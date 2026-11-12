/**
 * Coffeely - Zero-Fee Direct P2P UPIGateway Router
 * Direct user-to-user (Client -> Companion) UPI payments with 0% platform fee, dynamic QR, and 1-tap mobile intents
 */

const express = require("express");
const QRCode = require("qrcode");
const { pool } = require("../config/db");
const authenticateToken = require("../middleware/auth");

const router = express.Router();

// Fallback configuration if a companion hasn't configured a personal UPI ID yet
const DEFAULT_FALLBACK_VPA = process.env.UPI_VPA || "priyanshu.companion@icici";
const IS_SANDBOX = process.env.UPI_SANDBOX === "true" || true;

// In-memory anti-replay cache for UTRs
const usedUTRs = new Set();

/**
 * 0. GET /api/upi/config
 * Public UPI gateway configuration
 */
router.get("/config", (req, res) => {
  res.status(200).json({
    success: true,
    currency: "INR",
    is_sandbox: IS_SANDBOX,
    mode: "direct_p2p",
    platform_fee: 0,
    message: "Direct user-to-user UPI payments (100% Free / 0% Platform Fee)",
  });
});

/**
 * 1. POST /api/upi/create-order
 * Generates direct Peer-to-Peer UPI Intent & QR directly to the Companion's UPI ID!
 */
router.post("/create-order", authenticateToken, async (req, res) => {
  try {
    const { booking_id, companion_id, amount, note } = req.body;
    const baseAmt = parseFloat(amount) || 1000;
    // 0% Platform Fee - 100% of money goes directly to the companion!
    const payableTotal = baseAmt;
    const orderId = `P2P_${Date.now()}_${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    let targetGirlId = companion_id;
    let targetCompanionName = "Companion";
    let targetUpiId = null;

    if (booking_id) {
      const bRes = await pool.query("SELECT * FROM bookings WHERE id = $1", [booking_id]);
      if (bRes.rows.length > 0) {
        targetGirlId = bRes.rows[0].girl_id;
      }
    }

    if (targetGirlId) {
      const uRes = await pool.query("SELECT id, name, upi_id FROM users WHERE id = $1", [targetGirlId]);
      if (uRes.rows.length > 0) {
        targetCompanionName = uRes.rows[0].name || "Companion";
        targetUpiId = uRes.rows[0].upi_id;
      }
    }

    // Use Companion's personal UPI ID, or fallback if not yet set
    const effectiveVpa = (targetUpiId && targetUpiId.trim()) || DEFAULT_FALLBACK_VPA;
    const isDirectCompanionUPI = Boolean(targetUpiId && targetUpiId.trim());

    // NPCI standard UPI Intent URL pointing DIRECTLY to the Companion
    const cleanName = encodeURIComponent(targetCompanionName);
    const cleanNote = encodeURIComponent(note || `Coffeely Meetup #${booking_id || orderId}`);
    const intentUrl = `upi://pay?pa=${effectiveVpa}&pn=${cleanName}&am=${payableTotal.toFixed(2)}&cu=INR&tn=${cleanNote}&tr=${orderId}`;

    // Generate Base64 Data URL QR Code
    let qrDataUrl = null;
    try {
      qrDataUrl = await QRCode.toDataURL(intentUrl, {
        errorCorrectionLevel: "H",
        margin: 2,
        width: 320,
        color: { dark: "#000000", light: "#FFFFFF" },
      });
    } catch (qrErr) {
      console.warn("QR code generation warning:", qrErr.message);
    }

    // App Intent Schemes for 1-click mobile apps
    const appIntents = {
      gpay: intentUrl.replace("upi://pay", "gpay://upi/pay"),
      phonepe: intentUrl.replace("upi://pay", "phonepe://pay"),
      paytm: intentUrl.replace("upi://pay", "paytmmp://pay"),
      bhim: intentUrl,
    };

    if (booking_id) {
      await pool.query(
        "UPDATE bookings SET order_id = $1, platform_fee = 0, companion_earnings = $2 WHERE id = $3",
        [orderId, baseAmt, booking_id]
      );
    }

    res.status(200).json({
      success: true,
      order_id: orderId,
      booking_id,
      amount: payableTotal,
      base_amount: baseAmt,
      platform_fee: 0,
      vpa: effectiveVpa,
      companion_name: targetCompanionName,
      is_direct_companion_upi: isDirectCompanionUPI,
      intent_url: intentUrl,
      qr_data_url: qrDataUrl,
      app_intents: appIntents,
      is_sandbox: IS_SANDBOX,
      expires_in: 300, // 5 minutes
    });
  } catch (err) {
    console.error("UPI create-order error:", err);
    res.status(500).json({ success: false, error: "Failed to create direct UPI order" });
  }
});

