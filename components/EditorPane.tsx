
import React, { useState } from 'react';
import { FileText, Code, RotateCcw, Copy, Check, ListChecks } from 'lucide-react';
import { TabType } from '../types';
import MarkdownRenderer from './MarkdownRenderer';

interface EditorPaneProps {
  functional: string;
  technical: string;
  implementationPlan: string;
  onUpdateFunctional: (val: string) => void;
  onUpdateTechnical: (val: string) => void;
  onUpdateImplementationPlan: (val: string) => void;
  isReadOnly: boolean;
  lockedByName?: string | null;
}

const EditorPane: React.FC<EditorPaneProps> = ({ functional, technical, implementationPlan, onUpdateFunctional, onUpdateTechnical, onUpdateImplementationPlan, isReadOnly, lockedByName }) => {
  const [activeTab, setActiveTab] = useState<TabType>(TabType.FUNCTIONAL);
  const [isPreview, setIsPreview] = useState(true);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle');

  const handleCopy = () => {
    const content = activeTab === TabType.FUNCTIONAL ? functional : activeTab === TabType.TECHNICAL ? technical : implementationPlan;
    navigator.clipboard.writeText(content);
    setCopyStatus('copied');
    setTimeout(() => setCopyStatus('idle'), 2000);
  };

  return (
    <div className="flex flex-col h-full w-full bg-white">
      {/* Tab Header */}
      <div className="flex items-center justify-between px-2 sm:px-4 border-b border-slate-200 bg-slate-50/50">
        <div className="flex flex-1 min-w-0">
          <button
            onClick={() => setActiveTab(TabType.FUNCTIONAL)}
            className={`flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-4 lg:px-6 py-3 sm:py-4 text-xs sm:text-sm font-medium transition-all border-b-2 -mb-[1px] min-w-0 ${
              activeTab === TabType.FUNCTIONAL
                ? 'border-indigo-600 text-indigo-600 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <FileText className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline truncate">Functional</span>
            <span className="hidden lg:inline"> Spec</span>
          </button>
          <button
            onClick={() => setActiveTab(TabType.TECHNICAL)}
            className={`flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-4 lg:px-6 py-3 sm:py-4 text-xs sm:text-sm font-medium transition-all border-b-2 -mb-[1px] min-w-0 ${
              activeTab === TabType.TECHNICAL
                ? 'border-indigo-600 text-indigo-600 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Code className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline truncate">Technical</span>
            <span className="hidden lg:inline"> Spec</span>
          </button>
          <button
            onClick={() => setActiveTab(TabType.IMPLEMENTATION_PLAN)}
            className={`flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-4 lg:px-6 py-3 sm:py-4 text-xs sm:text-sm font-medium transition-all border-b-2 -mb-[1px] min-w-0 ${
              activeTab === TabType.IMPLEMENTATION_PLAN
                ? 'border-indigo-600 text-indigo-600 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <ListChecks className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline truncate">Plan</span>
            <span className="hidden lg:inline">Implementation</span>
          </button>
        </div>
        <div className="flex items-center gap-1 sm:gap-2 shrink-0 ml-2">
          <button
            onClick={handleCopy}
            className={`flex items-center gap-1 sm:gap-1.5 text-xs px-2 sm:px-3 py-1.5 rounded-full font-semibold transition-all border shadow-sm ${
              copyStatus === 'copied'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            {copyStatus === 'copied' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{copyStatus === 'copied' ? 'Copied' : 'Copy'}</span>
          </button>
          <button
            onClick={() => !isReadOnly && setIsPreview(!isPreview)}
            disabled={isReadOnly}
            className={`text-xs px-2 sm:px-3 py-1.5 rounded-full font-semibold transition-all border shadow-sm ${
              isReadOnly
                ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                : !isPreview
                ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            {isPreview ? '✏️' : '👁️'}<span className="hidden sm:inline ml-1">{isPreview ? 'Edit' : 'Preview'}</span>
          </button>
          <div className="hidden sm:block h-6 w-[1px] bg-slate-200 mx-1 sm:mx-2" />
          <button className="hidden sm:block p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-all">
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Editor/Viewer Body */}
      <div className="flex-1 overflow-hidden relative bg-slate-50/30">
        <div className="h-full overflow-y-auto p-2 sm:p-4 lg:p-6 max-w-6xl mx-auto w-full">
          <div className="bg-white min-h-full rounded-xl border border-slate-200 shadow-sm p-3 sm:p-6 lg:p-8">
            {activeTab === TabType.FUNCTIONAL ? (
              isPreview ? (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                  {functional ? <MarkdownRenderer content={functional} /> : <EmptyState text="No functional documentation generated yet." />}
                </div>
              ) : (
                <textarea
                  value={functional}
                  onChange={(e) => !isReadOnly && onUpdateFunctional(e.target.value)}
                  disabled={isReadOnly}
                  className={`w-full h-full min-h-[300px] sm:min-h-[500px] text-sm font-mono p-3 sm:p-4 border rounded-lg focus:outline-none resize-none ${
                    isReadOnly
                      ? 'bg-gray-100 border-gray-200 text-gray-600 cursor-not-allowed'
                      : 'bg-slate-50/50 border-slate-100 focus:ring-2 focus:ring-indigo-500/20'
                  }`}
                  placeholder={isReadOnly ? `🔒 Locked by ${lockedByName}` : "Type functional requirements here..."}
                />
              )
            ) : activeTab === TabType.TECHNICAL ? (
              isPreview ? (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                  {technical ? <MarkdownRenderer content={technical} /> : <EmptyState text="No technical documentation generated yet." />}
                </div>
              ) : (
                <textarea
                  value={technical}
                  onChange={(e) => !isReadOnly && onUpdateTechnical(e.target.value)}
                  disabled={isReadOnly}
                  className={`w-full h-full min-h-[300px] sm:min-h-[500px] text-sm font-mono p-3 sm:p-4 border rounded-lg focus:outline-none resize-none ${
                    isReadOnly
                      ? 'bg-gray-100 border-gray-200 text-gray-600 cursor-not-allowed'
                      : 'bg-slate-50/50 border-slate-100 focus:ring-2 focus:ring-indigo-500/20'
                  }`}
                  placeholder={isReadOnly ? `🔒 Locked by ${lockedByName}` : "Type technical requirements here (SQL, Endpoints, Mermaid)..."}
                />
              )
            ) : (
              isPreview ? (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                  {implementationPlan ? <MarkdownRenderer content={implementationPlan} /> : <EmptyState text="No implementation plan generated yet." />}
                </div>
              ) : (
                <textarea
                  value={implementationPlan}
                  onChange={(e) => !isReadOnly && onUpdateImplementationPlan(e.target.value)}
                  disabled={isReadOnly}
                  className={`w-full h-full min-h-[300px] sm:min-h-[500px] text-sm font-mono p-3 sm:p-4 border rounded-lg focus:outline-none resize-none ${
                    isReadOnly
                      ? 'bg-gray-100 border-gray-200 text-gray-600 cursor-not-allowed'
                      : 'bg-slate-50/50 border-slate-100 focus:ring-2 focus:ring-indigo-500/20'
                  }`}
                  placeholder={isReadOnly ? `🔒 Locked by ${lockedByName}` : "Type implementation plan here (steps, tasks, milestones)..."}
                />
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const EmptyState: React.FC<{ text: string }> = ({ text }) => (
  <div className="flex flex-col items-center justify-center py-20 text-slate-400">
    <FileText className="w-12 h-12 mb-4 opacity-10" />
    <p className="text-sm italic">{text}</p>
  </div>
);

export default EditorPane;
