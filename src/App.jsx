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
const NETWORK_SECTION_LIMIT = 3;
const RELATED_STOP_WORDS = new Set([
  "aber",
  "alle",
  "auch",
  "beim",
  "c",
  "class",
  "const",
  "cpp",
  "das",
  "dass",
  "dem",
  "den",
  "der",
  "des",
  "die",
  "dies",
  "diese",
  "diesem",
  "diese",
  "dieser",
  "einer",
  "eine",
  "einem",
  "einen",
  "einer",
  "enum",
  "für",
  "function",
  "hast",
  "ich",
  "ist",
  "kann",
  "mit",
  "nicht",
  "oder",
  "sich",
  "sind",
  "std",
  "struct",
  "thema",
  "und",
  "using",
  "von",
  "wenn",
  "while",
]);

const TAG_RULES = [
  { tag: "Syntax", patterns: ["syntax", "operator", "schlüsselwort", "schluesselwort", "ausdruck"] },
  { tag: "Variablen", patterns: ["variable", "variablen", "deklaration", "definition", "initialisierung", "zuweisung"] },
  { tag: "Datentypen", patterns: ["datentyp", "typen", "int", "double", "float", "char", "bool"] },
  { tag: "Kontrollfluss", patterns: ["if", "else", "switch", "while", "for", "schleife", "kontroll"] },
  { tag: "Funktionen", patterns: ["funktion", "funktionen", "parameter", "argument", "rückgabewert", "rueckgabewert"] },
  { tag: "Pointer", patterns: ["pointer", "zeiger", "adresse", "dereferenz"] },
  { tag: "Referenzen", patterns: ["referenz", "referenzen"] },
  { tag: "Speicher", patterns: ["speicher", "stack", "heap", "lebensdauer", "new", "delete"] },
  { tag: "OOP", patterns: ["klasse", "objekt", "vererbung", "polymorph", "konstruktor", "destruktor", "oop"] },
  { tag: "STL", patterns: ["stl", "vector", "map", "set", "iterator", "algorithm", "container"] },
  { tag: "Strings", patterns: ["string", "zeichenkette", "cstring"] },
  { tag: "I/O", patterns: ["cout", "cin", "ein", "ausgabe", "eingabe", "stream", "datei"] },
  { tag: "Debugging", patterns: ["fehler", "pitfall", "debug", "bug", "warnung"] },
  { tag: "Modern C++", patterns: ["modern", "auto", "smart pointer", "lambda", "constexpr", "move"] },
];

const slugify = (value) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[<>]/g, "")
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-");

const normalizeTopicTitle = (title) => title.replace(/[<>]/g, "").trim();

const extractKeywords = (text) => {
  const matches = text.toLowerCase().match(/[a-zA-ZäöüÄÖÜß_][a-zA-Z0-9_äöüÄÖÜß-]*/g) || [];
  return new Set(
    matches.filter(
      (word) => word.length > 2 && !RELATED_STOP_WORDS.has(word)
    )
  );
};

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

const deriveTopicTags = ({ category, subcategory, title, searchText, difficulty }) => {
  const haystack = `${category} ${subcategory} ${title} ${searchText}`.toLowerCase();
  const tags = [category, subcategory];

  if (difficulty === "basic") {
    tags.push("Basic");
  } else if (difficulty === "advanced") {
    tags.push("Fortgeschritten");
  }

  TAG_RULES.forEach((rule) => {
    if (rule.patterns.some((pattern) => haystack.includes(pattern))) {
      tags.push(rule.tag);
    }
  });

  return Array.from(new Set(tags)).slice(0, 8);
};

const getSemanticTags = (topic) =>
  topic.tags.filter(
    (tag) =>
      ![topic.category, topic.subcategory, "Basic", "Fortgeschritten", "Mix"].includes(tag)
  );

