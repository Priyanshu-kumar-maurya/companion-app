import React, { useState } from "react";
import { FiDollarSign, FiLock, FiTrendingUp, FiArrowUpRight, FiArrowDownLeft, FiClock, FiCreditCard, FiSmartphone, FiX, FiCheck } from "react-icons/fi";

export default function GirlWalletTab({ user }) {
    const [availableBalance, setAvailableBalance] = useState(18500);
    const [escrowPending] = useState(4200);
    const [totalEarned] = useState(52800);
    const [totalWithdrawn, setTotalWithdrawn] = useState(30100);

    const [filterType, setFilterType] = useState("all"); // 'all' | 'escrow' | 'withdrawals'
    const [showWithdrawModal, setShowWithdrawModal] = useState(false);
    const [withdrawMethod, setWithdrawMethod] = useState("upi"); // 'upi' | 'bank'
    const [withdrawAmount, setWithdrawAmount] = useState("");
    const [upiId, setUpiId] = useState("");
    const [accountHolder, setAccountHolder] = useState(user?.name || "");
    const [accountNumber, setAccountNumber] = useState("");
    const [ifscCode, setIfscCode] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");

    // Simulated Transactions
    const [transactions, setTransactions] = useState([
        {
            id: "tx_90123",
            booking_id: "BK-8841",
            type: "escrow_credit",
            title: "Session Payout (Client: Rahul S.)",
            amount: 2550,
            status: "completed",
            date: "Today, 4:30 PM",
            method: "Escrow Release"
        },
        {
            id: "tx_90119",
            booking_id: "BK-8839",
            type: "escrow_pending",
            title: "Upcoming Session Escrow Hold",
            amount: 4200,
            status: "in_escrow",
            date: "Tomorrow, 6:00 PM",
            method: "Held in Escrow 🔒"
        },
        {
            id: "tx_90105",
            booking_id: null,
            type: "withdrawal",
            title: "Payout to UPI (priya@okicici)",
            amount: 5000,
            status: "completed",
            date: "26 Aug 2026",
            method: "Instant UPI"
        },
        {
            id: "tx_90098",
            booking_id: "BK-8812",
            type: "escrow_credit",
            title: "Session Payout (Client: Aman K.)",
            amount: 3400,
            status: "completed",
            date: "24 Aug 2026",
            method: "Escrow Release"
        },
        {
            id: "tx_90074",
            booking_id: null,
            type: "withdrawal",
            title: "Direct Bank Transfer (HDFC ***4891)",
            amount: 15000,
            status: "completed",
            date: "20 Aug 2026",
            method: "NEFT / IMPS"
        }
    ]);

    const handleWithdrawSubmit = (e) => {
        e.preventDefault();
        const amt = parseFloat(withdrawAmount);
        if (!amt || amt <= 0 || amt > availableBalance) {
            alert("Please enter a valid withdrawal amount within your available balance.");
            return;
        }

        setIsSubmitting(true);
        setTimeout(() => {
            const newTx = {
                id: `tx_${Date.now().toString().slice(-5)}`,
                booking_id: null,
                type: "withdrawal",
                title: withdrawMethod === "upi" ? `Payout to UPI (${upiId})` : `Bank Payout (${accountHolder})`,
                amount: amt,
                status: "completed",
                date: "Just now",
                method: withdrawMethod === "upi" ? "Instant UPI" : "Bank IMPS"
            };

            setTransactions([newTx, ...transactions]);
            setAvailableBalance(prev => prev - amt);
            setTotalWithdrawn(prev => prev + amt);
            setIsSubmitting(false);
            setShowWithdrawModal(false);
            setWithdrawAmount("");
            setSuccessMessage(`🎉 Payout of ₹${amt.toLocaleString()} processed successfully to your ${withdrawMethod.toUpperCase()}!`);
            setTimeout(() => setSuccessMessage(""), 5000);
        }, 1500);
    };

    const filteredTransactions = transactions.filter(t => {
        if (filterType === "escrow") return t.type.startsWith("escrow");
        if (filterType === "withdrawals") return t.type === "withdrawal";
        return true;
    });

    return (
        <div className="space-y-6 text-left">
            {/* Success Toast */}
            {successMessage && (
                <div className="bg-gradient-to-r from-emerald-900/90 to-teal-900/90 border border-emerald-400/40 text-white text-xs font-semibold px-4 py-3 rounded-2xl shadow-xl flex items-center justify-between animate-slide-up">
                    <span>{successMessage}</span>
                    <button onClick={() => setSuccessMessage("")} className="text-gray-300 hover:text-white">
                        <FiX size={16} />
                    </button>
                </div>
            )}

            {/* ─── WALLET METRICS OVERVIEW CARDS ─── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Available Balance */}
                <div className="bg-gradient-to-br from-[#16162A] to-[#1E1238] border border-pink-500/30 rounded-3xl p-5 shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-pink-500/10 rounded-full blur-2xl pointer-events-none" />
                    <div className="flex justify-between items-start mb-3">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Available Balance</span>
                        <div className="w-9 h-9 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                            <FiDollarSign size={18} />
                        </div>
                    </div>
                    <div className="text-3xl font-black text-white mb-2">₹{availableBalance.toLocaleString()}</div>
                    <button
                        onClick={() => setShowWithdrawModal(true)}
                        className="w-full py-2.5 bg-gradient-to-r from-pink-500 to-purple-600 hover:opacity-90 active:scale-95 text-white rounded-xl text-xs font-bold shadow-lg transition flex items-center justify-center gap-1.5"
                    >
                        <FiArrowUpRight size={14} /> Withdraw Funds
                    </button>
                </div>

                {/* Locked in Escrow */}
                <div className="bg-[#16162A] border border-purple-500/20 rounded-3xl p-5 shadow-xl relative overflow-hidden">
                    <div className="flex justify-between items-start mb-3">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Locked in Escrow</span>
                        <div className="w-9 h-9 rounded-2xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center">
                            <FiLock size={18} />
                        </div>
                    </div>
                    <div className="text-3xl font-black text-purple-300 mb-2">₹{escrowPending.toLocaleString()}</div>
                    <div className="text-[11px] text-gray-400 flex items-center gap-1">
                        <FiClock size={12} className="text-purple-400" />
                        <span>Releases upon session completion</span>
                    </div>
                </div>

                {/* Total Lifetime Earnings */}
                <div className="bg-[#16162A] border border-white/10 rounded-3xl p-5 shadow-xl relative overflow-hidden">
                    <div className="flex justify-between items-start mb-3">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Lifetime Earnings</span>
                        <div className="w-9 h-9 rounded-2xl bg-white/10 text-pink-400 border border-white/10 flex items-center justify-center">
                            <FiTrendingUp size={18} />
                        </div>
                    </div>
                    <div className="text-3xl font-black text-white mb-2">₹{totalEarned.toLocaleString()}</div>
                    <div className="text-[11px] text-gray-400">
                        Total Withdrawn: <span className="text-gray-200 font-bold">₹{totalWithdrawn.toLocaleString()}</span>
                    </div>
                </div>
            </div>

            {/* ─── TRANSACTIONS & PAYOUT HISTORY ─── */}
            <div className="bg-[#16162A] border border-white/10 rounded-3xl p-6 shadow-xl">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
                    <div>
                        <h3 className="text-lg font-bold text-white">Wallet Activity & History</h3>
                        <p className="text-xs text-gray-400">Track your completed date payouts and withdrawals</p>
                    </div>

                    {/* Filter Tabs */}
                    <div className="flex bg-[#0D0D1A] p-1 rounded-2xl border border-white/5">
                        <button
                            onClick={() => setFilterType("all")}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                                filterType === "all" ? "bg-white/15 text-white" : "text-gray-400 hover:text-white"
                            }`}
                        >
                            All ({transactions.length})
                        </button>
                        <button
                            onClick={() => setFilterType("escrow")}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                                filterType === "escrow" ? "bg-purple-500/30 text-purple-300" : "text-gray-400 hover:text-white"
                            }`}
                        >
                            Escrow Credits
                        </button>
                        <button
                            onClick={() => setFilterType("withdrawals")}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                                filterType === "withdrawals" ? "bg-pink-500/30 text-pink-300" : "text-gray-400 hover:text-white"
                            }`}
                        >
                            Withdrawals
                        </button>
                    </div>
                </div>

                {/* Transactions Table / List */}
                <div className="divide-y divide-white/5">
                    {filteredTransactions.map((tx) => {
                        const isCredit = tx.type === "escrow_credit" || tx.type === "escrow_pending";
                        const isInEscrow = tx.status === "in_escrow";

                        return (
                            <div key={tx.id} className="py-3.5 flex items-center justify-between hover:bg-white/5 px-2 rounded-2xl transition">
                                <div className="flex items-center gap-3.5">
                                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-base ${
                                        isInEscrow
                                            ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                                            : isCredit
                                                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                                : "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                                    }`}>
                                        {isInEscrow ? <FiLock size={18} /> : isCredit ? <FiArrowDownLeft size={18} /> : <FiArrowUpRight size={18} />}
                                    </div>

                                    <div>
                                        <div className="font-bold text-white text-xs sm:text-sm">{tx.title}</div>
                                        <div className="text-[10px] text-gray-400 flex items-center gap-2 mt-0.5">
                                            <span>{tx.date}</span>
                                            <span>•</span>
                                            <span className="font-mono">{tx.id}</span>
                                            <span>•</span>
                                            <span>{tx.method}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="text-right">
                                    <div className={`text-sm sm:text-base font-extrabold ${
                                        isInEscrow ? "text-purple-400" : isCredit ? "text-emerald-400" : "text-white"
                                    }`}>
                                        {isCredit ? "+" : "-"}₹{tx.amount.toLocaleString()}
                                    </div>
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                                        isInEscrow
                                            ? "bg-purple-500/20 text-purple-300 border border-purple-500/40"
                                            : tx.status === "completed"
                                                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                                                : "bg-red-500/20 text-red-400"
                                    }`}>
                                        {isInEscrow ? "In Escrow" : tx.status}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ─── WITHDRAWAL MODAL ─── */}
            {showWithdrawModal && (
                <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
                    <div className="relative w-full max-w-md bg-[#141428] border border-pink-500/30 rounded-3xl p-6 sm:p-7 shadow-2xl text-left">
                        <button
                            onClick={() => setShowWithdrawModal(false)}
                            className="absolute top-5 right-5 p-2 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition"
                        >
                            <FiX size={18} />
                        </button>

                        <h3 className="text-lg font-bold text-white mb-1">Request Earnings Payout</h3>
                        <p className="text-xs text-gray-400 mb-4">
                            Available to withdraw: <strong className="text-emerald-400">₹{availableBalance.toLocaleString()}</strong>
                        </p>

                        <form onSubmit={handleWithdrawSubmit} className="space-y-4">
                            {/* Payout Method */}
                            <div>
                                <label className="block text-xs font-bold text-gray-300 mb-1.5">Payout Method</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setWithdrawMethod("upi")}
                                        className={`p-3 rounded-2xl border text-center transition flex items-center justify-center gap-2 ${
                                            withdrawMethod === "upi"
                                                ? "bg-pink-500/20 border-pink-500 text-pink-300 font-bold"
                                                : "bg-white/5 border-white/10 text-gray-400 hover:text-white"
                                        }`}
                                    >
                                        <FiSmartphone size={16} /> Instant UPI
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setWithdrawMethod("bank")}
                                        className={`p-3 rounded-2xl border text-center transition flex items-center justify-center gap-2 ${
                                            withdrawMethod === "bank"
                                                ? "bg-pink-500/20 border-pink-500 text-pink-300 font-bold"
                                                : "bg-white/5 border-white/10 text-gray-400 hover:text-white"
                                        }`}
                                    >
                                        <FiCreditCard size={16} /> Bank Transfer
                                    </button>
                                </div>
                            </div>

                            {/* Amount */}
                            <div>
                                <label className="block text-xs font-bold text-gray-300 mb-1">Withdrawal Amount (₹)</label>
                                <input
                                    type="number"
                                    required
                                    min="500"
                                    max={availableBalance}
                                    value={withdrawAmount}
                                    onChange={(e) => setWithdrawAmount(e.target.value)}
                                    placeholder="Enter amount (min ₹500)"
                                    className="w-full bg-[#181830] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500 outline-none focus:border-pink-500 transition font-bold"
                                />
                                <div className="flex gap-2 mt-2">
                                    {[1000, 2500, 5000].map(amt => (
                                        <button
                                            key={amt}
                                            type="button"
                                            onClick={() => setWithdrawAmount(amt.toString())}
                                            className="px-2.5 py-1 bg-white/5 hover:bg-white/10 rounded-lg text-[10px] text-gray-300 border border-white/5"
                                        >
                                            ₹{amt.toLocaleString()}
                                        </button>
                                    ))}
                                    <button
                                        type="button"
                                        onClick={() => setWithdrawAmount(availableBalance.toString())}
                                        className="px-2.5 py-1 bg-pink-500/20 text-pink-300 rounded-lg text-[10px] font-bold border border-pink-500/30 ml-auto"
                                    >
                                        Max All
                                    </button>
                                </div>
                            </div>

                            {/* UPI ID Input */}
                            {withdrawMethod === "upi" ? (
                                <div>
                                    <label className="block text-xs font-bold text-gray-300 mb-1">Your UPI ID (VPA)</label>
                                    <input
                                        type="text"
                                        required
                                        value={upiId}
                                        onChange={(e) => setUpiId(e.target.value)}
                                        placeholder="yourname@okhdfcbank / mobile@paytm"
                                        className="w-full bg-[#181830] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500 outline-none focus:border-pink-500 transition"
                                    />
                                </div>
                            ) : (
                                /* Bank Account Details */
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-300 mb-1">Account Holder Name</label>
                                        <input
                                            type="text"
                                            required
                                            value={accountHolder}
                                            onChange={(e) => setAccountHolder(e.target.value)}
                                            placeholder="As per bank records"
                                            className="w-full bg-[#181830] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500 outline-none focus:border-pink-500 transition"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-300 mb-1">Account Number</label>
                                        <input
                                            type="text"
                                            required
                                            value={accountNumber}
                                            onChange={(e) => setAccountNumber(e.target.value)}
                                            placeholder="987654321000"
                                            className="w-full bg-[#181830] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500 outline-none focus:border-pink-500 transition font-mono"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-300 mb-1">IFSC Code</label>
                                        <input
                                            type="text"
                                            required
                                            value={ifscCode}
                                            onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                                            placeholder="HDFC0001234"
                                            className="w-full bg-[#181830] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500 outline-none focus:border-pink-500 transition uppercase font-mono"
                                        />
                                    </div>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={isSubmitting || !withdrawAmount}
                                className="w-full py-3.5 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-2xl font-bold text-xs shadow-xl hover:opacity-95 transition disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isSubmitting ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        <span>Processing Payout Request...</span>
                                    </>
                                ) : (
                                    <>
                                        <FiCheck size={16} />
                                        <span>Confirm Payout of ₹{(parseFloat(withdrawAmount) || 0).toLocaleString()}</span>
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
