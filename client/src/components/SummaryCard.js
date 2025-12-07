import React, { useState } from 'react';
import { Trash2, CheckCircle, Reply, Loader, Send, X } from 'lucide-react';
import DOMPurify from 'dompurify';
import '../App.css';

const SummaryCard = ({ content, onTrash, onReply, onMarkRead }) => {
    const [loadingAction, setLoadingAction] = useState(null);
    const [isReplying, setIsReplying] = useState(false);
    const [replyText, setReplyText] = useState("");
    const [isExpanded, setIsExpanded] = useState(false);

    if (typeof content === 'string') {
        return (
            <div className="glass-card">
                <div className="summary-content">{content}</div>
            </div>
        );
    }

    const { id, Subject, From, Summary, RecommendedAction, ReplyContent } = content;

    // Initialize reply text if needed
    const startReply = () => {
        setReplyText(ReplyContent || "");
        setIsReplying(true);
    };

    const handleAction = async (actionType, callback) => {
        setLoadingAction(actionType);
        try {
            await callback();
            if (actionType === 'reply') {
                setIsReplying(false);
            }
        } catch (error) {
            console.error("Action failed", error);
        } finally {
            setLoadingAction(null);
        }
    };

    return (
        <div className="glass-card" style={{ textAlign: 'left', position: 'relative', overflow: 'hidden' }}>
            <div style={{ marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <div style={{ flex: 1, paddingRight: '1rem' }}>
                    <h3 style={{ fontSize: '1.2rem', color: '#fff', marginBottom: '0.2rem' }}>{Subject || 'No Subject'}</h3>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>From: {From || 'Unknown'}</p>
                </div>

                {/* Quick Actions (Always visible) */}
                {!isReplying && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                            onClick={() => handleAction('mark_read', () => onMarkRead(id))}
                            disabled={loadingAction === 'mark_read'}
                            title="Mark as Read"
                            style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
                        >
                            {loadingAction === 'mark_read' ? <Loader className="loading-spinner" size={20} /> : <CheckCircle size={20} />}
                        </button>
                        <button
                            onClick={() => handleAction('trash', () => onTrash(id))}
                            disabled={loadingAction === 'trash'}
                            title="Move to Trash"
                            style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                        >
                            {loadingAction === 'trash' ? <Loader className="loading-spinner" size={20} /> : <Trash2 size={20} />}
                        </button>
                    </div>
                )}
            </div>

            <div className="summary-content" style={{ marginBottom: '1rem' }}>
                <p style={{ marginTop: '0.2rem' }}>{Summary}</p>
            </div>

            {(RecommendedAction || ReplyContent || isReplying) && (
                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>

                    {/* Recommendation Header */}
                    {!isReplying && RecommendedAction && (
                        <div style={{ marginBottom: ReplyContent ? '1rem' : 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div>
                                <strong style={{ color: '#fbbf24', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Recommendation:</strong>
                                <p style={{ fontSize: '0.95rem', marginTop: '0.2rem' }}>
                                    {RecommendedAction === 'trash' && "Delete this email"}
                                    {RecommendedAction === 'reply' && "Send a reply"}
                                    {RecommendedAction === 'mark_as_read' && "Mark as read"}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Reply Editing Interface */}
                    {isReplying ? (
                        <div style={{ animation: 'fadeIn 0.3s' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                <strong style={{ color: '#34d399' }}>Edit Reply</strong>
                                <button onClick={() => setIsReplying(false)} style={{ background: 'transparent', border: 'none', color: '#94a3b8' }}>
                                    <X size={16} />
                                </button>
                            </div>
                            <textarea
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                style={{
                                    width: '100%',
                                    minHeight: '100px',
                                    background: 'rgba(0,0,0,0.2)',
                                    border: '1px solid #34d399',
                                    color: 'white',
                                    borderRadius: '8px',
                                    padding: '8px',
                                    marginBottom: '10px',
                                    fontFamily: 'inherit'
                                }}
                            />
                            <button
                                onClick={() => handleAction('reply', () => onReply(id, replyText))}
                                disabled={loadingAction === 'reply'}
                                className="action-btn"
                                style={{
                                    width: '100%',
                                    background: 'rgba(52, 211, 153, 0.2)',
                                    border: '1px solid rgba(52, 211, 153, 0.4)',
                                    color: '#34d399',
                                    boxShadow: 'none',
                                    justifyContent: 'center'
                                }}
                            >
                                {loadingAction === 'reply' ? <Loader className="loading-spinner" size={16} /> : <Send size={16} />}
                                Send Reply
                            </button>
                        </div>
                    ) : (
                        /* Static Recommendation Actions */
                        <>
                            {ReplyContent && RecommendedAction === 'reply' && (
                                <div>
                                    <div style={{ marginBottom: '10px' }}>
                                        <strong style={{ color: '#34d399', fontSize: '0.9rem' }}>Draft Reply:</strong>
                                        <p style={{ fontSize: '0.95rem', marginTop: '0.2rem', fontStyle: 'italic', opacity: 0.9 }}>"{ReplyContent}"</p>
                                    </div>

                                    <button
                                        onClick={startReply}
                                        className="action-btn"
                                        style={{
                                            width: '100%',
                                            background: 'rgba(52, 211, 153, 0.2)',
                                            border: '1px solid rgba(52, 211, 153, 0.4)',
                                            color: '#34d399',
                                            boxShadow: 'none',
                                            justifyContent: 'center'
                                        }}
                                    >
                                        <Reply size={16} />
                                        Review & Send
                                    </button>
                                </div>
                            )}
                            {RecommendedAction === 'trash' && (
                                <button
                                    onClick={() => handleAction('trash', () => onTrash(id))}
                                    disabled={loadingAction === 'trash'}
                                    className="action-btn"
                                    style={{
                                        width: '100%',
                                        marginTop: '10px',
                                        background: 'rgba(239, 68, 68, 0.2)',
                                        border: '1px solid rgba(239, 68, 68, 0.4)',
                                        color: '#fca5a5',
                                        boxShadow: 'none',
                                        justifyContent: 'center'
                                    }}
                                >
                                    {loadingAction === 'trash' ? <Loader className="loading-spinner" size={16} /> : <Trash2 size={16} />}
                                    Confirm Delete
                                </button>
                            )}
                        </>
                    )}
                </div>
            )}

            {/* Show Original Toggle */}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', marginTop: '1rem', paddingTop: '0.5rem' }}>
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}
                >
                    {isExpanded ? "Hide Original Email" : "Show Original Email"}
                </button>

                {isExpanded && (
                    <div style={{
                        marginTop: '10px',
                        padding: '15px',
                        background: '#fff', // White background for email readability
                        borderRadius: '4px',
                        fontSize: '1rem',
                        color: '#1a202c', // Dark text for readability
                        maxHeight: '400px',
                        overflowY: 'auto',
                        border: '1px solid rgba(255,255,255,0.1)'
                    }}>
                        {content.BodyHtml ? (
                            <div
                                dangerouslySetInnerHTML={{
                                    __html: DOMPurify.sanitize(content.BodyHtml)
                                }}
                            />
                        ) : (
                            <div style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
                                {content.Body || "No content available."}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default SummaryCard;
