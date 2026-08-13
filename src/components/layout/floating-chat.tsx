'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { MessageCircle, X, Send, ChevronLeft, Plus, Search, Users, Check, Paperclip, Download, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';
import type { Chat, ChatMessage, ChatUser } from '@/types';

const POLL_INTERVAL = 4000;

export function FloatingChatWidget() {
  const { data: session } = useSession();
  const currentUserId = (session?.user as any)?.id;

  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<'list' | 'chat' | 'new-chat'>('list');
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageText, setMessageText] = useState('');
  const [chatSearch, setChatSearch] = useState('');
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [sending, setSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // New Chat fields
  const [userSearch, setUserSearch] = useState('');
  const [searchResults, setSearchResults] = useState<ChatUser[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<ChatUser[]>([]);
  const [newChatSubject, setNewChatSubject] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const selectedChat = chats.find((c) => c.id === selectedChatId);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  }, []);

  const fetchChats = useCallback(async () => {
    if (!currentUserId) return;
    try {
      const res = await fetch('/api/messaging/chats');
      if (res.ok) {
        const data = await res.json();
        setChats(data);
      }
    } catch (_) {}
  }, [currentUserId]);

  const fetchMessages = useCallback(async (chatId: string) => {
    try {
      const res = await fetch(`/api/messaging/chats/${chatId}/messages`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
        scrollToBottom();
      }
    } catch (_) {}
  }, [scrollToBottom]);

  // Fetch lists on open
  useEffect(() => {
    if (session) {
      fetchChats();
    }
  }, [session, fetchChats]);

  // Poll for new messages when open
  useEffect(() => {
    if (session && isOpen) {
      pollRef.current = setInterval(() => {
        fetchChats();
        if (selectedChatId && view === 'chat') {
          fetchMessages(selectedChatId);
        }
      }, POLL_INTERVAL);

      return () => {
        if (pollRef.current) clearInterval(pollRef.current);
      };
    }
  }, [session, isOpen, selectedChatId, view, fetchChats, fetchMessages]);

  useEffect(() => {
    if (selectedChatId && view === 'chat') {
      fetchMessages(selectedChatId);
    }
  }, [selectedChatId, view, fetchMessages]);

  // Search users for new chat
  const searchUsers = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    try {
      const res = await fetch(`/api/messaging/users?search=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.filter((u: ChatUser) => u.id !== currentUserId));
      }
    } catch (_) {}
  }, [currentUserId]);

  useEffect(() => {
    const timer = setTimeout(() => searchUsers(userSearch), 300);
    return () => clearTimeout(timer);
  }, [userSearch, searchUsers]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setPendingFiles((prev) => [...prev, ...Array.from(e.target.files || [])]);
    }
  };

  const removePendingFile = (idx: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSend = async () => {
    const hasText = messageText.trim().length > 0;
    const hasFiles = pendingFiles.length > 0;
    if ((!hasText && !hasFiles) || !selectedChatId || sending) return;

    setSending(true);
    setUploadingFiles(true);

    let uploadedAttachments: any[] = [];

    if (hasFiles) {
      for (const file of pendingFiles) {
        const formData = new FormData();
        formData.append('file', file);
        try {
          const res = await fetch('/api/messaging/upload', {
            method: 'POST',
            body: formData,
          });
          if (res.ok) {
            const data = await res.json();
            uploadedAttachments.push(data);
          } else {
            toast(`Failed to upload ${file.name}`, 'error');
          }
        } catch {
          toast(`Network error uploading ${file.name}`, 'error');
        }
      }
    }

    setUploadingFiles(false);
    const content = messageText.trim();
    setMessageText('');
    setPendingFiles([]);

    const optimistic: ChatMessage = {
      id: `temp-${Date.now()}`,
      chatId: selectedChatId,
      senderId: currentUserId,
      content: content || '(file)',
      attachments: uploadedAttachments.length > 0 ? uploadedAttachments : undefined,
      createdAt: new Date().toISOString(),
      sender: {
        id: currentUserId,
        name: session?.user?.name || 'Me',
        email: session?.user?.email || '',
      },
    };

    setMessages((prev) => [...prev, optimistic]);
    scrollToBottom();

    try {
      const res = await fetch(`/api/messaging/chats/${selectedChatId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          attachments: uploadedAttachments.length > 0 ? uploadedAttachments : undefined,
        }),
      });

      if (res.ok) {
        const saved = await res.json();
        setMessages((prev) =>
          prev.map((m) => (m.id === optimistic.id ? saved : m))
        );
        fetchChats();
      } else {
        setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      }
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
    } finally {
      setSending(false);
    }
  };

  const handleCreateChat = async (user: ChatUser) => {
    try {
      const res = await fetch('/api/messaging/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participantIds: [user.id],
          subject: null,
        }),
      });

      if (res.ok) {
        const chat = await res.json();
        setChats((prev) => [chat, ...prev]);
        setSelectedChatId(chat.id);
        setView('chat');
        setUserSearch('');
        setSearchResults([]);
        toast(`Conversation with ${user.name} started`, 'success');
      }
    } catch (_) {
      toast('Failed to start chat', 'error');
    }
  };

  const totalUnread = chats.reduce((sum, c) => sum + (c.unreadCount || 0), 0);

  const getChatDisplayName = (chat: Chat): string => {
    if (chat.subject) return chat.subject;
    return chat.participants
      .filter((p) => p.user.id !== currentUserId)
      .map((p) => p.user.name)
      .join(', ') || 'Chat';
  };

  if (!session) return null;

  return (
    <>
      {/* Floating Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-500 hover:bg-slate-100 hover:text-mine-blue-600 rounded-lg transition-colors flex items-center justify-center"
        title="Messenger"
      >
        <MessageCircle className="h-5 w-5" />
        {totalUnread > 0 && (
          <span className="absolute top-1.5 right-1.5 h-2.5 w-2.5 rounded-full bg-red-500 border border-white" />
        )}
      </button>

      {/* Floating Chat Window */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 w-[360px] h-[480px] bg-white rounded-2xl shadow-2xl border border-slate-200/80 z-50 flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 duration-200">
          {/* Header */}
          <div className="bg-gradient-to-r from-mine-blue-800 to-indigo-900 text-white px-4 py-3 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-indigo-200" />
              <span className="font-semibold text-sm">Mineazy Hub Messenger</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-white/10 rounded transition-colors text-slate-200 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* View: Chats List */}
          {view === 'list' && (
            <div className="flex-1 flex flex-col min-h-0 bg-slate-50/50">
              <div className="p-3 border-b border-slate-100 bg-white flex gap-2 items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search chats..."
                    value={chatSearch}
                    onChange={(e) => setChatSearch(e.target.value)}
                    className="w-full text-xs pl-8 pr-2 py-1.5 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-mine-blue-500"
                  />
                </div>
                <Button
                  size="sm"
                  onClick={() => setView('new-chat')}
                  className="h-8 text-xs font-semibold"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  New
                </Button>
              </div>

              <div className="flex-1 overflow-y-auto divide-y divide-slate-100 bg-white">
                {chats
                  .filter((c) =>
                    getChatDisplayName(c)
                      .toLowerCase()
                      .includes(chatSearch.toLowerCase())
                  )
                  .map((chat) => {
                    const isUnread = (chat.unreadCount || 0) > 0;
                    const counterpart = chat.participants.find(
                      (p) => p.user.id !== currentUserId
                    )?.user;

                    return (
                      <button
                        key={chat.id}
                        onClick={() => {
                          setSelectedChatId(chat.id);
                          setView('chat');
                        }}
                        className={cn(
                          'w-full px-4 py-3 text-left hover:bg-slate-50 transition-colors flex items-center justify-between',
                          isUnread && 'bg-blue-50/30'
                        )}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar name={counterpart?.name || 'U'} size="sm" />
                          <div className="min-w-0">
                            <p className={cn("text-xs truncate font-medium", isUnread ? "text-slate-900 font-bold" : "text-slate-700")}>
                              {getChatDisplayName(chat)}
                            </p>
                            <p className="text-[10px] text-slate-400 truncate mt-0.5">
                              {chat.lastMessage?.content || 'No messages yet'}
                            </p>
                          </div>
                        </div>
                        {isUnread && (
                          <Badge variant="destructive" className="text-[9px] px-1.5 py-0.5 rounded-full">
                            {chat.unreadCount}
                          </Badge>
                        )}
                      </button>
                    );
                  })}
                {chats.length === 0 && (
                  <div className="text-center py-12 text-slate-400 text-xs">
                    No active chats found
                  </div>
                )}
              </div>
            </div>
          )}

          {/* View: Active Chat */}
          {view === 'chat' && (
            <div className="flex-1 flex flex-col min-h-0 bg-slate-50">
              {/* Back Bar */}
              <div className="px-3 py-2 border-b border-slate-200 bg-white flex items-center gap-2">
                <button
                  onClick={() => {
                    setView('list');
                    fetchChats();
                  }}
                  className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-800"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-800 truncate">
                    {selectedChat ? getChatDisplayName(selectedChat) : 'Chat'}
                  </p>
                </div>
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {messages.map((msg) => {
                  const isOwn = msg.senderId === currentUserId;
                  return (
                    <div
                      key={msg.id}
                      className={cn('flex', isOwn ? 'justify-end' : 'justify-start')}
                    >
                      <div
                        className={cn(
                          'max-w-[80%] rounded-xl px-3 py-1.5 text-xs shadow-sm',
                          isOwn
                            ? 'bg-mine-blue-700 text-white rounded-br-none'
                            : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none'
                        )}
                      >
                        {!isOwn && (
                          <p className="text-[9px] font-bold text-mine-blue-600 mb-0.5">
                            {msg.sender.name}
                          </p>
                        )}
                        {msg.content && <p className="whitespace-pre-wrap break-words">{msg.content}</p>}
                        {msg.attachments && msg.attachments.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {msg.attachments.map((att: any, idx: number) => (
                              <a
                                key={att.id || `att-${idx}`}
                                href={att.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={cn(
                                  "flex items-center gap-1.5 p-1.5 rounded-lg border text-[10px] hover:underline",
                                  isOwn 
                                    ? "bg-white/10 border-white/20 text-white" 
                                    : "bg-slate-50 border-slate-200 text-slate-700"
                                )}
                              >
                                <FileText className="h-3 w-3 flex-shrink-0" />
                                <span className="truncate flex-1 max-w-[140px]">{att.name}</span>
                                <Download className="h-3 w-3 flex-shrink-0 opacity-70" />
                              </a>
                            ))}
                          </div>
                        )}
                        <p className={cn("text-[8px] text-right mt-1", isOwn ? "text-indigo-200" : "text-slate-400")}>
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="p-2 border-t border-slate-200 bg-white">
                {pendingFiles.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2 px-2 max-h-[80px] overflow-y-auto">
                    {pendingFiles.map((file, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-1.5 rounded bg-slate-100 border border-slate-200 px-2 py-1 text-[10px] text-slate-600"
                      >
                        <span className="truncate max-w-[100px]">{file.name}</span>
                        <button
                          onClick={() => removePendingFile(idx)}
                          className="hover:bg-slate-200 rounded-full p-0.5"
                        >
                          <X className="h-2.5 w-2.5 text-slate-400" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-1.5 items-center">
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={sending || uploadingFiles}
                    className="p-1.5 hover:bg-slate-100 rounded text-slate-400 disabled:opacity-50"
                    title="Attach file"
                  >
                    <Paperclip className="h-4 w-4" />
                  </button>
                  <input
                    type="text"
                    placeholder={uploadingFiles ? "Uploading..." : "Type message..."}
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSend();
                    }}
                    className="flex-1 text-xs px-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-mine-blue-500 bg-slate-50"
                    disabled={sending || uploadingFiles}
                  />
                  <Button
                    size="icon"
                    onClick={handleSend}
                    disabled={(!messageText.trim() && pendingFiles.length === 0) || sending || uploadingFiles}
                    className="h-8 w-8 rounded-md bg-mine-blue-800 hover:bg-mine-blue-900 text-white flex items-center justify-center disabled:opacity-50"
                  >
                    <Send className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* View: Create New Chat */}
          {view === 'new-chat' && (
            <div className="flex-1 flex flex-col min-h-0 bg-slate-50">
              <div className="px-3 py-2 border-b border-slate-200 bg-white flex items-center gap-2">
                <button
                  onClick={() => setView('list')}
                  className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-800"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <p className="text-xs font-semibold text-slate-800">New Conversation</p>
              </div>

              <div className="p-3 bg-white border-b border-slate-100">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="w-full text-xs pl-8 pr-2 py-1.5 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-mine-blue-500"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto bg-white divide-y divide-slate-100">
                {searchResults.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => handleCreateChat(user)}
                    className="w-full px-4 py-2.5 text-left hover:bg-slate-50 transition-colors flex items-center gap-3"
                  >
                    <Avatar name={user.name} size="sm" />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-slate-800 truncate">{user.name}</p>
                      <p className="text-[10px] text-slate-400 truncate">{user.email}</p>
                    </div>
                  </button>
                ))}
                {userSearch.trim() && searchResults.length === 0 && (
                  <div className="text-center py-12 text-slate-400 text-xs">
                    No users found
                  </div>
                )}
                {!userSearch.trim() && (
                  <div className="text-center py-12 text-slate-400 text-xs">
                    Type a name to search users
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
