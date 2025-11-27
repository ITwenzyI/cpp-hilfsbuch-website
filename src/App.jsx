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
    if (searchTerm.trim() === "") {
      setSearchResults([]);
      return;
    }

    const fuse = new Fuse(
      themen.flatMap((cat) =>
        cat.subtopics.map((sub) => ({
          ...sub,
          category: cat.category,
        }))
      ),
      {
        keys: ["title", "content.text", "category"],
        threshold: 0.3,
      }
    );

    const result = fuse.search(searchTerm);
    setSearchResults(result.map((r) => r.item));
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
                {searchResults.map((topic, idx) => (
                  <li
                    key={idx}
                    className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow hover:bg-blue-50 dark:hover:bg-gray-700 cursor-pointer"
                    onClick={() => {
                      const category = themen.find(
                        (c) => c.category === topic.category
                      );
                      if (!category) return;
                      const selected = category.subtopics.find(
                        (t) => t.title === topic.title
                      );
                      if (!selected) return;
                      setSelectedCategory(category);
                      setSelectedTopic(selected);
                      setSearchTerm("");
                      setSearchResults([]);
                    }}
                  >
                    <h3 className="font-bold text-blue-600 dark:text-blue-400">{topic.title}</h3>
                    <p className="text-sm text-gray-500 mb-1">{topic.category}</p>
                    {topic.content?.text && (
                      <p className="text-sm text-gray-700 dark:text-gray-300">{Array.isArray(topic.content.text) ? topic.content.text.join(" ") : topic.content.text}</p>
                    )}
                  </li>
                ))}
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
                  onClick={() => setSelectedTopic(null)}
                  className="mb-4 px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
                >
                  ← Zurück
                </button>
                {/* Breadcrumb */}
<div className="text-sm text-gray-500 dark:text-gray-400 mb-2">
  {selectedCategory?.category}

  {selectedCategory?.subcategories &&
    selectedCategory.subcategories.flatMap((sub) =>
      sub.topics.includes(selectedTopic)
        ? [" › ", sub.name]
        : []
    )}

  {" › "}

  <span className="text-gray-700 dark:text-gray-200 font-semibold">
    {selectedTopic.title}
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
              <p className="text-gray-500">Wähle ein Thema aus der Liste.</p>
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
