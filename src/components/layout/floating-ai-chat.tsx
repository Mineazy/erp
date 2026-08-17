'use client';

import { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, User, ChevronDown, Minimize2, Maximize2 } from 'lucide-react';
import { useChat } from '@ai-sdk/react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export function FloatingAiChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [input, setInput] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  
  const { messages: chatMessages, setMessages, append, status } = useChat({
    api: '/api/chat',
    body: { sessionId },
  } as any) as any;

  useEffect(() => {
    async function fetchHistory() {
      try {
        const res = await fetch('/api/chat/history');
        if (res.ok) {
          const data = await res.json();
          if (data.sessionId) setSessionId(data.sessionId);
          if (data.messages && data.messages.length > 0) {
            setMessages(data.messages);
          } else {
            setMessages([
              {
                id: 'initial-msg',
                role: 'assistant',
                content: 'Hi! I am Ezzie, your AI assistant. How can I help you with your ERP tasks today?'
              }
            ]);
          }
        }
      } catch (error) {
        console.error('Failed to load chat history', error);
      } finally {
        setIsInitializing(false);
      }
    }
    fetchHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
                  
                  {/* Generative UI for Tool Invocations */}
                  {msg.toolInvocations && msg.toolInvocations.length > 0 && (
                    <div className="mt-3 flex flex-col gap-2">
                      {msg.toolInvocations.map((toolInvocation: any) => {
                        const { toolName, toolCallId, state, result } = toolInvocation;
                        
                        if (state !== 'result') {
                          return (
                            <div key={toolCallId} className="flex items-center gap-2 text-xs text-indigo-500 bg-indigo-50/50 p-2 rounded-md">
                              <div className="w-3 h-3 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                              <span>Calling <b>{toolName}</b>...</span>
                            </div>
                          );
                        }

                        if (result?.error) {
                          return (
                            <div key={toolCallId} className="text-xs text-red-500 bg-red-50 p-2 rounded-md">
                              Error: {result.error}
                            </div>
                          );
                        }

                        // Custom UI Rendering based on toolName
                        if (toolName === 'getInventoryStatus') {
                          return (
                            <div key={toolCallId} className="bg-slate-50 border border-slate-100 rounded-lg p-3 text-sm text-slate-700 w-full overflow-hidden">
                              <h4 className="font-semibold text-slate-800 mb-2">Inventory Status</h4>
                              <div className="grid grid-cols-2 gap-2 mb-3">
                                <div className="bg-white p-2 rounded shadow-sm">
                                  <div className="text-xs text-slate-500">Active Products</div>
                                  <div className="font-medium text-indigo-600">{result.totalActiveProducts}</div>
                                </div>
                                <div className="bg-white p-2 rounded shadow-sm">
                                  <div className="text-xs text-slate-500">Low Stock</div>
                                  <div className="font-medium text-amber-600">{result.lowStockCount}</div>
                                </div>
                                <div className="bg-white p-2 rounded shadow-sm col-span-2">
                                  <div className="text-xs text-slate-500">Est. Total Value</div>
                                  <div className="font-medium">${result.estimatedTotalValue?.toFixed(2) || '0.00'}</div>
                                </div>
                              </div>
                              {result.lowStockItems && result.lowStockItems.length > 0 && (
                                <div>
                                  <div className="text-xs font-semibold text-slate-500 mb-1">Items Needing Restock:</div>
                                  <ul className="text-xs list-disc pl-4 space-y-1">
                                    {result.lowStockItems.map((item: string, i: number) => (
                                      <li key={i}>{item}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          );
                        }

                        if (toolName === 'getSalesOrders' || toolName === 'getPurchaseOrders' || toolName === 'getRecentSales') {
                           const isSales = toolName === 'getSalesOrders';
                           const isPO = toolName === 'getPurchaseOrders';
                           const title = isSales ? 'Sales Orders' : isPO ? 'Purchase Orders' : 'Recent Sales';
                           const items = result || [];
                           
                           return (
                             <div key={toolCallId} className="bg-slate-50 border border-slate-100 rounded-lg p-3 text-sm w-full overflow-hidden">
                                <h4 className="font-semibold text-slate-800 mb-2">{title}</h4>
                                {items.length === 0 ? <p className="text-xs text-slate-500">No records found.</p> : (
                                  <div className="space-y-2">
                                    {items.map((item: any, idx: number) => (
                                      <div key={idx} className="bg-white p-2 rounded shadow-sm flex justify-between items-center text-xs">
                                        <div>
                                          <div className="font-medium">{item.orderNumber || item.poNumber || item.transactionNumber}</div>
                                          <div className="text-slate-500">{item.customerName || item.supplierName || 'System'}</div>
                                        </div>
                                        <div className="text-right">
                                          <div className="font-semibold">${item.total?.toFixed(2)}</div>
                                          <div className={cn("text-[10px] uppercase font-bold", item.status === 'COMPLETED' ? "text-emerald-500" : "text-amber-500")}>
                                            {item.status}
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                             </div>
                           );
                        }

                        if (toolName === 'searchProducts' || toolName === 'searchCustomers' || toolName === 'searchSuppliers' || toolName === 'getEmployees') {
                           const items = result || [];
                           return (
                             <div key={toolCallId} className="bg-slate-50 border border-slate-100 rounded-lg p-3 text-sm w-full overflow-hidden">
                                <h4 className="font-semibold text-slate-800 mb-2 capitalize">{toolName.replace(/([A-Z])/g, ' $1').trim()} Results</h4>
                                {items.length === 0 ? <p className="text-xs text-slate-500">No records found.</p> : (
                                  <div className="space-y-1.5">
                                    {items.map((item: any, idx: number) => (
                                      <div key={idx} className="bg-white p-2 rounded shadow-sm text-xs">
                                        <div className="font-medium">{item.name || item.firstName + ' ' + item.lastName}</div>
                                        <div className="text-slate-500 flex justify-between">
                                          <span>{item.email || item.code || item.department || item.category || 'N/A'}</span>
                                          {item.sellingPrice && <span className="font-medium text-emerald-600">${item.sellingPrice.toFixed(2)}</span>}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                             </div>
                           )
                        }

                        // Fallback generic renderer for other tools
                        return (
                          <div key={toolCallId} className="bg-slate-50 border border-slate-100 rounded-lg p-2 text-xs w-full overflow-hidden">
                             <div className="font-medium text-slate-600 mb-1 border-b border-slate-200 pb-1">Data: {toolName}</div>
                             <pre className="overflow-x-auto max-w-[200px] md:max-w-[250px] whitespace-pre-wrap break-all text-[10px] text-slate-500">
                               {JSON.stringify(result, null, 2)}
                             </pre>
                          </div>
                        );
                      })}
                    </div>
                  )}
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
              onSubmit={(e) => {
                e.preventDefault();
                if ((input || '').trim() && !isLoading && !isInitializing) {
                  const messageText = input;
                  setInput('');
                  append({ role: 'user', content: messageText });
                }
              }}
              className="flex items-end gap-2"
            >
              <div className="flex-1 bg-slate-100 rounded-xl px-3 py-2 focus-within:ring-2 focus-within:ring-indigo-500 transition-shadow">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask Ezzie anything..."
                  className="w-full bg-transparent text-sm resize-none outline-none max-h-32 placeholder:text-slate-500"
                  rows={1}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      if ((input || '').trim() && !isLoading && !isInitializing) {
                         const messageText = input;
                         setInput('');
                         append({ role: 'user', content: messageText });
                      }
                    }
                  }}
                />
              </div>
              <Button 
                type="submit" 
                size="icon" 
                className="rounded-xl flex-shrink-0 h-[38px] w-[38px] bg-indigo-600 hover:bg-indigo-700"
                disabled={!(input || '').trim() || isLoading || isInitializing}
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
