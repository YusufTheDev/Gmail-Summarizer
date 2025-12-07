import React, { useState } from "react";
import { Sparkles, LogOut, RefreshCw, Trash2, CheckCircle, Mail, ShieldCheck } from "lucide-react";
import SummaryCard from "./SummaryCard";
import "../App.css";

const Dashboard = () => {
    const [summary, setSummary] = useState(null);
    const [globalSummary, setGlobalSummary] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [deletingAll, setDeletingAll] = useState(false);

    const getAuthParams = () => {
        const params = new URLSearchParams(window.location.search);
        return params.get("state");
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
            } else if (data.summary) {
                setSummary([{ type: 'message', content: data.summary }]);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

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

    // Determine if special message
    const isMessageOnly = summary && summary.length === 1 && summary[0].type === 'message';

    // Filter Lists
    const trashEmails = summary && !isMessageOnly ? summary.filter(i => i.RecommendedAction === 'trash') : [];
    const importantEmails = summary && !isMessageOnly ? summary.filter(i => i.RecommendedAction !== 'trash') : [];

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

    const showWelcome = !summary && !loading && !error;

    return (
        <div className="dashboard-container">
            <header className="glass-card dashboard-header">
                <h2>Your Inbox Summary</h2>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                        onClick={handleSummarize}
                        disabled={loading}
                        className="action-btn"
                        title="Refresh"
                        style={{ background: 'rgba(255,255,255,0.1)', boxShadow: 'none' }}
                    >
                        <RefreshCw size={18} className={loading ? "loading-spinner" : ""} />
                    </button>
                    <button onClick={handleLogout} className="action-btn" style={{ background: 'rgba(255,255,255,0.1)', boxShadow: 'none' }}>
                        <LogOut size={18} />
                    </button>
                </div>
            </header>

            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                {showWelcome && (
                    <div className="glass-card" style={{ padding: '60px 40px', maxWidth: '600px', margin: '40px auto' }}>
                        <div style={{ marginBottom: '20px', color: '#a78bfa' }}>
                            <Sparkles size={60} />
                        </div>
                        <h3>Ready to declutter?</h3>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '30px', fontSize: '1.1rem' }}>
                            Let AI scan your unread emails and separate the important stuff from the noise.
                        </p>
                        <button
                            onClick={handleSummarize}
                            disabled={loading}
                            className="action-btn"
                            style={{ margin: '0 auto', fontSize: '1.1rem', padding: '12px 24px' }}
                        >
                            {loading ? "Analyzing..." : "Summarize My Emails"}
                        </button>
                    </div>
                )}
            </div>

            {error && (
                <div className="glass-card" style={{ borderLeft: '4px solid #ef4444' }}>
                    <p style={{ color: '#ef4444' }}>{error}</p>
                    <p style={{ marginTop: '10px', fontSize: '0.9rem' }}>
                        Please <a href="/" style={{ color: '#fff', textDecoration: 'underline' }}>Login again</a> to refresh your session.
                    </p>
                </div>
            )}

            {loading && !summary && (
                <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
                    <RefreshCw className="loading-spinner" size={40} style={{ marginBottom: '20px', opacity: 0.5 }} />
                    <p>Scanning your inbox...</p>
                </div>
            )}

            {isMessageOnly && (
                <div className="glass-card" style={{ padding: '60px 40px', textAlign: 'center', maxWidth: '600px', margin: '20px auto' }}>
                    <div style={{ marginBottom: '20px', color: '#34d399' }}>
                        <ShieldCheck size={60} />
                    </div>
                    <h3>All Caught Up!</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>
                        {summary[0].content || "No unread emails found."}
                    </p>
                </div>
            )}

            {summary && !isMessageOnly && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>

                    {/* Global Summary Card */}
                    {globalSummary && (
                        <div className="glass-card" style={{ background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)', border: '1px solid rgba(255,255,255,0.2)' }}>
                            <h3 style={{ color: '#fbbf24', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <Sparkles size={20} />
                                Daily Briefing
                            </h3>
                            <p style={{ lineHeight: '1.6', fontSize: '1.05rem', color: '#e2e8f0' }}>{globalSummary}</p>
                        </div>
                    )}

                    {/* Important Section */}
                    {importantEmails.length > 0 ? (
                        <div className="summary-section">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                                <h3 style={{ color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <Mail size={20} />
                                    Action Needed ({importantEmails.length})
                                </h3>
                                <button
                                    onClick={handleMarkAllRead}
                                    className="action-btn"
                                    style={{
                                        fontSize: '0.8rem',
                                        padding: '6px 12px',
                                        background: 'rgba(56, 189, 248, 0.15)',
                                        border: '1px solid rgba(56, 189, 248, 0.3)',
                                        color: '#38bdf8',
                                        boxShadow: 'none'
                                    }}
                                >
                                    <CheckCircle size={16} />
                                    Mark All Read
                                </button>
                            </div>

                            <div className="summary-list" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                {importantEmails.map((item) => (
                                    <SummaryCard
                                        key={item.id}
                                        content={item}
                                        onTrash={handleTrash}
                                        onReply={handleReply}
                                        onMarkRead={handleMarkRead}
                                    />
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="glass-card" style={{ textAlign: 'center', padding: '30px', opacity: 0.8 }}>
                            <p>No important emails pending. You're doing great!</p>
                        </div>
                    )}

                    {/* Trash Section */}
                    {trashEmails.length > 0 && (
                        <div className="summary-section" style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '30px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                                <h3 style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <Trash2 size={20} />
                                    Junk & Promotions ({trashEmails.length})
                                </h3>
                                <button
                                    onClick={handleDeleteAllTrash}
                                    disabled={deletingAll}
                                    className="action-btn"
                                    style={{
                                        background: 'rgba(239, 68, 68, 0.2)',
                                        border: '1px solid rgba(239, 68, 68, 0.4)',
                                        color: '#fca5a5',
                                        fontSize: '0.9rem',
                                        padding: '8px 16px',
                                        boxShadow: 'none'
                                    }}
                                >
                                    {deletingAll && <Trash2 className="loading-spinner" size={16} />}
                                    Delete All
                                </button>
                            </div>

                            <div className="summary-list" style={{ display: 'flex', flexDirection: 'column', gap: '20px', opacity: 0.8 }}>
                                {trashEmails.map((item) => (
                                    <SummaryCard
                                        key={item.id}
                                        content={item}
                                        onTrash={handleTrash}
                                        onReply={handleReply}
                                        onMarkRead={handleMarkRead}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default Dashboard;