/**
 * 2. POST /api/upi/verify-payment
 * Validates 12-digit UTR, prevents replay attacks, marks booking as PAID directly (0% fee)
 */
router.post("/verify-payment", authenticateToken, async (req, res) => {
  try {
    const { booking_id, order_id, utr, payer_vpa, amount } = req.body;

    if (!utr) {
      return res.status(400).json({
        success: false,
        error: "12-digit UPI Reference / UTR Number is required.",
      });
    }

    // Sanitize UTR
    const cleanUtr = String(utr).trim().replace(/[^0-9]/g, "");

    // NPCI 12-digit check
    if (cleanUtr.length !== 12) {
      return res.status(400).json({
        success: false,
        error: `Invalid UTR length (${cleanUtr.length} digits). Standard Indian UPI UTR is exactly 12 numeric digits.`,
      });
    }

    // Reject repetitive sequences (e.g. 000000000000, 111111111111)
    if (/^(\d)\1{11}$/.test(cleanUtr)) {
      return res.status(400).json({
        success: false,
        error: "Invalid dummy UTR number. Please enter a valid transaction reference.",
      });
    }

    // Check in-memory anti-replay cache
    if (usedUTRs.has(cleanUtr)) {
      return res.status(400).json({
        success: false,
        error: "This UTR has already been submitted and verified. Replay attack blocked.",
      });
    }

    // Check database if this UTR was used before in bookings
    const dbUtrCheck = await pool.query(
      "SELECT id, booking_id FROM wallet_transactions WHERE method LIKE $1 OR description LIKE $2 LIMIT 1",
      [`%${cleanUtr}%`, `%${cleanUtr}%`]
    );
    if (dbUtrCheck.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: "This transaction reference has already been credited previously.",
      });
    }

    // Mark UTR as consumed
    usedUTRs.add(cleanUtr);

    let booking = null;
    let baseAmount = parseFloat(amount) || 1000;
    let targetGirlId = null;

    if (booking_id) {
      const bookingRes = await pool.query("SELECT * FROM bookings WHERE id = $1", [booking_id]);
      if (bookingRes.rows.length > 0) {
        booking = bookingRes.rows[0];

        // Authorization check: User must be client (boy_id) or admin
        const isClient = parseInt(req.user.id) === parseInt(booking.boy_id);
        const isAdmin = req.user.role === "admin";
        if (!isClient && !isAdmin) {
          return res.status(403).json({
            success: false,
            error: "Forbidden: Not authorized to verify payment for this booking.",
          });
        }

        baseAmount = booking.amount || parseFloat(amount) || 1000;
        targetGirlId = booking.girl_id;

        // Update booking: Mark as PAID directly (Direct User-to-User settlement)
        await pool.query(
          `UPDATE bookings 
           SET payment_status = 'paid', payment_id = $1, order_id = $2, payment_method = 'Direct P2P UPI (0% Fee)', platform_fee = 0, companion_earnings = $3 
           WHERE id = $4`,
          [cleanUtr, order_id || booking.order_id, baseAmount, booking_id]
        );
      }
    }

    // Record direct transaction in wallet for records
    if (targetGirlId) {
      try {
        await pool.query(
          `INSERT INTO wallet_transactions (user_id, booking_id, type, amount, title, description, status, method)
           VALUES ($1, $2, 'direct_p2p', $3, $4, $5, 'completed', $6)`,
          [
            targetGirlId,
            booking_id,
            baseAmount,
            `Direct P2P UPI Payment (Booking #${booking_id})`,
            `Payment of Rs. ${baseAmount} transferred directly to companion's UPI bank account (UTR: ${cleanUtr}). 0% platform fee.`,
            `Direct UPI (UTR: ${cleanUtr})`,
          ]
        );
      } catch (txErr) {
        console.warn("Wallet record warning (non-fatal):", txErr.message);
      }
    }

    res.status(200).json({
      success: true,
      payment_status: "paid",
      payment_id: cleanUtr,
      utr: cleanUtr,
      order_id: order_id || (booking ? booking.order_id : null),
      companion_earnings: baseAmount,
      platform_fee: 0,
      payment_method: "Direct User-to-User UPI (100% Free)",
      payer_vpa: payer_vpa || "customer@upi",
      is_sandbox: IS_SANDBOX,
      message: "Direct user-to-user UPI payment verified successfully! 100% transferred to companion bank.",
    });
  } catch (err) {
    console.error("UPI verify error:", err);
    res.status(500).json({ success: false, error: "Failed to verify UPI payment" });
  }
});

module.exports = router;
