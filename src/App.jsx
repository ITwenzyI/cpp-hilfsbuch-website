import CodeBlock from "./components/CodeBlock";
import React, { useState, useEffect } from "react";
import themen from "./data/themen.json";
import Fuse from "fuse.js";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";

function App() {
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem("theme") === "dark";
  });
  const [expandedCategories, setExpandedCategories] = useState([]);
  const [showSidebar, setShowSidebar] = useState(false);
  const [selectedSubcategory, setSelectedSubcategory] = useState(null);


  useEffect(() => {
    const root = window.document.documentElement;
    if (darkMode) {
      root.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      root.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [darkMode]);

  useEffect(() => {
  const query = searchTerm.trim();

  // Mindestlänge 2 Zeichen
  if (query.length < 2) {
    setSearchResults([]);
    return;
  }

  // alle Themen extrahieren
  const allTopics = themen.flatMap((cat) =>
    cat.subcategories.flatMap((sub) =>
      sub.topics.map((topic) => ({
        ...topic,
        category: cat.category,
        subcategory: sub.name,
      }))
    )
  );

  const fuse = new Fuse(allTopics, {
    keys: [
      { name: "title", weight: 0.6 },
      { name: "content.text", weight: 0.3 },
      { name: "subcategory", weight: 0.07 },
      { name: "category", weight: 0.03 },
    ],
    threshold: 0.35,         // geringer Threshold -> weniger Spam
    ignoreLocation: true,    // Treffer überall im Text erlaubt
    includeScore: true,
  });

  const result = fuse.search(query);

  // sortieren nach Score
  const sorted = result.sort((a, b) => a.score - b.score);

  setSearchResults(sorted.map((r) => r.item));
}, [searchTerm]);



  const toggleCategory = (category) => {
    setExpandedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  };

  const formatText = (text) => {
    if (Array.isArray(text)) {
      return text.join("\n");
    }
    return text;
  };

      // === Highlight Funktion (STRG+F Stil) ===
const highlightMatch = (text, query) => {
  if (!text) return "";
  const regex = new RegExp(`(${query})`, "gi");
  return text.replace(regex, '<mark class="bg-yellow-300">$1</mark>');
};

// === Snippet Vorschau (Google Stil) ===
const getSnippet = (text, query, length = 120) => {
  if (!text) return "";
  const lower = text.toLowerCase();
  const idx = lower.indexOf(query.toLowerCase());
  if (idx === -1) return "";

  const start = Math.max(0, idx - length / 2);
  const end = Math.min(text.length, idx + length / 2);

  return text.substring(start, end) + "...";
};

  return (
    <div className="flex flex-col md:flex-row h-screen bg-gray-50 dark:bg-gray-900 dark:text-white">
      {/* Mobile Header */}
      <header className="md:hidden flex justify-between items-center p-4 bg-white dark:bg-gray-800 shadow">
        <h1 className="text-lg font-bold">C++ Hilfsbuch</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="px-3 py-1 rounded-full text-sm bg-gray-200 dark:bg-gray-600 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-500 transition"
          >
            {darkMode ? "🌞" : "🌙"}
          </button>
          <button
            onClick={() => setShowSidebar(!showSidebar)}
            className="px-3 py-1 rounded-full text-sm bg-gray-200 dark:bg-gray-600 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-500 transition"
          >
            ☰
          </button>
        </div>
      </header>

      {/* Sidebar */}
      <aside className={`md:block ${showSidebar ? "block" : "hidden"} w-full md:w-1/4 p-4 bg-white dark:bg-gray-800 shadow-lg overflow-y-auto z-10 md:z-auto`}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Kategorien</h2>
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="hidden md:inline px-3 py-1 rounded-full text-sm bg-gray-200 dark:bg-gray-600 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-500 transition"
          >
            {darkMode ? "🌞 Hell" : "🌙 Dunkel"}
          </button>
        </div>

        <ul className="space-y-2">
          {themen.map((cat, index) => (
            <li key={index}>
              {/* Kategorie */}
              <button
                className="w-full text-left px-4 py-2 rounded-xl transition flex justify-between items-center bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
                onClick={() => toggleCategory(cat.category)}
              >
                <span>{cat.category}</span>
                <span>{expandedCategories.includes(cat.category) ? "▲" : "▼"}</span>
              </button>

              {/* Unterkategorien */}
              {expandedCategories.includes(cat.category) && (
                <ul className="ml-4 mt-1 space-y-1">
                  {cat.subcategories?.map((sub, i) => (
                    <li key={i}>
                      <button
                        onClick={() =>
                          setExpandedCategories((prev) =>
                            prev.includes(sub.name)
                              ? prev.filter((c) => c !== sub.name)
                              : [...prev, sub.name]
                          )
                        }
                        className="w-full text-left px-4 py-2 rounded flex justify-between items-center bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500"
                      >
                        <span>{sub.name}</span>
                        <span>{expandedCategories.includes(sub.name) ? "▲" : "▼"}</span>
                      </button>

                      {/* Themen */}
                      {expandedCategories.includes(sub.name) && (
                        <ul className="ml-4 mt-1 space-y-1">
                          {sub.topics.map((topic, k) => (
                            <li key={k}>
                              <button
                                className="w-full text-left px-4 py-1 rounded hover:bg-blue-100 dark:hover:bg-gray-600"
                                onClick={() => {
                                  setSelectedCategory(cat);
                                  setSelectedSubcategory(sub); // <- wichtig!
                                  setSelectedTopic(topic);
                                  setShowSidebar(false);
                                }}
                              >
                                {topic.title}
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </aside>


      {/* Content */}
      <main className="flex-1 p-4 md:p-6 overflow-y-auto">
        <input
          type="text"
          placeholder="Suche nach Thema, Inhalt, Kategorie..."
          className="w-full mb-6 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-xl shadow-sm bg-white dark:bg-gray-800 text-black dark:text-white"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />

        {searchTerm.trim() ? (
          <>
            <h2 className="text-xl font-semibold mb-4">Suchergebnisse für: "{searchTerm}"</h2>
            {searchResults.length > 0 ? (
              <ul className="space-y-4">
                {searchResults.map((topic, idx) => {
  // gesamten durchsuchbaren Text generieren
let fullText = "";

if (Array.isArray(topic.content?.text)) {
  fullText += topic.content.text.join(" ");
} else if (typeof topic.content?.text === "string") {
  fullText += topic.content.text;
}

if (Array.isArray(topic.content?.code)) {
  fullText += " " + topic.content.code.join(" ");
} else if (typeof topic.content?.code === "string") {
  fullText += " " + topic.content.code;
}

// falls alles leer ist
fullText = fullText.trim();


  const snippet = getSnippet(fullText, searchTerm);

  return (
    <li
      key={idx}
      className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow hover:bg-blue-50 dark:hover:bg-gray-700 cursor-pointer"
      onClick={() => {
        const cat = themen.find((c) => c.category === topic.category);
        const sub = cat.subcategories.find((s) => s.name === topic.subcategory);

        setSelectedCategory(cat);
        setSelectedSubcategory(sub);
        setSelectedTopic(topic);

        setSearchTerm("");
        setSearchResults([]);
      }}
    >
      {/* Titel highlight */}
      <h3
        className="font-bold text-blue-600 dark:text-blue-400 mb-1"
        dangerouslySetInnerHTML={{
          __html: highlightMatch(topic.title, searchTerm),
        }}
      />

      {/* Breadcrumb */}
      <p className="text-xs text-gray-500 mb-2">
        📁 {topic.category} › 📂 {topic.subcategory}
      </p>

      {/* Snippet highlight */}
      {snippet && (
        <p
          className="text-sm text-gray-700 dark:text-gray-300"
          dangerouslySetInnerHTML={{
            __html: highlightMatch(snippet, searchTerm),
          }}
        />
      )}
    </li>
  );
})}

              </ul>
            ) : (
              <p className="text-gray-500">Keine Treffer gefunden.</p>
            )}
          </>
        ) : selectedCategory ? (
          <>
            <h1 className="text-2xl font-bold mb-4">{selectedCategory.category}</h1>
            {selectedTopic ? (
              <div>
                <button
                  onClick={() => {
                    // gehe zurück zur Unterkategorie-Übersicht
                    setSelectedTopic(null);
                  }}
                  className="mb-4 px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
                >
                  ← Zurück zur Unterkategorie
                </button>

            {/* Breadcrumb */}
<div className="text-sm text-gray-500 dark:text-gray-400 mb-2 flex flex-wrap items-center gap-1">
  <span>📁 {selectedCategory?.category}</span>

  {selectedCategory?.subcategories &&
    selectedCategory.subcategories.map((sub) =>
      sub.topics.includes(selectedTopic) ? (
        <React.Fragment key={sub.name}>
          <span className="mx-1">›</span>
          <span>📂 {sub.name}</span>
        </React.Fragment>
      ) : null
    )}

  <span className="mx-1">›</span>

  <span className="text-gray-700 dark:text-gray-200 font-semibold">
    📄 {selectedTopic.title}
  </span>
</div>


            <h2 className="text-xl font-semibold mb-2">{selectedTopic.title}</h2>

                            {selectedTopic?.content?.text && (
                              <div className="prose dark:prose-invert max-w-none mb-4">
                                <ReactMarkdown
                                  remarkPlugins={[remarkGfm]}
                                  rehypePlugins={[rehypeRaw, rehypeHighlight]}
                                >
                                  {formatText(selectedTopic.content.text)}
                                </ReactMarkdown>
                              </div>
                            )}
                            {Array.isArray(selectedTopic.content?.code)
                              ? selectedTopic.content.code.map((snippet, i) => (
                                  <CodeBlock key={i} code={snippet} />
                                ))
                              : selectedTopic?.content?.code && (
                                  <CodeBlock code={selectedTopic.content.code} />
                                )}
                          </div>
                        ) : (
  <div className="space-y-2">
    {selectedSubcategory?.topics.map((topic, idx) => (
      <button
        key={idx}
        className="block w-full text-left p-3 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-blue-100 dark:hover:bg-gray-600"
        onClick={() => setSelectedTopic(topic)}
      >
        📄 {topic.title}
      </button>
    ))}
  </div>
)}
                      </>
                    ) : (
                      <p className="text-gray-500">Wähle links eine Kategorie aus oder suche etwas.</p>
                    )}
                  </main>
                </div>
  );
}

export default App;
