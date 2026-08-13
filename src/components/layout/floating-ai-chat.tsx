'use client';

import { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, User, ChevronDown, Minimize2, Maximize2 } from 'lucide-react';
import { useChat } from '@ai-sdk/react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export function FloatingAiChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const { messages: chatMessages, input, handleInputChange, handleSubmit, status } = useChat({
    api: '/api/chat',
    initialMessages: [
      {
        id: 'initial-msg',
        role: 'assistant',
        content: 'Hi! I am Ezzie, your AI assistant. How can I help you with your ERP tasks today?'
      }
    ]
  } as any) as any;

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, status]);

  const isLoading = status === 'submitted' || status === 'streaming';

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="relative p-2 text-slate-500 hover:bg-slate-100 hover:text-indigo-600 rounded-lg transition-colors flex items-center justify-center group"
        title="Ask Ezzie (AI)"
      >
        <Bot className="h-5 w-5" />
      </button>
    );
  }

  return (
    <div
      className={cn(
        "fixed right-6 bottom-6 z-50 flex flex-col bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden transition-all duration-300 ease-in-out",
        isMinimized ? "w-72 h-14" : "w-80 md:w-96 h-[500px]"
      )}
    >
      {/* Header */}
      <div 
        className="flex items-center justify-between p-3 bg-indigo-600 text-white cursor-pointer select-none"
        onClick={() => setIsMinimized(!isMinimized)}
      >
        <div className="flex items-center gap-3">
          <div className="bg-white/20 p-1.5 rounded-lg">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">Ezzie AI</h3>
            <p className="text-xs text-indigo-200">System Assistant</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button 
            onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized); }}
            className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
          >
            {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); setIsOpen(false); setIsMinimized(false); }}
            className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Chat Body */}
      {!isMinimized && (
        <>
          <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[400px]">
            {chatMessages.map((msg: any) => (
              <div
                key={msg.id}
                className={cn(
                  "flex gap-3 max-w-[85%]",
                  msg.role === 'user' ? "ml-auto flex-row-reverse" : ""
                )}
              >
                <div className={cn(
                  "flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center",
                  msg.role === 'user' ? "bg-slate-200 text-slate-600" : "bg-indigo-100 text-indigo-600"
                )}>
                  {msg.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                </div>
                <div className={cn(
                  "rounded-2xl px-4 py-2 shadow-sm",
                  msg.role === 'user' ? "bg-slate-800 text-white" : "bg-white border border-slate-200 text-slate-800"
                )}>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {msg.content || (msg as any).parts?.filter((p: any) => p.type === 'text').map((p: any) => p.text).join('\n') || ''}
                  </p>
                </div>
              </div>
            ))}
            {isLoading && chatMessages[chatMessages.length - 1]?.role === 'user' && (
              <div className="flex gap-3 max-w-[85%]">
                <div className="flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center bg-indigo-100 text-indigo-600">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="p-4 rounded-2xl bg-white border border-slate-200 rounded-tl-sm shadow-sm flex gap-1">
                  <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                  <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"></div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-3 bg-white border-t border-slate-200">
            <form 
              onSubmit={handleSubmit}
              className="flex items-end gap-2"
            >
              <div className="flex-1 bg-slate-100 rounded-xl px-3 py-2 focus-within:ring-2 focus-within:ring-indigo-500 transition-shadow">
                <textarea
                  value={input || ''}
                  onChange={handleInputChange}
                  placeholder="Ask Ezzie anything..."
                  className="w-full bg-transparent text-sm resize-none outline-none max-h-32 placeholder:text-slate-500"
                  rows={1}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      if ((input || '').trim() && !isLoading) {
                         const form = e.currentTarget.form;
                         if (form) form.requestSubmit();
                      }
                    }
                  }}
                />
              </div>
              <Button 
                type="submit" 
                size="icon" 
                className="rounded-xl flex-shrink-0 h-[38px] w-[38px] bg-indigo-600 hover:bg-indigo-700"
                disabled={!(input || '').trim() || isLoading}
              >
                <Send className="h-4 w-4 text-white ml-0.5" />
              </Button>
            </form>
            <div className="mt-2 text-[10px] text-center text-slate-400 font-medium uppercase tracking-wider">
              Powered by Ezzie AI
            </div>
          </div>
        </>
      )}
    </div>
  );
}
