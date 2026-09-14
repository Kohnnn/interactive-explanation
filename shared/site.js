const FAMILY_CONFIGS = {
  "nicky-case": { label: "Nicky Case" },
  "mlu-explain": { label: "MLU Explain" },
  setosa: { label: "Setosa" },
  "anders-brownworth": { label: "Anders Brownworth" },
  "engineering-longform": { label: "Engineering Longform" },
  ableton: { label: "Ableton Learning" },
  teoria: { label: "Teoria" },
  "music-tools": { label: "Music Tools" },
  samwho: { label: "Samwho" },
  "independent-labs": { label: "Independent Labs" },
  "local-hubs": { label: "Local Hubs" },
};

const INTENT_LABELS = {
  explainer: "Understand",
  simulation: "Experiment",
  practice: "Practice",
  create: "Build",
  "guided-path": "Follow a path",
};

const FEATURED_SLUGS = new Set([
  "blockchain-101-combined-flow",
  "primary-interactive-hub",
  "music-interactive-hub",
  "blockchain",
  "public-private-keys",
  "zero-knowledge-proof-demo",
  "mechanical-watch",
  "formula-1-racing",
  "tesseract",
  "trust",
]);

const NEW_ROUTE_WINDOW_DAYS = 30;
const INITIAL_ROUTE_COUNT = 8;

function createElement(tagName, className, textContent) {
  const node = document.createElement(tagName);
  if (className) {
    node.className = className;
  }
  if (typeof textContent === "string") {
    node.textContent = textContent;
  }
  return node;
}

function getFamilyKey(page) {
  if (page.familyKey && FAMILY_CONFIGS[page.familyKey]) {
    return page.familyKey;
  }
  return RouteFamilies.classifySiteFamily(page);
}

