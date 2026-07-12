"use client";

import ReactMarkdown from "react-markdown";

/**
 * Lightweight wrapper around react-markdown for rendering LLM responses.
 * Strips block-level wrappers (like <p>) when `inline` is true so it can
 * sit inside <li>, <span>, or other inline contexts without nesting issues.
 */
export function Markdown({
  children,
  className,
  inline,
}: {
  children: string;
  className?: string;
  inline?: boolean;
}) {
  return (
    <div className={className}>
      <ReactMarkdown
        components={
          inline
            ? {
                // Replace block <p> with a <span> to avoid invalid nesting.
                p: ({ children }) => <span>{children}</span>,
              }
            : undefined
        }
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}

