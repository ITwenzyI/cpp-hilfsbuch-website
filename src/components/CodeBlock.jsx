import React, { useEffect, useState } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark, oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";

export default function CodeBlock({ title, code, language = "cpp" }) {
  const [copied, setCopied] = useState(false);
  const isDark = document.documentElement.classList.contains("dark");

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
  };

  useEffect(() => {
    if (!copied) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => setCopied(false), 1800);
    return () => window.clearTimeout(timeoutId);
  }, [copied]);

  return (
    <section className="mb-6">
      {title && (
        <h4 className="font-semibold mb-2">
          {title}
        </h4>
      )}

      <div className="relative">
        <button
          onClick={copyToClipboard}
          className={`absolute top-2 right-2 z-10 rounded px-3 py-1 text-xs shadow transition ${
            copied
              ? "bg-emerald-500 text-white"
              : "bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600"
          }`}
        >
          {copied ? "Kopiert" : "📋 Kopieren"}
        </button>

        <SyntaxHighlighter
          language={language}
          style={isDark ? oneDark : oneLight}
          wrapLines
          wrapLongLines
          customStyle={{
            borderRadius: "0.75rem",
            fontSize: "0.85rem",
            padding: "1rem",
            marginTop: "1.5rem"
          }}
        >
          {code}
        </SyntaxHighlighter>
      </div>
    </section>
  );
}
