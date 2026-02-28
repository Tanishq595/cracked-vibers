import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, X, Send } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

const CHAT_HISTORY_KEY = 'mustlearn_chat_history_';
const CHAT_SESSION_KEY = 'mustlearn_chat_session_';
const DEFAULT_GREETING: ChatMessage = {
  role: 'assistant',
  content:
    "Hi! I'm your M.U.S.T.Learn AI assistant! 👋 I can read your files, list your syntheses, search your library, and answer questions—all in chat. Try: \"What files do I have?\" or \"Search my library for photosynthesis\".",
};

function loadHistory(userId: string | null): ChatMessage[] {
  if (!userId) return [DEFAULT_GREETING];
  try {
    const raw = localStorage.getItem(CHAT_HISTORY_KEY + userId);
    if (!raw) return [DEFAULT_GREETING];
    const parsed = JSON.parse(raw) as ChatMessage[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : [DEFAULT_GREETING];
  } catch {
    return [DEFAULT_GREETING];
  }
}

function saveHistory(userId: string | null, messages: ChatMessage[]) {
  if (!userId) return;
  try {
    localStorage.setItem(CHAT_HISTORY_KEY + userId, JSON.stringify(messages));
  } catch {
    // ignore
  }
}

export function AIChatAssistant() {
  const { getToken } = useAuth();
  const [showAI, setShowAI] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  const [inputFocused, setInputFocused] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const inputValueRef = useRef('');

  useEffect(() => {
    getToken()
      .then((t) => {
        if (!t) {
          setMessages([DEFAULT_GREETING]);
          return;
        }
        const auth = { Authorization: `Bearer ${t}` };
        return fetch('/api/me', { headers: auth })
          .then((r) => (r.ok ? r.json() : null))
          .then((meData) => {
            const id = meData?.userId ?? null;
            setUserId(id);
            if (!id) {
              setMessages([DEFAULT_GREETING]);
              return null;
            }
            let sid = typeof crypto !== 'undefined' && crypto.randomUUID
              ? (localStorage.getItem(CHAT_SESSION_KEY + id) ?? crypto.randomUUID())
              : null;
            if (sid && !localStorage.getItem(CHAT_SESSION_KEY + id)) {
              try {
                localStorage.setItem(CHAT_SESSION_KEY + id, sid);
              } catch {
                // ignore
              }
            }
            setSessionId(sid);
            const url = sid ? `/api/chat-messages?session_id=${encodeURIComponent(sid)}` : '/api/chat-messages';
            return fetch(url, { method: 'GET', headers: auth })
              .then((r) => (r.ok ? r.json() : null))
              .then((chatData) => ({ chatData, sid, id }));
          });
      })
      .then((result) => {
        if (!result) return;
        const { chatData, sid, id } = result as {
          chatData: { messages?: ChatMessage[] } | null;
          sid: string | null;
          id: string | null;
        };
        const fromDb = Array.isArray(chatData?.messages) && chatData.messages.length > 0;
        if (fromDb) {
          setMessages(chatData.messages as ChatMessage[]);
        } else if (sid) {
          setMessages([DEFAULT_GREETING]);
        } else {
          setMessages(loadHistory(id));
        }
      })
      .catch(() => setMessages([DEFAULT_GREETING]));
  }, [getToken]);

  // Persist session id when we have userId but no sessionId in storage yet (e.g. after generate)
  useEffect(() => {
    if (!userId || !sessionId) return;
    try {
      if (!localStorage.getItem(CHAT_SESSION_KEY + userId)) {
        localStorage.setItem(CHAT_SESSION_KEY + userId, sessionId);
      }
    } catch {
      // ignore
    }
  }, [userId, sessionId]);

  useEffect(() => {
    if (messages.length > 0) saveHistory(userId, messages);
  }, [messages, userId]);

  const handleSendMessage = useCallback(
    async (valueFromRef?: string) => {
      const userContent = (valueFromRef ?? inputValueRef.current ?? inputText).trim();
      if (!userContent || chatLoading) return;

      const userMessage: ChatMessage = { role: 'user', content: userContent };
      const nextMessages = [...messages, userMessage];
      setMessages(nextMessages);
      setInputText('');
      inputValueRef.current = '';
      setChatLoading(true);

      try {
        const token = await getToken();
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
          }),
        });
        const data = await res.json();

        if (!res.ok) {
          setMessages((prev) => [
            ...prev,
            { role: 'assistant', content: `Error: ${data.error ?? 'Something went wrong'}` },
          ]);
          return;
        }

        const content = typeof data.content === 'string' ? data.content : '';
        const assistantMessage: ChatMessage = { role: 'assistant', content: content || 'Done!' };
        setMessages((prev) => [...prev, assistantMessage]);

        if (token && sessionId) {
          fetch('/api/chat-messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({
              session_id: sessionId,
              messages: [userMessage, assistantMessage],
            }),
          }).catch(() => {});
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Network error';
        setMessages((prev) => [...prev, { role: 'assistant', content: `Error: ${message}` }]);
      } finally {
        setChatLoading(false);
      }
    },
    [chatLoading, getToken, messages, inputText, sessionId]
  );

  const onSend = useCallback(() => {
    const value = inputValueRef.current ?? inputText;
    handleSendMessage(value);
  }, [handleSendMessage, inputText]);

  return (
    <>
      {/* Floating AI Assistant Orb */}
      <AnimatePresence>
        {showAI && (
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0 }}
            className="fixed bottom-8 right-8 z-50"
          >
            <motion.div
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="relative cursor-pointer group animate-float"
              onClick={() => {
                setChatOpen(true);
                setShowAI(false);
              }}
            >
              {/* Pulsing rings */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-[#ffb347] to-[#ff8c42] opacity-40 blur-xl animate-pulse" />
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-[#ffb347] to-[#ff8c42] opacity-20 blur-2xl animate-pulse" />

              {/* Main orb */}
              <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-[#ffb347] via-[#ff8c42] to-[#ff6b35] shadow-2xl shadow-[#ffb347]/50 flex items-center justify-center border-2 border-white/20">
                <Sparkles className="w-8 h-8 text-white" />
              </div>

              {/* Tooltip */}
              <div className="absolute -top-12 right-0 px-3 py-2 bg-card rounded-lg border border-border shadow-xl whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                <p className="text-xs text-foreground font-semibold">AI Assistant</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Chatbot Modal */}
      <AnimatePresence>
        {chatOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => {
              setChatOpen(false);
              setShowAI(true);
            }}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl h-[600px] bg-card rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden"
            >
              {/* Chat Header */}
              <div className="relative overflow-hidden bg-gradient-to-r from-[#ffb347] via-[#ff8c42] to-[#ff6b35] p-6">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
                <div className="relative flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="text-xl font-bold text-white">AI assistant</span>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.1, rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => {
                      setChatOpen(false);
                      setShowAI(true);
                    }}
                    className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
                  >
                    <X className="w-5 h-5 text-white" />
                  </motion.button>
                </div>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.length === 0 && !chatLoading && (
                  <div className="flex justify-start">
                    <div className="max-w-[80%] rounded-2xl p-4 bg-slate-100 text-slate-500 border border-slate-200">
                      <p className="text-sm">Loading conversation…</p>
                    </div>
                  </div>
                )}
                {messages.map((message, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl p-4 ${
                        message.role === 'user'
                          ? 'bg-gradient-to-r from-[#ffb347] to-[#ff8c42] text-white'
                          : 'bg-slate-100 text-slate-900 border border-slate-200'
                      }`}
                    >
                      {message.role === 'assistant' && (
                        <div className="flex items-center gap-2 mb-2">
                          <Sparkles className="w-4 h-4 text-[#ffb347]" />
                          <span className="text-xs font-bold text-[#ffb347]">AI Assistant</span>
                        </div>
                      )}
                      {message.role === 'assistant' ? (
                        <div className="chat-message-content text-sm leading-relaxed">
                          <ReactMarkdown
                            components={{
                              p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                              ul: ({ children }) => <ul className="list-disc pl-4 mb-2 space-y-0.5">{children}</ul>,
                              ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 space-y-0.5">{children}</ol>,
                              li: ({ children }) => <li className="leading-snug">{children}</li>,
                              strong: ({ children }) => <strong className="font-semibold text-slate-900">{children}</strong>,
                              table: ({ children }) => (
                                <div className="overflow-x-auto my-2 rounded-lg border border-slate-200">
                                  <table className="min-w-full border-collapse text-left text-sm">{children}</table>
                                </div>
                              ),
                              thead: ({ children }) => <thead className="bg-slate-100">{children}</thead>,
                              tbody: ({ children }) => <tbody className="divide-y divide-slate-200">{children}</tbody>,
                              tr: ({ children }) => <tr className="border-b border-slate-200 last:border-0">{children}</tr>,
                              th: ({ children }) => <th className="px-3 py-2 font-semibold text-slate-700 whitespace-nowrap">{children}</th>,
                              td: ({ children }) => <td className="px-3 py-2 text-slate-800 whitespace-nowrap">{children}</td>,
                              code: ({ className, children }) =>
                                className ? (
                                  <code className={`block p-2 rounded bg-slate-200 text-xs overflow-x-auto ${className}`}>{children}</code>
                                ) : (
                                  <code className="px-1 py-0.5 rounded bg-slate-200/80 text-xs font-mono">{children}</code>
                                ),
                            }}
                          >
                            {message.content}
                          </ReactMarkdown>
                        </div>
                      ) : (
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                      )}
                    </div>
                  </motion.div>
                ))}
                {/* Typing / replying animation */}
                {chatLoading && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex justify-start"
                  >
                    <div className="max-w-[80%] rounded-2xl p-4 bg-slate-100 border border-slate-200">
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="w-4 h-4 text-[#ffb347]" />
                        <span className="text-xs font-bold text-[#ffb347]">AI Assistant</span>
                      </div>
                      <div className="flex gap-1 items-center">
                        <span className="inline-block w-2 h-2 rounded-full bg-[#ffb347] animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="inline-block w-2 h-2 rounded-full bg-[#ffb347] animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="inline-block w-2 h-2 rounded-full bg-[#ffb347] animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Quick Action Buttons - hidden when typing */}
              {!inputFocused && !inputText.trim() && !chatLoading && (
                <div className="px-6 pb-3">
                  <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    <button
                      onClick={() => setInputText('What files do I have in my library?')}
                      className="flex-shrink-0 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold transition-colors"
                    >
                      📁 My files
                    </button>
                    <button
                      onClick={() => setInputText('List my syntheses')}
                      className="flex-shrink-0 px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-900 rounded-xl text-xs font-semibold transition-colors"
                    >
                      📄 My syntheses
                    </button>
                    <button
                      onClick={() => setInputText('Search my library for...')}
                      className="flex-shrink-0 px-4 py-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-xl text-xs font-semibold transition-colors"
                    >
                      🔍 Search library
                    </button>
                  </div>
                </div>
              )}

              {/* Chat Input - disabled while AI is replying */}
              <div
                className={`p-6 pt-3 border-t border-slate-200 bg-slate-50/50 transition-opacity ${chatLoading ? 'opacity-80 pointer-events-none' : ''}`}
                aria-busy={chatLoading}
              >
                <form
                  className="flex gap-3"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!chatLoading) onSend();
                  }}
                >
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => {
                      const v = e.target.value;
                      setInputText(v);
                      inputValueRef.current = v;
                    }}
                    onFocus={() => setInputFocused(true)}
                    onBlur={() => setInputFocused(false)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (!chatLoading) onSend();
                      }
                    }}
                    placeholder={chatLoading ? 'AI is replying...' : 'Ask about your files, syntheses, or search your library...'}
                    className="flex-1 px-4 py-3 bg-white border-2 border-slate-200 focus:border-[#ffb347] rounded-xl text-sm text-foreground placeholder-slate-400 outline-none transition-all disabled:bg-slate-100 disabled:cursor-not-allowed"
                    disabled={chatLoading}
                    readOnly={chatLoading}
                  />
                  <button
                    type="button"
                    disabled={chatLoading}
                    onClick={() => {
                      if (!chatLoading) onSend();
                    }}
                    className="px-6 py-3 bg-gradient-to-r from-[#ffb347] to-[#ff8c42] hover:from-[#ff8c42] hover:to-[#ff6b35] text-white rounded-xl font-semibold flex items-center gap-2 transition-all shadow-lg hover:shadow-xl disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:from-[#ffb347] disabled:hover:to-[#ff8c42]"
                  >
                    <Send className="w-4 h-4" />
                    {chatLoading ? 'Sending...' : 'Send'}
                  </button>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

