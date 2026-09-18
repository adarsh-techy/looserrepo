import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import {
  fetchMessages,
  sendChatMessage,
  markChatAsRead,
  addIncomingMessage,
  updateReadReceipts,
  resetUnreadCount,
} from '../store/slices/chatSlice';
import { getSocket } from '../services/socket';
import {
  Send,
  Check,
  CheckCheck,
  Shield,
  Sparkles,
  Lock,
  MessageSquare,
  User as UserIcon,
} from 'lucide-react';

export const MessagesPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const token = useSelector((state: RootState) => state.auth.token);
  const currentUser = useSelector((state: RootState) => state.auth.user);
  const { messages, partner, isLoading, isSending } = useSelector(
    (state: RootState) => state.chat
  );

  const [inputContent, setInputContent] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom
  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  // Initial fetch and mark as read
  useEffect(() => {
    dispatch(fetchMessages()).then((action: any) => {
      if (action.payload?.partner?.id) {
        dispatch(markChatAsRead({ senderId: action.payload.partner.id }));
      }
      dispatch(resetUnreadCount());
      setTimeout(() => scrollToBottom('auto'), 100);
    });
  }, [dispatch]);

  // WebSocket listeners for live messaging & read receipts
  useEffect(() => {
    if (!token) return;
    const socket = getSocket(token);
    if (!socket) return;

    const handleNewMessage = (msg: any) => {
      dispatch(addIncomingMessage(msg));
      // If message is from partner, mark as read immediately since user is on the chat page
      if (msg.senderId !== currentUser?.id) {
        dispatch(markChatAsRead({ senderId: msg.senderId }));
        dispatch(resetUnreadCount());
      }
      setTimeout(() => scrollToBottom('smooth'), 100);
    };

    const handleMessagesRead = (readData: any) => {
      dispatch(updateReadReceipts(readData));
    };

    socket.on('new_message', handleNewMessage);
    socket.on('messages_read', handleMessagesRead);

    // Fallback sync interval every 4 seconds while active on chat page
    const syncInterval = setInterval(() => {
      dispatch(fetchMessages());
      if (partner?.id) {
        dispatch(markChatAsRead({ senderId: partner.id }));
      }
    }, 4000);

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('messages_read', handleMessagesRead);
      clearInterval(syncInterval);
    };
  }, [token, dispatch, currentUser?.id, partner?.id]);

  // Scroll to bottom whenever messages array updates
  useEffect(() => {
    scrollToBottom('smooth');
  }, [messages.length]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputContent.trim() || isSending) return;

    const content = inputContent.trim();
    setInputContent('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    try {
      await dispatch(
        sendChatMessage({
          content,
          recipientId: partner?.id,
        })
      ).unwrap();
      setTimeout(() => scrollToBottom('smooth'), 100);
    } catch (err) {
      console.error('Failed to send message', err);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleQuickSend = (quickText: string) => {
    dispatch(sendChatMessage({ content: quickText, recipientId: partner?.id }));
  };

  // Quick reply suggestions
  const quickReplies = [
    '🔐 Vault items synced',
    '🛡️ Checked Secret Notes',
    '✅ Everything looks good & confirmed',
    '🚨 Urgent: please review security vault',
  ];

  const formatMessageTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatMessageDateGroup = (dateStr: string) => {
    const d = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    if (d.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (d.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    }
  };

  // Group messages by date
  const groupedMessages: { date: string; msgs: typeof messages }[] = [];
  messages.forEach((msg) => {
    const groupKey = formatMessageDateGroup(msg.createdAt);
    const lastGroup = groupedMessages[groupedMessages.length - 1];
    if (lastGroup && lastGroup.date === groupKey) {
      lastGroup.msgs.push(msg);
    } else {
      groupedMessages.push({ date: groupKey, msgs: [msg] });
    }
  });

  return (
    <div className="flex flex-col h-[calc(100vh-6.5rem)] max-w-5xl mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xl overflow-hidden animate-fade-in transition-all">
      {/* Top Partner Profile Bar */}
      <div className="px-5 py-3.5 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative shrink-0">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold flex items-center justify-center text-sm shadow-md shadow-blue-500/20">
              {partner?.avatar ? (
                <img
                  src={partner.avatar}
                  alt={partner.name}
                  className="w-full h-full rounded-2xl object-cover"
                />
              ) : partner?.name ? (
                partner.name.slice(0, 2).toUpperCase()
              ) : (
                <UserIcon className="w-5 h-5" />
              )}
            </div>
            {partner?.isOnline && (
              <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full shadow-xs" />
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-slate-900 dark:text-white text-base tracking-tight truncate">
                {partner?.name || (currentUser?.role === 'AD' ? 'Partner NS' : 'Partner AD')}
              </h2>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                  partner?.role === 'AD'
                    ? 'bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30'
                    : 'bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                }`}
              >
                {partner?.role || (currentUser?.role === 'AD' ? 'NS' : 'AD')}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1">
                <span
                  className={`w-2 h-2 rounded-full ${
                    partner?.isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                  }`}
                />
                {partner?.isOnline ? (
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                    Active in Vault
                  </span>
                ) : (
                  <span>Offline</span>
                )}
              </span>
              <span>•</span>
              <span className="truncate">{partner?.email}</span>
            </div>
          </div>
        </div>

        {/* Security badge */}
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 text-blue-700 dark:text-blue-300 text-xs font-medium shrink-0">
          <Lock className="w-3.5 h-3.5 text-blue-500 shrink-0" />
          <span>Encrypted Dual-Partner Channel</span>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-slate-50/50 dark:bg-slate-950/40">
        {/* Safe Channel Notice */}
        <div className="flex justify-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-200/70 dark:bg-slate-800/70 text-slate-600 dark:text-slate-400 text-[11px] font-medium backdrop-blur-xs border border-slate-300/40 dark:border-slate-700/50 shadow-2xs">
            <Shield className="w-3.5 h-3.5 text-blue-500" />
            Messages are delivered directly to your partner with delivery and read verification receipts.
          </div>
        </div>

        {isLoading && messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-slate-400">
            <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-xs font-medium">Loading conversation...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center px-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-3 shadow-inner">
              <MessageSquare className="w-7 h-7" />
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base">No messages yet</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1">
              Start a conversation with your partner. Messages feature real-time double grey ticks on delivery and double blue ticks when read.
            </p>
          </div>
        ) : (
          groupedMessages.map((group, gIdx) => (
            <div key={gIdx} className="space-y-3">
              {/* Date Group Header */}
              <div className="flex items-center justify-center my-2">
                <span className="px-3 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-semibold tracking-wide uppercase shadow-2xs">
                  {group.date}
                </span>
              </div>

              {/* Messages in Group */}
              {group.msgs.map((msg) => {
                const isMe = msg.senderId === currentUser?.id;

                return (
                  <div
                    key={msg.id}
                    className={`flex items-end gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}
                  >
                    {/* Partner Avatar for incoming */}
                    {!isMe && (
                      <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-slate-600 to-slate-800 text-white text-[10px] font-bold flex items-center justify-center shrink-0 mb-1 shadow-xs">
                        {msg.sender?.name ? msg.sender.name.slice(0, 2).toUpperCase() : 'P'}
                      </div>
                    )}

                    {/* Message Bubble */}
                    <div
                      className={`relative max-w-[82%] sm:max-w-[70%] rounded-2xl px-4 py-2.5 shadow-sm transition-all ${
                        isMe
                          ? 'bg-gradient-to-tr from-blue-600 to-indigo-600 text-white rounded-br-xs shadow-blue-500/10'
                          : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700/80 rounded-bl-xs shadow-xs'
                      }`}
                    >
                      {/* Message Content */}
                      <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap break-words font-normal">
                        {msg.content}
                      </p>

                      {/* Footer: Time & WhatsApp-Style Ticks */}
                      <div
                        className={`flex items-center justify-end gap-1.5 mt-1 select-none ${
                          isMe ? 'text-blue-100/80' : 'text-slate-400 dark:text-slate-500'
                        }`}
                      >
                        <span className="text-[10px] font-medium tracking-tight">
                          {formatMessageTime(msg.createdAt)}
                        </span>

                        {/* Ticks for Outgoing Messages */}
                        {isMe && (
                          <span
                            className="flex items-center"
                            title={
                              msg.isRead
                                ? `Read by partner at ${
                                    msg.readAt ? new Date(msg.readAt).toLocaleTimeString() : 'now'
                                  }`
                                : msg.isDelivered
                                ? 'Delivered to partner'
                                : 'Sent'
                            }
                          >
                            {msg.isRead ? (
                              // Double Blue Tick when seen by partner
                              <span className="flex items-center text-sky-300 drop-shadow-[0_0_6px_rgba(56,189,248,0.8)]">
                                <CheckCheck className="w-4 h-4 stroke-[2.5]" />
                              </span>
                            ) : msg.isDelivered ? (
                              // Double Grey Tick when delivered
                              <span className="flex items-center text-slate-300 dark:text-slate-300">
                                <CheckCheck className="w-4 h-4 stroke-[2]" />
                              </span>
                            ) : (
                              // Single Grey Tick when sent/delivered pending
                              <span className="flex items-center text-slate-300">
                                <Check className="w-3.5 h-3.5 stroke-[2]" />
                              </span>
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Replies Bar */}
      <div className="px-4 py-2 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0">
        <Sparkles className="w-3.5 h-3.5 text-blue-500 shrink-0" />
        <span className="text-[10px] uppercase font-bold text-slate-400 shrink-0">Quick:</span>
        {quickReplies.map((reply, index) => (
          <button
            key={index}
            onClick={() => handleQuickSend(reply)}
            disabled={isSending}
            className="px-2.5 py-1 text-[11px] font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 text-slate-700 dark:text-slate-300 rounded-lg whitespace-nowrap transition shadow-2xs hover:bg-blue-50 dark:hover:bg-blue-950/30"
          >
            {reply}
          </button>
        ))}
      </div>

      {/* Input Box Bar */}
      <div className="p-3 sm:p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shrink-0">
        <form onSubmit={handleSendMessage} className="flex items-end gap-2 sm:gap-3">
          <div className="relative flex-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 focus-within:border-blue-500 dark:focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 transition">
            <textarea
              ref={textareaRef}
              value={inputContent}
              onChange={(e) => {
                setInputContent(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
              }}
              onKeyDown={handleKeyDown}
              placeholder="Type a message to partner... (Press Enter to send)"
              rows={1}
              className="w-full px-4 py-2.5 bg-transparent text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 resize-none outline-none max-h-32"
            />
          </div>

          <button
            type="submit"
            disabled={!inputContent.trim() || isSending}
            className={`p-3 rounded-2xl font-bold flex items-center justify-center transition-all shrink-0 ${
              inputContent.trim() && !isSending
                ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-500/25 active:scale-95'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed'
            }`}
            title="Send message (Enter)"
          >
            {isSending ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
