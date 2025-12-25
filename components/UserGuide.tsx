
import React from 'react';
import { X, Sparkle, Lock, Unlock, MessageSquare, FileText, Code, ListChecks, Download, FolderOpen, Users, Paperclip, Bot, Maximize2, ZoomIn, BarChart3 } from 'lucide-react';

interface UserGuideProps {
  onClose: () => void;
}

const UserGuide: React.FC<UserGuideProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl max-w-3xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-indigo-600 text-white px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white/20 rounded-lg sm:rounded-xl flex items-center justify-center">
              <Sparkle className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold">Draftio User Guide</h2>
              <p className="text-indigo-200 text-[10px] sm:text-xs">Learn how to use the AI Requirements Architect</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 sm:space-y-8">
          {/* Introduction */}
          <section>
            <h3 className="text-base sm:text-lg font-bold text-slate-800 mb-2 sm:mb-3">Welcome to Draftio</h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Draftio is an AI-powered requirements architect that helps you create professional
              functional specifications, technical specifications, and implementation plans through
              natural conversation. It's designed for teams to collaborate on requirement documents
              in a shared workspace.
            </p>
          </section>

          {/* Getting Started */}
          <section>
            <h3 className="text-base sm:text-lg font-bold text-slate-800 mb-2 sm:mb-3 flex items-center gap-2">
              <span className="w-5 h-5 sm:w-6 sm:h-6 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-bold">1</span>
              Getting Started
            </h3>
            <div className="space-y-2 sm:space-y-3 text-xs sm:text-sm text-slate-600">
              <div className="flex items-start gap-2 sm:gap-3 bg-slate-50 p-3 sm:p-4 rounded-lg">
                <Users className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-slate-700">Sign In with Google</p>
                  <p>Click "Sign In" in the header to authenticate. This enables cloud sync and collaboration.</p>
                </div>
              </div>
              <div className="flex items-start gap-2 sm:gap-3 bg-slate-50 p-3 sm:p-4 rounded-lg">
                <FolderOpen className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-slate-700">Workspace Library</p>
                  <p>The sidebar shows all projects. Click any project to load it, or click <strong>+</strong> to create new.</p>
                </div>
              </div>
            </div>
          </section>

          {/* Editing & Locking */}
          <section>
            <h3 className="text-base sm:text-lg font-bold text-slate-800 mb-2 sm:mb-3 flex items-center gap-2">
              <span className="w-5 h-5 sm:w-6 sm:h-6 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-bold">2</span>
              Editing & Locking
            </h3>
            <div className="space-y-2 sm:space-y-3 text-xs sm:text-sm text-slate-600">
              <div className="flex items-start gap-2 sm:gap-3 bg-amber-50 border border-amber-200 p-3 sm:p-4 rounded-lg">
                <Lock className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-amber-800">Lock Before Editing</p>
                  <p className="text-amber-700">Click <strong>"LOCK TO EDIT"</strong> before making changes. Only one person can edit at a time.</p>
                </div>
              </div>
              <div className="flex items-start gap-2 sm:gap-3 bg-emerald-50 border border-emerald-200 p-3 sm:p-4 rounded-lg">
                <Unlock className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-emerald-800">Release the Lock</p>
                  <p className="text-emerald-700">Click <strong>"UNLOCK"</strong> when done. Auto-releases after 15 min idle.</p>
                </div>
              </div>
              <p className="text-slate-500 text-[10px] sm:text-xs italic">
                Note: If someone else has the lock, you'll see a read-only banner.
              </p>
            </div>
          </section>

          {/* Chatting with AI */}
          <section>
            <h3 className="text-base sm:text-lg font-bold text-slate-800 mb-2 sm:mb-3 flex items-center gap-2">
              <span className="w-5 h-5 sm:w-6 sm:h-6 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-bold">3</span>
              <span className="hidden sm:inline">Chatting with the AI Architect</span>
              <span className="sm:hidden">AI Chat</span>
            </h3>
            <div className="space-y-2 sm:space-y-3 text-xs sm:text-sm text-slate-600">
              <div className="flex items-start gap-2 sm:gap-3 bg-slate-50 p-3 sm:p-4 rounded-lg">
                <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-slate-700">Describe Requirements</p>
                  <p>Use chat to describe project goals. The AI asks clarifying questions.</p>
                </div>
              </div>
              <div className="flex items-start gap-2 sm:gap-3 bg-slate-50 p-3 sm:p-4 rounded-lg">
                <Paperclip className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-slate-700">Attach Files</p>
                  <p>Click paperclip to attach images, PDFs, or documents for AI analysis.</p>
                </div>
              </div>
              <div className="flex items-start gap-2 sm:gap-3 bg-slate-50 p-3 sm:p-4 rounded-lg">
                <Bot className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-slate-700">Auto-Generated Docs</p>
                  <p>AI generates specs and plans in real-time as you chat.</p>
                </div>
              </div>
            </div>
          </section>

          {/* Document Tabs */}
          <section>
            <h3 className="text-base sm:text-lg font-bold text-slate-800 mb-2 sm:mb-3 flex items-center gap-2">
              <span className="w-5 h-5 sm:w-6 sm:h-6 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-bold">4</span>
              Document Tabs
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 text-xs sm:text-sm">
              <div className="bg-indigo-50 border border-indigo-200 p-3 sm:p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-1 sm:mb-2">
                  <FileText className="w-4 h-4 text-indigo-600" />
                  <p className="font-semibold text-indigo-800">Functional</p>
                </div>
                <p className="text-indigo-700 text-[10px] sm:text-xs">Business requirements, user stories, features.</p>
              </div>
              <div className="bg-emerald-50 border border-emerald-200 p-3 sm:p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-1 sm:mb-2">
                  <Code className="w-4 h-4 text-emerald-600" />
                  <p className="font-semibold text-emerald-800">Technical</p>
                </div>
                <p className="text-emerald-700 text-[10px] sm:text-xs">Architecture, schemas, API endpoints.</p>
              </div>
              <div className="bg-purple-50 border border-purple-200 p-3 sm:p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-1 sm:mb-2">
                  <ListChecks className="w-4 h-4 text-purple-600" />
                  <p className="font-semibold text-purple-800">Plan</p>
                </div>
                <p className="text-purple-700 text-[10px] sm:text-xs">Tasks, phases, and milestones.</p>
              </div>
            </div>
            <p className="text-slate-500 text-[10px] sm:text-xs mt-2 sm:mt-3">
              Toggle between <strong>Preview</strong> and <strong>Edit</strong> mode in the tab header.
            </p>
          </section>

          {/* Visual Diagrams */}
          <section>
            <h3 className="text-base sm:text-lg font-bold text-slate-800 mb-2 sm:mb-3 flex items-center gap-2">
              <span className="w-5 h-5 sm:w-6 sm:h-6 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-bold">5</span>
              Visual Diagrams
            </h3>
            <div className="space-y-2 sm:space-y-3 text-xs sm:text-sm text-slate-600">
              <div className="flex items-start gap-2 sm:gap-3 bg-slate-50 p-3 sm:p-4 rounded-lg">
                <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-slate-700">Auto-Generated Diagrams</p>
                  <p>AI creates Gantt Charts, Flowcharts, ER Diagrams, Sequence Diagrams, Mind Maps, and more.</p>
                </div>
              </div>
              <div className="flex items-start gap-2 sm:gap-3 bg-slate-50 p-3 sm:p-4 rounded-lg">
                <Maximize2 className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-slate-700">Fullscreen View</p>
                  <p>Click "Expand" on any diagram for fullscreen viewing.</p>
                </div>
              </div>
              <div className="flex items-start gap-2 sm:gap-3 bg-slate-50 p-3 sm:p-4 rounded-lg">
                <ZoomIn className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-slate-700">Figma-like Controls</p>
                  <p><span className="hidden sm:inline">Ctrl/Cmd + scroll to zoom, Space + drag to pan.</span><span className="sm:hidden">Pinch to zoom, drag to pan.</span></p>
                </div>
              </div>
            </div>
          </section>

          {/* Exporting */}
          <section>
            <h3 className="text-base sm:text-lg font-bold text-slate-800 mb-2 sm:mb-3 flex items-center gap-2">
              <span className="w-5 h-5 sm:w-6 sm:h-6 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-bold">6</span>
              <span className="hidden sm:inline">Exporting Documents</span>
              <span className="sm:hidden">Export</span>
            </h3>
            <div className="flex items-start gap-2 sm:gap-3 bg-slate-50 p-3 sm:p-4 rounded-lg text-xs sm:text-sm text-slate-600">
              <Download className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-slate-700">Download as Markdown</p>
                <p>Click download icon to export as <strong>.md</strong> files for docs or wikis.</p>
              </div>
            </div>
          </section>

          {/* Tips */}
          <section className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 p-3 sm:p-5 rounded-xl">
            <h3 className="text-base sm:text-lg font-bold text-indigo-800 mb-2 sm:mb-3">Pro Tips</h3>
            <ul className="space-y-1.5 sm:space-y-2 text-[11px] sm:text-sm text-indigo-700">
              <li className="flex items-start gap-2">
                <span className="text-indigo-400">•</span>
                <span>Be specific - the AI will ask follow-up questions if needed.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-indigo-400">•</span>
                <span>Shift+Enter adds new lines without sending.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-indigo-400">•</span>
                <span>Click project name in header to rename.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-indigo-400">•</span>
                <span>Auto-saved to cloud when you have the lock.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-indigo-400">•</span>
                <span>Default stack: React, Next.js, Supabase (customizable).</span>
              </li>
            </ul>
          </section>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 px-4 sm:px-6 py-3 sm:py-4 bg-slate-50 shrink-0">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] sm:text-xs text-slate-500">
              Draftio v1.0 • Powered by Gemini AI
            </p>
            <button
              onClick={onClose}
              className="px-3 sm:px-4 py-1.5 sm:py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold rounded-lg transition-colors"
            >
              Got it!
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserGuide;
