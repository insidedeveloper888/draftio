
import React, { useState, useRef, useEffect } from 'react';
import { Send, User, Bot, Loader2, Sparkles, HelpCircle, Paperclip, X } from 'lucide-react';
import { Message, Attachment } from '../types';
import Avatar from './Avatar';

interface ChatPaneProps {
  messages: Message[];
  onSendMessage: (message: string, attachment?: Attachment) => void;
  isLoading: boolean;
  isReadOnly: boolean;
  lockedByName?: string | null;
}

const ChatPane: React.FC<ChatPaneProps> = ({ messages, onSendMessage, isLoading, isReadOnly, lockedByName }) => {
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

  // Auto-resize textarea based on content
  const MAX_TEXTAREA_HEIGHT = 160; // Max height in pixels

  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto'; // Reset height to recalculate
      const newHeight = Math.min(textarea.scrollHeight, MAX_TEXTAREA_HEIGHT);
      textarea.style.height = `${newHeight}px`;
      // Enable scroll when content exceeds max height
      textarea.style.overflowY = textarea.scrollHeight > MAX_TEXTAREA_HEIGHT ? 'auto' : 'hidden';
    }
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [input]);

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
      // Reset textarea height and overflow after sending
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.overflowY = 'hidden';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#0f172a] text-slate-100 border-r border-slate-800">
      {/* Header */}
      <div className="p-3 sm:p-4 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 sm:w-8 sm:h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg">
            <Bot className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xs sm:text-sm font-bold tracking-tight">AI Architect</h2>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
              <span className="text-[9px] sm:text-[10px] text-slate-400 font-medium uppercase tracking-wider">Ready to Consult</span>
            </div>
          </div>
        </div>
        <button className="text-slate-500 hover:text-slate-300">
          <HelpCircle className="w-4 h-4" />
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4 sm:space-y-6 custom-scrollbar">
        {messages.length === 0 && (
          <div className="text-center py-8 sm:py-12 px-4 sm:px-6">
            <Sparkles className="w-6 h-6 sm:w-8 sm:h-8 text-indigo-400 mx-auto mb-3 sm:mb-4 opacity-50" />
            <h3 className="text-sm sm:text-base text-slate-300 font-semibold mb-1">Architectural Discovery</h3>
            <p className="text-[11px] sm:text-xs text-slate-500 leading-relaxed max-w-[220px] mx-auto">
              Start by describing your project goals or pasting a high-level requirements brief.
            </p>
          </div>
        )}
        
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-2 sm:gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            {msg.role === 'user' ? (
              <Avatar
                photoURL={msg.photoURL}
                displayName={msg.displayName}
                size={6}
                className="shrink-0 sm:w-7 sm:h-7"
              />
            ) : (
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center shrink-0 bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
                <Bot className="w-3 h-3 sm:w-4 sm:h-4" />
              </div>
            )}
            <div className={`flex flex-col gap-1 max-w-[85%] ${msg.role === 'user' ? 'items-end' : ''}`}>
              <div className={`rounded-2xl px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm shadow-sm ${
                msg.role === 'user'
                  ? 'bg-indigo-600 text-white rounded-tr-none'
                  : 'bg-slate-800 text-slate-200 border border-slate-700/50 rounded-tl-none'
              }`}>
                {msg.attachment && (
                  <div className="mb-2 bg-black/20 p-2 rounded-lg border border-white/10">
                    <span className="text-[9px] sm:text-[10px] text-slate-400 font-mono uppercase">Attached Content Analyzed</span>
                  </div>
                )}
                <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
              </div>
              {msg.timestamp && (
                <span className={`text-[9px] text-slate-500 px-1 ${msg.role === 'user' ? 'text-right' : ''}`}>
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-2 sm:gap-3">
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shrink-0">
              <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" />
            </div>
            <div className="bg-slate-800 text-slate-400 rounded-2xl rounded-tl-none px-3 sm:px-4 py-2 sm:py-3 text-[11px] sm:text-xs italic">
              Architect is drafting decisions...
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-2 sm:p-4 bg-[#0f172a] border-t border-slate-800 shrink-0">
        {previewAttachment && (
          <div className="mb-2 flex items-center justify-between bg-slate-800/50 p-2 rounded-lg border border-indigo-500/30">
            <span className="text-[11px] sm:text-xs text-indigo-300 flex items-center gap-2">
              <Paperclip className="w-3 h-3" /> File Attached
            </span>
            <button onClick={() => setPreviewAttachment(null)} className="text-slate-500 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        <div className={`relative flex items-end gap-1 sm:gap-2 border rounded-xl p-1.5 sm:p-2 transition-all ${
          isReadOnly ? 'bg-slate-900 border-slate-700' : 'bg-slate-800 border-slate-700 focus-within:border-indigo-500/50'
        }`}>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isReadOnly}
            className={`p-1.5 sm:p-2 transition-colors ${
              isReadOnly ? 'text-slate-700 cursor-not-allowed' : 'text-slate-500 hover:text-indigo-400'
            }`}
          >
            <Paperclip className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            onChange={handleFileChange}
            accept="image/*,.pdf,.txt,.doc"
            disabled={isReadOnly}
          />
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isReadOnly}
            placeholder={isReadOnly ? `🔒 Locked by ${lockedByName}` : "Discuss requirements..."}
            className={`flex-1 bg-transparent border-none text-xs sm:text-sm py-1.5 sm:py-2 min-h-[36px] sm:min-h-[40px] resize-none focus:outline-none custom-scrollbar ${
              isReadOnly ? 'text-slate-500 placeholder:text-slate-700 cursor-not-allowed' : 'text-slate-200 placeholder:text-slate-600 focus:ring-0'
            }`}
            rows={1}
          />
          <button
            onClick={() => handleSubmit()}
            disabled={(!input.trim() && !previewAttachment) || isLoading || isReadOnly}
            className={`p-1.5 sm:p-2 rounded-lg transition-all ${
              isReadOnly ? 'bg-slate-800 text-slate-700 cursor-not-allowed' :
              (input.trim() || previewAttachment) ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-700 text-slate-500'
            }`}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="mt-2 sm:mt-3 text-[9px] sm:text-[10px] text-center text-slate-600 font-medium">
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
