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

function createPageCard(page, maxAddedDate, promoted) {
  const card = createElement("article", "page-card");
  card.dataset.intent = page.intent;
  card.dataset.family = page.familyKey;
  card.dataset.topics = page.topics.join(" ");
  card.dataset.slug = page.slug;
  card.appendChild(createElement("p", "eyebrow", promoted ? "Recommended path" : page.family.label));
  const title = createElement("h2", null, page.title);
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
  const routeLink = createElement("a", "action-link", promoted ? "Start path" : "Open route");
  routeLink.href = "./" + page.slug + "/";
  actions.appendChild(routeLink);
  const docsLink = createElement("a", "action-link secondary", "Docs");
  docsLink.href = page.docsUrl;
  actions.appendChild(docsLink);
  card.appendChild(actions);
  return card;
}

function renderFamilies(mount, pages, state, onChange) {
  mount.innerHTML = "";
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

function renderSummary(mount, filtered, total, state) {
  let text = "Showing " + filtered.length + " of " + total + " routes.";
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
  try {
    const response = await fetch("./pages.json", { cache: "no-store" });
    if (!response.ok) {
      throw new Error("Manifest unavailable");
    }
    const pages = (await response.json()).map(enrichPage);
    const maxAddedDate = getMaxAddedDate(pages);
    const topics = new Set(pages.flatMap(function (page) {
      return page.topics;
    }));
    const state = readHomeState(topics);

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
      guidedPathMount.appendChild(createPageCard(page, maxAddedDate, true));
    });

    function render(mode) {
      const filtered = applyFilters(pages, state);
      syncHomeState(state, mode);
      queryInput.value = state.query;
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
      renderSummary(results, filtered, pages.length, state);
      const active = Boolean(state.query || state.intent !== "all" || state.family !== "all" || state.topic !== "all");
      clearButton.hidden = !active;
      clearButton.disabled = !active;
      mount.innerHTML = "";
      if (!filtered.length) {
        mount.appendChild(createElement("div", "empty-state", "No routes match these filters."));
        return;
      }
      filtered.forEach(function (page) {
        mount.appendChild(createPageCard(page, maxAddedDate, false));
      });
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
      render("push");
    });
    window.addEventListener("popstate", function () {
      Object.assign(state, readHomeState(topics));
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
      const article = createElement("article", "module-card");
      article.appendChild(createElement("h3", null, module.moduleId));
      [["Original behavior:", module.originalBehavior], ["Local status:", module.localStatus]].forEach(function (item) {
        const paragraph = createElement("p", "meta-line");
        paragraph.appendChild(createElement("strong", null, item[0]));
        paragraph.appendChild(document.createTextNode(" " + item[1]));
        article.appendChild(paragraph);
      });
      const files = createElement("div", "chip-list");
      module.sourceFiles.forEach(function (file) {
        files.appendChild(createElement("span", "chip", file));
      });
      article.appendChild(files);
      [module.notes, module.evidence].forEach(function (items) {
        const list = createElement("ul", "plain-list compact");
        items.forEach(function (item) {
          list.appendChild(createElement("li", null, item));
        });
        article.appendChild(list);
      });
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
  initHome();
  initParity();
});
