import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, X, Send } from 'lucide-react';

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export function AIChatAssistant() {
  const [showAI, setShowAI] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  const [inputFocused, setInputFocused] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content:
        "Hi! I'm your M.U.S.T.Learn AI assistant! 👋 I can help you with study plans, gap analysis, and answering questions about your learning materials. What would you like to explore today?",
    },
  ]);

  const handleSendMessage = () => {
    if (!inputText.trim()) return;

    const userMessage: ChatMessage = { role: 'user', content: inputText };
    setMessages((prev) => [...prev, userMessage]);

    setTimeout(() => {
      const responses = [
        "That's a great question! Based on your recent activity, I suggest focusing on the Integration topic next. You've mastered 85% of Derivatives! 🎯",
        'I noticed you have 3 videos left on Cell Biology. Want me to create a study plan for this week? 📚',
        'Your knowledge graph shows strong connections in Math and Science. Consider exploring their intersection with Data Science! 💡',
        "You're on a 7-day learning streak! Keep it up! 🔥 Would you like to review your weekly progress?",
      ];
      const aiMessage: ChatMessage = {
        role: 'assistant',
        content: responses[Math.floor(Math.random() * responses.length)],
      };
      setMessages((prev) => [...prev, aiMessage]);
    }, 1000);

    setInputText('');
  };

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
                {messages.map((message, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
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
                      <p className="text-sm leading-relaxed">{message.content}</p>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Quick Action Buttons - hidden when typing */}
              {!inputFocused && !inputText.trim() && (
                <div className="px-6 pb-3">
                  <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    <button
                      onClick={() => {
                        setInputText('Create a study plan for this week');
                      }}
                      className="flex-shrink-0 px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-900 rounded-xl text-xs font-semibold transition-colors"
                    >
                      📅 Study Plan
                    </button>
                    <button
                      onClick={() => {
                        setInputText('Show my learning gaps');
                      }}
                      className="flex-shrink-0 px-4 py-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-xl text-xs font-semibold transition-colors"
                    >
                      🎯 Gap Analysis
                    </button>
                    <button
                      onClick={() => {
                        setInputText('Explain my knowledge graph');
                      }}
                      className="flex-shrink-0 px-4 py-2 bg-cyan-100 hover:bg-cyan-200 text-cyan-700 rounded-xl text-xs font-semibold transition-colors"
                    >
                      🧠 Knowledge Graph
                    </button>
                    <button
                      onClick={() => {
                        setInputText('Show my progress summary');
                      }}
                      className="flex-shrink-0 px-4 py-2 bg-amber-100 hover:bg-amber-200 text-amber-700 rounded-xl text-xs font-semibold transition-colors"
                    >
                      📊 Progress
                    </button>
                  </div>
                </div>
              )}

              {/* Chat Input */}
              <div className="p-6 pt-3 border-t border-slate-200 bg-slate-50/50">
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onFocus={() => setInputFocused(true)}
                    onBlur={() => setInputFocused(false)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Ask me anything about your learning..."
                    className="flex-1 px-4 py-3 bg-white border-2 border-slate-200 focus:border-[#ffb347] rounded-xl text-sm text-foreground placeholder-slate-400 outline-none transition-all"
                  />
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleSendMessage}
                    className="px-6 py-3 bg-gradient-to-r from-[#ffb347] to-[#ff8c42] hover:from-[#ff8c42] hover:to-[#ff6b35] text-white rounded-xl font-semibold flex items-center gap-2 transition-all shadow-lg hover:shadow-xl"
                  >
                    <Send className="w-4 h-4" />
                    Send
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

