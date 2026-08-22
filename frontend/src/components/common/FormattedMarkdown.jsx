import React from 'react';

/**
 * Normalizes raw AI output text into properly newline-separated markdown
 */
function normalizeMarkdown(text) {
  if (!text) return '';
  let str = String(text);

  // Replace literal '\n' string representations with actual newlines if present
  str = str.replace(/\\n/g, '\n');

  // Insert double newlines before headers (e.g. "...text ### Header" -> "...text \n\n### Header")
  str = str.replace(/([^\n])\s*(###|####)\s+/g, '$1\n\n$2 ');

  // Insert newlines before numbered items (e.g. "...text 1. **Header**" or "...text ### 1.")
  str = str.replace(/([^\n])\s+(\d+\.\s+)/g, '$1\n$2');

  // Insert newlines before bullet items (e.g. "...text - Item")
  str = str.replace(/([^\n])\s+-\s+/g, '$1\n- ');

  return str;
}

/**
 * Parses inline formatting like **bold**, [link](url), and `code`
 */
function renderInline(text, accentColor = '#60a5fa') {
  if (!text) return null;

  // Tokenize string by markdown inline tokens
  const regex = /(\*\*.*?\*\*|\[.*?\]\(.*?\)|`.*?`)/g;
  const parts = text.split(regex);

  return parts.map((part, idx) => {
    if (!part) return null;

    // Bold text **text**
    if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      const content = part.slice(2, -2);
      return (
        <strong key={idx} style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
          {content}
        </strong>
      );
    }

    // Links [Text](url)
    if (part.startsWith('[') && part.includes('](') && part.endsWith(')')) {
      const match = part.match(/^\[(.*?)\]\((.*?)\)$/);
      if (match) {
        return (
          <a
            key={idx}
            href={match[2]}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: accentColor,
              textDecoration: 'underline',
              fontWeight: 500,
              wordBreak: 'break-all'
            }}
          >
            {match[1]}
          </a>
        );
      }
    }

    // Inline Code `code`
    if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
      return (
        <code
          key={idx}
          style={{
            background: 'rgba(255,255,255,0.08)',
            padding: '1px 5px',
            borderRadius: '4px',
            fontFamily: 'monospace',
            fontSize: '0.88em'
          }}
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    return part;
  });
}

export default function FormattedMarkdown({ text, accentColor = '#60a5fa', style = {}, className = '' }) {
  if (!text) return null;

  const normalized = normalizeMarkdown(text);
  const lines = normalized.split('\n');

  const elements = [];

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed) {
      elements.push(<div key={`spacer-${index}`} style={{ height: '4px' }} />);
      return;
    }

    // H3 Header: ### Header
    if (trimmed.startsWith('### ')) {
      const headerText = trimmed.replace(/^###\s+/, '');
      elements.push(
        <div
          key={`h3-${index}`}
          style={{
            fontSize: '13px',
            fontWeight: 700,
            color: accentColor,
            marginTop: index === 0 ? '0' : '0.85rem',
            marginBottom: '0.4rem',
            paddingBottom: '3px',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            letterSpacing: '0.02em'
          }}
        >
          <span style={{ fontSize: '10px', opacity: 0.8 }}>▲</span>
          {renderInline(headerText, accentColor)}
        </div>
      );
      return;
    }

    // H4 Header: #### Header
    if (trimmed.startsWith('#### ')) {
      const headerText = trimmed.replace(/^####\s+/, '');
      elements.push(
        <div
          key={`h4-${index}`}
          style={{
            fontSize: '12px',
            fontWeight: 600,
            color: 'var(--text-primary)',
            marginTop: '0.6rem',
            marginBottom: '0.3rem',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <span style={{ color: accentColor, fontSize: '10px' }}>▸</span>
          {renderInline(headerText, accentColor)}
        </div>
      );
      return;
    }

    // Numbered List Item: 1. Item or 2. Item
    const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
    if (numMatch) {
      const num = numMatch[1];
      const content = numMatch[2];
      elements.push(
        <div
          key={`num-${index}`}
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '8px',
            marginTop: '0.35rem',
            marginBottom: '0.35rem',
            paddingLeft: '2px'
          }}
        >
          <span
            style={{
              background: `${accentColor}20`,
              color: accentColor,
              borderRadius: '50%',
              width: '18px',
              height: '18px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '11px',
              fontWeight: 700,
              flexShrink: 0,
              marginTop: '1px',
              border: `1px solid ${accentColor}40`
            }}
          >
            {num}
          </span>
          <div style={{ flex: 1, lineHeight: 1.5, fontSize: '12px', color: 'var(--text-secondary)' }}>
            {renderInline(content, accentColor)}
          </div>
        </div>
      );
      return;
    }

    // Bullet List Item: - Item or * Item
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      const content = trimmed.replace(/^[-*]\s+/, '');
      elements.push(
        <div
          key={`bullet-${index}`}
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '8px',
            marginTop: '0.25rem',
            marginBottom: '0.25rem',
            paddingLeft: '10px'
          }}
        >
          <span
            style={{
              color: accentColor,
              fontSize: '12px',
              flexShrink: 0,
              marginTop: '1px',
              lineHeight: 1.2
            }}
          >
            ●
          </span>
          <div style={{ flex: 1, lineHeight: 1.5, fontSize: '12px', color: 'var(--text-secondary)' }}>
            {renderInline(content, accentColor)}
          </div>
        </div>
      );
      return;
    }

    // Standard Paragraph / Key-Value
    elements.push(
      <div
        key={`p-${index}`}
        style={{
          fontSize: '12px',
          color: 'var(--text-secondary)',
          lineHeight: 1.55,
          marginTop: '0.25rem',
          marginBottom: '0.25rem'
        }}
      >
        {renderInline(trimmed, accentColor)}
      </div>
    );
  });

  return (
    <div className={`formatted-markdown ${className}`} style={{ ...style }}>
      {elements}
    </div>
  );
}
