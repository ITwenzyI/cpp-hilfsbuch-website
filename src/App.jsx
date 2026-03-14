import React, { useEffect, useRef, useState } from "react";
import Fuse from "fuse.js";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeHighlight from "rehype-highlight";
import themen from "./data/themen.json";
import CodeBlock from "./components/CodeBlock";
import ContentRenderer from "./components/ContentRenderer";
import "highlight.js/styles/github-dark.css";

const STORAGE_KEYS = {
  theme: "theme",
  favorites: "cpp-hilfsbuch:favorites",
  recent: "cpp-hilfsbuch:recent-topics",
};

const MAX_RECENT_TOPICS = 8;

const slugify = (value) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[<>]/g, "")
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-");

const normalizeTopicTitle = (title) => title.replace(/[<>]/g, "").trim();

const highlightMatch = (text, query) => {
  if (!text) return "";

  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escapedQuery})`, "gi");
  return text.replace(regex, '<mark class="rounded bg-amber-200 px-1 text-slate-900">$1</mark>');
};

const getSnippet = (text, query, length = 140) => {
  if (!text) return "";

  const lower = text.toLowerCase();
  const idx = lower.indexOf(query.toLowerCase());
  if (idx === -1) return "";

  const start = Math.max(0, idx - Math.floor(length / 2));
  const end = Math.min(text.length, idx + Math.floor(length / 2));
  const prefix = start > 0 ? "..." : "";
  const suffix = end < text.length ? "..." : "";

  return `${prefix}${text.substring(start, end)}${suffix}`;
};

const formatText = (text) => {
  if (Array.isArray(text)) {
    return text.join("\n");
  }

  return text;
};

const buildSearchText = (topic) => {
  let text = `${topic.title} `;

  if (topic.blocks) {
    topic.blocks.forEach((block) => {
      Object.values(block).forEach((value) => {
        if (typeof value === "string") {
          text += `${value} `;
        } else if (Array.isArray(value)) {
          value.forEach((item) => {
            if (typeof item === "string") {
              text += `${item} `;
            } else if (item && typeof item === "object") {
              Object.values(item).forEach((inner) => {
                if (typeof inner === "string") {
                  text += `${inner} `;
                } else if (Array.isArray(inner)) {
                  inner.forEach((nestedValue) => {
                    if (typeof nestedValue === "string") {
                      text += `${nestedValue} `;
                    }
                  });
                }
              });
            }
          });
        }
      });
    });
  }

  return text;
};

const findMatchInBlocks = (topic, query) => {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery || !topic?.blocks) {
    return null;
  }

  const getLabel = (block) => {
    if (block.type === "definition") return `Definition: ${block.term || ""}`.trim();
    if (block.type === "code") return `Code: ${block.title || ""}`.trim();
    if (block.type === "list") return `Liste: ${block.title || ""}`.trim();
    if (block.type === "explanation") return `Erklärung: ${block.title || ""}`.trim();
    if (block.type === "comparison") return `Vergleich: ${block.title || ""}`.trim();
    if (block.type === "note") return "Hinweis";
    if (block.type === "important") return "Wichtig";
    if (block.type === "pitfall") return `Fehler: ${block.title || ""}`.trim();
    if (block.type === "summary") return "Zusammenfassung";
    if (block.type === "example") return `Beispiel: ${block.title || ""}`.trim();
    return block.type;
  };

  const candidates = [];

  topic.blocks.forEach((block) => {
    const label = getLabel(block);

    Object.values(block).forEach((value) => {
      if (typeof value === "string") {
        candidates.push({ label, text: value });
      } else if (Array.isArray(value)) {
        value.forEach((item) => {
          if (typeof item === "string") {
            candidates.push({ label, text: item });
          } else if (item && typeof item === "object") {
            Object.values(item).forEach((inner) => {
              if (typeof inner === "string") {
                candidates.push({ label, text: inner });
              } else if (Array.isArray(inner)) {
                inner.forEach((nestedValue) => {
                  if (typeof nestedValue === "string") {
                    candidates.push({ label, text: nestedValue });
                  }
                });
              }
            });
          }
        });
      }
    });
  });

  for (const candidate of candidates) {
    if (candidate.text.toLowerCase().includes(normalizedQuery)) {
      return {
        where: candidate.label,
        snippet: getSnippet(candidate.text, query),
      };
    }
  }

  return null;
};

const enrichedTopics = themen.flatMap((category) =>
  category.subcategories.flatMap((subcategory) =>
    subcategory.topics.map((topic) => ({
      id: `${slugify(category.category)}__${slugify(subcategory.name)}__${slugify(topic.title)}`,
      category: category.category,
      categoryIcon: category.icon,
      categoryRef: category,
      subcategory: subcategory.name,
      subcategoryIcon: subcategory.icon,
      subcategoryRef: subcategory,
      title: normalizeTopicTitle(topic.title),
      topicRef: topic,
      searchText: buildSearchText(topic),
      difficulty: topic.difficulty || "mixed",
      isHeader: /^<.*>$/.test(topic.title),
    }))
  )
);

const searchableTopics = enrichedTopics.filter((topic) => !topic.isHeader);
const topicLookup = new Map(searchableTopics.map((topic) => [topic.id, topic]));
const totalSubcategories = themen.reduce(
  (sum, category) => sum + category.subcategories.length,
  0
);
const totalTopics = searchableTopics.length;

const readStoredList = (key) => {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) || "[]");
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((id) => topicLookup.has(id));
  } catch {
    return [];
  }
};

const getDifficultyLabel = (difficulty) => {
  if (difficulty === "basic") return "Basic";
  if (difficulty === "advanced") return "Fortgeschritten";
  return "Mix";
};

const getDifficultyClasses = (difficulty) => {
  if (difficulty === "basic") {
    return "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200";
  }

  if (difficulty === "advanced") {
    return "bg-amber-100 text-amber-900 dark:bg-amber-500/15 dark:text-amber-200";
  }

  return "bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200";
};

function App() {
  const [selectedCategoryName, setSelectedCategoryName] = useState(null);
  const [selectedSubcategoryName, setSelectedSubcategoryName] = useState(null);
  const [selectedTopicId, setSelectedTopicId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [darkMode, setDarkMode] = useState(
    () => typeof window !== "undefined" && window.localStorage.getItem(STORAGE_KEYS.theme) === "dark"
  );
  const [expandedCategories, setExpandedCategories] = useState([]);
  const [showSidebar, setShowSidebar] = useState(false);
  const [favoriteTopicIds, setFavoriteTopicIds] = useState(() => readStoredList(STORAGE_KEYS.favorites));
  const [recentTopicIds, setRecentTopicIds] = useState(() => readStoredList(STORAGE_KEYS.recent));
  const searchInputRef = useRef(null);

  const selectedCategory =
    themen.find((category) => category.category === selectedCategoryName) || null;
  const selectedSubcategory =
    selectedCategory?.subcategories.find((subcategory) => subcategory.name === selectedSubcategoryName) ||
    null;
  const selectedTopicEntry = selectedTopicId ? topicLookup.get(selectedTopicId) || null : null;
  const selectedTopic = selectedTopicEntry?.topicRef || null;
  const favoriteTopics = favoriteTopicIds.map((topicId) => topicLookup.get(topicId)).filter(Boolean);
  const recentTopics = recentTopicIds.map((topicId) => topicLookup.get(topicId)).filter(Boolean);

  const ensureExpandedPath = (topicEntry) => {
    const categoryKey = `cat:${topicEntry.category}`;
    const subcategoryKey = `sub:${topicEntry.category}:${topicEntry.subcategory}`;

    setExpandedCategories((previous) =>
      Array.from(new Set([...previous, categoryKey, subcategoryKey]))
    );
  };

  const rememberTopic = (topicId) => {
    setRecentTopicIds((previous) => [
      topicId,
      ...previous.filter((existingId) => existingId !== topicId),
    ].slice(0, MAX_RECENT_TOPICS));
  };

  const openCategory = (category) => {
    setSelectedCategoryName(category.category);
    setSelectedSubcategoryName(null);
    setSelectedTopicId(null);
    setExpandedCategories((previous) => {
      const key = `cat:${category.category}`;
      return previous.includes(key) ? previous : [...previous, key];
    });
  };

  const goHome = () => {
    setSelectedCategoryName(null);
    setSelectedSubcategoryName(null);
    setSelectedTopicId(null);
    setSearchTerm("");
    setSearchResults([]);
    setShowSidebar(false);
  };

  const openSubcategory = (category, subcategory) => {
    setSelectedCategoryName(category.category);
    setSelectedSubcategoryName(subcategory.name);
    setSelectedTopicId(null);
    setExpandedCategories((previous) => {
      const categoryKey = `cat:${category.category}`;
      const subcategoryKey = `sub:${category.category}:${subcategory.name}`;
      return Array.from(new Set([...previous, categoryKey, subcategoryKey]));
    });
    setShowSidebar(false);
  };

  const openTopic = (topicEntry, options = {}) => {
    const { addToRecent = true, clearSearch = true, closeSidebar = true } = options;

    setSelectedCategoryName(topicEntry.category);
    setSelectedSubcategoryName(topicEntry.subcategory);
    setSelectedTopicId(topicEntry.id);
    ensureExpandedPath(topicEntry);

    if (addToRecent) {
      rememberTopic(topicEntry.id);
    }

    if (clearSearch) {
      setSearchTerm("");
      setSearchResults([]);
    }

    if (closeSidebar) {
      setShowSidebar(false);
    }
  };

  const toggleCategory = (categoryName) => {
    const key = `cat:${categoryName}`;
    setExpandedCategories((previous) =>
      previous.includes(key)
        ? previous.filter((entry) => entry !== key)
        : [...previous, key]
    );
  };

  const toggleSubcategory = (categoryName, subcategoryName) => {
    const key = `sub:${categoryName}:${subcategoryName}`;
    setExpandedCategories((previous) =>
      previous.includes(key)
        ? previous.filter((entry) => entry !== key)
        : [...previous, key]
    );
  };

  const toggleFavorite = (topicId) => {
    setFavoriteTopicIds((previous) =>
      previous.includes(topicId)
        ? previous.filter((existingId) => existingId !== topicId)
        : [topicId, ...previous]
    );
  };

  useEffect(() => {
    const root = document.documentElement;

    if (darkMode) {
      root.classList.add("dark");
      window.localStorage.setItem(STORAGE_KEYS.theme, "dark");
    } else {
      root.classList.remove("dark");
      window.localStorage.setItem(STORAGE_KEYS.theme, "light");
    }
  }, [darkMode]);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEYS.favorites, JSON.stringify(favoriteTopicIds));
  }, [favoriteTopicIds]);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEYS.recent, JSON.stringify(recentTopicIds));
  }, [recentTopicIds]);

  useEffect(() => {
    const query = searchTerm.trim();
    const normalizedQuery = query.toLowerCase();

    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    const fuse = new Fuse(searchableTopics, {
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

    const strictResults = fuse
      .search(query)
      .sort((left, right) => left.score - right.score)
      .map((result) => ({
        ...result.item,
        matchInfo: findMatchInBlocks(result.item.topicRef, query),
      }))
      .filter((item) => {
        const titleHasMatch = item.title.toLowerCase().includes(normalizedQuery);
        const contentHasMatch = Boolean(item.matchInfo?.snippet);
        return titleHasMatch || contentHasMatch;
      });

    setSearchResults(strictResults);
  }, [searchTerm]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const openTopicFromHash = () => {
      const hash = window.location.hash || "";

      if (!hash.startsWith("#topic=")) {
        return;
      }

      const topicId = decodeURIComponent(hash.replace("#topic=", ""));
      const topicEntry = topicLookup.get(topicId);

      if (topicEntry) {
        openTopic(topicEntry, {
          addToRecent: false,
          clearSearch: false,
          closeSidebar: false,
        });
      }
    };

    openTopicFromHash();
    window.addEventListener("hashchange", openTopicFromHash);

    return () => window.removeEventListener("hashchange", openTopicFromHash);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const baseUrl = `${window.location.pathname}${window.location.search}`;

    if (selectedTopicId) {
      window.history.replaceState(null, "", `${baseUrl}#topic=${encodeURIComponent(selectedTopicId)}`);
    } else if (window.location.hash) {
      window.history.replaceState(null, "", baseUrl);
    }
  }, [selectedTopicId]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "/" && event.target.tagName !== "INPUT" && event.target.tagName !== "TEXTAREA") {
        event.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const renderBreadcrumb = () => {
    if (!selectedCategory || !selectedSubcategory || !selectedTopicEntry) {
      return null;
    }

    return (
      <div className="mb-3 flex flex-wrap items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
        <button
          className="rounded-full bg-slate-200/70 px-3 py-1 text-slate-700 transition hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          onClick={() => openCategory(selectedCategory)}
        >
          {selectedCategory.icon} {selectedCategory.category}
        </button>
        <span>›</span>
        <button
          className="rounded-full bg-slate-200/70 px-3 py-1 text-slate-700 transition hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          onClick={() => openSubcategory(selectedCategory, selectedSubcategory)}
        >
          {selectedSubcategory.icon} {selectedSubcategory.name}
        </button>
        <span>›</span>
        <span className="font-semibold text-slate-700 dark:text-slate-100">
          {selectedTopicEntry.title}
        </span>
      </div>
    );
  };

  const renderTopicCard = (topicEntry, variant = "default") => {
    const isFavorite = favoriteTopicIds.includes(topicEntry.id);
    const compact = variant === "compact";

    return (
      <article
        key={topicEntry.id}
        className={`rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-cyan-300 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900/90 dark:hover:border-cyan-700 ${
          compact ? "p-4" : ""
        }`}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700 dark:text-cyan-300">
              {topicEntry.category} · {topicEntry.subcategory}
            </p>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              {topicEntry.title}
            </h3>
          </div>

          <button
            type="button"
            aria-label={isFavorite ? "Thema aus Merkliste entfernen" : "Thema merken"}
            className={`rounded-full border px-3 py-1 text-sm transition ${
              isFavorite
                ? "border-amber-300 bg-amber-100 text-amber-900 dark:border-amber-600 dark:bg-amber-500/10 dark:text-amber-200"
                : "border-slate-200 bg-slate-100 text-slate-500 hover:border-amber-300 hover:text-amber-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            }`}
            onClick={() => toggleFavorite(topicEntry.id)}
          >
            {isFavorite ? "★" : "☆"}
          </button>
        </div>

        <div className="mb-4 flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200">
            {topicEntry.categoryIcon} {topicEntry.subcategoryIcon}
          </span>
          <span className={`rounded-full px-3 py-1 font-medium ${getDifficultyClasses(topicEntry.difficulty)}`}>
            {getDifficultyLabel(topicEntry.difficulty)}
          </span>
        </div>

        <div className="flex items-center justify-between gap-3">
          <button
            className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-700 dark:bg-cyan-500 dark:text-slate-950 dark:hover:bg-cyan-400"
            onClick={() => openTopic(topicEntry)}
          >
            Öffnen
          </button>
          <button
            className="text-sm font-medium text-cyan-700 transition hover:text-cyan-800 dark:text-cyan-300 dark:hover:text-cyan-200"
            onClick={() => {
              const url = `${window.location.origin}${window.location.pathname}#topic=${encodeURIComponent(topicEntry.id)}`;
              window.navigator.clipboard.writeText(url);
            }}
          >
            Link kopieren
          </button>
        </div>
      </article>
    );
  };

  const renderSearchResult = (topicEntry) => {
    const match = topicEntry.matchInfo;
    const fullText = topicEntry.searchText.trim();
    const snippet = match?.snippet || getSnippet(fullText, searchTerm);

    return (
      <li
        key={topicEntry.id}
        className="cursor-pointer rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-cyan-300 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900 dark:hover:border-cyan-700"
        onClick={() => openTopic(topicEntry)}
      >
        <div className="mb-2 flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700 dark:text-cyan-300">
          <span>{topicEntry.categoryIcon} {topicEntry.category}</span>
          <span>·</span>
          <span>{topicEntry.subcategoryIcon} {topicEntry.subcategory}</span>
        </div>

        <h3
          className="mb-2 text-lg font-semibold text-slate-900 dark:text-white"
          dangerouslySetInnerHTML={{ __html: highlightMatch(topicEntry.title, searchTerm) }}
        />

        {match?.where && (
          <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">
            Treffer in: {match.where}
          </p>
        )}

        {snippet && (
          <p
            className="text-sm leading-6 text-slate-600 dark:text-slate-300"
            dangerouslySetInnerHTML={{ __html: highlightMatch(snippet, searchTerm) }}
          />
        )}
      </li>
    );
  };

  const renderHome = () => (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-950 via-sky-900 to-cyan-700 p-8 text-white shadow-2xl shadow-cyan-950/20">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.35em] text-cyan-100/90">
          Persönliches C++ Nachschlagewerk
        </p>
        <h1 className="max-w-3xl text-3xl font-black leading-tight md:text-5xl">
          Dein persönliches C++ Nachschlagewerk.
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-200 md:text-base">
          Strukturierte C++ Themen, kompakte Erklärungen und schnelle Navigation durch Kategorien, Merkliste und zuletzt geöffnete Inhalte.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl border border-white/15 bg-white/10 p-5 backdrop-blur">
            <p className="text-sm text-cyan-100">Kategorien</p>
            <p className="mt-2 text-3xl font-bold">{themen.length}</p>
          </div>
          <div className="rounded-3xl border border-white/15 bg-white/10 p-5 backdrop-blur">
            <p className="text-sm text-cyan-100">Unterkategorien</p>
            <p className="mt-2 text-3xl font-bold">{totalSubcategories}</p>
          </div>
          <div className="rounded-3xl border border-white/15 bg-white/10 p-5 backdrop-blur">
            <p className="text-sm text-cyan-100">Themen</p>
            <p className="mt-2 text-3xl font-bold">{totalTopics}</p>
          </div>
        </div>
      </section>

      {(favoriteTopics.length > 0 || recentTopics.length > 0) && (
        <section className="grid gap-6 xl:grid-cols-2">
          {favoriteTopics.length > 0 && (
            <div className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/90">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">Merkliste</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Themen, die du häufiger nachschlägst.
                  </p>
                </div>
                <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-900 dark:bg-amber-500/15 dark:text-amber-200">
                  {favoriteTopics.length}
                </span>
              </div>

              <div className="grid gap-4">
                {favoriteTopics.slice(0, 4).map((topic) => renderTopicCard(topic, "compact"))}
              </div>
            </div>
          )}

          {recentTopics.length > 0 && (
            <div className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/90">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">Zuletzt geöffnet</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Für einen schnellen Wiedereinstieg beim Lernen.
                  </p>
                </div>
                <span className="rounded-full bg-cyan-100 px-3 py-1 text-sm font-medium text-cyan-900 dark:bg-cyan-500/15 dark:text-cyan-200">
                  {recentTopics.length}
                </span>
              </div>

              <div className="grid gap-4">
                {recentTopics.slice(0, 4).map((topic) => renderTopicCard(topic, "compact"))}
              </div>
            </div>
          )}
        </section>
      )}

      <section className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/90">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Kategorien im Überblick</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {themen.map((category) => {
            const categoryTopics = searchableTopics.filter((topic) => topic.category === category.category);

            return (
              <button
                key={category.category}
                className="rounded-3xl border border-slate-200 bg-slate-50 p-5 text-left transition hover:-translate-y-0.5 hover:border-cyan-300 hover:bg-white hover:shadow-lg dark:border-slate-800 dark:bg-slate-950 dark:hover:border-cyan-700"
                onClick={() => openCategory(category)}
              >
                <div className="mb-3 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-700 dark:text-cyan-300">
                      {category.icon} Kategorie
                    </p>
                    <h3 className="mt-2 text-xl font-bold text-slate-900 dark:text-white">
                      {category.category}
                    </h3>
                  </div>
                  <span className="rounded-full bg-slate-200 px-3 py-1 text-sm font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                    {categoryTopics.length} Themen
                  </span>
                </div>

                <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
                  {category.subcategories.length} Unterkategorien
                </p>

                <div className="flex flex-wrap gap-2">
                  {category.subcategories.slice(0, 4).map((subcategory) => (
                    <span
                      key={`${category.category}-${subcategory.name}`}
                      className="rounded-full bg-white px-3 py-1 text-sm text-slate-700 dark:bg-slate-900 dark:text-slate-200"
                    >
                      {subcategory.icon} {subcategory.name}
                    </span>
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );

  const renderCategoryOverview = () => {
    if (!selectedCategory) {
      return null;
    }

    return (
      <div className="space-y-6">
        <div className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/90">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-700 dark:text-cyan-300">
            {selectedCategory.icon} Kategorie
          </p>
          <h1 className="mt-2 text-3xl font-black text-slate-900 dark:text-white">
            {selectedCategory.category}
          </h1>
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
            Wähle eine Unterkategorie, um gezielt in deine Themen einzusteigen.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {selectedCategory.subcategories.map((subcategory) => {
            const subcategoryTopics = searchableTopics.filter(
              (topic) =>
                topic.category === selectedCategory.category && topic.subcategory === subcategory.name
            );

            return (
              <button
                key={subcategory.name}
                className="rounded-3xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-cyan-300 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900 dark:hover:border-cyan-700"
                onClick={() => openSubcategory(selectedCategory, subcategory)}
              >
                <div className="mb-3 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-700 dark:text-cyan-300">
                      {subcategory.icon} Unterkategorie
                    </p>
                    <h2 className="mt-2 text-xl font-bold text-slate-900 dark:text-white">
                      {subcategory.name}
                    </h2>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                    {subcategoryTopics.length}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {subcategoryTopics.slice(0, 3).map((topic) => (
                    <span
                      key={topic.id}
                      className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                    >
                      {topic.title}
                    </span>
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const renderSubcategoryOverview = () => {
    if (!selectedSubcategory || !selectedCategory) {
      return null;
    }

    const topics = searchableTopics.filter(
      (topic) =>
        topic.category === selectedCategory.category && topic.subcategory === selectedSubcategory.name
    );

    return (
      <div className="space-y-6">
        <div className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/90">
          <div className="mb-3 flex flex-wrap items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <button
              className="rounded-full bg-slate-100 px-3 py-1 transition hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700"
              onClick={() => openCategory(selectedCategory)}
            >
              {selectedCategory.icon} {selectedCategory.category}
            </button>
            <span>›</span>
            <span className="font-semibold text-slate-700 dark:text-slate-100">
              {selectedSubcategory.icon} {selectedSubcategory.name}
            </span>
          </div>

          <h1 className="text-3xl font-black text-slate-900 dark:text-white">
            {selectedSubcategory.name}
          </h1>
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
            {topics.length} Themen in diesem Bereich.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {topics.map((topic) => renderTopicCard(topic))}
        </div>
      </div>
    );
  };

  return (
    <div className="flex min-h-screen bg-slate-100 text-slate-900 dark:bg-slate-950 dark:text-white">
      <aside
        className={`fixed inset-y-0 left-0 z-30 w-[88vw] max-w-sm overflow-y-auto border-r border-slate-200 bg-white/95 p-5 shadow-2xl shadow-slate-950/10 backdrop-blur transition-transform dark:border-slate-800 dark:bg-slate-950/95 md:static md:block md:w-[340px] md:translate-x-0 md:shadow-none ${
          showSidebar ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="mb-6 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-cyan-700 dark:text-cyan-300">
              C++ Lernhilfe
            </p>
            <h2 className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
              C++ Hilfsbuch
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setDarkMode((value) => !value)}
              className="rounded-full border border-slate-200 bg-slate-100 px-3 py-2 text-sm font-medium transition hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700"
            >
              {darkMode ? "🌞" : "🌙"}
            </button>
            <button
              onClick={() => setShowSidebar(false)}
              className="rounded-full border border-slate-200 bg-slate-100 px-3 py-2 text-sm font-medium transition hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 md:hidden"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="mb-4 rounded-3xl bg-slate-100 p-4 dark:bg-slate-900">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Made by Kilian.
          </p>
        </div>

        <ul className="space-y-3">
          {themen.map((category) => {
            const categoryKey = `cat:${category.category}`;
            const categoryExpanded = expandedCategories.includes(categoryKey);

            return (
              <li key={category.category}>
                <div className="flex gap-2">
                  <button
                    className="flex-1 rounded-2xl bg-slate-100 px-4 py-3 text-left font-semibold transition hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800"
                    onClick={() => openCategory(category)}
                  >
                    {category.icon} {category.category}
                  </button>
                  <button
                    className="rounded-2xl bg-slate-100 px-4 py-3 text-sm transition hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800"
                    onClick={() => toggleCategory(category.category)}
                  >
                    {categoryExpanded ? "▲" : "▼"}
                  </button>
                </div>

                {categoryExpanded && (
                  <ul className="ml-3 mt-3 space-y-2 border-l border-slate-200 pl-4 dark:border-slate-800">
                    {category.subcategories.map((subcategory) => {
                      const subcategoryKey = `sub:${category.category}:${subcategory.name}`;
                      const subcategoryExpanded = expandedCategories.includes(subcategoryKey);

                      return (
                        <li key={`${category.category}-${subcategory.name}`}>
                          <div className="flex gap-2">
                            <button
                              className="flex-1 rounded-2xl bg-white px-4 py-2 text-left text-sm font-medium transition hover:bg-cyan-50 dark:bg-slate-900 dark:hover:bg-slate-800"
                              onClick={() => openSubcategory(category, subcategory)}
                            >
                              {subcategory.icon} {subcategory.name}
                            </button>
                            <button
                              className="rounded-2xl bg-white px-3 py-2 text-xs transition hover:bg-cyan-50 dark:bg-slate-900 dark:hover:bg-slate-800"
                              onClick={() => toggleSubcategory(category.category, subcategory.name)}
                            >
                              {subcategoryExpanded ? "▲" : "▼"}
                            </button>
                          </div>

                          {subcategoryExpanded && (
                            <ul className="mt-2 space-y-1">
                              {searchableTopics
                                .filter(
                                  (topic) =>
                                    topic.category === category.category &&
                                    topic.subcategory === subcategory.name
                                )
                                .map((topic) => (
                                  <li key={topic.id}>
                                    <button
                                      className={`w-full rounded-xl px-4 py-2 text-left text-sm transition ${
                                        selectedTopicId === topic.id
                                          ? "bg-cyan-100 text-cyan-900 dark:bg-cyan-500/15 dark:text-cyan-200"
                                          : "hover:bg-slate-100 dark:hover:bg-slate-800"
                                      }`}
                                      onClick={() => openTopic(topic)}
                                    >
                                      {topic.title}
                                    </button>
                                  </li>
                                ))}
                            </ul>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </aside>

      {showSidebar && (
        <button
          className="fixed inset-0 z-20 bg-slate-950/45 md:hidden"
          aria-label="Sidebar schließen"
          onClick={() => setShowSidebar(false)}
        />
      )}

      <main className="relative z-10 flex-1">
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-slate-100/90 backdrop-blur dark:border-slate-800 dark:bg-slate-950/85">
          <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-4 md:px-8">
            <button
              onClick={() => setShowSidebar(true)}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800 md:hidden"
            >
              ☰
            </button>

            <button
              onClick={goHome}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
            >
              Startseite
            </button>

            <div className="relative flex-1">
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Suche nach Thema, Inhalt oder Begriff..."
                className="w-full rounded-full border border-slate-200 bg-white px-5 py-3 pr-24 text-sm shadow-sm outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100 dark:border-slate-700 dark:bg-slate-900 dark:focus:border-cyan-500 dark:focus:ring-cyan-500/10"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                / Fokus
              </span>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-8">
          {searchTerm.trim() ? (
            <section className="space-y-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-700 dark:text-cyan-300">
                  Suche
                </p>
                <h1 className="mt-2 text-3xl font-black text-slate-900 dark:text-white">
                  Ergebnisse für "{searchTerm}"
                </h1>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  {searchResults.length} Treffer
                </p>
              </div>

              {searchResults.length > 0 ? (
                <ul className="grid gap-4 lg:grid-cols-2">
                  {searchResults.map((topic) => renderSearchResult(topic))}
                </ul>
              ) : (
                <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white/90 p-8 text-slate-500 dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-400">
                  Keine Treffer gefunden. Probier einen kürzeren Begriff oder suche nach einem C++ Schlüsselwort.
                </div>
              )}
            </section>
          ) : selectedTopic ? (
            <section className="space-y-5">
              {renderBreadcrumb()}

              <div className="rounded-[2rem] border border-slate-200 bg-white/95 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/95">
                <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="mb-3 flex flex-wrap gap-2 text-xs">
                      <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                        {selectedTopicEntry.categoryIcon} {selectedTopicEntry.category}
                      </span>
                      <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                        {selectedTopicEntry.subcategoryIcon} {selectedTopicEntry.subcategory}
                      </span>
                      <span className={`rounded-full px-3 py-1 font-medium ${getDifficultyClasses(selectedTopicEntry.difficulty)}`}>
                        {getDifficultyLabel(selectedTopicEntry.difficulty)}
                      </span>
                    </div>

                    <h1 className="text-3xl font-black text-slate-900 dark:text-white">
                      {selectedTopic.title}
                    </h1>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                        favoriteTopicIds.includes(selectedTopicEntry.id)
                          ? "border-amber-300 bg-amber-100 text-amber-900 dark:border-amber-600 dark:bg-amber-500/10 dark:text-amber-200"
                          : "border-slate-200 bg-slate-100 text-slate-700 hover:border-amber-300 hover:text-amber-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                      }`}
                      onClick={() => toggleFavorite(selectedTopicEntry.id)}
                    >
                      {favoriteTopicIds.includes(selectedTopicEntry.id) ? "★ Gemerkt" : "☆ Merken"}
                    </button>
                    <button
                      className="rounded-full border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                      onClick={() => {
                        const url = `${window.location.origin}${window.location.pathname}#topic=${encodeURIComponent(selectedTopicEntry.id)}`;
                        window.navigator.clipboard.writeText(url);
                      }}
                    >
                      Link kopieren
                    </button>
                  </div>
                </div>

                {selectedTopic.blocks ? (
                  <ContentRenderer blocks={selectedTopic.blocks} />
                ) : (
                  <>
                    {selectedTopic.content?.text && (
                      <div className="prose max-w-none prose-slate dark:prose-invert">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          rehypePlugins={[rehypeRaw, rehypeHighlight]}
                        >
                          {formatText(selectedTopic.content.text)}
                        </ReactMarkdown>
                      </div>
                    )}

                    {Array.isArray(selectedTopic.content?.code)
                      ? selectedTopic.content.code.map((snippet, index) => (
                          <CodeBlock key={index} code={snippet} />
                        ))
                      : selectedTopic.content?.code && <CodeBlock code={selectedTopic.content.code} />}
                  </>
                )}
              </div>
            </section>
          ) : selectedSubcategory ? (
            renderSubcategoryOverview()
          ) : selectedCategory ? (
            renderCategoryOverview()
          ) : (
            renderHome()
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
