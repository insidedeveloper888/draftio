
import React from 'react';
import { X, Sparkle, Lock, Unlock, MessageSquare, FileText, Code, ListChecks, Download, FolderOpen, Users, Paperclip, Bot, Maximize2, ZoomIn, BarChart3 } from 'lucide-react';

interface UserGuideProps {
  onClose: () => void;
}

const UserGuide: React.FC<UserGuideProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-indigo-600 text-white px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Sparkle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Draftio User Guide</h2>
              <p className="text-indigo-200 text-xs">Learn how to use the AI Requirements Architect</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* Introduction */}
          <section>
            <h3 className="text-lg font-bold text-slate-800 mb-3">Welcome to Draftio</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Draftio is an AI-powered requirements architect that helps you create professional
              functional specifications, technical specifications, and implementation plans through
              natural conversation. It's designed for teams to collaborate on requirement documents
              in a shared workspace.
            </p>
          </section>

          {/* Getting Started */}
          <section>
            <h3 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
              <span className="w-6 h-6 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-xs font-bold">1</span>
              Getting Started
            </h3>
            <div className="space-y-3 text-sm text-slate-600">
              <div className="flex items-start gap-3 bg-slate-50 p-4 rounded-lg">
                <Users className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-slate-700">Sign In with Google</p>
                  <p>Click the "Sign In" button in the header to authenticate with your Google account. This enables cloud sync and collaboration features.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 bg-slate-50 p-4 rounded-lg">
                <FolderOpen className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-slate-700">Workspace Library</p>
                  <p>The left sidebar shows all projects in the shared workspace. Click any project to load it, or click the <strong>+</strong> button to create a new one.</p>
                </div>
              </div>
            </div>
          </section>

          {/* Editing & Locking */}
          <section>
            <h3 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
              <span className="w-6 h-6 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-xs font-bold">2</span>
              Editing & Locking
            </h3>
            <div className="space-y-3 text-sm text-slate-600">
              <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 p-4 rounded-lg">
                <Lock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-amber-800">Lock Before Editing</p>
                  <p className="text-amber-700">To prevent conflicts, you must click <strong>"LOCK TO EDIT"</strong> before making changes. This ensures only one person edits at a time.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-200 p-4 rounded-lg">
                <Unlock className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-emerald-800">Release the Lock</p>
                  <p className="text-emerald-700">Click <strong>"UNLOCK"</strong> when you're done editing. The lock also auto-releases after 15 minutes of inactivity.</p>
                </div>
              </div>
              <p className="text-slate-500 text-xs italic">
                Note: If someone else has the lock, you'll see a read-only banner and can still view real-time updates.
              </p>
            </div>
          </section>

          {/* Chatting with AI */}
          <section>
            <h3 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
              <span className="w-6 h-6 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-xs font-bold">3</span>
              Chatting with the AI Architect
            </h3>
            <div className="space-y-3 text-sm text-slate-600">
              <div className="flex items-start gap-3 bg-slate-50 p-4 rounded-lg">
                <MessageSquare className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-slate-700">Describe Your Requirements</p>
                  <p>Use the chat panel on the left to describe your project goals, features, or paste existing requirements. The AI will ask clarifying questions to understand your needs.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 bg-slate-50 p-4 rounded-lg">
                <Paperclip className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-slate-700">Attach Files</p>
                  <p>Click the paperclip icon to attach images, PDFs, or documents. The AI can analyze these to extract requirements.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 bg-slate-50 p-4 rounded-lg">
                <Bot className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-slate-700">AI Generates Documentation</p>
                  <p>As you chat, the AI automatically generates and updates the Functional Spec, Technical Spec, and Implementation Plan in real-time.</p>
                </div>
              </div>
            </div>
          </section>

          {/* Document Tabs */}
          <section>
            <h3 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
              <span className="w-6 h-6 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-xs font-bold">4</span>
              Document Tabs
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-4 h-4 text-indigo-600" />
                  <p className="font-semibold text-indigo-800">Functional Spec</p>
                </div>
                <p className="text-indigo-700 text-xs">Business requirements, user stories, features, and acceptance criteria.</p>
              </div>
              <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Code className="w-4 h-4 text-emerald-600" />
                  <p className="font-semibold text-emerald-800">Technical Spec</p>
                </div>
                <p className="text-emerald-700 text-xs">Architecture, database schemas, API endpoints, and technical decisions.</p>
              </div>
              <div className="bg-purple-50 border border-purple-200 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <ListChecks className="w-4 h-4 text-purple-600" />
                  <p className="font-semibold text-purple-800">Implementation Plan</p>
                </div>
                <p className="text-purple-700 text-xs">Step-by-step tasks, phases, and milestones for development.</p>
              </div>
            </div>
            <p className="text-slate-500 text-xs mt-3">
              Toggle between <strong>Preview</strong> and <strong>Edit</strong> mode using the button in the tab header.
            </p>
          </section>

          {/* Visual Diagrams */}
          <section>
            <h3 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
              <span className="w-6 h-6 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-xs font-bold">5</span>
              Visual Diagrams
            </h3>
            <div className="space-y-3 text-sm text-slate-600">
              <div className="flex items-start gap-3 bg-slate-50 p-4 rounded-lg">
                <BarChart3 className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-slate-700">Auto-Generated Diagrams</p>
                  <p>The AI creates visual diagrams including <strong>Gantt Charts</strong>, <strong>Flowcharts</strong>, <strong>ER Diagrams</strong>, <strong>Sequence Diagrams</strong>, <strong>Mind Maps</strong>, <strong>State Diagrams</strong>, and <strong>Timelines</strong>. Each diagram shows a colored label indicating its type.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 bg-slate-50 p-4 rounded-lg">
                <Maximize2 className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-slate-700">Fullscreen View</p>
                  <p>Click the <strong>"Expand"</strong> button on any diagram to open it in fullscreen mode. Diagrams automatically fit to your screen for optimal viewing.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 bg-slate-50 p-4 rounded-lg">
                <ZoomIn className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-slate-700">Figma-like Controls</p>
                  <p>In fullscreen mode: <strong>Ctrl/Cmd + scroll</strong> zooms toward your cursor (up to 1000%). Hold <strong>Space + drag</strong> to pan around. Use the <strong>Reset</strong> button to return to fit view. Press <strong>ESC</strong> to close.</p>
                </div>
              </div>
            </div>
          </section>

          {/* Exporting */}
          <section>
            <h3 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
              <span className="w-6 h-6 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-xs font-bold">6</span>
              Exporting Documents
            </h3>
            <div className="flex items-start gap-3 bg-slate-50 p-4 rounded-lg text-sm text-slate-600">
              <Download className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-slate-700">Download as Markdown</p>
                <p>Click the download icon in the header to export any document as a <strong>.md</strong> file. Use these files in your project documentation, wikis, or development tools.</p>
              </div>
            </div>
          </section>

          {/* Tips */}
          <section className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 p-5 rounded-xl">
            <h3 className="text-lg font-bold text-indigo-800 mb-3">Pro Tips</h3>
            <ul className="space-y-2 text-sm text-indigo-700">
              <li className="flex items-start gap-2">
                <span className="text-indigo-400">•</span>
                <span>Be specific when describing features - the AI will ask follow-up questions if needed.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-indigo-400">•</span>
                <span>Use Shift+Enter to add new lines in the chat without sending.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-indigo-400">•</span>
                <span>Click the project name in the header to rename it.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-indigo-400">•</span>
                <span>All changes are auto-saved to the cloud when you have the lock.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-indigo-400">•</span>
                <span>The AI uses a default tech stack (React, Next.js, Supabase) but you can specify alternatives.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-indigo-400">•</span>
                <span>Ask the AI to "add a Gantt chart" or "create an ER diagram" to enhance your documentation visually.</span>
              </li>
            </ul>
          </section>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 px-6 py-4 bg-slate-50 shrink-0">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">
              Draftio v1.0 • Powered by Gemini AI
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors"
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
