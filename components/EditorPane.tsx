
import React, { useState } from 'react';
import { FileText, Code, RotateCcw, Copy, Check, ListChecks } from 'lucide-react';
import { TabType } from '../types';
import MermaidRenderer from './MermaidRenderer';

interface EditorPaneProps {
  functional: string;
  technical: string;
  implementationPlan: string;
  onUpdateFunctional: (val: string) => void;
  onUpdateTechnical: (val: string) => void;
  onUpdateImplementationPlan: (val: string) => void;
}

const EditorPane: React.FC<EditorPaneProps> = ({ functional, technical, implementationPlan, onUpdateFunctional, onUpdateTechnical, onUpdateImplementationPlan }) => {
  const [activeTab, setActiveTab] = useState<TabType>(TabType.FUNCTIONAL);
  const [isPreview, setIsPreview] = useState(true);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle');

  const handleCopy = () => {
    const content = activeTab === TabType.FUNCTIONAL ? functional : activeTab === TabType.TECHNICAL ? technical : implementationPlan;
    navigator.clipboard.writeText(content);
    setCopyStatus('copied');
    setTimeout(() => setCopyStatus('idle'), 2000);
  };

  const renderContent = (content: string) => {
    if (!content) return null;
    const parts = content.split(/```mermaid([\s\S]*?)```/);
    return parts.map((part, index) => {
      if (index % 2 === 1) {
        return <MermaidRenderer key={index} chart={part.trim()} />;
      }
      return (
        <div key={index} className="prose prose-slate max-w-none prose-sm whitespace-pre-wrap leading-relaxed">
          {part}
        </div>
      );
    });
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Tab Header */}
      <div className="flex items-center justify-between px-4 border-b border-slate-200 bg-slate-50/50">
        <div className="flex">
          <button
            onClick={() => setActiveTab(TabType.FUNCTIONAL)}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-all border-b-2 -mb-[1px] ${
              activeTab === TabType.FUNCTIONAL 
                ? 'border-indigo-600 text-indigo-600 bg-white' 
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <FileText className="w-4 h-4" />
            Functional Spec
          </button>
          <button
            onClick={() => setActiveTab(TabType.TECHNICAL)}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-all border-b-2 -mb-[1px] ${
              activeTab === TabType.TECHNICAL
                ? 'border-indigo-600 text-indigo-600 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Code className="w-4 h-4" />
            Technical Spec
          </button>
          <button
            onClick={() => setActiveTab(TabType.IMPLEMENTATION_PLAN)}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-all border-b-2 -mb-[1px] ${
              activeTab === TabType.IMPLEMENTATION_PLAN
                ? 'border-indigo-600 text-indigo-600 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <ListChecks className="w-4 h-4" />
            Implementation Plan
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleCopy}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-semibold transition-all border shadow-sm ${
              copyStatus === 'copied' 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            {copyStatus === 'copied' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copyStatus === 'copied' ? 'Copied' : 'Copy'}
          </button>
          <button
            onClick={() => setIsPreview(!isPreview)}
            className={`text-xs px-3 py-1.5 rounded-full font-semibold transition-all border shadow-sm ${
              !isPreview
                ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            {isPreview ? '✏️ Edit' : '👁️ Preview'}
          </button>
          <div className="h-6 w-[1px] bg-slate-200 mx-2" />
          <button className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-all">
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Editor/Viewer Body */}
      <div className="flex-1 overflow-hidden relative bg-slate-50/30">
        <div className="h-full overflow-y-auto p-8 max-w-4xl mx-auto w-full">
          <div className="bg-white min-h-full rounded-xl border border-slate-200 shadow-sm p-8 lg:p-12">
            {activeTab === TabType.FUNCTIONAL ? (
              isPreview ? (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                  {functional ? renderContent(functional) : <EmptyState text="No functional documentation generated yet." />}
                </div>
              ) : (
                <textarea
                  value={functional}
                  onChange={(e) => onUpdateFunctional(e.target.value)}
                  className="w-full h-full min-h-[500px] text-sm font-mono p-4 border border-slate-100 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:outline-none resize-none bg-slate-50/50"
                  placeholder="Type functional requirements here..."
                />
              )
            ) : activeTab === TabType.TECHNICAL ? (
              isPreview ? (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                  {technical ? renderContent(technical) : <EmptyState text="No technical documentation generated yet." />}
                </div>
              ) : (
                <textarea
                  value={technical}
                  onChange={(e) => onUpdateTechnical(e.target.value)}
                  className="w-full h-full min-h-[500px] text-sm font-mono p-4 border border-slate-100 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:outline-none resize-none bg-slate-50/50"
                  placeholder="Type technical requirements here (SQL, Endpoints, Mermaid)..."
                />
              )
            ) : (
              isPreview ? (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                  {implementationPlan ? renderContent(implementationPlan) : <EmptyState text="No implementation plan generated yet." />}
                </div>
              ) : (
                <textarea
                  value={implementationPlan}
                  onChange={(e) => onUpdateImplementationPlan(e.target.value)}
                  className="w-full h-full min-h-[500px] text-sm font-mono p-4 border border-slate-100 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:outline-none resize-none bg-slate-50/50"
                  placeholder="Type implementation plan here (steps, tasks, milestones)..."
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
