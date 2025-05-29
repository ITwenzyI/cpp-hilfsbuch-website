import React from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark, oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";

export default function CodeBlock({ code, language = "cpp" }) {
  const copyToClipboard = () => navigator.clipboard.writeText(code);

  const isDark = document.documentElement.classList.contains("dark");

  return (
    <div className="relative mb-6">
      <button
        onClick={copyToClipboard}
        className="absolute top-2 right-2 z-10 bg-gray-200 dark:bg-gray-700 text-xs px-3 py-1 rounded shadow hover:bg-gray-300 dark:hover:bg-gray-600 transition"
      >
        📋 Kopieren
      </button>
      <SyntaxHighlighter
        language={language}
        style={isDark ? oneDark : oneLight}
        wrapLines
        wrapLongLines
        customStyle={{ borderRadius: "0.75rem", fontSize: "0.85rem", padding: "1rem", marginTop: "1.5rem" }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}