const getSharedSemanticTags = (leftTopic, rightTopic) => {
  const leftTags = new Set(getSemanticTags(leftTopic));
  return getSemanticTags(rightTopic).filter((tag) => leftTags.has(tag));
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

const enrichedTopics = themen.flatMap((category, categoryIndex) =>
  category.subcategories.flatMap((subcategory, subcategoryIndex) =>
    subcategory.topics.map((topic, topicIndex) => ({
      id: `${slugify(category.category)}__${slugify(subcategory.name)}__${slugify(topic.title)}`,
      category: category.category,
      categoryIcon: category.icon,
      categoryRef: category,
      categoryIndex,
      subcategory: subcategory.name,
      subcategoryIcon: subcategory.icon,
      subcategoryRef: subcategory,
      subcategoryIndex,
      topicIndex,
      title: normalizeTopicTitle(topic.title),
      topicRef: topic,
      searchText: buildSearchText(topic),
      difficulty: topic.difficulty || "mixed",
      tags: deriveTopicTags({
        category: category.category,
        subcategory: subcategory.name,
        title: normalizeTopicTitle(topic.title),
        searchText: buildSearchText(topic),
        difficulty: topic.difficulty || "mixed",
      }),
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

const getSharedKeywordCount = (leftTopic, rightTopic) => {
  const leftKeywords = extractKeywords(`${leftTopic.title} ${leftTopic.searchText}`);
  const rightKeywords = extractKeywords(`${rightTopic.title} ${rightTopic.searchText}`);
  let sharedKeywordCount = 0;

  leftKeywords.forEach((keyword) => {
    if (rightKeywords.has(keyword)) {
      sharedKeywordCount += 1;
    }
  });

  return sharedKeywordCount;
};

const buildTopicNetwork = (topicEntry, allTopics) => {
  if (!topicEntry) {
    return {
      prerequisites: [],
      nextTopics: [],
      companionTopics: [],
    };
  }

  const sameSubcategoryTopics = allTopics
    .filter(
      (candidate) =>
        candidate.category === topicEntry.category &&
        candidate.subcategory === topicEntry.subcategory &&
        candidate.id !== topicEntry.id
    )
    .sort((left, right) => left.topicIndex - right.topicIndex);

  const prerequisites = sameSubcategoryTopics
    .filter((candidate) => candidate.topicIndex < topicEntry.topicIndex)
    .map((candidate) => {
      const distance = topicEntry.topicIndex - candidate.topicIndex;
      const sharedTags = getSharedSemanticTags(topicEntry, candidate);
      const sharedKeywordCount = getSharedKeywordCount(topicEntry, candidate);
      let score = 10 - distance;

      if (candidate.difficulty === "basic") {
        score += 2;
      }

      score += sharedTags.length * 2;
      score += sharedKeywordCount;

      return {
        topic: candidate,
        score,
        reason:
          sharedTags.length > 0
            ? `Vorwissen mit Fokus auf ${sharedTags.slice(0, 2).join(", ")}`
            : "Früheres Thema aus derselben Unterkategorie",
      };
    })
    .sort((left, right) => right.score - left.score)
    .slice(0, NETWORK_SECTION_LIMIT);

  const nextTopics = sameSubcategoryTopics
    .filter((candidate) => candidate.topicIndex > topicEntry.topicIndex)
    .map((candidate) => {
      const distance = candidate.topicIndex - topicEntry.topicIndex;
      const sharedTags = getSharedSemanticTags(topicEntry, candidate);
      const sharedKeywordCount = getSharedKeywordCount(topicEntry, candidate);
      let score = 10 - distance;

      if (candidate.difficulty === "advanced") {
        score += 2;
      }

      score += sharedTags.length * 2;
      score += sharedKeywordCount;

      return {
        topic: candidate,
        score,
        reason:
          sharedTags.length > 0
            ? `Sinnvolle Fortsetzung zu ${sharedTags.slice(0, 2).join(", ")}`
            : "Nächstes Thema aus derselben Unterkategorie",
      };
    })
    .sort((left, right) => right.score - left.score)
    .slice(0, NETWORK_SECTION_LIMIT);

  const excludedTopicIds = new Set([
    topicEntry.id,
    ...prerequisites.map((entry) => entry.topic.id),
    ...nextTopics.map((entry) => entry.topic.id),
  ]);

  const companionTopics = allTopics
    .filter((candidate) => !excludedTopicIds.has(candidate.id))
    .map((candidate) => {
      const sharedTags = getSharedSemanticTags(topicEntry, candidate);
      const sharedKeywordCount = getSharedKeywordCount(topicEntry, candidate);
      let score = 0;

      if (candidate.category === topicEntry.category) {
        score += 3;
      }

      if (candidate.subcategory === topicEntry.subcategory) {
        score += 2;
      }

      if (candidate.difficulty === topicEntry.difficulty) {
        score += 1;
      }

      score += sharedTags.length * 2;
      score += sharedKeywordCount;

      return {
        topic: candidate,
        score,
        reason:
          sharedTags.length > 0
            ? `Passt thematisch wegen ${sharedTags.slice(0, 2).join(", ")}`
            : candidate.category === topicEntry.category
              ? "Hilfreiche Ergänzung aus derselben Kategorie"
              : "Inhaltlich angrenzendes Thema",
      };
    })
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, NETWORK_SECTION_LIMIT);

  return {
    prerequisites,
    nextTopics,
    companionTopics,
  };
};

const getTagCounts = (topics) => {
  const counts = new Map();

  topics.forEach((topic) => {
    topic.tags.forEach((tag) => {
      counts.set(tag, (counts.get(tag) || 0) + 1);
    });
  });

  return Array.from(counts.entries()).sort((left, right) => {
    if (right[1] !== left[1]) {
      return right[1] - left[1];
    }

    return left[0].localeCompare(right[0], "de");
  });
};

const filterTopicsByTag = (topics, activeTag) => {
  if (!activeTag) {
    return topics;
  }

  return topics.filter((topic) => topic.tags.includes(activeTag));
};

function App() {
  const [selectedCategoryName, setSelectedCategoryName] = useState(null);
  const [selectedSubcategoryName, setSelectedSubcategoryName] = useState(null);
  const [selectedTopicId, setSelectedTopicId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [activeTag, setActiveTag] = useState(null);
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
  const topicNetwork = selectedTopicEntry
    ? buildTopicNetwork(selectedTopicEntry, searchableTopics)
    : { prerequisites: [], nextTopics: [], companionTopics: [] };
  const hasTopicNetwork =
    topicNetwork.prerequisites.length > 0 ||
    topicNetwork.nextTopics.length > 0 ||
    topicNetwork.companionTopics.length > 0;
  const filteredSearchResults = filterTopicsByTag(searchResults, activeTag);
  const homeFilteredTopics = filterTopicsByTag(searchableTopics, activeTag);

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

  const renderTagFilterBar = (topics, title = "Tags filtern") => {
    const tagCounts = getTagCounts(topics);

    if (tagCounts.length === 0) {
      return null;
    }

    return (
      <section className="rounded-[2rem] border border-stone-300 bg-[rgba(255,251,245,0.9)] p-5 shadow-sm shadow-stone-900/5 dark:border-stone-800 dark:bg-[rgba(24,20,17,0.92)]">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-800 dark:text-amber-300">
              Themenfilter
            </p>
            <h2 className="mt-2 text-xl font-bold text-stone-900 dark:text-stone-100">
              {title}
            </h2>
          </div>

          {activeTag && (
            <button
              className="rounded-full border border-stone-300 bg-stone-100 px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-200 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 dark:hover:bg-stone-800"
              onClick={() => setActiveTag(null)}
            >
              Filter zurücksetzen
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {tagCounts.map(([tag, count]) => {
            const isActive = activeTag === tag;

            return (
              <button
                key={tag}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  isActive
                    ? "bg-amber-800 text-amber-50 shadow-sm dark:bg-amber-300 dark:text-stone-950"
                    : "bg-stone-100 text-stone-700 hover:bg-stone-200 dark:bg-stone-900 dark:text-stone-200 dark:hover:bg-stone-800"
                }`}
                onClick={() => setActiveTag((currentTag) => (currentTag === tag ? null : tag))}
              >
                #{tag} <span className="opacity-70">{count}</span>
              </button>
            );
          })}
        </div>
      </section>
    );
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
      <div className="mb-3 flex flex-wrap items-center gap-2 text-sm text-stone-500 dark:text-stone-400">
        <button
          className="rounded-full border border-stone-300 bg-stone-100 px-3 py-1 text-stone-700 transition hover:bg-stone-200 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 dark:hover:bg-stone-800"
          onClick={() => openCategory(selectedCategory)}
        >
          {selectedCategory.icon} {selectedCategory.category}
        </button>
        <span>›</span>
        <button
          className="rounded-full border border-stone-300 bg-stone-100 px-3 py-1 text-stone-700 transition hover:bg-stone-200 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 dark:hover:bg-stone-800"
          onClick={() => openSubcategory(selectedCategory, selectedSubcategory)}
        >
          {selectedSubcategory.icon} {selectedSubcategory.name}
        </button>
        <span>›</span>
        <span className="font-semibold text-stone-700 dark:text-stone-100">
          {selectedTopicEntry.title}
        </span>
      </div>
    );
  };

  const renderTopicCard = (topicEntry, variant = "default") => {
    const isFavorite = favoriteTopicIds.includes(topicEntry.id);
    const compact = variant === "compact";
    const visibleTags = compact ? topicEntry.tags.slice(0, 3) : topicEntry.tags.slice(0, 4);

    return (
      <article
        key={topicEntry.id}
        className={`rounded-3xl border border-stone-300 bg-[rgba(255,251,245,0.92)] p-5 shadow-sm shadow-stone-900/5 transition hover:-translate-y-0.5 hover:border-amber-400 hover:shadow-lg dark:border-stone-800 dark:bg-[rgba(24,20,17,0.92)] dark:hover:border-amber-500 ${
          compact ? "p-4" : ""
        }`}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-amber-800 dark:text-amber-300">
              {topicEntry.category} · {topicEntry.subcategory}
            </p>
            <h3 className="text-lg font-semibold text-stone-900 dark:text-stone-100">
              {topicEntry.title}
            </h3>
          </div>

          <button
            type="button"
            aria-label={isFavorite ? "Thema aus Merkliste entfernen" : "Thema merken"}
            className={`rounded-full border px-3 py-1 text-sm transition ${
              isFavorite
                ? "border-amber-300 bg-amber-100 text-amber-900 dark:border-amber-600 dark:bg-amber-500/10 dark:text-amber-200"
                : "border-stone-300 bg-stone-100 text-stone-500 hover:border-amber-400 hover:text-amber-800 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300"
            }`}
            onClick={() => toggleFavorite(topicEntry.id)}
          >
            {isFavorite ? "★" : "☆"}
          </button>
        </div>

        <div className="mb-4 flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-stone-100 px-3 py-1 font-medium text-stone-700 dark:bg-stone-900 dark:text-stone-200">
            {topicEntry.categoryIcon} {topicEntry.subcategoryIcon}
          </span>
          <span className={`rounded-full px-3 py-1 font-medium ${getDifficultyClasses(topicEntry.difficulty)}`}>
            {getDifficultyLabel(topicEntry.difficulty)}
          </span>
          {visibleTags.map((tag) => (
            <span
              key={`${topicEntry.id}-${tag}`}
              className="rounded-full bg-amber-50 px-3 py-1 font-medium text-amber-800 dark:bg-amber-500/10 dark:text-amber-200"
            >
              #{tag}
            </span>
          ))}
        </div>

        <div className="flex items-center justify-between gap-3">
          <button
            className="rounded-full bg-stone-900 px-4 py-2 text-sm font-semibold text-stone-50 transition hover:bg-amber-800 dark:bg-amber-300 dark:text-stone-950 dark:hover:bg-amber-200"
            onClick={() => openTopic(topicEntry)}
          >
            Öffnen
          </button>
          <button
            className="text-sm font-medium text-amber-800 transition hover:text-amber-900 dark:text-amber-300 dark:hover:text-amber-200"
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
        className="cursor-pointer rounded-3xl border border-stone-300 bg-[rgba(255,251,245,0.92)] p-5 shadow-sm shadow-stone-900/5 transition hover:-translate-y-0.5 hover:border-amber-400 hover:shadow-lg dark:border-stone-800 dark:bg-[rgba(24,20,17,0.92)] dark:hover:border-amber-500"
        onClick={() => openTopic(topicEntry)}
      >
        <div className="mb-2 flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-amber-800 dark:text-amber-300">
          <span>{topicEntry.categoryIcon} {topicEntry.category}</span>
          <span>·</span>
          <span>{topicEntry.subcategoryIcon} {topicEntry.subcategory}</span>
        </div>

        <div className="mb-3 flex flex-wrap gap-2">
          {topicEntry.tags.slice(0, 4).map((tag) => (
            <span
              key={`${topicEntry.id}-${tag}`}
              className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800 dark:bg-amber-500/10 dark:text-amber-200"
            >
              #{tag}
            </span>
          ))}
        </div>

        <h3
          className="mb-2 text-lg font-semibold text-stone-900 dark:text-stone-100"
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

  const renderTopicNetworkCard = (entry, tone) => {
    const toneClasses = {
      emerald: "border-stone-300 bg-[rgba(242,236,221,0.95)] text-stone-900 dark:border-stone-800 dark:bg-[rgba(28,23,19,0.95)] dark:text-stone-100",
      amber: "border-amber-200 bg-[rgba(248,239,225,0.95)] text-stone-900 dark:border-amber-900/40 dark:bg-[rgba(46,33,24,0.95)] dark:text-stone-100",
      cyan: "border-stone-300 bg-[rgba(239,233,224,0.95)] text-stone-900 dark:border-stone-800 dark:bg-[rgba(26,22,18,0.95)] dark:text-stone-100",
    };

    return (
      <article
        key={entry.topic.id}
        className={`rounded-3xl border p-5 shadow-sm ${toneClasses[tone]}`}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] opacity-75">
              {entry.topic.category} · {entry.topic.subcategory}
            </p>
            <h3 className="mt-2 text-lg font-bold">
              {entry.topic.title}
            </h3>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getDifficultyClasses(entry.topic.difficulty)}`}>
            {getDifficultyLabel(entry.topic.difficulty)}
          </span>
        </div>

        <p className="mb-4 text-sm leading-6 opacity-80">
          {entry.reason}
        </p>

        <div className="mb-4 flex flex-wrap gap-2">
          {entry.topic.tags.slice(0, 3).map((tag) => (
            <span
              key={`${entry.topic.id}-${tag}`}
              className="rounded-full bg-white/80 px-3 py-1 text-xs font-medium text-stone-700 dark:bg-stone-950/50 dark:text-stone-200"
            >
              #{tag}
            </span>
          ))}
        </div>

        <button
          className="rounded-full bg-stone-900 px-4 py-2 text-sm font-semibold text-stone-50 transition hover:bg-amber-800 dark:bg-amber-300 dark:text-stone-950 dark:hover:bg-amber-200"
          onClick={() => openTopic(entry.topic)}
        >
          Thema öffnen
        </button>
      </article>
    );
  };

  const renderTopicNetworkSection = (title, description, entries, tone) => {
    if (entries.length === 0) {
      return null;
    }

    return (
      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100">
            {title}
          </h2>
          <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">
            {description}
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {entries.map((entry) => renderTopicNetworkCard(entry, tone))}
        </div>
      </section>
    );
  };

  const renderHome = () => (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-[2rem] border border-stone-300 bg-[linear-gradient(135deg,rgba(255,251,245,0.98),rgba(238,227,214,0.98))] p-8 text-stone-900 shadow-xl shadow-stone-900/5 dark:border-stone-800 dark:bg-[linear-gradient(135deg,rgba(31,25,21,0.98),rgba(20,16,13,0.98))] dark:text-stone-100">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.35em] text-amber-800 dark:text-amber-300">
          Persönliches C++ Nachschlagewerk
        </p>
        <h1 className="max-w-3xl text-3xl font-black leading-tight md:text-5xl">
          Dein persönliches C++ Nachschlagewerk.
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-stone-600 md:text-base dark:text-stone-300">
          Strukturierte C++ Themen, kompakte Erklärungen und schnelle Navigation durch Kategorien, Merkliste und zuletzt geöffnete Inhalte.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl border border-stone-300 bg-[rgba(255,255,255,0.55)] p-5 dark:border-stone-800 dark:bg-[rgba(255,255,255,0.03)]">
            <p className="text-sm text-stone-500 dark:text-stone-400">Kategorien</p>
            <p className="mt-2 text-3xl font-bold">{themen.length}</p>
          </div>
          <div className="rounded-3xl border border-stone-300 bg-[rgba(255,255,255,0.55)] p-5 dark:border-stone-800 dark:bg-[rgba(255,255,255,0.03)]">
            <p className="text-sm text-stone-500 dark:text-stone-400">Unterkategorien</p>
            <p className="mt-2 text-3xl font-bold">{totalSubcategories}</p>
          </div>
          <div className="rounded-3xl border border-stone-300 bg-[rgba(255,255,255,0.55)] p-5 dark:border-stone-800 dark:bg-[rgba(255,255,255,0.03)]">
            <p className="text-sm text-stone-500 dark:text-stone-400">Themen</p>
            <p className="mt-2 text-3xl font-bold">{totalTopics}</p>
          </div>
        </div>
      </section>

      {(favoriteTopics.length > 0 || recentTopics.length > 0) && (
        <section className="grid gap-6 xl:grid-cols-2">
          {favoriteTopics.length > 0 && (
            <div className="rounded-[2rem] border border-stone-300 bg-[rgba(255,251,245,0.92)] p-6 shadow-sm shadow-stone-900/5 dark:border-stone-800 dark:bg-[rgba(24,20,17,0.92)]">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100">Merkliste</h2>
                  <p className="text-sm text-stone-500 dark:text-stone-400">
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
            <div className="rounded-[2rem] border border-stone-300 bg-[rgba(255,251,245,0.92)] p-6 shadow-sm shadow-stone-900/5 dark:border-stone-800 dark:bg-[rgba(24,20,17,0.92)]">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100">Zuletzt geöffnet</h2>
                  <p className="text-sm text-stone-500 dark:text-stone-400">
                    Für einen schnellen Wiedereinstieg beim Lernen.
                  </p>
                </div>
                <span className="rounded-full bg-stone-200 px-3 py-1 text-sm font-medium text-stone-800 dark:bg-stone-800 dark:text-stone-200">
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

      {renderTagFilterBar(searchableTopics, "Nach Tags stöbern")}

      {activeTag && (
        <section className="rounded-[2rem] border border-stone-300 bg-[rgba(255,251,245,0.92)] p-6 shadow-sm shadow-stone-900/5 dark:border-stone-800 dark:bg-[rgba(24,20,17,0.92)]">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-800 dark:text-amber-300">
                Aktiver Filter
              </p>
              <h2 className="mt-2 text-xl font-bold text-stone-900 dark:text-stone-100">
                Themen mit #{activeTag}
              </h2>
            </div>
            <span className="rounded-full bg-stone-200 px-3 py-1 text-sm font-medium text-stone-800 dark:bg-stone-800 dark:text-stone-200">
              {homeFilteredTopics.length}
            </span>
          </div>

          {homeFilteredTopics.length > 0 ? (
            <div className="grid gap-4 lg:grid-cols-2">
              {homeFilteredTopics.slice(0, 8).map((topic) => renderTopicCard(topic))}
            </div>
          ) : (
            <p className="text-sm text-stone-500 dark:text-stone-400">
              Für diesen Tag wurden aktuell keine Themen gefunden.
            </p>
          )}
        </section>
      )}

      <section className="rounded-[2rem] border border-stone-300 bg-[rgba(255,251,245,0.92)] p-6 shadow-sm shadow-stone-900/5 dark:border-stone-800 dark:bg-[rgba(24,20,17,0.92)]">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100">Kategorien im Überblick</h2>
          <p className="text-sm text-stone-500 dark:text-stone-400">
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {themen.map((category) => {
            const categoryTopics = searchableTopics.filter((topic) => topic.category === category.category);

            return (
              <button
                key={category.category}
                className="rounded-3xl border border-stone-300 bg-stone-100/80 p-5 text-left transition hover:-translate-y-0.5 hover:border-amber-400 hover:bg-[rgba(255,251,245,0.96)] hover:shadow-lg dark:border-stone-800 dark:bg-stone-950 dark:hover:border-amber-500"
                onClick={() => openCategory(category)}
              >
                <div className="mb-3 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-800 dark:text-amber-300">
                      {category.icon} Kategorie
                    </p>
                    <h3 className="mt-2 text-xl font-bold text-stone-900 dark:text-stone-100">
                      {category.category}
                    </h3>
                  </div>
                  <span className="rounded-full bg-stone-200 px-3 py-1 text-sm font-medium text-stone-700 dark:bg-stone-800 dark:text-stone-200">
                    {categoryTopics.length} Themen
                  </span>
                </div>

                <p className="mb-4 text-sm text-stone-500 dark:text-stone-400">
                  {category.subcategories.length} Unterkategorien
                </p>

                <div className="flex flex-wrap gap-2">
                  {category.subcategories.slice(0, 4).map((subcategory) => (
                    <span
                      key={`${category.category}-${subcategory.name}`}
                      className="rounded-full bg-white/80 px-3 py-1 text-sm text-stone-700 dark:bg-stone-900 dark:text-stone-200"
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

    const categoryTopics = searchableTopics.filter(
      (topic) => topic.category === selectedCategory.category
    );
    const filteredCategoryTopics = filterTopicsByTag(categoryTopics, activeTag);

    return (
      <div className="space-y-6">
        <div className="rounded-[2rem] border border-stone-300 bg-[rgba(255,251,245,0.92)] p-6 shadow-sm shadow-stone-900/5 dark:border-stone-800 dark:bg-[rgba(24,20,17,0.92)]">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-800 dark:text-amber-300">
            {selectedCategory.icon} Kategorie
          </p>
          <h1 className="mt-2 text-3xl font-black text-stone-900 dark:text-stone-100">
            {selectedCategory.category}
          </h1>
          <p className="mt-3 text-sm text-stone-500 dark:text-stone-400">
            Wähle eine Unterkategorie, um gezielt in deine Themen einzusteigen.
          </p>
        </div>

        {renderTagFilterBar(categoryTopics, `${selectedCategory.category} filtern`)}

        {activeTag && (
          <section className="rounded-[2rem] border border-stone-300 bg-[rgba(255,251,245,0.92)] p-6 shadow-sm shadow-stone-900/5 dark:border-stone-800 dark:bg-[rgba(24,20,17,0.92)]">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-800 dark:text-amber-300">
                  Tag-Ansicht
                </p>
                <h2 className="mt-2 text-xl font-bold text-stone-900 dark:text-stone-100">
                  Passende Themen für #{activeTag}
                </h2>
              </div>
              <span className="rounded-full bg-stone-200 px-3 py-1 text-sm font-medium text-stone-800 dark:bg-stone-800 dark:text-stone-200">
                {filteredCategoryTopics.length}
              </span>
            </div>

            {filteredCategoryTopics.length > 0 ? (
              <div className="grid gap-4 lg:grid-cols-2">
                {filteredCategoryTopics.map((topic) => renderTopicCard(topic))}
              </div>
            ) : (
              <p className="text-sm text-stone-500 dark:text-stone-400">
                In dieser Kategorie gibt es aktuell keine Themen mit #{activeTag}.
              </p>
            )}
          </section>
        )}

        <div className="grid gap-4 lg:grid-cols-2">
          {selectedCategory.subcategories.map((subcategory) => {
            const subcategoryTopics = categoryTopics.filter(
              (topic) =>
                topic.subcategory === subcategory.name
            );

            return (
              <button
                key={subcategory.name}
                className="rounded-3xl border border-stone-300 bg-[rgba(255,251,245,0.92)] p-5 text-left shadow-sm shadow-stone-900/5 transition hover:-translate-y-0.5 hover:border-amber-400 hover:shadow-lg dark:border-stone-800 dark:bg-[rgba(24,20,17,0.92)] dark:hover:border-amber-500"
                onClick={() => openSubcategory(selectedCategory, subcategory)}
              >
                <div className="mb-3 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-800 dark:text-amber-300">
                      {subcategory.icon} Unterkategorie
                    </p>
                    <h2 className="mt-2 text-xl font-bold text-stone-900 dark:text-stone-100">
                      {subcategory.name}
                    </h2>
                  </div>
                  <span className="rounded-full bg-stone-100 px-3 py-1 text-sm font-medium text-stone-700 dark:bg-stone-900 dark:text-stone-200">
                    {subcategoryTopics.length}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {subcategoryTopics.slice(0, 3).map((topic) => (
                    <span
                      key={topic.id}
                      className="rounded-full bg-stone-100 px-3 py-1 text-xs text-stone-600 dark:bg-stone-900 dark:text-stone-300"
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
    const filteredTopics = filterTopicsByTag(topics, activeTag);

    return (
      <div className="space-y-6">
        <div className="rounded-[2rem] border border-stone-300 bg-[rgba(255,251,245,0.92)] p-6 shadow-sm shadow-stone-900/5 dark:border-stone-800 dark:bg-[rgba(24,20,17,0.92)]">
          <div className="mb-3 flex flex-wrap items-center gap-2 text-sm text-stone-500 dark:text-stone-400">
            <button
              className="rounded-full border border-stone-300 bg-stone-100 px-3 py-1 transition hover:bg-stone-200 dark:border-stone-700 dark:bg-stone-900 dark:hover:bg-stone-800"
              onClick={() => openCategory(selectedCategory)}
            >
              {selectedCategory.icon} {selectedCategory.category}
            </button>
            <span>›</span>
            <span className="font-semibold text-stone-700 dark:text-stone-100">
              {selectedSubcategory.icon} {selectedSubcategory.name}
            </span>
          </div>

          <h1 className="text-3xl font-black text-stone-900 dark:text-stone-100">
            {selectedSubcategory.name}
          </h1>
          <p className="mt-3 text-sm text-stone-500 dark:text-stone-400">
            {topics.length} Themen in diesem Bereich.
          </p>
        </div>

        {renderTagFilterBar(topics, `${selectedSubcategory.name} filtern`)}

        {filteredTopics.length > 0 ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {filteredTopics.map((topic) => renderTopicCard(topic))}
          </div>
        ) : (
          <div className="rounded-[2rem] border border-dashed border-stone-300 bg-[rgba(255,251,245,0.92)] p-8 text-stone-500 dark:border-stone-700 dark:bg-[rgba(24,20,17,0.92)] dark:text-stone-400">
            In dieser Unterkategorie gibt es aktuell keine Themen mit #{activeTag}.
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex h-screen overflow-hidden bg-stone-200 text-stone-900 dark:bg-[#14110e] dark:text-stone-100">
      <aside
        className={`fixed inset-y-0 left-0 z-30 w-[88vw] max-w-sm overflow-y-auto border-r border-stone-300 bg-[rgba(247,242,232,0.96)] p-5 shadow-2xl shadow-stone-950/10 transition-transform dark:border-stone-800 dark:bg-[rgba(24,20,17,0.96)] md:static md:block md:h-screen md:w-[340px] md:shrink-0 md:translate-x-0 md:shadow-none ${
          showSidebar ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="mb-6 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-800 dark:text-amber-300">
              C++ Lernhilfe
            </p>
            <h2 className="mt-2 text-2xl font-black text-stone-900 dark:text-stone-100">
              C++ Hilfsbuch
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setDarkMode((value) => !value)}
              className="rounded-full border border-stone-300 bg-stone-100 px-3 py-2 text-sm font-medium transition hover:bg-stone-200 dark:border-stone-700 dark:bg-stone-900 dark:hover:bg-stone-800"
            >
              {darkMode ? "🌞" : "🌙"}
            </button>
            <button
              onClick={() => setShowSidebar(false)}
              className="rounded-full border border-stone-300 bg-stone-100 px-3 py-2 text-sm font-medium transition hover:bg-stone-200 dark:border-stone-700 dark:bg-stone-900 dark:hover:bg-stone-800 md:hidden"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="mb-4 rounded-3xl border border-stone-300/70 bg-stone-100 p-4 dark:border-stone-800 dark:bg-stone-950">
          <p className="text-sm text-stone-600 dark:text-stone-300">
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
                    className="flex-1 rounded-2xl border border-stone-300 bg-stone-100 px-4 py-3 text-left font-semibold transition hover:bg-stone-200 dark:border-stone-800 dark:bg-stone-950 dark:hover:bg-stone-900"
                    onClick={() => openCategory(category)}
                  >
                    {category.icon} {category.category}
                  </button>
                  <button
                    className="rounded-2xl border border-stone-300 bg-stone-100 px-4 py-3 text-sm transition hover:bg-stone-200 dark:border-stone-800 dark:bg-stone-950 dark:hover:bg-stone-900"
                    onClick={() => toggleCategory(category.category)}
                  >
                    {categoryExpanded ? "▲" : "▼"}
                  </button>
                </div>

                {categoryExpanded && (
                  <ul className="ml-3 mt-3 space-y-2 border-l border-stone-300 pl-4 dark:border-stone-800">
                    {category.subcategories.map((subcategory) => {
                      const subcategoryKey = `sub:${category.category}:${subcategory.name}`;
                      const subcategoryExpanded = expandedCategories.includes(subcategoryKey);

                      return (
                        <li key={`${category.category}-${subcategory.name}`}>
                          <div className="flex gap-2">
                            <button
                              className="flex-1 rounded-2xl border border-stone-300 bg-[rgba(255,251,245,0.92)] px-4 py-2 text-left text-sm font-medium transition hover:bg-stone-100 dark:border-stone-800 dark:bg-stone-950 dark:hover:bg-stone-900"
                              onClick={() => openSubcategory(category, subcategory)}
                            >
                              {subcategory.icon} {subcategory.name}
                            </button>
                            <button
                              className="rounded-2xl border border-stone-300 bg-[rgba(255,251,245,0.92)] px-3 py-2 text-xs transition hover:bg-stone-100 dark:border-stone-800 dark:bg-stone-950 dark:hover:bg-stone-900"
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
                                          ? "bg-amber-100 text-amber-950 dark:bg-amber-500/15 dark:text-amber-200"
                                          : "hover:bg-stone-100 dark:hover:bg-stone-900"
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
          className="fixed inset-0 z-20 bg-stone-950/45 md:hidden"
          aria-label="Sidebar schließen"
          onClick={() => setShowSidebar(false)}
        />
      )}

      <main className="relative z-10 min-w-0 flex-1 overflow-y-auto overscroll-contain">
        <header className="sticky top-0 z-10 border-b border-stone-300 bg-[rgba(247,242,232,0.9)] backdrop-blur dark:border-stone-800 dark:bg-[rgba(20,17,14,0.88)]">
          <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-4 md:px-8">
            <button
              onClick={() => setShowSidebar(true)}
              className="rounded-full border border-stone-300 bg-[rgba(255,251,245,0.95)] px-4 py-2 text-sm font-medium transition hover:bg-stone-100 dark:border-stone-700 dark:bg-stone-950 dark:hover:bg-stone-900 md:hidden"
            >
              ☰
            </button>

            <button
              onClick={goHome}
              className="rounded-full border border-stone-300 bg-[rgba(255,251,245,0.95)] px-4 py-2 text-sm font-medium transition hover:bg-stone-100 dark:border-stone-700 dark:bg-stone-950 dark:hover:bg-stone-900"
            >
              Startseite
            </button>

            <div className="relative flex-1">
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Suche nach Thema, Inhalt oder Begriff..."
                className="w-full rounded-full border border-stone-300 bg-[rgba(255,251,245,0.96)] px-5 py-3 pr-24 text-sm shadow-sm outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100 dark:border-stone-700 dark:bg-stone-950 dark:focus:border-amber-400 dark:focus:ring-amber-500/10"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-stone-100 px-3 py-1 text-xs text-stone-500 dark:bg-stone-900 dark:text-stone-400">
                / Fokus
              </span>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-8">
          {searchTerm.trim() ? (
            <section className="space-y-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-800 dark:text-amber-300">
                  Suche
                </p>
                <h1 className="mt-2 text-3xl font-black text-stone-900 dark:text-stone-100">
                  Ergebnisse für "{searchTerm}"
                </h1>
                <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">
                  {filteredSearchResults.length} Treffer
                </p>
              </div>

              {renderTagFilterBar(searchResults, "Suchergebnisse eingrenzen")}

              {filteredSearchResults.length > 0 ? (
                <ul className="grid gap-4 lg:grid-cols-2">
                  {filteredSearchResults.map((topic) => renderSearchResult(topic))}
                </ul>
              ) : (
                <div className="rounded-[2rem] border border-dashed border-stone-300 bg-[rgba(255,251,245,0.92)] p-8 text-stone-500 dark:border-stone-700 dark:bg-[rgba(24,20,17,0.92)] dark:text-stone-400">
                  Keine Treffer gefunden. Probier einen kürzeren Begriff oder suche nach einem C++ Schlüsselwort.
                </div>
              )}
            </section>
          ) : selectedTopic ? (
            <section className="space-y-5">
              {renderBreadcrumb()}

              <div className="rounded-[2rem] border border-stone-300 bg-[rgba(255,251,245,0.94)] p-6 shadow-sm shadow-stone-900/5 dark:border-stone-800 dark:bg-[rgba(24,20,17,0.94)]">
                <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="mb-3 flex flex-wrap gap-2 text-xs">
                      <span className="rounded-full bg-stone-100 px-3 py-1 font-medium text-stone-700 dark:bg-stone-900 dark:text-stone-200">
                        {selectedTopicEntry.categoryIcon} {selectedTopicEntry.category}
                      </span>
                      <span className="rounded-full bg-stone-100 px-3 py-1 font-medium text-stone-700 dark:bg-stone-900 dark:text-stone-200">
                        {selectedTopicEntry.subcategoryIcon} {selectedTopicEntry.subcategory}
                      </span>
                      <span className={`rounded-full px-3 py-1 font-medium ${getDifficultyClasses(selectedTopicEntry.difficulty)}`}>
                        {getDifficultyLabel(selectedTopicEntry.difficulty)}
                      </span>
                    </div>

                    <div className="mb-4 flex flex-wrap gap-2">
                      {selectedTopicEntry.tags.map((tag) => (
                        <span
                          key={`${selectedTopicEntry.id}-${tag}`}
                          className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800 dark:bg-amber-500/10 dark:text-amber-200"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>

                    <h1 className="text-3xl font-black text-stone-900 dark:text-stone-100">
                      {selectedTopic.title}
                    </h1>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                        favoriteTopicIds.includes(selectedTopicEntry.id)
                          ? "border-amber-300 bg-amber-100 text-amber-900 dark:border-amber-600 dark:bg-amber-500/10 dark:text-amber-200"
                          : "border-stone-300 bg-stone-100 text-stone-700 hover:border-amber-400 hover:text-amber-800 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200"
                      }`}
                      onClick={() => toggleFavorite(selectedTopicEntry.id)}
                    >
                      {favoriteTopicIds.includes(selectedTopicEntry.id) ? "★ Gemerkt" : "☆ Merken"}
                    </button>
                    <button
                      className="rounded-full border border-stone-300 bg-stone-100 px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-200 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 dark:hover:bg-stone-800"
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

                {hasTopicNetwork && (
                  <section className="mt-10 space-y-8 border-t border-stone-300 pt-8 dark:border-stone-800">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-800 dark:text-amber-300">
                        Themennetz
                      </p>
                      <h2 className="mt-2 text-2xl font-bold text-stone-900 dark:text-stone-100">
                        Dazu passen diese nächsten Ankerpunkte
                      </h2>
                      <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">
                      </p>
                    </div>

                    {renderTopicNetworkSection(
                      "Hilfreiches Vorwissen",
                      "Themen, die dir den Einstieg oder das Verständnis dieses Abschnitts erleichtern.",
                      topicNetwork.prerequisites,
                      "emerald"
                    )}

                    {renderTopicNetworkSection(
                      "Als Nächstes sinnvoll",
                      "Naheliegende Anschluss-Themen, wenn du auf dieser Stelle weiterlernen oder tiefer gehen willst.",
                      topicNetwork.nextTopics,
                      "amber"
                    )}

                    {renderTopicNetworkSection(
                      "Passt gut dazu",
                      "Ergänzende Themen aus demselben Kontext, die oft zusammen nachgeschlagen werden.",
                      topicNetwork.companionTopics,
                      "cyan"
                    )}
                  </section>
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
