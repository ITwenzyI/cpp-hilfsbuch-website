import React, { useState, useEffect } from "react";
import themen from "./data/themen.json";
import Fuse from "fuse.js";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeHighlight from "rehype-highlight";
import CodeBlock from "./components/CodeBlock";
import "highlight.js/styles/github-dark.css";
import ContentRenderer from "./components/ContentRenderer";


/* ============================================================================
   STATE MANAGEMENT & CONSTANTS
============================================================================ */

function App() {
  // Selected navigation items
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState(null);
  const [selectedTopic, setSelectedTopic] = useState(null);

  // Search system
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);

  // UI States
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem("theme") === "dark");
  const [expandedCategories, setExpandedCategories] = useState([]);
  const [showSidebar, setShowSidebar] = useState(false);

  /* ============================================================================
     EFFECTS
  ============================================================================ */

  // Handle dark mode
  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      root.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [darkMode]);

  // Smart search (Fuse.js)
  useEffect(() => {
    const query = searchTerm.trim();

    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    // flatten all topics
    const allTopics = themen.flatMap((cat) =>
      cat.subcategories.flatMap((sub) =>
      sub.topics.map((topic) => ({
        ...topic,
        category: cat.category,
        categoryIcon: cat.icon,
        subcategory: sub.name,
        subcategoryIcon: sub.icon,
        searchText: buildSearchText(topic),
        matchInfo: findMatchInBlocks(topic, query)
      }))
      )
    );

    const fuse = new Fuse(allTopics, {
      keys: [
        { name: "title", weight: 0.6 },
        { name: "searchText", weight: 0.4 },
        { name: "subcategory", weight: 0.07 },
        { name: "category", weight: 0.03 },
      ],
      threshold: 0.35,
      ignoreLocation: true,
      includeScore: true,
    });

    const result = fuse.search(query);
    const sorted = result.sort((a, b) => a.score - b.score);
    setSearchResults(sorted.map((r) => r.item));
  }, [searchTerm]);

  /* ============================================================================
     HELPER FUNCTIONS (HIGHLIGHT, SNIPPET, TEXT FORMAT)
  ============================================================================ */

  // Highlight text like STRG+F
  const highlightMatch = (text, query) => {
    if (!text) return "";
    const regex = new RegExp(`(${query})`, "gi");
    return text.replace(regex, `<mark class="bg-yellow-300">$1</mark>`);
  };

  // Snippet preview around matched term
  const getSnippet = (text, query, length = 120) => {
    if (!text) return "";

    const lower = text.toLowerCase();
    const idx = lower.indexOf(query.toLowerCase());
    if (idx === -1) return "";

    const start = Math.max(0, idx - length / 2);
    const end = Math.min(text.length, idx + length / 2);

    return text.substring(start, end) + "...";
  };

  // Convert arrays to markdown text
  const formatText = (text) => {
    if (Array.isArray(text)) return text.join("\n");
    return text;
  };

  // Sidebar category toggler
  const toggleCategory = (category) => {
    setExpandedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  };

    const buildSearchText = (topic) => {
    let text = topic.title + " ";

    if (topic.blocks) {
      topic.blocks.forEach((block) => {
        Object.values(block).forEach((value) => {
          if (typeof value === "string") {
            text += value + " ";
          } else if (Array.isArray(value)) {
            value.forEach((v) => {
              if (typeof v === "string") text += v + " ";
              if (typeof v === "object" && v !== null) {
                Object.values(v).forEach((inner) => {
                  if (typeof inner === "string") text += inner + " ";
                });
              }
            });
          }
        });
      });
    }

    return text.toLowerCase();
  };

  const findMatchInBlocks = (topic, query) => {
  const q = (query || "").trim().toLowerCase();
  if (!q || !topic?.blocks) return null;

  const makeLabel = (block) => {
    if (block.type === "definition") return `Definition: ${block.term || ""}`.trim();
    if (block.type === "code") return `Code: ${block.title || ""}`.trim();
    if (block.type === "list") return `Liste: ${block.title || ""}`.trim();
    if (block.type === "explanation") return `Erklärung: ${block.title || ""}`.trim();
    if (block.type === "comparison") return `Vergleich: ${block.title || ""}`.trim();
    if (block.type === "note") return `Hinweis`;
    if (block.type === "important") return `Wichtig`;
    if (block.type === "pitfall") return `Fehler: ${block.title || ""}`.trim();
    if (block.type === "summary") return `Zusammenfassung`;
    if (block.type === "example") return `Beispiel: ${block.title || ""}`.trim();
    return block.type;
  };

  const candidates = [];

  for (const block of topic.blocks) {
    const label = makeLabel(block);

    // Strings
    for (const [key, value] of Object.entries(block)) {
      if (typeof value === "string") {
        candidates.push({ label, text: value });
      }
    }

    // Arrays (strings oder objects)
    for (const value of Object.values(block)) {
      if (Array.isArray(value)) {
        for (const item of value) {
          if (typeof item === "string") candidates.push({ label, text: item });
          if (item && typeof item === "object") {
            for (const inner of Object.values(item)) {
              if (typeof inner === "string") candidates.push({ label, text: inner });
              if (Array.isArray(inner)) {
                inner.forEach((x) => {
                  if (typeof x === "string") candidates.push({ label, text: x });
                });
              }
            }
          }
        }
      }
    }
  }

  // Finde erstes Feld, das den Query enthält
  for (const c of candidates) {
    const lower = c.text.toLowerCase();
    const idx = lower.indexOf(q);
    if (idx !== -1) {
      const snippet = getSnippet(c.text, query, 140);
      return { where: c.label, snippet };
    }
  }

  return null;
};


  /* ============================================================================
     RENDER HELPERS (UI COMPOSITION)
  ============================================================================ */

  // Breadcrumb for topic view
  const renderBreadcrumb = () => (
    <div className="text-sm text-gray-500 dark:text-gray-400 mb-2 flex flex-wrap items-center gap-1">
      <span>{selectedCategory?.icon} {selectedCategory?.category}</span>

      {selectedCategory?.subcategories?.map((sub) =>
        sub.topics.includes(selectedTopic) ? (
          <React.Fragment key={sub.name}>
            <span className="mx-1">›</span>
            <span>{sub.icon} {sub.name}</span>
          </React.Fragment>
        ) : null
      )}

      <span className="mx-1">›</span>

      <span className="text-gray-700 dark:text-gray-200 font-semibold">
        📄 {selectedTopic.title}
      </span>
    </div>
  );

  // Search result list item
  const renderSearchResult = (topic, idx) => {
  const match = topic.matchInfo;

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

  fullText = fullText.trim();

  const legacySnippet = getSnippet(fullText, searchTerm);
  const snippetToShow = match?.snippet || legacySnippet;


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
        <h3
          className="font-bold text-blue-600 dark:text-blue-400 mb-1"
          dangerouslySetInnerHTML={{
            __html: highlightMatch(topic.title, searchTerm),
          }}
        />

        <p className="text-xs text-gray-500 mb-2">
          {topic.categoryIcon} {topic.category} › {topic.subcategoryIcon} {topic.subcategory}
        </p>

        {match?.where && (
        <p className="text-xs text-gray-500 mb-1">
          Treffer in: {match.where}
        </p>
      )}

      {snippetToShow && (
        <p
          className="text-sm text-gray-700 dark:text-gray-300"
          dangerouslySetInnerHTML={{
            __html: highlightMatch(snippetToShow, searchTerm),
          }}
        />
      )}
      </li>
    );
  };

  /* ============================================================================
     MAIN RETURN (PAGE LAYOUT)
  ============================================================================ */

  return (
    <div className="flex flex-col md:flex-row h-screen bg-gray-50 dark:bg-gray-900 dark:text-white">

      {/* ================= MOBILE HEADER ================= */}
      <header className="md:hidden flex justify-between items-center p-4 bg-white dark:bg-gray-800 shadow">
        <h1 className="text-lg font-bold">C++ Hilfsbuch</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="px-3 py-1 rounded-full text-sm bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500"
          >
            {darkMode ? "🌞" : "🌙"}
          </button>

          <button
            onClick={() => setShowSidebar(!showSidebar)}
            className="px-3 py-1 rounded-full text-sm bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500"
          >
            ☰
          </button>
        </div>
      </header>

      {/* ================= SIDEBAR ================= */}
      <aside
        className={`md:block ${showSidebar ? "block" : "hidden"} w-full md:w-1/4 p-4 bg-white dark:bg-gray-800 shadow-lg overflow-y-auto z-10`}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Kategorien</h2>

          <button
            onClick={() => setDarkMode(!darkMode)}
            className="hidden md:inline px-3 py-1 rounded-full text-sm bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500"
          >
            {darkMode ? "🌞 Hell" : "🌙 Dunkel"}
          </button>
        </div>

        <ul className="space-y-2">
          {themen.map((cat, index) => (
            <li key={index}>
              {/* Category Button */}
              <button
                className="w-full text-left px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 flex justify-between"
                onClick={() => toggleCategory(`cat:${cat.category}`)}
              >
                <span>{cat.icon} {cat.category}</span>
                <span>{expandedCategories.includes(`cat:${cat.category}`) ? "▲" : "▼"}</span>
              </button>

              {/* Subcategories */}
              {expandedCategories.includes(`cat:${cat.category}`) && (
                <ul className="ml-4 mt-1 space-y-1">
                  {cat.subcategories.map((sub, subIndex) => (
                    <li key={subIndex}>
                      <button
                        onClick={() => {
                        const key = `sub:${cat.category}:${sub.name}`;
                        setExpandedCategories((prev) =>
                          prev.includes(key)
                            ? prev.filter((c) => c !== key)
                            : [...prev, key]
                        );
                      }}
                        className="w-full text-left px-4 py-2 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 rounded flex justify-between"
                      >
                        <span>{sub.icon} {sub.name}</span>
                        <span>
                          {expandedCategories.includes(`sub:${cat.category}:${sub.name}`) ? "▲" : "▼"}
                        </span>
                      </button>

                      {/* Topics */}
                      {expandedCategories.includes(`sub:${cat.category}:${sub.name}`) && (
                        <ul className="ml-4 mt-1 space-y-1">
                          {sub.topics.map((topic, topicIndex) => (
                            <li key={topicIndex}>
                              <button
                                className="w-full text-left px-4 py-1 hover:bg-blue-100 dark:hover:bg-gray-600 rounded"
                                onClick={() => {
                                  setSelectedCategory(cat);
                                  setSelectedSubcategory(sub);
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

      {/* ================= CONTENT AREA ================= */}
      <main className="flex-1 p-4 md:p-6 overflow-y-auto">

        {/* Searchbar */}
        <input
          type="text"
          placeholder="Suche nach Thema, Inhalt, Kategorie..."
          className="w-full mb-6 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />

        {/* ================= SEARCH VIEW ================= */}
        {searchTerm.trim() ? (
          <>
            <h2 className="text-xl font-semibold mb-4">
              Suchergebnisse für: "{searchTerm}"
            </h2>

            {searchResults.length > 0 ? (
              <ul className="space-y-4">
                {searchResults.map((topic, idx) => renderSearchResult(topic, idx))}
              </ul>
            ) : (
              <p className="text-gray-500">Keine Treffer gefunden.</p>
            )}
          </>
        ) : selectedCategory ? (
          <>
            <h1 className="text-2xl font-bold mb-4">{selectedCategory.category}</h1>

            {/* ================= TOPIC VIEW ================= */}
            {selectedTopic ? (
              <>
                <button
                  onClick={() => setSelectedTopic(null)}
                  className="mb-4 px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
                >
                  ← Zurück zur Unterkategorie
                </button>

                {renderBreadcrumb()}

                <h2 className="text-xl font-semibold mb-2">{selectedTopic.title}</h2>

                {/* ================= CONTENT ================= */}
                {selectedTopic.blocks ? (
                  <ContentRenderer blocks={selectedTopic.blocks} />
                ) : (
                  <>
                    {/* Fallback: altes Markdown */}
                    {selectedTopic.content?.text && (
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
                      : selectedTopic.content?.code && (
                          <CodeBlock code={selectedTopic.content.code} />
                        )}
                  </>
                )}

              </>
            ) : (
              /* ================= SUBCATEGORY VIEW ================= */
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
