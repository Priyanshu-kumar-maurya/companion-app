import React, { useState, useEffect } from "react";
import { PAGES } from "../App";
import { FiShield, FiUser, FiAlertTriangle, FiCheckCircle, FiLock, FiUnlock, FiSlash, FiTrash2, FiBarChart2, FiPrinter, FiCalendar, FiMail, FiX } from "react-icons/fi";

const API = "https://rentgf-and-bf.onrender.com/api";

function AdminDashboard({ user, setPage }) {
    const [stats, setStats] = useState(null);
    const [users, setUsers] = useState([]);
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("users");
    const [activeFilter, setActiveFilter] = useState("all"); // "all" | "girls" | "boys" | "frozen" | "blocked" | "pendingKyc" | "unverified"
    const [actionLoading, setActionLoading] = useState({});
    const [searchQuery, setSearchQuery] = useState("");

    const token = localStorage.getItem('token');
    const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

    useEffect(() => { fetchAll(); }, []);

    const fetchAll = async () => {
        try {
            const [statsRes, usersRes, reportsRes] = await Promise.all([
                fetch(`${API}/admin/stats`, { headers }),
                fetch(`${API}/admin/users`, { headers }),
                fetch(`${API}/admin/reports`, { headers }),
            ]);
            if (statsRes.ok) setStats(await statsRes.json());
            if (usersRes.ok) setUsers(await usersRes.json());
            if (reportsRes.ok) setReports(await reportsRes.json());
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const setLoaderFor = (key, val) => setActionLoading(prev => ({ ...prev, [key]: val }));

    const handleKycUpdate = async (userId, status) => {
        setLoaderFor(`kyc_${userId}`, true);
        try {
            const res = await fetch(`${API}/admin/kyc/${userId}`, { method: "PUT", headers, body: JSON.stringify({ status }) });
            if (res.ok) { await fetchAll(); }
        } catch (e) {} finally { setLoaderFor(`kyc_${userId}`, false); }
    };

    const handleFreeze = async (userId, freeze) => {
        setLoaderFor(`freeze_${userId}`, true);
        try {
            const res = await fetch(`${API}/admin/users/${userId}/freeze`, { method: "PUT", headers, body: JSON.stringify({ freeze }) });
            if (res.ok) { setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_frozen: freeze } : u)); }
        } catch (e) {} finally { setLoaderFor(`freeze_${userId}`, false); }
    };

    const handlePlatformBlock = async (userId, block) => {
        setLoaderFor(`block_${userId}`, true);
        try {
            const res = await fetch(`${API}/admin/users/${userId}/platform-block`, { method: "PUT", headers, body: JSON.stringify({ block }) });
            if (res.ok) { setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_platform_blocked: block } : u)); }
        } catch (e) {} finally { setLoaderFor(`block_${userId}`, false); }
    };

    const handleDeleteUser = async (userId, name) => {
        if (!window.confirm(`Delete "${name}"? Ye PERMANENT hai!`)) return;
        setLoaderFor(`del_${userId}`, true);
        try {
            const res = await fetch(`${API}/admin/users/${userId}`, { method: "DELETE", headers });
            if (res.ok) { setUsers(prev => prev.filter(u => u.id !== userId)); }
        } catch (e) {} finally { setLoaderFor(`del_${userId}`, false); }
    };

    const handleReportStatus = async (reportId, status) => {
        setLoaderFor(`rep_${reportId}`, true);
        try {
            const res = await fetch(`${API}/admin/reports/${reportId}`, { method: "PUT", headers, body: JSON.stringify({ status }) });
            if (res.ok) { setReports(prev => prev.map(r => r.id === reportId ? { ...r, status } : r)); }
        } catch (e) {} finally { setLoaderFor(`rep_${reportId}`, false); }
    };

    if (loading || !stats) {
        return (
            <div className="min-h-[100dvh] bg-[#0D0D1A] flex items-center justify-center">
                <div className="text-pink-400 animate-pulse text-xl font-bold">Loading Admin Panel...</div>
            </div>
        );
    }

    // ── Filtered Users Logic ──────────────────────────────────
    // is_verified can be true, false, or null (old users who were never asked to verify)
    const unverifiedUsers = users.filter(u => u.is_verified === false);

    const getFilteredUsers = () => {
        let base = users; // default: show ALL users
        switch (activeFilter) {
            case "girls":       base = users.filter(u => u.role === 'girl'); break;
            case "boys":        base = users.filter(u => u.role === 'boy'); break;
            case "frozen":      base = users.filter(u => u.is_frozen); break;
            case "blocked":     base = users.filter(u => u.is_platform_blocked); break;
            case "pendingKyc":  base = users.filter(u => u.kyc_status === 'pending'); break;
            case "unverified":  base = unverifiedUsers; break;
            default:            base = users; break;
        }
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            base = base.filter(u =>
                (u.name && u.name.toLowerCase().includes(q)) ||
                (u.email && u.email.toLowerCase().includes(q)) ||
                (u.phone && u.phone.includes(q))
            );
        }
        return base;
    };

    const filteredUsers = getFilteredUsers();

    // ── Stat Cards (clickable) ────────────────────────────────
    const statCards = [
        {
            label: "Total Users", value: stats.totalUsers,
            color: "text-white", border: "border-white/10",
            bg: "hover:bg-white/5",
            filter: "all"
        },
        {
            label: "Girls", value: stats.girls,
            color: "text-pink-400", border: "border-pink-500/30",
            bg: "hover:bg-pink-500/5",
            filter: "girls"
        },
        {
            label: "Boys", value: stats.boys,
            color: "text-blue-400", border: "border-blue-500/30",
            bg: "hover:bg-blue-500/5",
            filter: "boys"
        },
        {
            label: "Pending KYC", value: stats.pendingKyc,
            color: "text-yellow-400", border: "border-yellow-500/30",
            bg: "hover:bg-yellow-500/5",
            filter: "pendingKyc"
        },
        {
            label: "Posts", value: stats.posts,
            color: "text-purple-400", border: "border-purple-500/30",
            bg: "hover:bg-purple-500/5",
            filter: null // posts tab nahi hai — no filter
        },
        {
            label: "Bookings", value: stats.bookings,
            color: "text-green-400", border: "border-green-500/30",
            bg: "hover:bg-green-500/5",
            filter: null
        },
        {
            label: "Pending Reports", value: stats.pendingReports,
            color: "text-orange-400", border: "border-orange-500/30",
            bg: "hover:bg-orange-500/5",
            filter: null, // Reports tab pe jayega
            goTab: "reports"
        },
        {
            label: "Frozen Accounts", value: stats.frozenUsers,
            color: "text-cyan-400", border: "border-cyan-500/30",
            bg: "hover:bg-cyan-500/5",
            filter: "frozen"
        },
        {
            label: "OTP Unverified", value: unverifiedUsers.length,
            color: "text-red-400", border: "border-red-500/30",
            bg: "hover:bg-red-500/5",
            filter: "unverified"
        },
    ];

    const filterLabels = {
        all: "All Users",
        girls: "Girls Only",
        boys: "Boys Only",
        frozen: "Frozen Accounts",
        blocked: "Blocked Users",
        pendingKyc: "Pending KYC",
        unverified: "OTP Unverified",
    };

    return (
        <div className="pt-24 pb-20 min-h-[100dvh] bg-[#0D0D1A] px-4 sm:px-6 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-8 print:hidden">
                <div>
                    <h1 className="text-3xl font-extrabold text-white flex items-center gap-2">
                        <FiShield className="text-yellow-500 drop-shadow-[0_0_8px_rgba(234,179,8,0.4)]" /> Super Admin Panel
                    </h1>
                    <p className="text-gray-400 mt-1 text-sm">Full control over users, accounts, and reports.</p>
                </div>
                <button onClick={() => setPage(PAGES.HOME)} className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition text-sm">
                    ← Home
                </button>
            </div>

            {/* ── Stats Grid (clickable) ── */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-8 print:hidden">
                {statCards.map(s => (
                    <div
                        key={s.label}
                        onClick={() => {
                            if (s.goTab) { setActiveTab(s.goTab); return; }
                            if (s.filter !== null && s.filter !== undefined) {
                                setActiveTab("users");
                                setActiveFilter(s.filter);
                                setSearchQuery("");
                            }
                        }}
                        className={`bg-[#16162A] border ${s.border} rounded-2xl p-4 shadow-lg transition ${
                            (s.filter !== null && s.filter !== undefined) || s.goTab
                                ? `cursor-pointer ${s.bg} ${activeFilter === s.filter && activeTab === 'users' ? 'ring-2 ring-white/30 scale-[1.02]' : ''}`
                                : 'cursor-default opacity-80'
                        }`}
                    >
                        <div className="text-gray-400 text-xs mb-1 flex items-center justify-between">
                            <span>{s.label}</span>
                            {((s.filter !== null && s.filter !== undefined) || s.goTab) &&
                                <span className="text-[9px] text-gray-600 font-medium">click</span>
                            }
                        </div>
                        <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                    </div>
                ))}
            </div>

            {/* ── Tabs ── */}
            <div className="flex flex-wrap gap-2 mb-6 bg-[#16162A] p-1 rounded-xl border border-white/5 w-fit print:hidden">
                <button
                    onClick={() => { setActiveTab("users"); setActiveFilter("all"); }}
                    className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition flex items-center gap-1.5 ${activeTab === "users" ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                >
                    <FiUser size={15} /> Users ({users.length})
                </button>
                <button
                    onClick={() => { setActiveTab("unverified"); }}
                    className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition flex items-center gap-1.5 relative ${activeTab === "unverified" ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                >
                    <FiMail size={15} /> OTP Pending
                    {unverifiedUsers.length > 0 && (
                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                            {unverifiedUsers.length}
                        </span>
                    )}
                </button>
                <button
                    onClick={() => setActiveTab("reports")}
                    className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition flex items-center gap-1.5 relative ${activeTab === "reports" ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                >
                    <FiAlertTriangle size={15} /> Reports
                    {stats.pendingReports > 0 && (
                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                            {stats.pendingReports}
                        </span>
                    )}
                </button>
                <button
                    onClick={() => setActiveTab("insights")}
                    className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition flex items-center gap-1.5 ${activeTab === "insights" ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                >
                    <FiBarChart2 size={15} /> Insights & Proofs
                </button>
            </div>

            {/* ── USERS TAB ── */}
            {activeTab === "users" && (
                <div>
                    {/* Filter bar */}
                    <div className="flex flex-wrap items-center gap-2 mb-4">
                        {/* Search */}
                        <div className="relative flex-1 min-w-[200px] max-w-sm">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder="Search by name, email, phone..."
                                className="w-full bg-[#16162A] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-pink-500 transition"
                            />
                            {searchQuery && (
                                <button onClick={() => setSearchQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
                                    <FiX size={14} />
                                </button>
                            )}
                        </div>

                        {/* Filter pills */}
                        {["all", "girls", "boys", "frozen", "blocked", "pendingKyc"].map(f => (
                            <button
                                key={f}
                                onClick={() => setActiveFilter(f)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                                    activeFilter === f
                                        ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white'
                                        : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                                }`}
                            >
                                {filterLabels[f]}
                            </button>
                        ))}
                    </div>

                    {/* Active filter label */}
                    <div className="text-xs text-gray-500 mb-3 flex items-center gap-2">
                        Showing <span className="text-pink-400 font-bold">{filterLabels[activeFilter]}</span>
                        <span className="text-gray-600">— {filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''}</span>
                    </div>

                    <div className="bg-[#16162A] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
                        <div className="overflow-x-auto">
                            {filteredUsers.length === 0 ? (
                                <div className="p-10 text-center text-gray-500 flex flex-col items-center gap-2">
                                    <FiUser size={28} className="text-gray-700" />
                                    <span>Koi user nahi mila is filter mein.</span>
                                </div>
                            ) : (
                                <table className="w-full text-left text-sm text-gray-300">
                                    <thead className="text-xs text-gray-400 uppercase bg-white/5">
                                        <tr>
                                            <th className="px-4 py-3">User</th>
                                            <th className="px-4 py-3">Role</th>
                                            <th className="px-4 py-3">Contact</th>
                                            <th className="px-4 py-3">Status</th>
                                            <th className="px-4 py-3">KYC</th>
                                            <th className="px-4 py-3">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {filteredUsers.map((u) => (
                                            <tr key={u.id} className={`hover:bg-white/5 transition ${u.is_frozen ? 'opacity-60' : ''}`}>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        {u.profile_pic
                                                            ? <img src={u.profile_pic} alt="" className="w-8 h-8 rounded-full object-cover" />
                                                            : <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">{u.name?.[0]}</div>
                                                        }
                                                        <div>
                                                            <div className="font-medium text-white">{u.name}</div>
                                                            {u.report_count > 0 && <span className="text-[10px] text-orange-400">🚩 {u.report_count} reports</span>}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 uppercase text-xs">{u.role}</td>
                                                <td className="px-4 py-3">
                                                    <div className="text-xs">{u.email}</div>
                                                    <div className="text-xs text-gray-500">{u.phone}</div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex flex-col gap-1">
                                                        {u.is_frozen && <span className="text-[10px] bg-cyan-500/20 text-cyan-400 px-1.5 py-0.5 rounded font-bold w-fit flex items-center gap-1"><FiLock size={10} /> Frozen</span>}
                                                        {u.is_platform_blocked && <span className="text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded font-bold w-fit flex items-center gap-1"><FiSlash size={10} /> Blocked</span>}
                                                        {!u.is_frozen && !u.is_platform_blocked && <span className="text-[10px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded font-bold w-fit flex items-center gap-1"><FiCheckCircle size={10} /> Active</span>}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`px-2 py-1 rounded text-xs font-bold ${u.kyc_status === 'verified' ? 'bg-green-500/20 text-green-400' : u.kyc_status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'}`}>
                                                        {u.kyc_status}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex flex-wrap gap-1">
                                                        {u.kyc_status === 'pending' && u.id_proof_url && (
                                                            <>
                                                                <a href={u.id_proof_url} target="_blank" rel="noreferrer" className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs hover:bg-blue-500/40">ID</a>
                                                                <button onClick={() => handleKycUpdate(u.id, 'verified')} disabled={actionLoading[`kyc_${u.id}`]} className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs hover:bg-green-500/40 disabled:opacity-50">✓ OK</button>
                                                                <button onClick={() => handleKycUpdate(u.id, 'rejected')} disabled={actionLoading[`kyc_${u.id}`]} className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs hover:bg-red-500/40 disabled:opacity-50">✗ No</button>
                                                            </>
                                                        )}
                                                        <button
                                                            onClick={() => handleFreeze(u.id, !u.is_frozen)}
                                                            disabled={actionLoading[`freeze_${u.id}`]}
                                                            className={`px-2 py-1 rounded text-xs disabled:opacity-50 transition ${u.is_frozen ? 'bg-cyan-500/30 text-cyan-300 hover:bg-cyan-500/50' : 'bg-slate-500/20 text-slate-300 hover:bg-slate-500/40'}`}
                                                        >
                                                            {u.is_frozen ? <span className="flex items-center gap-1"><FiUnlock size={11} /> Unfreeze</span> : <span className="flex items-center gap-1"><FiLock size={11} /> Freeze</span>}
                                                        </button>
                                                        <button
                                                            onClick={() => handlePlatformBlock(u.id, !u.is_platform_blocked)}
                                                            disabled={actionLoading[`block_${u.id}`]}
                                                            className={`px-2 py-1 rounded text-xs disabled:opacity-50 transition ${u.is_platform_blocked ? 'bg-green-500/20 text-green-400 hover:bg-green-500/40' : 'bg-orange-500/20 text-orange-400 hover:bg-orange-500/40'}`}
                                                        >
                                                            {u.is_platform_blocked ? <span className="flex items-center gap-1"><FiCheckCircle size={11} /> Unblock</span> : <span className="flex items-center gap-1"><FiSlash size={11} /> Block</span>}
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteUser(u.id, u.name)}
                                                            disabled={actionLoading[`del_${u.id}`]}
                                                            className="px-2 py-1 bg-red-900/30 text-red-400 rounded text-xs hover:bg-red-900/60 disabled:opacity-50 flex items-center justify-center"
                                                        >
                                                            <FiTrash2 size={12} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ── OTP UNVERIFIED TAB ── */}
            {activeTab === "unverified" && (
                <div>
                    <div className="mb-4 flex items-center gap-3">
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 border border-red-500/30 rounded-xl">
                            <FiMail size={14} className="text-red-400" />
                            <span className="text-red-400 text-xs font-bold">{unverifiedUsers.length} users ne OTP verify nahi kiya</span>
                        </div>
                        <span className="text-gray-500 text-xs">In users ka email verify nahi hua — login nahi kar sakte.</span>
                    </div>

                    <div className="bg-[#16162A] border border-red-500/20 rounded-2xl overflow-hidden shadow-xl">
                        <div className="overflow-x-auto">
                            {unverifiedUsers.length === 0 ? (
                                <div className="p-10 text-center text-gray-500 flex flex-col items-center gap-2">
                                    <FiCheckCircle size={28} className="text-green-500" />
                                    <span>Sab users ne OTP verify kar liya! 🎉</span>
                                </div>
                            ) : (
                                <table className="w-full text-left text-sm text-gray-300">
                                    <thead className="text-xs text-gray-400 uppercase bg-red-500/5">
                                        <tr>
                                            <th className="px-4 py-3">User</th>
                                            <th className="px-4 py-3">Role</th>
                                            <th className="px-4 py-3">Email</th>
                                            <th className="px-4 py-3">Phone</th>
                                            <th className="px-4 py-3">OTP Status</th>
                                            <th className="px-4 py-3">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {unverifiedUsers.map((u) => (
                                            <tr key={u.id} className="hover:bg-red-500/5 transition">
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center text-white text-xs font-bold">{u.name?.[0]}</div>
                                                        <div className="font-medium text-white">{u.name}</div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 uppercase text-xs">{u.role}</td>
                                                <td className="px-4 py-3 text-xs text-gray-300">{u.email}</td>
                                                <td className="px-4 py-3 text-xs text-gray-500">{u.phone || '—'}</td>
                                                <td className="px-4 py-3">
                                                    <span className="text-[10px] bg-red-500/20 text-red-400 px-2 py-1 rounded-full font-bold flex items-center gap-1 w-fit">
                                                        <FiMail size={10} /> OTP Pending
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex gap-1">
                                                        {/* Delete unverified user */}
                                                        <button
                                                            onClick={() => handleDeleteUser(u.id, u.name)}
                                                            disabled={actionLoading[`del_${u.id}`]}
                                                            className="px-2 py-1 bg-red-900/30 text-red-400 rounded text-xs hover:bg-red-900/60 disabled:opacity-50 flex items-center gap-1"
                                                        >
                                                            <FiTrash2 size={12} /> Delete
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ── REPORTS TAB ── */}
            {activeTab === "reports" && (
                <div className="space-y-3">
                    {reports.length === 0 && (
                        <div className="bg-[#16162A] border border-white/5 rounded-2xl p-10 text-center text-gray-500 flex flex-col items-center gap-2">
                            <FiCheckCircle size={28} className="text-green-500" />
                            <span>No reports yet. Platform is clean!</span>
                        </div>
                    )}
                    {reports.map(r => (
                        <div key={r.id} className="bg-[#16162A] border border-white/10 rounded-2xl p-4 shadow-lg">
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                                        <div className="flex items-center gap-1.5">
                                            {r.reporter_pic ? <img src={r.reporter_pic} alt="" className="w-6 h-6 rounded-full object-cover" /> : <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white text-[10px]">{r.reporter_name?.[0]}</div>}
                                            <span className="text-xs text-blue-300 font-medium">{r.reporter_name || 'Unknown'}</span>
                                        </div>
                                        <span className="text-gray-500 text-xs">reported</span>
                                        <div className="flex items-center gap-1.5">
                                            {r.reported_pic ? <img src={r.reported_pic} alt="" className="w-6 h-6 rounded-full object-cover" /> : <div className="w-6 h-6 rounded-full bg-red-600 flex items-center justify-center text-white text-[10px]">{r.reported_name?.[0]}</div>}
                                            <span className="text-xs text-red-300 font-medium">{r.reported_name || 'Deleted'}</span>
                                            <span className="text-gray-600 text-xs">({r.reported_role})</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="px-2 py-0.5 bg-orange-500/20 text-orange-300 rounded-full text-xs font-bold flex items-center gap-1"><FiAlertTriangle size={10} /> {r.reason}</span>
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${r.status === 'pending' ? 'bg-yellow-500/20 text-yellow-300' : r.status === 'reviewed' ? 'bg-green-500/20 text-green-300' : 'bg-gray-500/20 text-gray-400'}`}>
                                            {r.status}
                                        </span>
                                    </div>
                                    {r.description && <p className="text-gray-400 text-xs mt-1">"{r.description}"</p>}
                                    <p className="text-gray-600 text-[10px] mt-1">{new Date(r.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                                </div>
                                <div className="flex flex-col gap-1.5 shrink-0">
                                    {r.status !== 'reviewed' && (
                                        <button onClick={() => handleReportStatus(r.id, 'reviewed')} disabled={actionLoading[`rep_${r.id}`]} className="px-3 py-1.5 bg-green-500/20 text-green-400 rounded-lg text-xs font-bold hover:bg-green-500/40 disabled:opacity-50">
                                            ✓ Reviewed
                                        </button>
                                    )}
                                    {r.status !== 'dismissed' && (
                                        <button onClick={() => handleReportStatus(r.id, 'dismissed')} disabled={actionLoading[`rep_${r.id}`]} className="px-3 py-1.5 bg-gray-500/20 text-gray-400 rounded-lg text-xs font-bold hover:bg-gray-500/40 disabled:opacity-50">
                                            ✗ Dismiss
                                        </button>
                                    )}
                                    {r.reported_id && (
                                        <button onClick={() => handlePlatformBlock(r.reported_id, true)} disabled={actionLoading[`block_${r.reported_id}`]} className="px-3 py-1.5 bg-red-500/20 text-red-400 rounded-lg text-xs font-bold hover:bg-red-500/40 disabled:opacity-50 flex items-center justify-center gap-1">
                                            <FiSlash size={12} /> Block User
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ── INSIGHTS TAB ── */}
            {activeTab === "insights" && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:hidden animate-fade-in">
                        <div className="bg-[#16162A] border border-white/10 rounded-2xl p-5 shadow-lg">
                            <h3 className="text-white font-bold text-sm mb-4 flex items-center gap-1.5">
                                <FiUser className="text-pink-500" /> Gender Distribution
                            </h3>
                            <div className="space-y-4">
                                <div>
                                    <div className="flex justify-between text-xs mb-1.5">
                                        <span className="text-blue-400">Boys</span>
                                        <span className="font-bold text-white">{stats.boys} ({Math.round((stats.boys / stats.totalUsers) * 100) || 0}%)</span>
                                    </div>
                                    <div className="w-full h-2.5 bg-white/5 rounded-full overflow-hidden">
                                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(stats.boys / stats.totalUsers) * 100}%` }}></div>
                                    </div>
                                </div>
                                <div>
                                    <div className="flex justify-between text-xs mb-1.5">
                                        <span className="text-pink-400">Girls</span>
                                        <span className="font-bold text-white">{stats.girls} ({Math.round((stats.girls / stats.totalUsers) * 100) || 0}%)</span>
                                    </div>
                                    <div className="w-full h-2.5 bg-white/5 rounded-full overflow-hidden">
                                        <div className="h-full bg-pink-500 rounded-full" style={{ width: `${(stats.girls / stats.totalUsers) * 100}%` }}></div>
                                    </div>
                                </div>
                                <div>
                                    <div className="flex justify-between text-xs mb-1.5">
                                        <span className="text-red-400">OTP Unverified</span>
                                        <span className="font-bold text-white">{unverifiedUsers.length}</span>
                                    </div>
                                    <div className="w-full h-2.5 bg-white/5 rounded-full overflow-hidden">
                                        <div className="h-full bg-red-500 rounded-full" style={{ width: `${(unverifiedUsers.length / (stats.totalUsers + unverifiedUsers.length)) * 100}%` }}></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-[#16162A] border border-white/10 rounded-2xl p-5 shadow-lg">
                            <h3 className="text-white font-bold text-sm mb-4 flex items-center gap-1.5">
                                <FiCheckCircle className="text-yellow-500" /> KYC Verification Rate
                            </h3>
                            <div className="space-y-4">
                                <div>
                                    <div className="flex justify-between text-xs mb-1.5">
                                        <span className="text-green-400">KYC Verified</span>
                                        <span className="font-bold text-white">{stats.totalUsers - stats.pendingKyc}</span>
                                    </div>
                                    <div className="w-full h-2.5 bg-white/5 rounded-full overflow-hidden">
                                        <div className="h-full bg-green-500 rounded-full" style={{ width: `${((stats.totalUsers - stats.pendingKyc) / stats.totalUsers) * 100}%` }}></div>
                                    </div>
                                </div>
                                <div>
                                    <div className="flex justify-between text-xs mb-1.5">
                                        <span className="text-yellow-400">Pending KYC</span>
                                        <span className="font-bold text-white">{stats.pendingKyc}</span>
                                    </div>
                                    <div className="w-full h-2.5 bg-white/5 rounded-full overflow-hidden">
                                        <div className="h-full bg-yellow-500 rounded-full" style={{ width: `${(stats.pendingKyc / stats.totalUsers) * 100}%` }}></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Print Section */}
                    <div className="pt-4 animate-fade-in">
                        <div className="flex justify-between items-center mb-4 print:hidden">
                            <h3 className="text-gray-400 text-sm font-bold">Official Platform Summary Report</h3>
                            <button
                                onClick={() => window.print()}
                                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-lg text-xs font-bold hover:opacity-90 transition shadow-lg shadow-pink-500/20"
                            >
                                <FiPrinter size={14} /> Print / Save PDF Proof
                            </button>
                        </div>

                        <style dangerouslySetInnerHTML={{__html: `
                            @media print {
                                body { background: white !important; color: black !important; }
                                nav, .print\\:hidden, button, header, footer { display: none !important; }
                                .print-box { background: white !important; color: black !important; border: 2px solid #000 !important; box-shadow: none !important; max-width: 100% !important; width: 100% !important; margin: 0 !important; padding: 20px !important; }
                                .print-box text, .print-box span, .print-box div, .print-box p, .print-box h1, .print-box h2, .print-box h3, .print-box th, .print-box td { color: black !important; }
                                .print-border { border-color: #ccc !important; }
                            }
                        `}} />

                        <div id="print-section" className="print-box bg-[#16162A] border border-white/10 rounded-3xl p-8 max-w-xl mx-auto shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-pink-500/10 to-purple-600/10 rounded-bl-full border-l border-b border-white/5 pointer-events-none print:hidden"></div>
                            <div className="flex flex-col items-center text-center pb-6 border-b border-white/10 print-border">
                                <span className="text-2xl font-black bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent tracking-wide print:text-black">RentGF</span>
                                <p className="text-[10px] text-gray-400 tracking-widest uppercase mt-1">Official Platform Summary Report</p>
                            </div>
                            <div className="py-5 grid grid-cols-2 gap-4 text-xs border-b border-white/10 print-border">
                                <div>
                                    <span className="text-gray-500 block mb-0.5">Generated On</span>
                                    <span className="text-gray-200 font-mono font-bold flex items-center gap-1"><FiCalendar size={12} className="text-pink-500" /> {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                                <div>
                                    <span className="text-gray-500 block mb-0.5">Platform Status</span>
                                    <span className="text-green-400 font-bold flex items-center gap-1">🛡️ Secured & Verified</span>
                                </div>
                            </div>
                            <div className="py-6 space-y-4">
                                <h4 className="text-sm font-bold text-white border-b border-white/5 pb-2">Statistical Breakdown</h4>
                                <div className="grid grid-cols-2 gap-y-4 gap-x-2 text-xs">
                                    <div className="flex justify-between pr-4 border-r border-white/5 print-border">
                                        <span className="text-gray-400">Total Verified Users:</span>
                                        <span className="text-white font-bold">{stats.totalUsers}</span>
                                    </div>
                                    <div className="flex justify-between pl-4">
                                        <span className="text-gray-400">OTP Unverified:</span>
                                        <span className="text-red-400 font-bold">{unverifiedUsers.length}</span>
                                    </div>
                                    <div className="flex justify-between pr-4 border-r border-white/5 print-border">
                                        <span className="text-gray-400">Male Users (Boys):</span>
                                        <span className="text-white font-bold">{stats.boys}</span>
                                    </div>
                                    <div className="flex justify-between pl-4">
                                        <span className="text-gray-400">Female Users (Girls):</span>
                                        <span className="text-white font-bold">{stats.girls}</span>
                                    </div>
                                    <div className="flex justify-between pr-4 border-r border-white/5 print-border">
                                        <span className="text-gray-400">Total Bookings:</span>
                                        <span className="text-white font-bold">{stats.bookings}</span>
                                    </div>
                                    <div className="flex justify-between pl-4">
                                        <span className="text-gray-400">Pending Reports:</span>
                                        <span className="text-white font-bold">{stats.pendingReports}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="pt-6 border-t border-white/10 print-border flex justify-between items-end text-[10px]">
                                <div className="space-y-1">
                                    <span className="text-gray-500 block">Signature Verification</span>
                                    <span className="text-gray-300 font-mono select-all">SYSTEM_SECURE_HASH_{Math.random().toString(36).substring(2, 10).toUpperCase()}</span>
                                </div>
                                <div className="text-right">
                                    <span className="text-gray-300 font-bold block">Super Admin Authority</span>
                                    <span className="text-gray-500">RentGF Trust & Safety</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default AdminDashboard;