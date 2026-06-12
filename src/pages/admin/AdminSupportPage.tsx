/* eslint-disable react-hooks/set-state-in-effect, @typescript-eslint/no-explicit-any */
import React, { useEffect, useState, useRef } from 'react';
import { supportService } from '../../services/supportService';
import type { SupportChat, SupportMessage } from '../../types';
import { Button } from '../../components/Button';
import { Loader } from '../../components/Loader';
import { MessageSquare, Send } from 'lucide-react';

export const AdminSupportPage: React.FC = () => {
  const [chats, setChats] = useState<SupportChat[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1. Subscribe to support chats list
  useEffect(() => {
    setLoadingChats(true);
    const unsubChats = supportService.onSupportChatsChange((fetchedChats) => {
      setChats(fetchedChats);
      setLoadingChats(false);
    });

    return () => unsubChats();
  }, []);

  // 2. Subscribe to messages when selected chat changes
  useEffect(() => {
    if (!selectedChatId) {
      setMessages([]);
      return;
    }

    setLoadingMessages(true);
    
    // Mark as read immediately when admin opens chat
    supportService.markChatAsReadByAdmin(selectedChatId);

    const unsubMessages = supportService.onSupportMessagesChange(selectedChatId, (fetchedMessages) => {
      setMessages(fetchedMessages);
      setLoadingMessages(false);
      
      // Auto-scroll to bottom
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 50);
    });

    return () => unsubMessages();
  }, [selectedChatId]);

  // 3. Keep marking as read if new messages arrive while viewing the chat
  useEffect(() => {
    if (!selectedChatId || messages.length === 0) return;
    supportService.markChatAsReadByAdmin(selectedChatId);
  }, [selectedChatId, messages]);

  const activeChat = chats.find((c) => c.id === selectedChatId);

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChatId || !inputText.trim() || sending || !activeChat) return;

    const replyText = inputText.trim();
    setInputText('');
    setSending(true);

    try {
      await supportService.sendMessage(
        selectedChatId,
        replyText,
        'admin',
        'admin',
        activeChat.userName
      );
    } catch (err) {
      console.error('Failed to send reply:', err);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 h-[calc(100vh-140px)]">
      {/* Title */}
      <div className="mb-4">
        <h1 className="text-xl font-extrabold text-textPrimary uppercase tracking-wider">Support Communications Hub</h1>
        <p className="text-[10px] text-textSecondary font-semibold uppercase tracking-widest block mt-1">Real-time terminal answering client requests and desk logs</p>
      </div>

      {/* Main split inbox desk */}
      <div className="flex-1 flex flex-col md:flex-row border border-borderCustom rounded-card overflow-hidden bg-surface shadow-2xl">
        
        {/* Left Side: Ticket Threads List (40% width on md+) */}
        <div className="w-full md:w-80 border-r border-borderCustom flex flex-col bg-bgMain/10 shrink-0">
          <div className="p-4 border-b border-borderCustom/60 bg-bgMain/30 flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-textPrimary uppercase tracking-widest">Active Conversations</span>
            <span className="text-[9px] font-bold font-mono text-goldAccent bg-goldAccent/10 px-2 py-0.5 rounded border border-goldAccent/20">
              {chats.filter((c) => c.unreadByAdmin).length} UNREAD
            </span>
          </div>

          <div className="flex-grow overflow-y-auto divide-y divide-borderCustom/40">
            {loadingChats ? (
              <div className="p-8 text-center flex justify-center">
                <Loader variant="inline" />
              </div>
            ) : chats.length === 0 ? (
              <div className="p-8 text-center text-textSecondary text-[10px] uppercase tracking-wider">
                No support tickets found in system queue.
              </div>
            ) : (
              chats.map((chat) => {
                const isSelected = chat.id === selectedChatId;
                const date = chat.lastMessageAt instanceof Date ? chat.lastMessageAt : (chat.lastMessageAt as any)?.toDate?.() || new Date();
                return (
                  <div
                    key={chat.id}
                    onClick={() => setSelectedChatId(chat.id)}
                    className={`p-4 flex items-start justify-between gap-3 cursor-pointer select-none transition-all duration-200 border-l-2 ${
                      isSelected
                        ? 'bg-goldAccent/5 border-goldAccent border-l-2'
                        : 'border-transparent bg-transparent hover:bg-bgMain/20'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-textPrimary block truncate">{chat.userName}</span>
                        {chat.unreadByAdmin && (
                          <span className="h-2 w-2 rounded-full bg-danger shrink-0 inline-block" />
                        )}
                      </div>
                      <p className="text-[10px] text-textSecondary font-medium truncate mt-1">
                        {chat.lastMessage}
                      </p>
                      <span className="text-[8px] text-textSecondary/60 font-mono mt-2 block">
                        {date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Message Tunnel Stream */}
        <div className="flex-grow flex flex-col min-w-0 bg-bgMain/5">
          {selectedChatId && activeChat ? (
            <div className="flex-1 flex flex-col min-h-0">
              {/* Active Header bar */}
              <div className="px-6 py-4 bg-bgMain/30 border-b border-borderCustom/60 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-full bg-goldAccent/10 border border-goldAccent/30 text-goldAccent flex items-center justify-center font-bold text-xs uppercase select-none">
                    {activeChat.userName.substring(0, 2)}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-textPrimary uppercase tracking-wider block">{activeChat.userName}</span>
                    <span className="text-[8px] text-textSecondary font-mono block uppercase">Client ID: {activeChat.id}</span>
                  </div>
                </div>
                <div className="text-[9px] font-bold uppercase tracking-widest text-textSecondary bg-borderCustom/40 border border-borderCustom px-2.5 py-1 rounded select-none">
                  SECURE CHAT NODE
                </div>
              </div>

              {/* Message History list */}
              <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
                {loadingMessages ? (
                  <div className="flex-grow flex items-center justify-center">
                    <Loader variant="inline" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex-grow flex items-center justify-center text-center text-textSecondary text-[10px] uppercase tracking-wider">
                    Empty conversation history.
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isUser = msg.senderRole === 'user';
                    const msgDate = msg.createdAt instanceof Date ? msg.createdAt : (msg.createdAt as any)?.toDate?.() || new Date();
                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col max-w-[75%] ${
                          isUser ? 'self-start items-start' : 'self-end items-end'
                        }`}
                      >
                        {/* Sender Tag */}
                        <span className="text-[8px] font-bold text-textSecondary uppercase tracking-widest mb-1 px-1">
                          {isUser ? activeChat.userName : 'Support Team (You)'}
                        </span>

                        {/* Bubble */}
                        <div
                          className={`px-4 py-3 rounded-card text-xs font-medium leading-relaxed ${
                            isUser
                              ? 'bg-bgMain border border-borderCustom text-textPrimary rounded-tl-none'
                              : 'bg-goldAccent text-bgMain font-semibold rounded-tr-none'
                          }`}
                        >
                          {msg.message}
                        </div>

                        {/* Time */}
                        <span className="text-[8px] text-textSecondary/60 font-mono mt-1 px-1">
                          {msgDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Reply box form */}
              <form onSubmit={handleSendReply} className="p-4 bg-bgMain/30 border-t border-borderCustom/60 shrink-0">
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder={`Reply to ${activeChat.userName} details...`}
                    disabled={sending}
                    className="flex-grow min-h-[44px] h-11 px-4 rounded-[8px] bg-bgMain border border-borderCustom text-textPrimary text-xs font-semibold tracking-wide focus:outline-none focus:border-goldAccent focus:shadow-[0_0_10px_rgba(201,168,76,0.05)] disabled:opacity-50"
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
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center max-w-sm mx-auto p-6">
              <div className="h-12 w-12 rounded-full border border-borderCustom bg-borderCustom/20 flex items-center justify-center mb-4 text-goldAccent">
                <MessageSquare className="w-5 h-5" />
              </div>
              <h3 className="text-xs font-extrabold text-textPrimary uppercase tracking-wider">No Conversation Selected</h3>
              <p className="text-[9px] text-textSecondary uppercase tracking-widest mt-2 leading-relaxed">
                Select an active conversation panel on the left navigation column to begin real-time answering transmission.
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default AdminSupportPage;
