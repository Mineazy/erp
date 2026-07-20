'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from '@/components/ui/toast';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogFooter } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import {
  MessageCircle,
  Send,
  Plus,
  Search,
  ChevronLeft,
  Users,
  CheckCheck,
  Paperclip,
  X,
  FileText,
  FileImage,
  FileArchive,
  FileSpreadsheet,
  File,
  Download,
  ImageIcon,
  UserPlus,
  LogOut,
  Settings,
  Trash2,
} from 'lucide-react';
import type { Chat, ChatMessage, ChatUser, ChatAttachment } from '@/types';

const POLL_INTERVAL = 3000;
const MAX_FILE_SIZE = 20 * 1024 * 1024;

export default function MessagingPage() {
  const { data: session } = useSession();
  const currentUserId = (session?.user as any)?.id;

  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageText, setMessageText] = useState('');
  const [chatSearch, setChatSearch] = useState('');
  const [loadingChats, setLoadingChats] = useState(true);
  const [sending, setSending] = useState(false);
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [searchResults, setSearchResults] = useState<ChatUser[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<ChatUser[]>([]);
  const [newChatSubject, setNewChatSubject] = useState('');
  const [creatingChat, setCreatingChat] = useState(false);
  const [showMobileList, setShowMobileList] = useState(true);

  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);

  const [groupInfoOpen, setGroupInfoOpen] = useState(false);
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  const [memberSearchResults, setMemberSearchResults] = useState<ChatUser[]>([]);
  const [addingMember, setAddingMember] = useState(false);
  const [leavingGroup, setLeavingGroup] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedChat = chats.find((c) => c.id === selectedChatId);

  const filteredChats = chats.filter((chat) => {
    if (!chatSearch) return true;
    const search = chatSearch.toLowerCase();
    if (chat.subject?.toLowerCase().includes(search)) return true;
    return chat.participants.some(
      (p) =>
        p.user.id !== currentUserId &&
        p.user.name.toLowerCase().includes(search),
    );
  });

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  }, []);

  const fetchChats = useCallback(async () => {
    try {
      const res = await fetch('/api/messaging/chats');
      if (res.ok) {
        const data = await res.json();
        setChats(data);
      }
    } catch {
      console.error('Failed to fetch chats');
    } finally {
      setLoadingChats(false);
    }
  }, []);

  const fetchMessages = useCallback(async (chatId: string) => {
    try {
      const res = await fetch(`/api/messaging/chats/${chatId}/messages`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
        scrollToBottom();
      }
    } catch {
      console.error('Failed to fetch messages');
    }
  }, [scrollToBottom]);

  useEffect(() => {
    fetchChats();
  }, [fetchChats]);

  useEffect(() => {
    if (selectedChatId) {
      fetchMessages(selectedChatId);
    }
  }, [selectedChatId, fetchMessages]);

  useEffect(() => {
    if (selectedChatId) {
      pollRef.current = setInterval(() => {
        fetchMessages(selectedChatId);
        fetchChats();
      }, POLL_INTERVAL);

      return () => {
        if (pollRef.current) clearInterval(pollRef.current);
      };
    }
  }, [selectedChatId, fetchMessages, fetchChats]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && selectedChatId) {
        fetchMessages(selectedChatId);
        fetchChats();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [selectedChatId, fetchMessages, fetchChats]);

  const selectChat = (chatId: string) => {
    setSelectedChatId(chatId);
    setShowMobileList(false);
    setPendingFiles([]);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const valid: File[] = [];
    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        toast(`${file.name} exceeds 20 MB limit`, 'warning');
        continue;
      }
      valid.push(file);
    }
    setPendingFiles((prev) => [...prev, ...valid]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removePendingFile = (index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return ImageIcon;
    if (type.includes('pdf')) return FileText;
    if (type.includes('spreadsheet') || type.includes('excel') || type.includes('csv')) return FileSpreadsheet;
    if (type.includes('zip') || type.includes('rar')) return FileArchive;
    if (type.includes('text') || type.includes('document') || type.includes('word')) return FileText;
    return File;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleSend = async () => {
    const hasText = messageText.trim().length > 0;
    const hasFiles = pendingFiles.length > 0;
    if ((!hasText && !hasFiles) || !selectedChatId || sending) return;

    setSending(true);
    setUploadingFiles(true);

    let uploadedAttachments: ChatAttachment[] = [];

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
            const err = await res.json().catch(() => ({ error: 'Upload failed' }));
            toast(`Failed to upload ${file.name}: ${err.error}`, 'error');
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
      sender: { id: currentUserId, name: (session?.user as any)?.name || '', email: (session?.user as any)?.email || '' },
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
          prev.map((m) => (m.id === optimistic.id ? saved : m)),
        );
        fetchChats();
      } else {
        setMessages((prev) => prev.filter((m) => m.id === optimistic.id));
        const err = await res.json().catch(() => ({ error: 'Failed to send' }));
        toast(err.error || 'Failed to send message', 'error');
      }
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      toast('Network error. Please try again.', 'error');
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

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
    } catch {
      console.error('Failed to search users');
    }
  }, [currentUserId]);

  useEffect(() => {
    const timer = setTimeout(() => searchUsers(userSearch), 300);
    return () => clearTimeout(timer);
  }, [userSearch, searchUsers]);

  const searchMembers = useCallback(async (query: string) => {
    if (!query.trim()) {
      setMemberSearchResults([]);
      return;
    }
    try {
      const res = await fetch(`/api/messaging/users?search=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        const existingUserIds = selectedChat?.participants.map((p: any) => p.userId) || [];
        setMemberSearchResults(
          data.filter((u: ChatUser) => u.id !== currentUserId && !existingUserIds.includes(u.id))
        );
      }
    } catch {
      console.error('Failed to search users for group');
    }
  }, [currentUserId, selectedChat]);

  useEffect(() => {
    const timer = setTimeout(() => searchMembers(memberSearch), 300);
    return () => clearTimeout(timer);
  }, [memberSearch, searchMembers]);

  const handleAddMember = async (user: ChatUser) => {
    if (!selectedChatId) return;
    setAddingMember(true);
    try {
      const res = await fetch(`/api/messaging/chats/${selectedChatId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });
      if (res.ok) {
        const updated = await res.json();
        setChats((prev) =>
          prev.map((c) => (c.id === selectedChatId ? { ...c, participants: updated.participants } : c))
        );
        fetchMessages(selectedChatId);
        setAddMemberOpen(false);
        setMemberSearch('');
        setMemberSearchResults([]);
        toast(`Added ${user.name} to the group`, 'success');
      } else {
        const err = await res.json().catch(() => ({ error: 'Failed to add member' }));
        toast(err.error || 'Failed to add member', 'error');
      }
    } catch {
      toast('Network error. Please try again.', 'error');
    } finally {
      setAddingMember(false);
    }
  };

  const handleLeaveGroup = async () => {
    if (!selectedChatId) return;
    if (!confirm('Are you sure you want to leave this group chat?')) return;
    setLeavingGroup(true);
    try {
      const res = await fetch(`/api/messaging/chats/${selectedChatId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setChats((prev) => prev.filter((c) => c.id !== selectedChatId));
        setSelectedChatId(null);
        setGroupInfoOpen(false);
        toast('You left the group chat', 'success');
      } else {
        const err = await res.json().catch(() => ({ error: 'Failed to leave group' }));
        toast(err.error || 'Failed to leave group', 'error');
      }
    } catch {
      toast('Network error. Please try again.', 'error');
    } finally {
      setLeavingGroup(false);
    }
  };

  const handleRemoveMember = async (targetUserId: string, targetName: string) => {
    if (!selectedChatId) return;
    if (!confirm(`Are you sure you want to remove ${targetName} from the group?`)) return;
    try {
      const res = await fetch(`/api/messaging/chats/${selectedChatId}?userId=${targetUserId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setChats((prev) =>
          prev.map((c) =>
            c.id === selectedChatId
              ? { ...c, participants: c.participants.filter((p: any) => p.userId !== targetUserId) }
              : c
          )
        );
        fetchMessages(selectedChatId);
        toast(`Removed ${targetName} from the group`, 'success');
      } else {
        const err = await res.json().catch(() => ({ error: 'Failed to remove member' }));
        toast(err.error || 'Failed to remove member', 'error');
      }
    } catch {
      toast('Network error. Please try again.', 'error');
    }
  };

  const toggleUser = (user: ChatUser) => {
    setSelectedUsers((prev) =>
      prev.find((u) => u.id === user.id)
        ? prev.filter((u) => u.id !== user.id)
        : [...prev, user],
    );
  };

  const handleCreateChat = async () => {
    if (selectedUsers.length === 0) return;

    setCreatingChat(true);
    try {
      const res = await fetch('/api/messaging/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participantIds: selectedUsers.map((u) => u.id),
          subject: newChatSubject || null,
        }),
      });

      if (res.ok) {
        const chat = await res.json();
        setChats((prev) => [chat, ...prev]);
        setSelectedChatId(chat.id);
        setShowMobileList(false);
        setNewChatOpen(false);
        setSelectedUsers([]);
        setUserSearch('');
        setNewChatSubject('');
        setSearchResults([]);
        toast('Chat created successfully', 'success');
      } else {
        const err = await res.json().catch(() => ({ error: 'Failed to create chat' }));
        toast(err.error || 'Failed to create chat', 'error');
      }
    } catch {
      toast('Network error. Please try again.', 'error');
    } finally {
      setCreatingChat(false);
    }
  };

  const getChatDisplayName = (chat: Chat): string => {
    if (chat.subject) return chat.subject;
    return chat.participants
      .filter((p) => p.user.id !== currentUserId)
      .map((p) => p.user.name)
      .join(', ') || 'Chat';
  };

  const getChatParticipants = (chat: Chat): ChatUser[] => {
    return chat.participants
      .filter((p) => p.user.id !== currentUserId)
      .map((p) => p.user);
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    if (days === 1) return 'Yesterday';
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const formatMessageDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getLastMsgPreview = (chat: Chat): string => {
    const last = chat.lastMessage;
    if (!last) return 'No messages yet';
    const prefix = last.sender.id === currentUserId ? 'You: ' : '';
    const hasAttachments = last.attachments && last.attachments.length > 0;
    const attachLabel = hasAttachments ? `[${last.attachments!.length} attachment(s)]` : '';
    const text = last.content && last.content !== '(file)' ? last.content : '';
    return `${prefix}${attachLabel} ${text}`.trim();
  };

  if (loadingChats) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-10rem)]">
        <div className="text-slate-500">Loading messages...</div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-10rem)]">
      <Card className="h-full overflow-hidden">
        <div className="flex h-full">
          {/* Chat List */}
          <div
            className={cn(
              'w-full sm:w-80 lg:w-96 border-r border-slate-200 flex flex-col',
              !showMobileList && 'hidden sm:flex',
            )}
          >
            <div className="p-4 border-b border-slate-200">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                  <MessageCircle className="h-5 w-5 text-mine-blue-800" />
                  Messages
                </h2>
                <Button size="sm" onClick={() => setNewChatOpen(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  New Chat
                </Button>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search conversations..."
                  value={chatSearch}
                  onChange={(e) => setChatSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-mine-blue-500"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {filteredChats.length === 0 ? (
                <div className="p-6 text-center text-slate-400">
                  <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">No conversations yet</p>
                  <p className="text-xs mt-1">Start a new chat to begin</p>
                </div>
              ) : (
                filteredChats.map((chat) => {
                  const isSelected = chat.id === selectedChatId;
                  const participants = getChatParticipants(chat);
                  const lastMsg = chat.lastMessage;
                  const isUnread = (chat.unreadCount || 0) > 0;

                  return (
                    <button
                      key={chat.id}
                      onClick={() => selectChat(chat.id)}
                      className={cn(
                        'w-full px-4 py-3 text-left border-b border-slate-100 hover:bg-slate-50 transition-colors',
                        isSelected && 'bg-mine-blue-50',
                        isUnread && 'bg-blue-50/50',
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0">
                          {participants.length === 1 ? (
                            <Avatar name={participants[0]?.name || 'U'} size="sm" />
                          ) : (
                            <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center">
                              <Users className="h-4 w-4 text-slate-500" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-slate-900 truncate">
                              {getChatDisplayName(chat)}
                            </span>
                            {lastMsg && (
                              <span className="text-xs text-slate-400 flex-shrink-0 ml-2">
                                {formatTime(lastMsg.createdAt)}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center justify-between mt-0.5">
                            <span className="text-xs text-slate-500 truncate">
                              {getLastMsgPreview(chat)}
                            </span>
                            {isUnread && (
                              <Badge variant="destructive" className="ml-2 flex-shrink-0 text-[10px] px-1.5 py-0">
                                {chat.unreadCount}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Chat View */}
          <div
            className={cn(
              'flex-1 flex flex-col',
              showMobileList && 'hidden sm:flex',
            )}
          >
            {selectedChat ? (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b border-slate-200 flex items-center gap-3">
                  <button
                    onClick={() => setShowMobileList(true)}
                    className="sm:hidden p-1 hover:bg-slate-100 rounded"
                  >
                    <ChevronLeft className="h-5 w-5 text-slate-500" />
                  </button>
                  {selectedChat.participants.filter((p) => p.user.id !== currentUserId).length === 1 ? (
                    <Avatar
                      name={selectedChat.participants.find((p) => p.user.id !== currentUserId)?.user.name || 'U'}
                      size="sm"
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center">
                      <Users className="h-4 w-4 text-slate-500" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-slate-900 truncate">
                      {getChatDisplayName(selectedChat)}
                    </h3>
                    <p className="text-xs text-slate-500 truncate">
                      {getChatParticipants(selectedChat).map((u) => u.name).join(', ')}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setGroupInfoOpen(true)}
                    className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-950 font-semibold"
                  >
                    <Settings className="h-4 w-4" />
                    <span className="hidden sm:inline">Group Info</span>
                  </Button>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
                  {messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-sm text-slate-400">No messages yet. Start a conversation!</p>
                    </div>
                  ) : (
                    messages.map((msg, idx) => {
                      const isOwn = msg.senderId === currentUserId;
                      const showAvatar =
                        idx === 0 ||
                        messages[idx - 1]?.senderId !== msg.senderId;
                      const hasAttachments = msg.attachments && msg.attachments.length > 0;

                      const isSystemMessage = msg.content && (
                        (msg.content.includes('added ') && msg.content.includes(' to the group')) ||
                        msg.content === 'left the group' ||
                        (msg.content.includes('removed ') && msg.content.includes(' from the group'))
                      );

                      if (isSystemMessage) {
                        return (
                          <div key={msg.id} className="flex justify-center my-2.5">
                            <div className="bg-slate-200/60 text-slate-500 rounded-full px-3 py-1 text-[10px] font-semibold border border-slate-300/40">
                              <span className="font-bold text-slate-700">{msg.sender.name}</span> {msg.content}
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={msg.id}
                          className={cn(
                            'flex gap-2',
                            isOwn ? 'justify-end' : 'justify-start',
                          )}
                        >
                          {!isOwn && showAvatar && (
                            <div className="flex-shrink-0 self-end">
                              <Avatar name={msg.sender.name} size="sm" />
                            </div>
                          )}
                          {!isOwn && !showAvatar && (
                            <div className="w-8 flex-shrink-0" />
                          )}
                          <div
                            className={cn(
                              'max-w-[75%] rounded-2xl px-4 py-2 space-y-2',
                              isOwn
                                ? 'bg-mine-blue-800 text-white rounded-br-sm'
                                : 'bg-white border border-slate-200 text-slate-900 rounded-bl-sm',
                            )}
                          >
                            {!isOwn && showAvatar && (
                              <p className="text-[11px] font-medium text-mine-blue-600 mb-0.5">
                                {msg.sender.name}
                              </p>
                            )}

                            {msg.content && msg.content !== '(file)' && (
                              <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                            )}

                            {hasAttachments && (
                              <div className={cn('space-y-2', !isOwn && 'mt-1')}>
                                {msg.attachments!.map((att, attIdx) => {
                                  const isImage = att.type.startsWith('image/');
                                  const FileIcon = getFileIcon(att.type);

                                  return (
                                    <a
                                      key={attIdx}
                                      href={att.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className={cn(
                                        'flex items-center gap-3 rounded-lg p-2 transition-colors',
                                        isOwn
                                          ? 'bg-blue-900/40 hover:bg-blue-900/60'
                                          : 'bg-slate-100 hover:bg-slate-200',
                                      )}
                                    >
                                      {isImage ? (
                                        <div className="h-10 w-10 rounded overflow-hidden flex-shrink-0 bg-slate-200">
                                          <img
                                            src={att.url}
                                            alt={att.name}
                                            className="h-full w-full object-cover"
                                          />
                                        </div>
                                      ) : (
                                        <div className={cn(
                                          'h-10 w-10 rounded flex items-center justify-center flex-shrink-0',
                                          isOwn ? 'bg-blue-800' : 'bg-slate-200',
                                        )}>
                                          <FileIcon className={cn(
                                            'h-5 w-5',
                                            isOwn ? 'text-blue-200' : 'text-slate-500',
                                          )} />
                                        </div>
                                      )}
                                      <div className="flex-1 min-w-0">
                                        <p className={cn(
                                          'text-xs font-medium truncate',
                                          isOwn ? 'text-white' : 'text-slate-900',
                                        )}>
                                          {att.name}
                                        </p>
                                        <p className={cn(
                                          'text-[10px]',
                                          isOwn ? 'text-blue-200' : 'text-slate-400',
                                        )}>
                                          {formatFileSize(att.size)}
                                        </p>
                                      </div>
                                      <Download className={cn(
                                        'h-4 w-4 flex-shrink-0',
                                        isOwn ? 'text-blue-200' : 'text-slate-400',
                                      )} />
                                    </a>
                                  );
                                })}
                              </div>
                            )}

                            <div
                              className={cn(
                                'flex items-center justify-end gap-1',
                                isOwn ? 'text-blue-200' : 'text-slate-400',
                              )}
                            >
                              <span className="text-[10px] leading-none">
                                {formatMessageDate(msg.createdAt)}
                              </span>
                              {isOwn && (
                                <CheckCheck className="h-3 w-3" />
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="p-4 border-t border-slate-200">
                  {pendingFiles.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {pendingFiles.map((file, idx) => {
                        const FileIcon = getFileIcon(file.type);
                        const isImage = file.type.startsWith('image/');
                        const previewUrl = isImage ? URL.createObjectURL(file) : null;

                        return (
                          <div
                            key={idx}
                            className={cn(
                              'flex items-center gap-2 rounded-lg px-3 py-2 text-xs',
                              'bg-slate-100 border border-slate-200',
                            )}
                          >
                            {previewUrl ? (
                              <img src={previewUrl} alt="" className="h-8 w-8 rounded object-cover" />
                            ) : (
                              <FileIcon className="h-5 w-5 text-slate-500" />
                            )}
                            <div className="min-w-0 max-w-[120px]">
                              <p className="truncate text-slate-700 font-medium">{file.name}</p>
                              <p className="text-slate-400">{formatFileSize(file.size)}</p>
                            </div>
                            <button
                              onClick={() => removePendingFile(idx)}
                              className="p-0.5 hover:bg-slate-200 rounded flex-shrink-0"
                            >
                              <X className="h-3.5 w-3.5 text-slate-400" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <div className="flex gap-2">
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
                      className="h-10 w-10 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors flex-shrink-0 disabled:opacity-50"
                      title="Attach file"
                    >
                      <Paperclip className="h-5 w-5 text-slate-400" />
                    </button>
                    <input
                      type="text"
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={uploadingFiles ? 'Uploading files...' : 'Type a message...'}
                      className="flex-1 h-10 px-4 text-sm border border-slate-200 rounded-full focus:outline-none focus:ring-2 focus:ring-mine-blue-500 bg-slate-50"
                      disabled={sending || uploadingFiles}
                    />
                    <Button
                      size="icon"
                      onClick={handleSend}
                      disabled={(!messageText.trim() && pendingFiles.length === 0) || sending || uploadingFiles}
                      loading={sending || uploadingFiles}
                      className="rounded-full h-10 w-10"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <MessageCircle className="h-16 w-16 mx-auto mb-4 text-slate-300" />
                  <h3 className="text-lg font-medium text-slate-600">Select a conversation</h3>
                  <p className="text-sm text-slate-400 mt-1">
                    Choose a chat from the left or start a new one
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* New Chat Dialog */}
      <Dialog
        open={newChatOpen}
        onClose={() => {
          setNewChatOpen(false);
          setSelectedUsers([]);
          setUserSearch('');
          setNewChatSubject('');
          setSearchResults([]);
        }}
        title="New Chat"
        size="lg"
      >
        <div className="space-y-4">
          <Input
            label="Search Users"
            value={userSearch}
            onChange={(e) => setUserSearch(e.target.value)}
            placeholder="Type a name to search..."
          />

          {searchResults.length > 0 && (
            <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
              {searchResults.map((user) => {
                const isSelected = selectedUsers.find((u) => u.id === user.id);
                return (
                  <button
                    key={user.id}
                    onClick={() => toggleUser(user)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-slate-50 transition-colors',
                      isSelected && 'bg-mine-blue-50',
                    )}
                  >
                    <Avatar name={user.name} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900">{user.name}</p>
                      <p className="text-xs text-slate-500 truncate">{user.email}</p>
                    </div>
                    {isSelected && (
                      <Badge variant="default" className="text-[10px]">Selected</Badge>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {selectedUsers.length > 0 && (
            <div>
              <p className="text-sm font-medium text-slate-700 mb-2">
                Selected ({selectedUsers.length})
              </p>
              <div className="flex flex-wrap gap-2">
                {selectedUsers.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => toggleUser(user)}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-mine-blue-50 text-mine-blue-800 rounded-full text-xs font-medium hover:bg-mine-blue-100"
                  >
                    {user.name}
                    <span className="ml-1">&times;</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <Input
            label="Subject (optional)"
            value={newChatSubject}
            onChange={(e) => setNewChatSubject(e.target.value)}
            placeholder="e.g. Project discussion"
          />
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setNewChatOpen(false);
              setSelectedUsers([]);
              setUserSearch('');
              setNewChatSubject('');
              setSearchResults([]);
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreateChat}
            disabled={selectedUsers.length === 0 || creatingChat}
            loading={creatingChat}
          >
            Start Chat
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Group Info Dialog */}
      <Dialog
        open={groupInfoOpen}
        onClose={() => setGroupInfoOpen(false)}
        title={selectedChat ? `${getChatDisplayName(selectedChat)} - Details` : 'Group Info'}
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Group Members</h4>
            <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100 bg-white">
              {selectedChat?.participants.map((participant) => {
                const isSelf = participant.user.id === currentUserId;
                return (
                  <div key={participant.id} className="flex items-center justify-between px-3 py-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar name={participant.user.name} size="sm" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">
                          {participant.user.name} {isSelf && <span className="text-xs text-slate-400">(You)</span>}
                        </p>
                        <p className="text-xs text-slate-400 truncate">{participant.user.email}</p>
                      </div>
                    </div>
                    {!isSelf && (
                      <button
                        onClick={() => handleRemoveMember(participant.userId, participant.user.name)}
                        className="p-1.5 hover:bg-red-50 text-red-500 hover:text-red-700 rounded transition-colors"
                        title="Remove member"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex gap-2 justify-between pt-2 border-t border-slate-100">
            <Button
              variant="outline"
              onClick={() => {
                setGroupInfoOpen(false);
                setAddMemberOpen(true);
              }}
              className="text-xs gap-1.5 font-semibold"
            >
              <UserPlus className="h-4 w-4" />
              Add Member
            </Button>
            
            <Button
              variant="destructive"
              onClick={handleLeaveGroup}
              disabled={leavingGroup}
              loading={leavingGroup}
              className="text-xs gap-1.5 font-semibold"
            >
              <LogOut className="h-4 w-4" />
              Leave Conversation
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Add Member Dialog */}
      <Dialog
        open={addMemberOpen}
        onClose={() => {
          setAddMemberOpen(false);
          setMemberSearch('');
          setMemberSearchResults([]);
        }}
        title="Add Member to Group"
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="Search Users"
            value={memberSearch}
            onChange={(e) => setMemberSearch(e.target.value)}
            placeholder="Type a name to search..."
          />

          <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100 bg-white">
            {memberSearchResults.map((user) => (
              <button
                key={user.id}
                onClick={() => handleAddMember(user)}
                disabled={addingMember}
                className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar name={user.name} size="sm" />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-800 truncate">{user.name}</p>
                    <p className="text-[10px] text-slate-400 truncate">{user.email}</p>
                  </div>
                </div>
                <UserPlus className="h-4 w-4 text-mine-blue-600" />
              </button>
            ))}
            {memberSearch.trim() && memberSearchResults.length === 0 && (
              <div className="text-center py-8 text-slate-400 text-xs">
                No users found
              </div>
            )}
            {!memberSearch.trim() && (
              <div className="text-center py-8 text-slate-400 text-xs">
                Type name to search active staff members
              </div>
            )}
          </div>
        </div>
      </Dialog>
    </div>
  );
}
