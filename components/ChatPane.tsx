
import React, { useState, useRef, useEffect } from 'react';
import { Send, User, Bot, Loader2, Sparkles, HelpCircle, Paperclip, X } from 'lucide-react';
import { Message, Attachment } from '../types';

interface ChatPaneProps {
  messages: Message[];
  onSendMessage: (message: string, attachment?: Attachment) => void;
  isLoading: boolean;
}

const ChatPane: React.FC<ChatPaneProps> = ({ messages, onSendMessage, isLoading }) => {
  const [input, setInput] = useState('');
  const [previewAttachment, setPreviewAttachment] = useState<Attachment | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setPreviewAttachment({
          data: (ev.target?.result as string).split(',')[1],
          mimeType: file.type
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((input.trim() || previewAttachment) && !isLoading) {
      onSendMessage(input.trim(), previewAttachment || undefined);
      setInput('');
      setPreviewAttachment(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0f172a] text-slate-100 border-r border-slate-800">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-sm font-bold tracking-tight">AI Architect</h2>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
              <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Ready to Consult</span>
            </div>
          </div>
        </div>
        <button className="text-slate-500 hover:text-slate-300">
          <HelpCircle className="w-4 h-4" />
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
        {messages.length === 0 && (
          <div className="text-center py-12 px-6">
            <Sparkles className="w-8 h-8 text-indigo-400 mx-auto mb-4 opacity-50" />
            <h3 className="text-slate-300 font-semibold mb-1">Architectural Discovery</h3>
            <p className="text-xs text-slate-500 leading-relaxed max-w-[220px] mx-auto">
              Start by describing your project goals or pasting a high-level requirements brief.
            </p>
          </div>
        )}
        
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
              msg.role === 'user' ? 'bg-slate-700' : 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
            }`}>
              {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>
            <div className={`flex flex-col gap-1 max-w-[85%] ${msg.role === 'user' ? 'items-end' : ''}`}>
              <div className={`rounded-2xl px-4 py-3 text-sm shadow-sm ${
                msg.role === 'user' 
                  ? 'bg-indigo-600 text-white rounded-tr-none' 
                  : 'bg-slate-800 text-slate-200 border border-slate-700/50 rounded-tl-none'
              }`}>
                {msg.attachment && (
                  <div className="mb-2 bg-black/20 p-2 rounded-lg border border-white/10">
                    <span className="text-[10px] text-slate-400 font-mono uppercase">Attached Content Analyzed</span>
                  </div>
                )}
                <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-full bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shrink-0">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
            <div className="bg-slate-800 text-slate-400 rounded-2xl rounded-tl-none px-4 py-3 text-xs italic">
              Architect is drafting decisions...
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 bg-[#0f172a] border-t border-slate-800">
        {previewAttachment && (
          <div className="mb-2 flex items-center justify-between bg-slate-800/50 p-2 rounded-lg border border-indigo-500/30">
            <span className="text-xs text-indigo-300 flex items-center gap-2">
              <Paperclip className="w-3 h-3" /> File Attached
            </span>
            <button onClick={() => setPreviewAttachment(null)} className="text-slate-500 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        <div className="relative flex items-end gap-2 bg-slate-800 border border-slate-700 rounded-xl p-2 focus-within:border-indigo-500/50 transition-all">
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-slate-500 hover:text-indigo-400 transition-colors"
          >
            <Paperclip className="w-5 h-5" />
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            onChange={handleFileChange} 
            accept="image/*,.pdf,.txt,.doc"
          />
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Discuss requirements..."
            className="flex-1 bg-transparent border-none text-sm text-slate-200 placeholder:text-slate-600 focus:ring-0 py-2 min-h-[40px] max-h-[120px] resize-none overflow-y-auto custom-scrollbar"
            rows={1}
          />
          <button
            onClick={() => handleSubmit()}
            disabled={(!input.trim() && !previewAttachment) || isLoading}
            className={`p-2 rounded-lg transition-all ${
              input.trim() || previewAttachment ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-700 text-slate-500'
            }`}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="mt-3 text-[10px] text-center text-slate-600 font-medium">
          DRAFTIO v1.0 • POWERED BY GEMINI 3 PRO
        </p>
      </div>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #475569; }
      `}</style>
    </div>
  );
};

export default ChatPane;
