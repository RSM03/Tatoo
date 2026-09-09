'use client';

import React from 'react';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

/**
 * Parses inline formatting tokens:
 * - **bold** or __bold__ -> <strong>
 * - *italic* or _italic_ -> <em>
 * - `code` -> <code>
 * - [text](url) -> <a>
 */
function renderInlineText(text: string): React.ReactNode[] {
  // Regex matches bold, code, links, italics
  const inlineRegex = /(\*\*([^*]+)\*\*|__([^_]+)__|`([^`]+)`|\[([^\]]+)\]\(([^)]+)\)|\*([^*]+)\*|_([^_]+)_)/g;

  const elements: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = inlineRegex.exec(text)) !== null) {
    const matchIndex = match.index;

    // Push preceding plain text
    if (matchIndex > lastIndex) {
      elements.push(text.substring(lastIndex, matchIndex));
    }

    const fullMatch = match[0];

    if (fullMatch.startsWith('**') && fullMatch.endsWith('**')) {
      const inner = fullMatch.slice(2, -2);
      elements.push(
        <strong key={`bold-${matchIndex}`} className="font-bold text-white tracking-wide">
          {inner}
        </strong>
      );
    } else if (fullMatch.startsWith('__') && fullMatch.endsWith('__')) {
      const inner = fullMatch.slice(2, -2);
      elements.push(
        <strong key={`bold-u-${matchIndex}`} className="font-bold text-white tracking-wide">
          {inner}
        </strong>
      );
    } else if (fullMatch.startsWith('`') && fullMatch.endsWith('`')) {
      const inner = fullMatch.slice(1, -1);
      elements.push(
        <code
          key={`code-${matchIndex}`}
          className="px-1.5 py-0.5 rounded bg-black/40 border border-white/10 text-crimson-400 font-mono text-xs"
        >
          {inner}
        </code>
      );
    } else if (fullMatch.startsWith('[') && fullMatch.includes('](')) {
      const linkMatch = fullMatch.match(/\[([^\]]+)\]\(([^)]+)\)/);
      if (linkMatch) {
        elements.push(
          <a
            key={`link-${matchIndex}`}
            href={linkMatch[2]}
            target="_blank"
            rel="noopener noreferrer"
            className="text-crimson-400 hover:text-crimson-300 underline underline-offset-2 transition-colors font-semibold"
          >
            {linkMatch[1]}
          </a>
        );
      }
    } else if ((fullMatch.startsWith('*') && fullMatch.endsWith('*')) || (fullMatch.startsWith('_') && fullMatch.endsWith('_'))) {
      const inner = fullMatch.slice(1, -1);
      elements.push(
        <em key={`em-${matchIndex}`} className="italic text-ink-200">
          {inner}
        </em>
      );
    } else {
      elements.push(fullMatch);
    }

    lastIndex = matchIndex + fullMatch.length;
  }

  // Push remaining text
  if (lastIndex < text.length) {
    elements.push(text.substring(lastIndex));
  }

  return elements.length > 0 ? elements : [text];
}

/**
 * Robust, lightweight Markdown renderer for Chat & Portal
 * Renders bold without asterisks, bullet lists, numbered lists, blockquotes, code, and headers.
 */
export default function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  if (!content) return null;

  const lines = content.split('\n');
  const renderedBlocks: React.ReactNode[] = [];

  let currentList: { type: 'ul' | 'ol'; items: string[] } | null = null;

  const flushList = (keySuffix: number) => {
    if (!currentList) return;
    if (currentList.type === 'ul') {
      renderedBlocks.push(
        <ul key={`ul-${keySuffix}`} className="my-1.5 space-y-1 pl-1">
          {currentList.items.map((item, idx) => (
            <li key={`li-${keySuffix}-${idx}`} className="flex items-start gap-2">
              <span className="text-crimson-500 font-bold leading-relaxed select-none">•</span>
              <div className="flex-1 leading-relaxed">{renderInlineText(item)}</div>
            </li>
          ))}
        </ul>
      );
    } else {
      renderedBlocks.push(
        <ol key={`ol-${keySuffix}`} className="my-1.5 space-y-1 pl-1">
          {currentList.items.map((item, idx) => (
            <li key={`oli-${keySuffix}-${idx}`} className="flex items-start gap-2">
              <span className="text-amber-400 font-mono text-xs font-bold pt-0.5 select-none">{idx + 1}.</span>
              <div className="flex-1 leading-relaxed">{renderInlineText(item)}</div>
            </li>
          ))}
        </ol>
      );
    }
    currentList = null;
  };

  lines.forEach((rawLine, index) => {
    const line = rawLine.trim();

    // Bullet list item: starts with "- " or "* "
    const bulletMatch = line.match(/^[-*]\s+(.*)$/);
    if (bulletMatch) {
      if (!currentList || currentList.type !== 'ul') {
        flushList(index);
        currentList = { type: 'ul', items: [] };
      }
      currentList.items.push(bulletMatch[1]);
      return;
    }

    // Numbered list item: starts with "1. ", "2. ", etc.
    const numberedMatch = line.match(/^\d+\.\s+(.*)$/);
    if (numberedMatch) {
      if (!currentList || currentList.type !== 'ol') {
        flushList(index);
        currentList = { type: 'ol', items: [] };
      }
      currentList.items.push(numberedMatch[1]);
      return;
    }

    // Flush any list before non-list elements
    if (currentList) {
      flushList(index);
    }

    // Empty line
    if (!line) {
      renderedBlocks.push(<div key={`empty-${index}`} className="h-1.5" />);
      return;
    }

    // Headers
    if (line.startsWith('### ')) {
      renderedBlocks.push(
        <h4 key={`h4-${index}`} className="font-display font-bold text-sm text-crimson-400 mt-2 mb-0.5">
          {renderInlineText(line.slice(4))}
        </h4>
      );
      return;
    }

    if (line.startsWith('## ')) {
      renderedBlocks.push(
        <h3 key={`h3-${index}`} className="font-display font-bold text-base text-white mt-2.5 mb-1">
          {renderInlineText(line.slice(3))}
        </h3>
      );
      return;
    }

    if (line.startsWith('# ')) {
      renderedBlocks.push(
        <h2 key={`h2-${index}`} className="font-display font-bold text-lg text-white mt-3 mb-1">
          {renderInlineText(line.slice(2))}
        </h2>
      );
      return;
    }

    // Blockquote
    if (line.startsWith('> ')) {
      renderedBlocks.push(
        <blockquote key={`quote-${index}`} className="border-l-2 border-crimson-500/80 pl-3 my-1 text-xs text-ink-300 italic bg-white/5 py-1 rounded-r-lg">
          {renderInlineText(line.slice(2))}
        </blockquote>
      );
      return;
    }

    // Normal paragraph line
    renderedBlocks.push(
      <p key={`p-${index}`} className="leading-relaxed my-0.5">
        {renderInlineText(rawLine)}
      </p>
    );
  });

  if (currentList) {
    flushList(lines.length);
  }

  return <div className={`text-xs sm:text-sm leading-relaxed ${className}`}>{renderedBlocks}</div>;
}
