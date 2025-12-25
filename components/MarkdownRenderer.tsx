
import React from 'react';
import MermaidRenderer from './MermaidRenderer';

interface MarkdownRendererProps {
  content: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  if (!content) return null;

  // First, split out mermaid blocks
  const mermaidRegex = /```mermaid([\s\S]*?)```/g;
  const parts: { type: 'markdown' | 'mermaid'; content: string }[] = [];
  let lastIndex = 0;
  let match;

  while ((match = mermaidRegex.exec(content)) !== null) {
    // Add markdown before mermaid
    if (match.index > lastIndex) {
      parts.push({ type: 'markdown', content: content.slice(lastIndex, match.index) });
    }
    // Add mermaid block
    parts.push({ type: 'mermaid', content: match[1].trim() });
    lastIndex = match.index + match[0].length;
  }
  // Add remaining markdown
  if (lastIndex < content.length) {
    parts.push({ type: 'markdown', content: content.slice(lastIndex) });
  }

  return (
    <div className="markdown-content">
      {parts.map((part, index) => {
        if (part.type === 'mermaid') {
          return <MermaidRenderer key={index} chart={part.content} />;
        }
        return <MarkdownSection key={index} content={part.content} />;
      })}
    </div>
  );
};

const MarkdownSection: React.FC<{ content: string }> = ({ content }) => {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Code blocks (non-mermaid)
    if (line.startsWith('```')) {
      const language = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      elements.push(
        <pre key={elements.length} className="bg-slate-900 text-slate-100 rounded-lg p-4 overflow-x-auto my-4 text-sm">
          {language && (
            <div className="text-xs text-slate-500 uppercase font-semibold mb-2 -mt-1">{language}</div>
          )}
          <code className="font-mono">{codeLines.join('\n')}</code>
        </pre>
      );
      i++;
      continue;
    }

    // Headings
    if (line.startsWith('#### ')) {
      elements.push(
        <h4 key={elements.length} className="text-base font-bold text-slate-700 mt-6 mb-2">
          {renderInlineMarkdown(line.slice(5))}
        </h4>
      );
      i++;
      continue;
    }

    if (line.startsWith('### ')) {
      elements.push(
        <h3 key={elements.length} className="text-lg font-bold text-slate-800 mt-6 mb-3 pb-2 border-b border-slate-100">
          {renderInlineMarkdown(line.slice(4))}
        </h3>
      );
      i++;
      continue;
    }

    if (line.startsWith('## ')) {
      elements.push(
        <h2 key={elements.length} className="text-xl font-bold text-slate-900 mt-8 mb-4 pb-2 border-b border-slate-200">
          {renderInlineMarkdown(line.slice(3))}
        </h2>
      );
      i++;
      continue;
    }

    if (line.startsWith('# ')) {
      elements.push(
        <h1 key={elements.length} className="text-2xl font-bold text-slate-900 mt-8 mb-4 pb-3 border-b-2 border-indigo-200">
          {renderInlineMarkdown(line.slice(2))}
        </h1>
      );
      i++;
      continue;
    }

    // Horizontal rule
    if (line.match(/^(-{3,}|\*{3,}|_{3,})$/)) {
      elements.push(<hr key={elements.length} className="my-6 border-slate-200" />);
      i++;
      continue;
    }

    // Unordered lists
    if (line.match(/^(\s*)[-*]\s/)) {
      const listItems: { indent: number; content: string; isChecked?: boolean }[] = [];
      while (i < lines.length && lines[i].match(/^(\s*)[-*]\s/)) {
        const listMatch = lines[i].match(/^(\s*)[-*]\s(.*)$/);
        if (listMatch) {
          const indent = listMatch[1].length;
          let itemContent = listMatch[2];
          let isChecked: boolean | undefined;

          // Check for checkbox
          if (itemContent.startsWith('[ ] ')) {
            isChecked = false;
            itemContent = itemContent.slice(4);
          } else if (itemContent.startsWith('[x] ') || itemContent.startsWith('[X] ')) {
            isChecked = true;
            itemContent = itemContent.slice(4);
          }

          listItems.push({ indent, content: itemContent, isChecked });
        }
        i++;
      }
      elements.push(
        <ul key={elements.length} className="my-3 space-y-1.5">
          {listItems.map((item, idx) => (
            <li
              key={idx}
              className="flex items-start gap-2 text-sm text-slate-600"
              style={{ marginLeft: `${item.indent * 12}px` }}
            >
              {item.isChecked !== undefined ? (
                <span className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                  item.isChecked
                    ? 'bg-emerald-500 border-emerald-500 text-white'
                    : 'border-slate-300 bg-white'
                }`}>
                  {item.isChecked && (
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </span>
              ) : (
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
              )}
              <span className={item.isChecked ? 'line-through text-slate-400' : ''}>
                {renderInlineMarkdown(item.content)}
              </span>
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // Ordered lists
    if (line.match(/^(\s*)\d+\.\s/)) {
      const listItems: { indent: number; content: string; number: number }[] = [];
      while (i < lines.length && lines[i].match(/^(\s*)\d+\.\s/)) {
        const listMatch = lines[i].match(/^(\s*)(\d+)\.\s(.*)$/);
        if (listMatch) {
          listItems.push({
            indent: listMatch[1].length,
            number: parseInt(listMatch[2]),
            content: listMatch[3]
          });
        }
        i++;
      }
      elements.push(
        <ol key={elements.length} className="my-3 space-y-1.5">
          {listItems.map((item, idx) => (
            <li
              key={idx}
              className="flex items-start gap-3 text-sm text-slate-600"
              style={{ marginLeft: `${item.indent * 12}px` }}
            >
              <span className="mt-0.5 w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center shrink-0">
                {item.number}
              </span>
              <span>{renderInlineMarkdown(item.content)}</span>
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // Blockquotes
    if (line.startsWith('> ')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].startsWith('> ')) {
        quoteLines.push(lines[i].slice(2));
        i++;
      }
      elements.push(
        <blockquote key={elements.length} className="border-l-4 border-indigo-300 bg-indigo-50/50 pl-4 py-2 my-4 text-sm text-slate-600 italic">
          {quoteLines.map((ql, idx) => (
            <p key={idx}>{renderInlineMarkdown(ql)}</p>
          ))}
        </blockquote>
      );
      continue;
    }

    // Empty lines
    if (line.trim() === '') {
      elements.push(<div key={elements.length} className="h-2" />);
      i++;
      continue;
    }

    // Regular paragraphs
    elements.push(
      <p key={elements.length} className="text-sm text-slate-600 leading-relaxed my-2">
        {renderInlineMarkdown(line)}
      </p>
    );
    i++;
  }

  return <>{elements}</>;
};

// Render inline markdown (bold, italic, code, links)
function renderInlineMarkdown(text: string): React.ReactNode {
  const elements: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    // Bold + Italic (***text***)
    let match = remaining.match(/^\*\*\*(.+?)\*\*\*/);
    if (match) {
      elements.push(
        <strong key={key++} className="font-bold italic text-slate-800">
          {match[1]}
        </strong>
      );
      remaining = remaining.slice(match[0].length);
      continue;
    }

    // Bold (**text**)
    match = remaining.match(/^\*\*(.+?)\*\*/);
    if (match) {
      elements.push(
        <strong key={key++} className="font-semibold text-slate-800">
          {match[1]}
        </strong>
      );
      remaining = remaining.slice(match[0].length);
      continue;
    }

    // Italic (*text*)
    match = remaining.match(/^\*([^*]+?)\*/);
    if (match) {
      elements.push(
        <em key={key++} className="italic text-slate-700">
          {match[1]}
        </em>
      );
      remaining = remaining.slice(match[0].length);
      continue;
    }

    // Inline code (`code`)
    match = remaining.match(/^`([^`]+)`/);
    if (match) {
      elements.push(
        <code key={key++} className="px-1.5 py-0.5 bg-slate-100 text-indigo-600 rounded text-xs font-mono">
          {match[1]}
        </code>
      );
      remaining = remaining.slice(match[0].length);
      continue;
    }

    // Links [text](url)
    match = remaining.match(/^\[([^\]]+)\]\(([^)]+)\)/);
    if (match) {
      elements.push(
        <a
          key={key++}
          href={match[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-indigo-600 hover:text-indigo-800 underline underline-offset-2"
        >
          {match[1]}
        </a>
      );
      remaining = remaining.slice(match[0].length);
      continue;
    }

    // Plain text (take characters until next special character)
    const nextSpecial = remaining.search(/[\*`\[]/);
    if (nextSpecial === -1) {
      elements.push(remaining);
      break;
    } else if (nextSpecial === 0) {
      // Special char but didn't match pattern, treat as literal
      elements.push(remaining[0]);
      remaining = remaining.slice(1);
    } else {
      elements.push(remaining.slice(0, nextSpecial));
      remaining = remaining.slice(nextSpecial);
    }
  }

  return elements.length === 1 ? elements[0] : elements;
}

export default MarkdownRenderer;
