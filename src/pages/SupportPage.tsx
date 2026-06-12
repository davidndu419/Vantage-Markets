/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supportService } from '../services/supportService';
import type { SupportMessage } from '../types';
import { Button } from '../components/Button';
import { Loader } from '../components/Loader';
import { Send, MessageSquare, ShieldCheck, ArrowLeft } from 'lucide-react';

export const SupportPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, userProfile } = useAuth();
  
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1. Subscribe to support messages real-time
  useEffect(() => {
    if (!user) return;

    // Defer to avoid synchronous setState inside effect
    Promise.resolve().then(() => setLoading(true));
    
    // Clear unread flag for user
    supportService.markChatAsReadByUser(user.uid);

    const unsubMessages = supportService.onSupportMessagesChange(user.uid, (fetchedMessages) => {
      setMessages(fetchedMessages);
      setLoading(false);
      // Scroll to bottom
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    });

    return () => unsubMessages();
  }, [user]);

  // 2. Mark as read when messages update (in case new messages arrive while on page)
  useEffect(() => {
    if (!user || messages.length === 0) return;
    supportService.markChatAsReadByUser(user.uid);
  }, [user, messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !inputText.trim() || sending) return;

    const msgText = inputText.trim();
    setInputText('');
    setSending(true);

    try {
      const name = userProfile?.name || 'Trader';
      await supportService.sendMessage(user.uid, msgText, user.uid, 'user', name);
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col relative h-[calc(100vh-190px)] md:h-[calc(100vh-140px)] overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 h-96 w-96 bg-goldAccent/3 rounded-full blur-[100px] pointer-events-none" />

      {/* Main Support Workspace */}
      <div className="w-full flex-1 flex flex-col overflow-hidden z-10">
        
        {/* Chat window panel */}
        <div className="flex-1 bg-surface border border-borderCustom rounded-card flex flex-col overflow-hidden shadow-2xl">
          
          {/* Header info bar */}
          <div className="px-6 py-4 bg-bgMain/60 border-b border-borderCustom/60 flex items-center justify-between select-none">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(-1)}
                className="mr-2 p-2 rounded-btn bg-borderCustom/40 border border-borderCustom hover:border-goldAccent text-textSecondary hover:text-goldAccent transition-all flex items-center justify-center cursor-pointer"
                title="Go Back"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div className="relative">
                <div className="h-10 w-10 rounded-full bg-goldAccent/10 border border-goldAccent/30 flex items-center justify-center text-goldAccent">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-success ring-2 ring-surface" />
              </div>
              <div>
                <h2 className="text-xs font-extrabold text-textPrimary uppercase tracking-wider">Premium Support Node</h2>
                <span className="text-[9px] text-textSecondary font-semibold uppercase tracking-widest block mt-0.5">Connected directly to live desk</span>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-textSecondary bg-borderCustom/40 border border-borderCustom px-2.5 py-1 rounded">
              <ShieldCheck className="w-3.5 h-3.5 text-goldAccent" /> SECURE TUNNEL
            </div>
          </div>

          {/* Message Stream */}
          <div className="flex-grow overflow-y-auto p-6 flex flex-col gap-4">
            {loading ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader variant="inline" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center max-w-sm mx-auto">
                <div className="h-14 w-14 rounded-full bg-borderCustom/40 text-goldAccent flex items-center justify-center border border-borderCustom mb-4 select-none">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-textPrimary uppercase tracking-wider">Start a Conversation</h3>
                <p className="text-[10px] text-textSecondary mt-2 leading-relaxed">
                  Transmit a message below to establish connection with our support desk operators.
                </p>
              </div>
            ) : (
              messages.map((msg) => {
                const isUser = msg.senderRole === 'user';
                const date = msg.createdAt instanceof Date ? msg.createdAt : (msg.createdAt as any).toDate();
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col max-w-[75%] ${
                      isUser ? 'self-end items-end' : 'self-start items-start'
                    }`}
                  >
                    {/* Sender Identity label */}
                    <span className="text-[8px] font-bold text-textSecondary uppercase tracking-widest mb-1 px-1 select-none">
                      {isUser ? 'You' : 'Support Team'}
                    </span>

                    {/* Chat Bubble */}
                    <div
                      className={`px-4 py-3 rounded-card text-xs font-medium leading-relaxed ${
                        isUser
                          ? 'bg-goldAccent text-bgMain font-semibold rounded-tr-none shadow-md'
                          : 'bg-bgMain border border-borderCustom text-textPrimary rounded-tl-none'
                      }`}
                    >
                      {msg.message}
                    </div>

                    {/* Message Timestamp */}
                    <span className="text-[8px] text-textSecondary/60 font-mono mt-1 px-1 select-none">
                      {date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Form input field */}
          <form onSubmit={handleSend} className="p-4 bg-bgMain/40 border-t border-borderCustom/60 shrink-0">
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Type your message details here..."
                disabled={sending}
                className="flex-grow min-h-[44px] h-11 px-4 rounded-[8px] bg-bgMain border border-borderCustom text-textPrimary text-xs font-semibold tracking-wide transition-all focus:outline-none focus:border-goldAccent focus:shadow-[0_0_10px_rgba(201,168,76,0.05)] disabled:opacity-50"
              />
              <Button
                type="submit"
                variant="primary"
                className="h-11 w-11 p-0 flex items-center justify-center shrink-0"
                disabled={!inputText.trim() || sending}
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </form>

        </div>

      </div>
    </div>
  );
};

export default SupportPage;
