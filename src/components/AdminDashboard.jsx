import React, { useState, useEffect } from "react";
import { PAGES } from "../App";

function AdminDashboard({ user, setPage }) {
    const [stats, setStats] = useState(null);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAdminData();
    }, []);

    const fetchAdminData = async () => {
        setLoading(true);
        try {
            const statsRes = await fetch("https://rentgf-and-bf.onrender.com/api/admin/stats");
            const usersRes = await fetch("https://rentgf-and-bf.onrender.com/api/admin/users");

            if (statsRes.ok) setStats(await statsRes.json());
            if (usersRes.ok) setUsers(await usersRes.json());
        } catch (err) {
            console.error("Error fetching admin data:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleKycUpdate = async (userId, status) => {
        try {
            const res = await fetch(`https://rentgf-and-bf.onrender.com/api/admin/kyc/${userId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status })
            });

            if (res.ok) {
                alert(`KYC marked as ${status}!`);
                fetchAdminData(); // Refresh data
            }
        } catch (err) {
            console.error(err);
            alert("Error updating KYC");
        }
    };

    if (loading || !stats) {
        return (
            <div className="min-h-[100dvh] bg-[#0D0D1A] flex items-center justify-center text-pink-500 animate-pulse text-xl font-bold">
                Loading Boss Mode... 👑
            </div>
        );
    }

    return (
        <div className="pt-24 pb-20 min-h-[100dvh] bg-[#0D0D1A] px-4 sm:px-6 max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-extrabold text-white flex items-center gap-2">
                        👑 Super Admin Panel
                    </h1>
                    <p className="text-gray-400 mt-1">Welcome Boss, here is what's happening on your app.</p>
                </div>
                <button onClick={() => setPage(PAGES.HOME)} className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition">
                    Go to Home
                </button>
            </div>

            {/* STATS CARDS */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
                <div className="bg-[#16162A] border border-white/10 rounded-2xl p-5 shadow-lg">
                    <div className="text-gray-400 text-sm mb-1">Total Users</div>
                    <div className="text-3xl font-bold text-white">{stats.totalUsers}</div>
                </div>
                <div className="bg-[#16162A] border border-pink-500/30 rounded-2xl p-5 shadow-lg">
                    <div className="text-pink-400 text-sm mb-1">Total Girls</div>
                    <div className="text-3xl font-bold text-pink-500">{stats.girls}</div>
                </div>
                <div className="bg-[#16162A] border border-blue-500/30 rounded-2xl p-5 shadow-lg">
                    <div className="text-blue-400 text-sm mb-1">Total Boys</div>
                    <div className="text-3xl font-bold text-blue-500">{stats.boys}</div>
                </div>
                <div className="bg-[#16162A] border border-yellow-500/30 rounded-2xl p-5 shadow-lg">
                    <div className="text-yellow-400 text-sm mb-1">Pending KYC</div>
                    <div className="text-3xl font-bold text-yellow-500">{stats.pendingKyc}</div>
                </div>
                <div className="bg-[#16162A] border border-white/10 rounded-2xl p-5 shadow-lg">
                    <div className="text-gray-400 text-sm mb-1">Total Posts</div>
                    <div className="text-3xl font-bold text-white">{stats.posts}</div>
                </div>
                <div className="bg-[#16162A] border border-purple-500/30 rounded-2xl p-5 shadow-lg">
                    <div className="text-purple-400 text-sm mb-1">Total Bookings</div>
                    <div className="text-3xl font-bold text-purple-500">{stats.bookings}</div>
                </div>
            </div>

            {/* USERS TABLE */}
            <div className="bg-[#16162A] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
                <div className="p-5 border-b border-white/10 bg-[#0D0D1A]">
                    <h2 className="text-xl font-bold text-white">Registered Users</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-gray-300">
                        <thead className="text-xs text-gray-400 uppercase bg-white/5">
                            <tr>
                                <th className="px-4 py-3">Name</th>
                                <th className="px-4 py-3">Role</th>
                                <th className="px-4 py-3">Contact</th>
                                <th className="px-4 py-3">KYC Status</th>
                                <th className="px-4 py-3">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {users.map((u) => (
                                <tr key={u.id} className="hover:bg-white/5 transition">
                                    <td className="px-4 py-3 font-medium text-white">{u.name}</td>
                                    <td className="px-4 py-3 uppercase text-xs">{u.role}</td>
                                    <td className="px-4 py-3">
                                        <div>{u.email}</div>
                                        <div className="text-xs text-gray-500">{u.phone}</div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-1 rounded text-xs font-bold ${u.kyc_status === 'verified' ? 'bg-green-500/20 text-green-400' :
                                                u.kyc_status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                                                    'bg-red-500/20 text-red-400'
                                            }`}>
                                            {u.kyc_status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        {u.kyc_status === 'pending' && u.id_proof_url && (
                                            <div className="flex gap-2">
                                                <a href={u.id_proof_url} target="_blank" rel="noreferrer" className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs hover:bg-blue-500/40">View ID</a>
                                                <button onClick={() => handleKycUpdate(u.id, 'verified')} className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs hover:bg-green-500/40">Approve</button>
                                                <button onClick={() => handleKycUpdate(u.id, 'rejected')} className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs hover:bg-red-500/40">Reject</button>
                                            </div>
                                        )}
                                        {u.kyc_status === 'verified' && (
                                            <span className="text-xs text-green-500">✅ Approved</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

export default AdminDashboard;