function isRouteDate(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function getMaxAddedDate(pages) {
  return pages.reduce(function (latest, page) {
    return isRouteDate(page.addedDate) && page.addedDate > latest ? page.addedDate : latest;
  }, "");
}

function isNewPage(page, maxAddedDate) {
  if (!isRouteDate(page.addedDate) || !isRouteDate(maxAddedDate)) {
    return false;
  }
  return Date.parse(maxAddedDate + "T00:00:00Z") - Date.parse(page.addedDate + "T00:00:00Z") <= NEW_ROUTE_WINDOW_DAYS * 86400000;
}

function enrichPage(page, index) {
  const familyKey = getFamilyKey(page);
  const family = FAMILY_CONFIGS[familyKey] || FAMILY_CONFIGS["independent-labs"];
  const topics = Array.isArray(page.topicTags) ? page.topicTags : [];
  return {
    ...page,
    index: index,
    familyKey: familyKey,
    family: family,
    topics: topics,
    featured: FEATURED_SLUGS.has(page.slug),
    searchText: [page.title, page.summary, page.slug, topics.join(" "), family.label, page.referenceUrl || ""].join(" ").toLowerCase(),
  };
}

function getSort(value) {
  return ["featured", "new", "title"].includes(value) ? value : "featured";
}

function getIntent(value) {
  return Object.prototype.hasOwnProperty.call(INTENT_LABELS, value) ? value : "all";
}

function getFamily(value) {
  return value === "all" || FAMILY_CONFIGS[value] ? value : "all";
}

function getTopic(value, topics) {
  return value === "all" || topics.has(value) ? value : "all";
}

function formatTopic(topic) {
  return topic.replace(/-/g, " ").replace(/\b\w/g, function (letter) {
    return letter.toUpperCase();
  });
}

function readHomeState(topics) {
  const params = new URLSearchParams(window.location.search);
  return {
    query: (params.get("q") || "").trim(),
    intent: getIntent(params.get("intent") || "all"),
    family: getFamily(params.get("family") || "all"),
    topic: getTopic(params.get("topic") || "all", topics),
    sort: getSort(params.get("sort") || "featured"),
  };
}

function syncHomeState(state, mode) {
  if (mode === "none") {
    return;
  }
  const url = new URL(window.location.href);
  [["q", state.query], ["intent", state.intent === "all" ? "" : state.intent], ["family", state.family === "all" ? "" : state.family], ["topic", state.topic === "all" ? "" : state.topic], ["sort", state.sort === "featured" ? "" : state.sort]].forEach(function (entry) {
    if (entry[1]) {
      url.searchParams.set(entry[0], entry[1]);
    } else {
      url.searchParams.delete(entry[0]);
    }
  });
  window.history[mode + "State"]({}, "", url);
}

function comparePages(left, right, sort) {
  if (sort === "new") {
    return (right.addedDate || "").localeCompare(left.addedDate || "") || left.title.localeCompare(right.title);
  }
  if (sort === "title") {
    return left.title.localeCompare(right.title);
  }
  return Number(right.featured) - Number(left.featured) || left.title.localeCompare(right.title);
}

function applyFilters(pages, state) {
  return pages.filter(function (page) {
    return (state.intent === "all" || page.intent === state.intent) &&
      (state.family === "all" || page.familyKey === state.family) &&
      (state.topic === "all" || page.topics.includes(state.topic)) &&
      (!state.query || page.searchText.includes(state.query.toLowerCase()));
  }).sort(function (left, right) {
    return comparePages(left, right, state.sort);
  });
}

function createPageCard(page, maxAddedDate, promoted, pagesBySlug) {
  const card = createElement("article", "page-card");
  card.dataset.intent = page.intent;
  card.dataset.family = page.familyKey;
  card.dataset.topics = page.topics.join(" ");
  card.dataset.slug = page.slug;
  card.appendChild(createElement("p", "eyebrow", promoted ? "Recommended path" : page.family.label));
  const title = createElement("h3");
  const titleLink = createElement("a", "page-card__title-link", page.title);
  titleLink.href = "./" + page.slug + "/";
  title.appendChild(titleLink);
  card.appendChild(title);
  card.appendChild(createElement("p", "page-card__intent", page.intent === "guided-path" ? "Guided path" : INTENT_LABELS[page.intent]));
  card.appendChild(createElement("p", "meta-line", page.summary));
  const tags = createElement("div", "chip-list page-card__tags");
  page.topics.forEach(function (topic) {
    tags.appendChild(createElement("span", "chip chip--tag", formatTopic(topic)));
  });
  if (isNewPage(page, maxAddedDate)) {
    tags.appendChild(createElement("span", "status-pill status-pill--new", "New"));
  }
  if (tags.children.length) {
    card.appendChild(tags);
  }
  const actions = createElement("div", "action-row action-row--compact");
  actions.dataset.pageCardActions = "";
  const routeLink = createElement("a", "action-link", promoted ? "Start path" : "Open route");
  routeLink.href = "./" + page.slug + "/";
  actions.appendChild(routeLink);
  const docsLink = createElement("a", "action-link secondary", "Docs");
  docsLink.href = page.docsUrl;
  actions.appendChild(docsLink);
  card.appendChild(actions);
  const suggestedNext = pagesBySlug.get(page.suggestedNextSlug);
  if (suggestedNext) {
    const continuation = createElement("a", "page-card__continuation", "Suggested next: " + suggestedNext.title);
    continuation.dataset.pageCardContinuation = "";
    continuation.href = "./" + suggestedNext.slug + "/";
    card.appendChild(continuation);
  }
  return card;
}

function renderFamilies(mount, pages, state, onChange) {
  if (mount.children.length) {
    mount.querySelectorAll("[data-atlas-family]").forEach(function (button) {
      const active = state.family === button.dataset.atlasFamily;
      button.setAttribute("aria-pressed", String(active));
      button.classList.toggle("is-active", active);
    });
    return;
  }
  const counts = new Map();
  pages.forEach(function (page) {
    counts.set(page.familyKey, (counts.get(page.familyKey) || 0) + 1);
  });
  [["all", "All families", pages.length], ...Array.from(counts.entries()).sort(function (left, right) {
    return FAMILY_CONFIGS[left[0]].label.localeCompare(FAMILY_CONFIGS[right[0]].label);
  }).map(function (entry) {
    return [entry[0], FAMILY_CONFIGS[entry[0]].label, entry[1]];
  })].forEach(function (item) {
    const button = createElement("button", "filter-pill", item[1] + " (" + item[2] + ")");
    button.type = "button";
    button.dataset.atlasFamily = item[0];
    button.setAttribute("aria-pressed", String(state.family === item[0]));
    button.classList.toggle("is-active", state.family === item[0]);
    button.addEventListener("click", function () {
      onChange(item[0]);
    });
    mount.appendChild(button);
  });
}

function renderSummary(mount, filtered, total, state, visibleCount) {
  let text = visibleCount < filtered.length
    ? "Showing " + visibleCount + " routes. " + filtered.length + " available."
    : "Showing " + filtered.length + " of " + total + " routes.";
  if (state.intent !== "all") {
    text += " " + INTENT_LABELS[state.intent] + ".";
  }
  if (state.family !== "all") {
    text += " " + FAMILY_CONFIGS[state.family].label + ".";
  }
  if (state.topic !== "all") {
    text += " Topic: " + formatTopic(state.topic) + ".";
  }
  if (state.query) {
    text += " Search: \"" + state.query + "\".";
  }
  mount.textContent = text;
}

async function initHome() {
  const mount = document.querySelector("[data-page-list]");
  if (!mount) {
    return;
  }
  const results = document.querySelector("[data-page-results]");
  const queryInput = document.querySelector("[data-filter-query]");
  const topicSelect = document.querySelector("[data-topic-select]");
  const sortSelect = document.querySelector("[data-sort-select]");
  const intentButtons = Array.from(document.querySelectorAll("[data-atlas-intent]"));
  const familyMount = document.querySelector("[data-family-filters]");
  const advancedFilters = document.querySelector(".advanced-filters");
  const guidedPathMount = document.querySelector("[data-guided-path-list]");
  const clearButton = document.querySelector("[data-clear-filters]");
  const showMoreButton = document.querySelector("[data-show-more]");
  if (!results || !queryInput || !topicSelect || !sortSelect || !familyMount || !advancedFilters || !guidedPathMount || !clearButton || !showMoreButton) {
    return;
  }
  try {
    const response = await fetch("./pages.json", { cache: "no-store" });
    if (!response.ok) {
      throw new Error("Manifest unavailable");
    }
    const pages = (await response.json()).map(enrichPage);
    const pagesBySlug = new Map(pages.map(function (page) {
      return [page.slug, page];
    }));
    const maxAddedDate = getMaxAddedDate(pages);
    const topics = new Set(pages.flatMap(function (page) {
      return page.topics;
    }));
    const state = readHomeState(topics);
    let expanded = Boolean(state.query || state.intent !== "all" || state.family !== "all" || state.topic !== "all");

    Array.from(topics).sort(function (left, right) {
      return formatTopic(left).localeCompare(formatTopic(right));
    }).forEach(function (topic) {
      const option = createElement("option", null, formatTopic(topic));
      option.value = topic;
      topicSelect.appendChild(option);
    });

    pages.filter(function (page) {
      return page.intent === "guided-path";
    }).sort(function (left, right) {
      return left.index - right.index;
    }).forEach(function (page) {
      guidedPathMount.appendChild(createPageCard(page, maxAddedDate, true, pagesBySlug));
    });

    mount.innerHTML = "";
    const cardsBySlug = new Map();
    pages.forEach(function (page) {
      const card = createPageCard(page, maxAddedDate, false, pagesBySlug);
      cardsBySlug.set(page.slug, card);
      mount.appendChild(card);
    });
    const emptyState = createElement("div", "empty-state", "No routes match these filters. Change your search or use Clear filters to show all routes.");
    emptyState.hidden = true;
    mount.appendChild(emptyState);

    function render(mode) {
      const filtered = applyFilters(pages, state);
      syncHomeState(state, mode);
      if (document.activeElement !== queryInput || mode === "none") {
        queryInput.value = state.query;
      }
      topicSelect.value = state.topic;
      sortSelect.value = state.sort;
      intentButtons.forEach(function (button) {
        const active = button.dataset.atlasIntent === state.intent;
        button.classList.toggle("is-active", active);
        button.setAttribute("aria-pressed", String(active));
      });
      renderFamilies(familyMount, pages, state, function (family) {
        state.family = family;
        render("push");
      });
      if (state.family !== "all") {
        advancedFilters.open = true;
      }
      const active = Boolean(state.query || state.intent !== "all" || state.family !== "all" || state.topic !== "all");
      const visibleCount = !expanded && !active ? Math.min(filtered.length, INITIAL_ROUTE_COUNT) : filtered.length;
      renderSummary(results, filtered, pages.length, state, visibleCount);
      clearButton.hidden = !active;
      clearButton.disabled = !active;
      const collapsed = !expanded && !active;
      const filteredSlugs = new Set(filtered.map(function (page) {
        return page.slug;
      }));
      const visibleSlugs = new Set(filtered.filter(function (page) {
        return page.intent !== "guided-path";
      }).slice(0, INITIAL_ROUTE_COUNT).map(function (page) {
        return page.slug;
      }));
      filtered.forEach(function (page) {
        mount.appendChild(cardsBySlug.get(page.slug));
      });
      pages.forEach(function (page) {
        const card = cardsBySlug.get(page.slug);
        card.hidden = !filteredSlugs.has(page.slug) || (collapsed && !visibleSlugs.has(page.slug));
        if (!filteredSlugs.has(page.slug)) {
          mount.appendChild(card);
        }
      });
      emptyState.hidden = filtered.length > 0;
      mount.appendChild(emptyState);
      showMoreButton.hidden = !collapsed || filtered.length <= INITIAL_ROUTE_COUNT;
      showMoreButton.textContent = "Show all " + filtered.length + " routes";
    }

    intentButtons.forEach(function (button) {
      button.addEventListener("click", function () {
        state.intent = button.dataset.atlasIntent;
        render("push");
      });
    });
    queryInput.addEventListener("input", function () {
      state.query = queryInput.value.trim();
      render("replace");
    });
    topicSelect.addEventListener("change", function () {
      state.topic = getTopic(topicSelect.value, topics);
      render("push");
    });
    sortSelect.addEventListener("change", function () {
      state.sort = getSort(sortSelect.value);
      render("push");
    });
    clearButton.addEventListener("click", function () {
      state.query = "";
      state.intent = "all";
      state.family = "all";
      state.topic = "all";
      expanded = false;
      render("push");
      queryInput.focus();
    });
    showMoreButton.addEventListener("click", function () {
      expanded = true;
      render("none");
      const firstRevealedCard = Array.from(mount.querySelectorAll(".page-card")).find(function (card) {
        return card.dataset.intent === "guided-path";
      });
      firstRevealedCard?.querySelector(".page-card__title-link")?.focus({ preventScroll: true });
      firstRevealedCard?.scrollIntoView({ block: "center" });
    });
    window.addEventListener("popstate", function () {
      Object.assign(state, readHomeState(topics));
      expanded = Boolean(state.query || state.intent !== "all" || state.family !== "all" || state.topic !== "all");
      render("none");
    });
    render("replace");
  } catch (error) {
    mount.innerHTML = '<div class="empty-state">The route inventory could not be loaded. Serve this folder over HTTP.</div>';
    if (results) {
      results.textContent = "Route inventory unavailable.";
    }
  }
}

function enhanceDocsSections() {
  const sections = Array.from(document.querySelectorAll(".docs-page .note-grid > .note-section"));
  sections.forEach(function (section) {
    const heading = section.querySelector(":scope > h2");
    if (!heading) {
      return;
    }
    const details = createElement("details", "note-section docs-disclosure");
    details.open = window.innerWidth > 720;
    if (section.id) {
      details.id = section.id;
    }
    const summary = createElement("summary", "docs-disclosure__summary");
    summary.appendChild(heading);
    const content = createElement("div", "docs-disclosure__content");
    while (section.firstChild) {
      content.appendChild(section.firstChild);
    }
    details.appendChild(summary);
    details.appendChild(content);
    section.replaceWith(details);
  });

  function openHashTarget() {
    if (!window.location.hash) {
      return;
    }
    let targetId;
    try {
      targetId = decodeURIComponent(window.location.hash.slice(1));
    } catch (error) {
      return;
    }
    const target = document.getElementById(targetId);
    if (target?.matches(".docs-disclosure")) {
      target.open = true;
    }
  }

  openHashTarget();
  window.addEventListener("hashchange", openHashTarget);
}

async function initParity() {
  const mount = document.querySelector("[data-parity-list]");
  if (!mount) {
    return;
  }
  const countTarget = document.querySelector("[data-module-count]");
  try {
    const response = await fetch(document.body.dataset.parityUrl, { cache: "no-store" });
    const modules = await response.json();
    if (countTarget) {
      countTarget.textContent = modules.length + " modules tracked";
    }
    mount.innerHTML = "";
    modules.forEach(function (module) {
      const article = createElement("details", "module-card");
      const summary = createElement("summary", "module-card__summary");
      summary.appendChild(createElement("h3", null, module.moduleId));
      article.appendChild(summary);
      const content = createElement("div", "module-card__content");
      [["Original behavior:", module.originalBehavior], ["Local status:", module.localStatus]].forEach(function (item) {
        const paragraph = createElement("p", "meta-line");
        paragraph.appendChild(createElement("strong", null, item[0]));
        paragraph.appendChild(document.createTextNode(" " + item[1]));
        content.appendChild(paragraph);
      });
      const files = createElement("div", "chip-list");
      module.sourceFiles.forEach(function (file) {
        files.appendChild(createElement("span", "chip", file));
      });
      content.appendChild(files);
      [module.notes, module.evidence].forEach(function (items) {
        const list = createElement("ul", "plain-list compact");
        items.forEach(function (item) {
          list.appendChild(createElement("li", null, item));
        });
        content.appendChild(list);
      });
      article.appendChild(content);
      mount.appendChild(article);
    });
  } catch (error) {
    mount.innerHTML = '<div class="empty-state">The parity contract could not be loaded.</div>';
  }
}

function enhanceAccessibility() {
  const main = document.querySelector("main.site-page");
  if (!main) {
    return;
  }
  main.id ||= "main";
  main.tabIndex = -1;
  if (!document.querySelector(".skip-link")) {
    const link = createElement("a", "skip-link", "Skip to main content");
    link.href = "#" + main.id;
    document.body.insertBefore(link, document.body.firstChild);
  }
  if (document.body.dataset.pageType === "home") {
    main.setAttribute("aria-label", "Interactive explanation atlas");
    document.querySelector("[data-atlas-controls]")?.setAttribute("role", "search");
  }
  if (document.body.dataset.pageType === "docs") {
    const backLink = document.querySelector(".back-link");
    if (backLink) {
      backLink.textContent = "Back to Atlas";
    }
  }
}

document.addEventListener("DOMContentLoaded", function () {
  enhanceAccessibility();
  enhanceDocsSections();
  initHome();
  initParity();
});
