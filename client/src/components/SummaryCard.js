import React, { useState } from 'react';
import { Trash2, CheckCircle, Reply, Loader, Send, X, AlertCircle } from 'lucide-react';
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
        <div className="glass-card transition-all duration-300 hover:shadow-xl hover:shadow-indigo-100/40 relative overflow-hidden group">
            {/* Header */}
            <div className="flex justify-between items-start mb-4 pb-3 border-b border-slate-200/50">
                <div className="flex-1 pr-4">
                    <h3 className="text-lg font-bold text-slate-800 mb-1 leading-tight group-hover:text-indigo-600 transition-colors">
                        {Subject || 'No Subject'}
                    </h3>
                    <p className="text-sm font-medium text-slate-500">From: <span className="text-slate-700">{From || 'Unknown'}</span></p>
                </div>

                {/* Quick Actions (Always visible) */}
                {!isReplying && (
                    <div className="flex gap-1 shrink-0">
                        <button
                            onClick={() => handleAction('mark_read', () => onMarkRead(id))}
                            disabled={loadingAction === 'mark_read'}
                            title="Mark as Read"
                            className="p-2 rounded-full hover:bg-green-50 text-slate-400 hover:text-green-500 transition-colors"
                        >
                            {loadingAction === 'mark_read' ? <Loader className="animate-spin" size={18} /> : <CheckCircle size={18} />}
                        </button>
                        <button
                            onClick={() => handleAction('trash', () => onTrash(id))}
                            disabled={loadingAction === 'trash'}
                            title="Move to Trash"
                            className="p-2 rounded-full hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                        >
                            {loadingAction === 'trash' ? <Loader className="animate-spin" size={18} /> : <Trash2 size={18} />}
                        </button>
                    </div>
                )}
            </div>

            {/* Summary Body */}
            <div className="mb-5 text-slate-600 leading-relaxed text-[15px]">
                {Summary}
            </div>

            {/* Action / Recommendation Zone */}
            {(RecommendedAction || ReplyContent || isReplying) && (
                <div className={`p-4 rounded-xl border transition-all ${isReplying || RecommendedAction === 'reply' ? 'bg-indigo-50/50 border-indigo-100' : 'bg-amber-50/50 border-amber-100'}`}>

                    {/* Recommendation Header */}
                    {!isReplying && RecommendedAction && (
                        <div className="flex items-center gap-2 mb-3">
                            <AlertCircle size={16} className={RecommendedAction === 'trash' ? 'text-red-500' : 'text-amber-500'} />
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                Recommendation:
                            </span>
                            <span className="text-sm font-bold text-slate-700">
                                {RecommendedAction === 'trash' && "Delete this email"}
                                {RecommendedAction === 'reply' && "Send a reply"}
                                {RecommendedAction === 'mark_as_read' && "Mark as read"}
                            </span>
                        </div>
                    )}

                    {/* Reply Editing Interface */}
                    {isReplying ? (
                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="flex justify-between items-center mb-2">
                                <strong className="text-indigo-600 text-sm">Drafting Reply</strong>
                                <button onClick={() => setIsReplying(false)} className="text-slate-400 hover:text-slate-600">
                                    <X size={16} />
                                </button>
                            </div>
                            <textarea
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                className="w-full min-h-[100px] p-3 rounded-lg bg-white border border-indigo-100 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 focus:outline-none text-slate-700 text-sm mb-3 resize-y font-sans shadow-sm"
                                placeholder="Write your reply..."
                                autoFocus
                            />
                            <button
                                onClick={() => handleAction('reply', () => onReply(id, replyText))}
                                disabled={loadingAction === 'reply'}
                                className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-all shadow-md shadow-indigo-200"
                            >
                                {loadingAction === 'reply' ? <Loader className="animate-spin" size={16} /> : <Send size={16} />}
                                Send Reply
                            </button>
                        </div>
                    ) : (
                        /* Static Actions */
                        <div className="space-y-3">
                            {ReplyContent && RecommendedAction === 'reply' && (
                                <div className="bg-white/80 p-3 rounded-lg border border-indigo-50/50">
                                    <span className="text-xs font-bold text-indigo-400 block mb-1">DRAFT REPLY</span>
                                    <p className="text-sm text-slate-600 italic">"{ReplyContent}"</p>

                                    <button
                                        onClick={startReply}
                                        className="mt-3 w-full py-2 px-4 bg-white border border-indigo-200 text-indigo-600 hover:bg-indigo-50 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors"
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
                                    className="w-full py-2 px-4 bg-white border border-red-200 text-red-500 hover:bg-red-50 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                                >
                                    {loadingAction === 'trash' ? <Loader className="animate-spin" size={16} /> : <Trash2 size={16} />}
                                    Confirm Delete
                                </button>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Show Original Toggle */}
            <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col">
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="self-start text-xs font-medium text-slate-400 hover:text-indigo-500 transition-colors flex items-center gap-1.5 py-1"
                >
                    {isExpanded ? (
                        <>Hide Original Email</>
                    ) : (
                        <>Show Original Email</>
                    )}
                </button>

                {isExpanded && (
                    <div className="mt-3 p-4 bg-slate-50 rounded-lg border border-slate-100 text-sm text-slate-700 overflow-y-auto max-h-96 shadow-inner font-mono leading-relaxed">
                        {content.BodyHtml ? (
                            <div
                                dangerouslySetInnerHTML={{
                                    __html: DOMPurify.sanitize(content.BodyHtml)
                                }}
                            />
                        ) : (
                            <div className="whitespace-pre-wrap">
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
