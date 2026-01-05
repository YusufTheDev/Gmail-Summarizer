import React, { useState, useEffect } from "react";
import { Sparkles, LogOut, RefreshCw, Trash2, CheckCircle, Mail, ShieldCheck, Activity, Clock, BarChart2 } from "lucide-react";
import Plot from 'react-plotly.js';
import SummaryCard from "./SummaryCard";
import "../App.css";
import logoIcon from "../assets/logo_icon.png";
import logoText from "../assets/logo_text.png";


const Dashboard = () => {
    const [summary, setSummary] = useState(null);
    const [globalSummary, setGlobalSummary] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [deletingAll, setDeletingAll] = useState(false);

    // Stats State
    const [stats, setStats] = useState(null);

    const getAuthParams = () => {
        const params = new URLSearchParams(window.location.search);
        return params.get("state");
    };

    // Fetch stats on mount
    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const res = await fetch("http://localhost:5000/api/stats");
            const data = await res.json();
            if (res.ok) setStats(data);
        } catch (err) {
            console.error("Failed to fetch stats:", err);
        }
    };

    const handleSummarize = async () => {
        setLoading(true);
        setError(null);
        setSummary(null);
        setGlobalSummary(null);

        try {
            const stateParam = getAuthParams();
            if (!stateParam) throw new Error("Session invalid. Please login again.");

            const res = await fetch(`http://localhost:5000/summarize?state=${stateParam}`, {
                credentials: "include",
            });
            const data = await res.json();

            if (!res.ok) throw new Error(data.error || "Failed to fetch summaries");

            if (data.emails) {
                setSummary(data.emails);
                if (data.global_summary) setGlobalSummary(data.global_summary);

                // Log usage
                logUsage(data.emails.length);
            } else if (data.summary) {
                setSummary([{ type: 'message', content: data.summary }]);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const logUsage = async (count) => {
        try {
            await fetch("http://localhost:5000/api/log_usage", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ emails_processed: count })
            });
            // Refresh stats to show new data
            fetchStats();
        } catch (err) {
            console.error("Failed to log usage:", err);
        }
    };

    // Existing handlers...
    const handleTrash = async (id) => {
        if (!id) return alert("Cannot perform action: Email ID missing");

        try {
            const stateParam = getAuthParams();
            const res = await fetch(`http://localhost:5000/action/trash?state=${stateParam}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            setSummary(prev => prev.filter(email => email.id !== id));
        } catch (err) {
            alert("Failed to trash email: " + err.message);
        }
    };

    const handleMarkRead = async (id) => {
        if (!id) return alert("Cannot perform action: Email ID missing");
        try {
            const stateParam = getAuthParams();
            const res = await fetch(`http://localhost:5000/action/mark_read?state=${stateParam}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            setSummary(prev => prev.filter(email => email.id !== id));
        } catch (err) {
            alert("Failed to mark read: " + err.message);
        }
    };

    const handleReply = async (id, replyContent) => {
        if (!id) return alert("Cannot perform action: Email ID missing");
        try {
            const stateParam = getAuthParams();
            const emailObj = summary.find(e => e.id === id);
            if (!emailObj) return;

            const res = await fetch(`http://localhost:5000/action/reply?state=${stateParam}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    to: emailObj.From,
                    subject: "Re: " + emailObj.Subject,
                    body: replyContent
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            alert("Reply sent!");
            setSummary(prev => prev.filter(email => email.id !== id));
        } catch (err) {
            alert("Failed to send reply: " + err.message);
        }
    };

    const handleDeleteAllTrash = async () => {
        if (!window.confirm("Are you sure you want to delete all 'Trash' items?")) return;

        setDeletingAll(true);
        const trashItems = summary.filter(item => item.RecommendedAction === 'trash');

        try {
            const promises = trashItems.map(item => handleTrash(item.id));
            await Promise.all(promises);
        } catch (err) {
            console.error("Error bulk deleting:", err);
            alert("Some items might not have been deleted.");
        } finally {
            setDeletingAll(false);
        }
    };

    const handleMarkAllRead = async () => {
        if (!window.confirm("Mark all filtered emails as read?")) return;
        const idsToMark = importantEmails.map(e => e.id);
        if (idsToMark.length === 0) return;

        try {
            const stateParam = getAuthParams();
            const res = await fetch(`http://localhost:5000/action/mark_all_read?state=${stateParam}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: idsToMark })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setSummary(prev => prev.filter(email => !idsToMark.includes(email.id)));
        } catch (err) {
            alert("Failed to mark all as read: " + err.message);
        }
    };

    const handleLogout = () => {
        window.location.href = "/";
    };

    // Derived State
    const isMessageOnly = summary && summary.length === 1 && summary[0].type === 'message';
    const trashEmails = summary && !isMessageOnly ? summary.filter(i => i.RecommendedAction === 'trash') : [];
    const importantEmails = summary && !isMessageOnly ? summary.filter(i => i.RecommendedAction !== 'trash') : [];
    const showWelcome = !summary && !loading && !error;

    return (
        <div className="w-full max-w-5xl mx-auto p-6 flex flex-col gap-8 animate-fade-in">

            {/* Header / Stats Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                <div className="cursor-pointer flex items-center gap-3" onClick={() => window.location.href = '/dashboard'}>
                    <img src={logoIcon} alt="NebulaFlux" className="w-10 h-10 object-contain" />
                    <img src={logoText} alt="NebulaFlux Text" className="h-8 object-contain" />
                </div>
                <div className="flex gap-2">
                    <button onClick={handleSummarize} disabled={loading} className="p-2 rounded-full hover:bg-slate-100 transition-colors text-slate-600 disabled:opacity-50">
                        <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
                    </button>
                    <button onClick={handleLogout} className="p-2 rounded-full hover:bg-slate-100 transition-colors text-slate-600">
                        <LogOut size={20} />
                    </button>
                </div>
            </div>

            {/* Stats Dashboard */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    {/* Stat Cards */}
                    <div className="glass-card p-4 flex flex-col items-center justify-center gap-2">
                        <Mail className="text-blue-400" size={24} />
                        <span className="text-3xl font-bold text-slate-800">{stats.total_emails_processed}</span>
                        <span className="text-xs text-slate-500 uppercase tracking-wider">Emails Processed</span>
                    </div>
                    <div className="glass-card p-4 flex flex-col items-center justify-center gap-2">
                        <Clock className="text-purple-400" size={24} />
                        <span className="text-3xl font-bold text-slate-800">{Math.round(stats.total_time_saved_minutes)}m</span>
                        <span className="text-xs text-slate-500 uppercase tracking-wider">Time Saved</span>
                    </div>
                    <div className="glass-card p-4 flex flex-col items-center justify-center gap-2">
                        <Activity className="text-green-400" size={24} />
                        <span className="text-3xl font-bold text-slate-800">{stats.productivity_score}</span>
                        <span className="text-xs text-slate-500 uppercase tracking-wider">Prod. Score</span>
                    </div>

                    {/* Graph Card - Spans 1 col on LG, maybe needs more space? Let's make it span full row below on small screens or 1.5 cols */}
                    <div className="glass-card p-2 flex items-center justify-center relative col-span-1 md:col-span-2 lg:col-span-1 overflow-hidden" style={{ minHeight: '140px' }}>
                        <div className="absolute inset-0 opacity-50 pointer-events-none">
                            <Plot
                                data={[
                                    {
                                        x: stats.graph_data.x,
                                        y: stats.graph_data.y,
                                        type: 'scatter',
                                        mode: 'lines+markers',
                                        marker: { color: '#A855F7' },
                                        line: { shape: 'spline', width: 3 },
                                        fill: 'tozeroy',
                                    },
                                ]}
                                layout={{
                                    autosize: true,
                                    margin: { l: 20, r: 20, t: 20, b: 20 },
                                    xaxis: { showgrid: false, zeroline: false, showticklabels: false },
                                    yaxis: { showgrid: false, zeroline: false, showticklabels: false },
                                    paper_bgcolor: 'rgba(0,0,0,0)',
                                    plot_bgcolor: 'rgba(0,0,0,0)',
                                    height: 140,
                                }}
                                config={{ displayModeBar: false, staticPlot: true }}
                                style={{ width: '100%', height: '100%' }}
                            />
                        </div>
                        <div className="relative z-10 text-center pointer-events-none">
                            <BarChart2 className="mx-auto mb-1 text-slate-400" size={16} />
                            <span className="text-xs font-semibold text-slate-500">7-Day Trend</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Content Area */}
            <div className="flex-grow">
                {showWelcome && (
                    <div className="text-center py-20 px-4 glass-card max-w-2xl mx-auto">
                        <div className="inline-flex p-4 rounded-full bg-indigo-50 text-soft-purple mb-6">
                            <Sparkles size={32} />
                        </div>
                        <h2 className="text-3xl font-bold text-slate-800 mb-4">Ready to declutter?</h2>
                        <p className="text-slate-500 mb-8 text-lg">
                            Let AI scan your unread emails and separate the important stuff from the noise.
                        </p>
                        <button
                            onClick={handleSummarize}
                            disabled={loading}
                            className="bg-slate-900 text-white px-8 py-3 rounded-full font-semibold shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all flex items-center gap-2 mx-auto disabled:opacity-70"
                        >
                            {loading ? <RefreshCw className="animate-spin" /> : <Sparkles size={18} />}
                            {loading ? "Analyzing..." : "Summarize My Emails"}
                        </button>
                    </div>
                )}

                {error && (
                    <div className="glass-card border-l-4 border-red-500 p-6 mb-8">
                        <h3 className="text-red-500 font-bold mb-2">Error</h3>
                        <p className="text-slate-600">{error}</p>
                        <a href="/" className="text-sm text-slate-400 underline mt-2 inline-block">Login again if needed</a>
                    </div>
                )}

                {loading && !summary && (
                    <div className="text-center py-20 text-slate-400">
                        <RefreshCw className="animate-spin mb-4 mx-auto" size={40} />
                        <p className="animate-pulse">Analyzing your inbox...</p>
                    </div>
                )}

                {isMessageOnly && (
                    <div className="glass-card text-center py-12 px-6 max-w-xl mx-auto">
                        <ShieldCheck size={48} className="mx-auto text-green-400 mb-4" />
                        <h3 className="text-xl font-bold text-slate-800 mb-2">All Caught Up!</h3>
                        <p className="text-slate-500">{summary[0].content}</p>
                    </div>
                )}

                {summary && !isMessageOnly && (
                    <div className="space-y-8">
                        {globalSummary && (
                            <div className="glass-card bg-gradient-to-br from-indigo-50/50 to-purple-50/50 border-indigo-100">
                                <h3 className="text-yellow-500 font-bold mb-3 flex items-center gap-2">
                                    <Sparkles size={20} /> Daily Briefing
                                </h3>
                                <p className="text-slate-700 leading-relaxed text-lg">{globalSummary}</p>
                            </div>
                        )}

                        {importantEmails.length > 0 ? (
                            <div>
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-blue-500 font-bold flex items-center gap-2 text-lg">
                                        <Mail size={20} /> Action Needed ({importantEmails.length})
                                    </h3>
                                    <button onClick={handleMarkAllRead} className="text-sm text-blue-500 hover:text-blue-600 font-medium bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100 transition-colors">
                                        Mark All Read
                                    </button>
                                </div>
                                <div className="space-y-4">
                                    {importantEmails.map(email => (
                                        <SummaryCard key={email.id} content={email} onTrash={handleTrash} onReply={handleReply} onMarkRead={handleMarkRead} />
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="glass-card text-center py-8 opacity-75">
                                <p>No important emails pending.</p>
                            </div>
                        )}

                        {trashEmails.length > 0 && (
                            <div className="pt-8 border-t border-slate-200/50">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-red-400 font-bold flex items-center gap-2 text-lg">
                                        <Trash2 size={20} /> Junk & Promotions ({trashEmails.length})
                                    </h3>
                                    <button onClick={handleDeleteAllTrash} disabled={deletingAll} className="text-sm text-red-400 hover:text-red-500 font-medium bg-red-50 px-3 py-1.5 rounded-lg border border-red-100 transition-colors flex items-center gap-2">
                                        {deletingAll && <Trash2 className="animate-spin" size={14} />}
                                        Delete All
                                    </button>
                                </div>
                                <div className="space-y-4 opacity-80">
                                    {trashEmails.map(email => (
                                        <SummaryCard key={email.id} content={email} onTrash={handleTrash} onReply={handleReply} onMarkRead={handleMarkRead} />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Dashboard;
