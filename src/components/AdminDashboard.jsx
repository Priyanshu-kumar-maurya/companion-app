import React, { useState, useEffect } from "react";
import { PAGES } from "../App";

const API = "https://rentgf-and-bf.onrender.com/api";

function AdminDashboard({ user, setPage }) {
    const [stats, setStats] = useState(null);
    const [users, setUsers] = useState([]);
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("users");
    const [actionLoading, setActionLoading] = useState({});

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
        if (!window.confirm(`Delete ${name}? This is PERMANENT!`)) return;
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

    const statCards = [
        { label: "Total Users", value: stats.totalUsers, color: "text-white", border: "border-white/10" },
        { label: "Girls", value: stats.girls, color: "text-pink-400", border: "border-pink-500/30" },
        { label: "Boys", value: stats.boys, color: "text-blue-400", border: "border-blue-500/30" },
        { label: "Pending KYC", value: stats.pendingKyc, color: "text-yellow-400", border: "border-yellow-500/30" },
        { label: "Posts", value: stats.posts, color: "text-purple-400", border: "border-purple-500/30" },
        { label: "Bookings", value: stats.bookings, color: "text-green-400", border: "border-green-500/30" },
        { label: "Pending Reports", value: stats.pendingReports, color: "text-orange-400", border: "border-orange-500/30" },
        { label: "Frozen Accounts", value: stats.frozenUsers, color: "text-cyan-400", border: "border-cyan-500/30" },
    ];

    return (
        <div className="pt-24 pb-20 min-h-[100dvh] bg-[#0D0D1A] px-4 sm:px-6 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-extrabold text-white">⚡ Super Admin Panel</h1>
                    <p className="text-gray-400 mt-1 text-sm">Full control over users, accounts, and reports.</p>
                </div>
                <button onClick={() => setPage(PAGES.HOME)} className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition text-sm">
                    ← Home
                </button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
                {statCards.map(s => (
                    <div key={s.label} className={`bg-[#16162A] border ${s.border} rounded-2xl p-4 shadow-lg`}>
                        <div className="text-gray-400 text-xs mb-1">{s.label}</div>
                        <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                    </div>
                ))}
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-5 bg-[#16162A] p-1 rounded-xl border border-white/5 w-fit">
                <button
                    onClick={() => setActiveTab("users")}
                    className={`px-5 py-2 rounded-lg text-sm font-bold transition ${activeTab === "users" ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                >
                    👥 Users ({users.length})
                </button>
                <button
                    onClick={() => setActiveTab("reports")}
                    className={`px-5 py-2 rounded-lg text-sm font-bold transition relative ${activeTab === "reports" ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                >
                    🚩 Reports
                    {stats.pendingReports > 0 && (
                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                            {stats.pendingReports}
                        </span>
                    )}
                </button>
            </div>

            {/* ── USERS TAB ── */}
            {activeTab === "users" && (
                <div className="bg-[#16162A] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
                    <div className="overflow-x-auto">
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
                                {users.map((u) => (
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
                                                {u.is_frozen && <span className="text-[10px] bg-cyan-500/20 text-cyan-400 px-1.5 py-0.5 rounded font-bold w-fit">❄️ Frozen</span>}
                                                {u.is_platform_blocked && <span className="text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded font-bold w-fit">🚫 Blocked</span>}
                                                {!u.is_frozen && !u.is_platform_blocked && <span className="text-[10px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded font-bold w-fit">✅ Active</span>}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${u.kyc_status === 'verified' ? 'bg-green-500/20 text-green-400' : u.kyc_status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'}`}>
                                                {u.kyc_status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-wrap gap-1">
                                                {/* KYC actions */}
                                                {u.kyc_status === 'pending' && u.id_proof_url && (
                                                    <>
                                                        <a href={u.id_proof_url} target="_blank" rel="noreferrer" className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs hover:bg-blue-500/40">ID</a>
                                                        <button onClick={() => handleKycUpdate(u.id, 'verified')} disabled={actionLoading[`kyc_${u.id}`]} className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs hover:bg-green-500/40 disabled:opacity-50">✓ OK</button>
                                                        <button onClick={() => handleKycUpdate(u.id, 'rejected')} disabled={actionLoading[`kyc_${u.id}`]} className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs hover:bg-red-500/40 disabled:opacity-50">✗ No</button>
                                                    </>
                                                )}
                                                {/* Freeze */}
                                                <button
                                                    onClick={() => handleFreeze(u.id, !u.is_frozen)}
                                                    disabled={actionLoading[`freeze_${u.id}`]}
                                                    className={`px-2 py-1 rounded text-xs disabled:opacity-50 ${u.is_frozen ? 'bg-cyan-500/30 text-cyan-300 hover:bg-cyan-500/50' : 'bg-slate-500/20 text-slate-300 hover:bg-slate-500/40'}`}
                                                >
                                                    {u.is_frozen ? '🔥 Unfreeze' : '❄️ Freeze'}
                                                </button>
                                                {/* Platform block */}
                                                <button
                                                    onClick={() => handlePlatformBlock(u.id, !u.is_platform_blocked)}
                                                    disabled={actionLoading[`block_${u.id}`]}
                                                    className={`px-2 py-1 rounded text-xs disabled:opacity-50 ${u.is_platform_blocked ? 'bg-green-500/20 text-green-400 hover:bg-green-500/40' : 'bg-orange-500/20 text-orange-400 hover:bg-orange-500/40'}`}
                                                >
                                                    {u.is_platform_blocked ? '✅ Unblock' : '🚫 Block'}
                                                </button>
                                                {/* Delete */}
                                                <button
                                                    onClick={() => handleDeleteUser(u.id, u.name)}
                                                    disabled={actionLoading[`del_${u.id}`]}
                                                    className="px-2 py-1 bg-red-900/30 text-red-400 rounded text-xs hover:bg-red-900/60 disabled:opacity-50"
                                                >
                                                    🗑️
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ── REPORTS TAB ── */}
            {activeTab === "reports" && (
                <div className="space-y-3">
                    {reports.length === 0 && (
                        <div className="bg-[#16162A] border border-white/5 rounded-2xl p-10 text-center text-gray-500">
                            No reports yet. Platform is clean! ✅
                        </div>
                    )}
                    {reports.map(r => (
                        <div key={r.id} className="bg-[#16162A] border border-white/10 rounded-2xl p-4 shadow-lg">
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex-1">
                                    {/* Reporter → Reported */}
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
                                        <span className="px-2 py-0.5 bg-orange-500/20 text-orange-300 rounded-full text-xs font-bold">{r.reason}</span>
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${r.status === 'pending' ? 'bg-yellow-500/20 text-yellow-300' : r.status === 'reviewed' ? 'bg-green-500/20 text-green-300' : 'bg-gray-500/20 text-gray-400'}`}>
                                            {r.status}
                                        </span>
                                    </div>
                                    {r.description && <p className="text-gray-400 text-xs mt-1">"{r.description}"</p>}
                                    <p className="text-gray-600 text-[10px] mt-1">{new Date(r.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                                </div>

                                {/* Actions */}
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
                                        <button onClick={() => handlePlatformBlock(r.reported_id, true)} disabled={actionLoading[`block_${r.reported_id}`]} className="px-3 py-1.5 bg-red-500/20 text-red-400 rounded-lg text-xs font-bold hover:bg-red-500/40 disabled:opacity-50">
                                            🚫 Block User
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default AdminDashboard;