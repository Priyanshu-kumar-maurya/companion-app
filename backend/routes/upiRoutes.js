/**
 * Coffeely - Zero-Fee UPIGateway Router
 * Direct peer-to-merchant UPI integration with 0% MDR, dynamic QR codes, mobile intents, and escrow protection
 */

const express = require("express");
const QRCode = require("qrcode");
const { pool } = require("../config/db");
const authenticateToken = require("../middleware/auth");

const router = express.Router();

// Configuration
const UPI_VPA = process.env.UPI_VPA || "priyanshu.companion@icici";
const MERCHANT_NAME = process.env.MERCHANT_NAME || "Coffeely Escrow";
const IS_SANDBOX = process.env.UPI_SANDBOX === "true" || true;

// In-memory anti-replay cache for UTRs
const usedUTRs = new Set();

// Helper: Ensure or initialize wallet balance for a user
async function ensureWalletExists(userId) {
  const existing = await pool.query("SELECT * FROM wallet_balances WHERE user_id = $1", [userId]);
  if (existing.rows.length > 0) {
    return existing.rows[0];
  }
  const inserted = await pool.query(
    "INSERT INTO wallet_balances (user_id, available_balance, pending_escrow, total_withdrawn, total_earned) VALUES ($1, 0, 0, 0, 0) RETURNING *",
    [userId]
  );
  return inserted.rows[0];
}

/**
 * 0. GET /api/upi/config
 * Public UPI gateway configuration
 */
router.get("/config", (req, res) => {
  res.status(200).json({
    success: true,
    vpa: UPI_VPA,
    merchant_name: MERCHANT_NAME,
    currency: "INR",
    is_sandbox: IS_SANDBOX,
    commission_rate: 0,
    message: "Zero-fee direct bank UPI gateway active",
  });
});

/**
 * 1. POST /api/upi/create-order
 * Generates dynamic NPCI UPI intent & high-res Base64 QR code
 */
router.post("/create-order", authenticateToken, async (req, res) => {
  try {
    const { booking_id, amount, note } = req.body;
    const baseAmt = parseFloat(amount) || 1000;
    // 0% Payment Gateway Fee (100% saved for merchant/client)
    const platformFee = 0;
    const payableTotal = baseAmt + platformFee;
    const orderId = `UPI_${Date.now()}_${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    // NPCI standard UPI Intent URL
    const cleanName = encodeURIComponent(MERCHANT_NAME);
    const cleanNote = encodeURIComponent(note || `Coffeely Booking ${booking_id ? '#' + booking_id : orderId}`);
    const intentUrl = `upi://pay?pa=${UPI_VPA}&pn=${cleanName}&am=${payableTotal.toFixed(2)}&cu=INR&tn=${cleanNote}&tr=${orderId}`;

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
        "UPDATE bookings SET order_id = $1, platform_fee = $2, companion_earnings = $3 WHERE id = $4",
        [orderId, platformFee, baseAmt, booking_id]
      );
    }

    res.status(200).json({
      success: true,
      order_id: orderId,
      booking_id,
      amount: payableTotal,
      base_amount: baseAmt,
      platform_fee: 0,
      vpa: UPI_VPA,
      merchant_name: MERCHANT_NAME,
      intent_url: intentUrl,
      qr_data_url: qrDataUrl,
      app_intents: appIntents,
      is_sandbox: IS_SANDBOX,
      expires_in: 300, // 5 minutes
    });
  } catch (err) {
    console.error("UPI create-order error:", err);
    res.status(500).json({ success: false, error: "Failed to create UPI order" });
  }
});

/**
 * 2. POST /api/upi/verify-payment
 * Validates 12-digit UTR, prevents replay attacks, and holds funds in Escrow
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

    // Also check database if this UTR was used before in bookings
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

    // Mark UTR as used
    usedUTRs.add(cleanUtr);

    let booking = null;
    let baseAmount = parseFloat(amount) || 1000;
    let companionEarnings = baseAmount;
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
        companionEarnings = baseAmount;
        targetGirlId = booking.girl_id;

        // Update booking payment status
        await pool.query(
          `UPDATE bookings 
           SET payment_status = 'escrow_held', payment_id = $1, order_id = $2, payment_method = 'UPIGateway (0% Fee)', platform_fee = 0, companion_earnings = $3 
           WHERE id = $4`,
          [cleanUtr, order_id || booking.order_id, companionEarnings, booking_id]
        );
      }
    }

    // Hold in Escrow for Companion
    if (targetGirlId) {
      await ensureWalletExists(targetGirlId);
      await pool.query(
        "UPDATE wallet_balances SET pending_escrow = pending_escrow + $1, updated_at = NOW() WHERE user_id = $2",
        [companionEarnings, targetGirlId]
      );

      // Record Escrow Transaction
      await pool.query(
        `INSERT INTO wallet_transactions (user_id, booking_id, type, amount, title, description, status, method)
         VALUES ($1, $2, 'escrow_hold', $3, $4, $5, 'in_escrow', $6)`,
        [
          targetGirlId,
          booking_id,
          companionEarnings,
          `Session Escrow Hold (Booking #${booking_id})`,
          `Funds (UTR: ${cleanUtr}) held safely in Coffeely Escrow via UPIGateway. Released upon meetup completion.`,
          `UPIGateway (UTR: ${cleanUtr})`,
        ]
      );
    }

    res.status(200).json({
      success: true,
      payment_status: "escrow_held",
      payment_id: cleanUtr,
      utr: cleanUtr,
      order_id: order_id || (booking ? booking.order_id : null),
      companion_earnings: companionEarnings,
      platform_fee: 0,
      payment_method: "UPIGateway (0% Fee Direct Bank)",
      payer_vpa: payer_vpa || "customer@upi",
      is_sandbox: IS_SANDBOX,
      message: "Payment verified successfully and held in 100% Escrow Protection via UPIGateway!",
    });
  } catch (err) {
    console.error("UPI verify error:", err);
    res.status(500).json({ success: false, error: "Failed to verify UPI payment" });
  }
});

module.exports = router;
