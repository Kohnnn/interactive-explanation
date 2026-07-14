const FAMILY_PRIORITY = {
  "local-hubs": -20,
  "engineering-longform": -10,
  "anders-brownworth": -9,
  "nicky-case": -8,
};

const ROUTE_DECORATORS = {
  "blockchain-101-combined-flow": {
    featured: true,
    timeEstimate: "15-20 min",
    difficulty: "Starter path",
    spotlight: "Best first stop for the blockchain family.",
  },
  "primary-interactive-hub": {
    featured: true,
    timeEstimate: "10 min to browse",
    difficulty: "Starter path",
    spotlight: "Fastest way into the social sims and narrative routes.",
  },
  "music-interactive-hub": {
    featured: true,
    timeEstimate: "15 min to browse",
    difficulty: "Starter path",
    spotlight: "Curated entry point for the music tools and lessons.",
  },
  blockchain: {
    featured: true,
    timeEstimate: "8-12 min",
    difficulty: "Beginner",
    spotlight: "Best editable demo for learning chained state.",
  },
  "public-private-keys": {
    featured: true,
    timeEstimate: "10-15 min",
    difficulty: "Beginner",
    spotlight: "Shortest path from identity to signatures and transactions.",
  },
  "zero-knowledge-proof-demo": {
    featured: true,
    timeEstimate: "6-10 min",
    difficulty: "Intermediate",
    spotlight: "Compact privacy-proof demo once the blockchain flow clicks.",
  },
  "mechanical-watch": {
    featured: true,
    timeEstimate: "20-30 min",
    difficulty: "Intermediate",
    spotlight: "Most complete engineering longform route in the collection.",
  },
  "formula-1-racing": {
    featured: true,
    timeEstimate: "18-28 min",
    difficulty: "Intermediate",
    spotlight: "Original longform route about how a modern F1 car turns tradeoffs into lap time.",
  },
  tesseract: {
    featured: true,
    timeEstimate: "15-25 min",
    difficulty: "Intermediate",
    spotlight: "Best math-first longform route for geometric intuition.",
  },
  trust: {
    featured: true,
    timeEstimate: "15-20 min",
    difficulty: "Beginner",
    spotlight: "Strong first systems explainer for new visitors.",
  },
};

const HOME_SORT_LABELS = {
  featured: "Featured first",
  new: "Newest first",
  title: "Title A–Z",
};

const HOME_VIEW_LABELS = {
  grouped: "Grouped by family",
  flat: "Flat list",
};

const NEW_ROUTE_WINDOW_DAYS = 30;

const FAMILY_CONFIGS = {
  "nicky-case": {
    key: "nicky-case",
    label: "Nicky Case",
    description: "Social sims, narrative games, and systems explainers.",
    tone: "ember",
  },
  "mlu-explain": {
    key: "mlu-explain",
    label: "MLU Explain",
    description: "Machine-learning scrollytelling and chart-driven explainers.",
    tone: "harbor",
  },
  setosa: {
    key: "setosa",
    label: "Setosa",
    description: "Classic visual math and statistics essays.",
    tone: "amber",
  },
  "anders-brownworth": {
    key: "anders-brownworth",
    label: "Anders Brownworth",
    description: "Blockchain, signing, and zero-knowledge demos.",
    tone: "brick",
  },
  "engineering-longform": {
    key: "engineering-longform",
    label: "Engineering Longform",
    description: "Dense engineering essays with simulation-heavy scenes.",
    tone: "copper",
  },
  ableton: {
    key: "ableton",
    label: "Ableton Learning",
    description: "Learning Music and Learning Synths lesson replicas.",
    tone: "sunrise",
  },
  teoria: {
    key: "teoria",
    label: "Teoria",
    description: "Music-theory drills and ear-training exercises.",
    tone: "olive",
  },
  "music-tools": {
    key: "music-tools",
    label: "Music Tools",
    description: "Browser-native music sandboxes, maps, and sequencers.",
    tone: "lagoon",
  },
  samwho: {
    key: "samwho",
    label: "Samwho",
    description: "Systems explainers with playground-style demos.",
    tone: "moss",
  },
  "independent-labs": {
    key: "independent-labs",
    label: "Independent Labs",
    description: "Standalone one-off explainers from smaller source families.",
    tone: "slate",
  },
  "local-hubs": {
    key: "local-hubs",
    label: "Local Hubs",
    description: "Editorial hub pages that connect shipped replicas into paths.",
    tone: "ink",
  },
};

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

function createActionLink(href, label, className, openInNewTab) {
  const link = createElement("a", className, label);
  link.href = href;
  if (openInNewTab) {
    link.target = "_blank";
    link.rel = "noreferrer";
  }
  return link;
}

function getReferenceHost(page) {
  if (!page.referenceUrl) {
    return "Local editorial route";
  }

  try {
    return new URL(page.referenceUrl).host.replace(/^www\./, "");
  } catch (error) {
    return "external reference";
  }
}

function getFamilyPriority(familyKey) {
  return FAMILY_PRIORITY[familyKey] || 0;
}

function getFamilyKey(page) {
  if (page.familyKey && FAMILY_CONFIGS[page.familyKey]) {
    return page.familyKey;
  }

  return RouteFamilies.classifySiteFamily(page);
}

function enrichPage(page, manifestIndex) {
  const familyKey = getFamilyKey(page);
  const family = FAMILY_CONFIGS[familyKey] || FAMILY_CONFIGS["independent-labs"];
  const referenceHost = page.referenceMode === "neutral"
    ? "Original local route"
    : familyKey === "engineering-longform"
    ? "Reference archive"
    : getReferenceHost(page);
  const decorator = ROUTE_DECORATORS[page.slug] || {};
  const topicTags = Array.isArray(page.topicTags) ? page.topicTags : [];
  const addedDate = typeof page.addedDate === "string" ? page.addedDate : "";

  return {
    manifestIndex: manifestIndex,
    slug: page.slug,
    title: page.title,
    summary: page.summary,
    docsUrl: page.docsUrl,
    referenceUrl: page.referenceUrl || "",
    referenceMode: page.referenceMode || "",
    topicTags: topicTags,
    addedDate: addedDate,
    family: family,
    referenceHost: referenceHost,
    timeEstimate: decorator.timeEstimate || page.timeEstimate || "",
    difficulty: decorator.difficulty || page.difficulty || "",
    featured: Boolean(decorator.featured || page.featured),
    spotlight: decorator.spotlight || page.spotlight || "",
    searchText: [
      page.title,
      page.slug,
      page.summary,
      topicTags.join(" "),
      family.label,
      referenceHost,
      decorator.timeEstimate || "",
      decorator.difficulty || "",
    ].join(" ").toLowerCase(),
  };
}

function buildFamilyList(pages) {
  const familyMap = new Map();

  pages.forEach(function (page) {
    if (!familyMap.has(page.family.key)) {
      familyMap.set(page.family.key, {
        key: page.family.key,
        label: page.family.label,
        description: page.family.description,
        tone: page.family.tone,
        count: 0,
        hosts: new Set(),
      });
    }

    const family = familyMap.get(page.family.key);
    family.count += 1;
    family.hosts.add(page.referenceHost);
  });

  return Array.from(familyMap.values()).sort(function (left, right) {
    const priorityDelta = getFamilyPriority(left.key) - getFamilyPriority(right.key);
    if (priorityDelta !== 0) {
      return priorityDelta;
    }
    if (right.count !== left.count) {
      return right.count - left.count;
    }
    return left.label.localeCompare(right.label);
  });
}

function buildTopicList(pages) {
  const topicCounts = new Map();

  pages.forEach(function (page) {
    page.topicTags.forEach(function (tag) {
      topicCounts.set(tag, (topicCounts.get(tag) || 0) + 1);
    });
  });

  return Array.from(topicCounts.entries())
    .map(function (entry) {
      return {
        tag: entry[0],
        count: entry[1],
      };
    })
    .sort(function (left, right) {
      if (right.count !== left.count) {
        return right.count - left.count;
      }
      return left.tag.localeCompare(right.tag);
    });
}

function buildRelatedSlugsBySlug(pages) {
  const familyPages = new Map();
  const relatedSlugsBySlug = new Map();

  pages.forEach(function (page) {
    if (!familyPages.has(page.family.key)) {
      familyPages.set(page.family.key, []);
    }
    familyPages.get(page.family.key).push(page);
  });

  familyPages.forEach(function (pagesInFamily) {
    const sortedPages = pagesInFamily.slice().sort(comparePages);
    sortedPages.forEach(function (page) {
      const relatedSlugs = sortedPages
        .filter(function (relatedPage) {
          return relatedPage.slug !== page.slug;
        })
        .slice(0, 3)
        .map(function (relatedPage) {
          return relatedPage.slug;
        });
      relatedSlugsBySlug.set(page.slug, relatedSlugs);
    });
  });

  return relatedSlugsBySlug;
}

function getMaxAddedDate(pages) {
  return pages.reduce(function (maxDate, page) {
    if (!isRouteDate(page.addedDate)) {
      return maxDate;
    }
    return page.addedDate > maxDate ? page.addedDate : maxDate;
  }, "");
}

function isRouteDate(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function parseRouteDate(value) {
  if (!isRouteDate(value)) {
    return null;
  }

  const time = Date.parse(value + "T00:00:00Z");
  return Number.isNaN(time) ? null : time;
}

function isNewPage(page, maxAddedDate) {
  const maxTime = parseRouteDate(maxAddedDate);
  const pageTime = parseRouteDate(page.addedDate);

  if (maxTime === null || pageTime === null || pageTime > maxTime) {
    return false;
  }

  return maxTime - pageTime <= NEW_ROUTE_WINDOW_DAYS * 24 * 60 * 60 * 1000;
}

function getHomeSort(sort) {
  return Object.prototype.hasOwnProperty.call(HOME_SORT_LABELS, sort) ? sort : "featured";
}

function getHomeView(view) {
  return Object.prototype.hasOwnProperty.call(HOME_VIEW_LABELS, view) ? view : "grouped";
}

function syncHomeState(state) {
  const url = new URL(window.location.href);
  if (state.family && state.family !== "all") {
    url.searchParams.set("family", state.family);
  } else {
    url.searchParams.delete("family");
  }
  if (state.tag && state.tag !== "all") {
    url.searchParams.set("tag", state.tag);
  } else {
    url.searchParams.delete("tag");
  }
  if (state.sort && state.sort !== "featured") {
    url.searchParams.set("sort", state.sort);
  } else {
    url.searchParams.delete("sort");
  }
  if (state.view && state.view !== "grouped") {
    url.searchParams.set("view", state.view);
  } else {
    url.searchParams.delete("view");
  }
  if (state.query) {
    url.searchParams.set("q", state.query);
  } else {
    url.searchParams.delete("q");
  }
  window.history.replaceState({}, "", url);
}

function renderHomeStats(mount, pages, families) {
  if (!mount) {
    return;
  }

  mount.innerHTML = "";

  const hubCount = pages.filter(function (page) {
    return page.family.key === "local-hubs";
  }).length;

  [
    {
      label: "Live routes",
      value: String(pages.length),
      detail: "Manifest-backed public replicas",
    },
    {
      label: "Source families",
      value: String(families.length),
      detail: "Color-coded groups for filtering",
    },
    {
      label: "Docs pages",
      value: String(pages.filter(function (page) {
        return Boolean(page.docsUrl);
      }).length),
      detail: "Parity and provenance notes linked per route",
    },
    {
      label: "Local hubs",
      value: String(hubCount),
      detail: "Editorial routes that connect shipped families",
    },
  ].forEach(function (stat) {
    const card = createElement("article", "stat-card");
    card.appendChild(createElement("p", "eyebrow", stat.label));
    card.appendChild(createElement("div", "stat-card__value", stat.value));
    card.appendChild(createElement("p", "meta-line stat-card__detail", stat.detail));
    mount.appendChild(card);
  });
}

function renderFamilyFilters(mount, families, state, onSelectFamily) {
  if (!mount) {
    return;
  }

  mount.innerHTML = "";

  function buildFilterButton(config) {
    const button = createElement("button", "filter-pill", null);
    button.type = "button";
    button.setAttribute("aria-pressed", String(config.key === state.family));
    button.dataset.familyTone = config.tone;
    if (config.key === state.family) {
      button.classList.add("is-active");
    }
    button.appendChild(createElement("span", "filter-pill__label", config.label));
    button.appendChild(createElement("span", "filter-pill__count", String(config.count)));
    button.addEventListener("click", function () {
      onSelectFamily(config.key);
    });
    mount.appendChild(button);
  }

  buildFilterButton({
    key: "all",
    label: "All routes",
    count: families.reduce(function (sum, family) {
      return sum + family.count;
    }, 0),
    tone: "ink",
  });

  families.forEach(function (family) {
    buildFilterButton(family);
  });
}

function renderTopicFilters(mount, topics, totalCount, state, onSelectTag) {
  if (!mount) {
    return;
  }

  mount.innerHTML = "";

  function buildFilterButton(tag, label, count) {
    const button = createElement("button", "filter-pill filter-pill--topic", null);
    button.type = "button";
    button.setAttribute("aria-pressed", String(tag === state.tag));
    if (tag === state.tag) {
      button.classList.add("is-active");
    }
    button.appendChild(createElement("span", "filter-pill__label", label));
    button.appendChild(createElement("span", "filter-pill__count", String(count)));
    button.addEventListener("click", function () {
      onSelectTag(tag);
    });
    mount.appendChild(button);
  }

  buildFilterButton(
    "all",
    "All topics",
    totalCount,
  );

  topics.forEach(function (topic) {
    buildFilterButton(topic.tag, topic.tag, topic.count);
  });
}

function renderHomeControls(sortSelect, viewToggle, state, onSelectSort, onSelectView) {
  if (sortSelect) {
    sortSelect.value = getHomeSort(state.sort);
    sortSelect.addEventListener("change", function () {
      onSelectSort(getHomeSort(sortSelect.value));
    });
  }

  if (!viewToggle) {
    return;
  }

  viewToggle.innerHTML = "";

  Object.keys(HOME_VIEW_LABELS).forEach(function (view) {
    const button = createElement("button", "view-toggle__button", HOME_VIEW_LABELS[view]);
    button.type = "button";
    button.value = view;
    button.setAttribute("aria-pressed", String(view === state.view));
    if (view === state.view) {
      button.classList.add("is-active");
    }
    button.addEventListener("click", function () {
      onSelectView(view);
      Array.from(viewToggle.querySelectorAll("button")).forEach(function (viewButton) {
        const isActive = viewButton.value === view;
        viewButton.classList.toggle("is-active", isActive);
        viewButton.setAttribute("aria-pressed", String(isActive));
      });
    });
    viewToggle.appendChild(button);
  });
}

function renderFamilyBoard(mount, families, state, onSelectFamily) {
  if (!mount) {
    return;
  }

  mount.innerHTML = "";

  families.forEach(function (family) {
    const article = createElement("article", "family-card");
    article.dataset.familyTone = family.tone;
    if (family.key === state.family) {
      article.classList.add("is-active");
    }

    const header = createElement("div", "family-card__header");
    header.appendChild(createElement("p", "eyebrow", family.label));
    header.appendChild(createElement("span", "status-pill", family.count + " routes"));
    article.appendChild(header);

    article.appendChild(createElement("p", "meta-line", family.description));

    const hostList = createElement("div", "chip-list");
    Array.from(family.hosts)
      .sort()
      .slice(0, 3)
      .forEach(function (host) {
        hostList.appendChild(createElement("span", "chip", host));
      });
    if (family.hosts.size > 3) {
      hostList.appendChild(createElement("span", "chip", "+" + (family.hosts.size - 3) + " more"));
    }
    article.appendChild(hostList);

    const actions = createElement("div", "action-row action-row--compact");
    const filterButton = createElement(
      "button",
      "action-link secondary action-link--button",
      family.key === state.family ? "Showing family" : "Filter to family",
    );
    filterButton.type = "button";
    filterButton.addEventListener("click", function () {
      onSelectFamily(family.key);
      document.querySelector("[data-filter-query]")?.focus();
    });
    actions.appendChild(filterButton);
    article.appendChild(actions);

    mount.appendChild(article);
  });
}

function buildMetaChips(page) {
  const chips = [page.slug];

  if (page.difficulty) {
    chips.push(page.difficulty);
  }

  if (page.timeEstimate) {
    chips.push(page.timeEstimate);
  }

  if (page.featured) {
    chips.push("Featured");
  }

  chips.push("docs linked");
  return chips;
}

function comparePages(left, right) {
  const leftPriority = left.featured ? -1 : 0;
  const rightPriority = right.featured ? -1 : 0;
  if (leftPriority !== rightPriority) {
    return leftPriority - rightPriority;
  }

  return left.title.localeCompare(right.title);
}

function comparePagesByDate(left, right) {
  const leftDate = isRouteDate(left.addedDate) ? left.addedDate : "";
  const rightDate = isRouteDate(right.addedDate) ? right.addedDate : "";
  if (leftDate !== rightDate) {
    return rightDate.localeCompare(leftDate);
  }

  return left.title.localeCompare(right.title);
}

function comparePagesByTitle(left, right) {
  return left.title.localeCompare(right.title);
}

function comparePagesForSort(left, right, sort) {
  if (sort === "new") {
    return comparePagesByDate(left, right);
  }
  if (sort === "title") {
    return comparePagesByTitle(left, right);
  }
  return comparePages(left, right);
}

function comparePageFamilies(left, right) {
  const priorityDelta = getFamilyPriority(left) - getFamilyPriority(right);
  if (priorityDelta !== 0) {
    return priorityDelta;
  }
  return (FAMILY_CONFIGS[left]?.label || left).localeCompare(FAMILY_CONFIGS[right]?.label || right);
}

function getFeaturedPages(pages) {
  return pages
    .filter(function (page) {
      return page.featured;
    })
    .sort(comparePages);
}

function renderFeaturedRoutes(mount, pages, context) {
  if (!mount) {
    return;
  }

  mount.innerHTML = "";

  const featuredPages = getFeaturedPages(pages).slice(0, 6);
  if (!featuredPages.length) {
    mount.innerHTML = '<div class="empty-state">Featured routes unavailable.</div>';
    return;
  }

  featuredPages.forEach(function (page) {
    const article = createPageCard(page, context);
    article.classList.add("page-card--featured");
    if (page.spotlight) {
      article.appendChild(createElement("p", "meta-line page-card__spotlight", page.spotlight));
    }
    mount.appendChild(article);
  });
}

function createPageCard(page, context) {
  const article = createElement("article", "page-card");
  const relatedSlugsBySlug = context?.relatedSlugsBySlug || new Map();
  const maxAddedDate = context?.maxAddedDate || "";
  article.dataset.familyTone = page.family.tone;

  const header = createElement("div", "page-card__header");
  header.appendChild(createElement("p", "eyebrow", page.family.label));
  const statusList = createElement("div", "page-card__status");
  if (isNewPage(page, maxAddedDate)) {
    statusList.appendChild(createElement("span", "status-pill status-pill--new", "New"));
  }
  statusList.appendChild(createElement("span", "status-pill", page.referenceHost));
  header.appendChild(statusList);
  article.appendChild(header);

  article.appendChild(createElement("h2", null, page.title));

  const chipList = createElement("div", "chip-list page-card__chips");
  buildMetaChips(page).forEach(function (label) {
    chipList.appendChild(createElement("span", "chip", label));
  });
  article.appendChild(chipList);

  if (page.topicTags.length) {
    const tagList = createElement("div", "chip-list page-card__tags");
    page.topicTags.forEach(function (tag) {
      tagList.appendChild(createElement("span", "chip chip--tag", tag));
    });
    article.appendChild(tagList);
  }

  article.appendChild(createElement("p", "meta-line", page.summary));

  const actions = createElement("div", "action-row action-row--compact");
  actions.appendChild(createActionLink("./" + page.slug + "/", "Open replica", "action-link"));
  actions.appendChild(createActionLink(page.docsUrl, "Docs", "action-link secondary"));
  if (page.referenceUrl) {
    const referenceLabel = page.referenceMode === "neutral" || page.family.key === "engineering-longform"
      ? "Reference"
      : "Upstream";
    actions.appendChild(
      createActionLink(
        page.referenceUrl,
        referenceLabel,
        "action-link ghost",
        true,
      ),
    );
  }
  article.appendChild(actions);

  article.appendChild(
    createElement(
      "p",
      "meta-line page-card__footnote",
      "Built with relative paths for subpath hosting and separated docs coverage.",
    ),
  );

  const relatedSlugs = relatedSlugsBySlug.get(page.slug) || [];
  if (relatedSlugs.length) {
    const related = createElement("div", "page-card__related");
    related.appendChild(createElement("p", "eyebrow", "Related"));
    const relatedList = createElement("div", "chip-list");
    relatedSlugs.forEach(function (slug) {
      relatedList.appendChild(createActionLink("./" + slug + "/", slug, "chip"));
    });
    related.appendChild(relatedList);
    article.appendChild(related);
  }

  return article;
}

function applyHomeFilters(pages, state) {
  return pages.filter(function (page) {
    if (state.family !== "all" && page.family.key !== state.family) {
      return false;
    }
    if (state.tag !== "all" && page.topicTags.indexOf(state.tag) === -1) {
      return false;
    }
    if (state.query && !page.searchText.includes(state.query.toLowerCase())) {
      return false;
    }
    return true;
  });
}

function renderPageList(mount, pages, state, context, onReset) {
  if (!mount) {
    return;
  }

  mount.innerHTML = "";
  mount.classList.toggle("page-grid--flat", state.view === "flat");

  if (!pages.length) {
    const empty = createElement("div", "empty-state");
    empty.appendChild(createElement("p", null, "No routes match the current filters."));
    const resetButton = createElement("button", "action-link secondary action-link--button", "Clear filters");
    resetButton.type = "button";
    resetButton.addEventListener("click", onReset);
    empty.appendChild(resetButton);
    mount.appendChild(empty);
    return;
  }

  const sortedPages = pages.slice().sort(function (left, right) {
    return comparePagesForSort(left, right, state.sort);
  });

  if (state.view === "flat") {
    sortedPages.forEach(function (page) {
      mount.appendChild(createPageCard(page, context));
    });
    return;
  }

  const groupedPages = new Map();

  sortedPages.forEach(function (page) {
    if (!groupedPages.has(page.family.key)) {
      groupedPages.set(page.family.key, []);
    }
    groupedPages.get(page.family.key).push(page);
  });

  Array.from(groupedPages.keys())
    .sort(comparePageFamilies)
    .forEach(function (familyKey) {
      const family = FAMILY_CONFIGS[familyKey] || FAMILY_CONFIGS["independent-labs"];
      const section = createElement("section", "inventory-group");
      const heading = createElement("div", "inventory-group__header");
      const headerCopy = createElement("div", null, null);
      headerCopy.appendChild(createElement("p", "eyebrow", "Source family"));
      headerCopy.appendChild(createElement("h2", null, family.label));
      headerCopy.appendChild(createElement("p", "meta-line", family.description));
      heading.appendChild(headerCopy);
      heading.appendChild(createElement("span", "status-pill", groupedPages.get(familyKey).length + " routes"));
      section.appendChild(heading);

      const grid = createElement("div", "page-grid page-grid--grouped");
      groupedPages.get(familyKey).forEach(function (page) {
        grid.appendChild(createPageCard(page, context));
      });
      section.appendChild(grid);
      mount.appendChild(section);
    });
}

function renderResultsSummary(mount, filteredPages, allPages, state) {
  if (!mount) {
    return;
  }

  const familyLabel = state.family === "all"
    ? "All families"
    : (FAMILY_CONFIGS[state.family]?.label || state.family);

  let text = "Showing " + filteredPages.length + " of " + allPages.length + " routes.";
  text += " Family: " + familyLabel + ".";
  if (state.tag !== "all") {
    text += " Topic: " + state.tag + ".";
  }
  text += " Sort: " + HOME_SORT_LABELS[state.sort] + ".";
  text += " View: " + HOME_VIEW_LABELS[state.view] + ".";
  if (state.query) {
    text += ' Search: "' + state.query + '".';
  }

  mount.textContent = text;
}

function readHomeState() {
  const params = new URLSearchParams(window.location.search);
  return {
    family: params.get("family") || "all",
    tag: params.get("tag") || "all",
    sort: getHomeSort(params.get("sort") || "featured"),
    view: getHomeView(params.get("view") || "grouped"),
    query: params.get("q") || "",
  };
}

async function initHome() {
  const mount = document.querySelector("[data-page-list]");
  const statsMount = document.querySelector("[data-home-stats]");
  const featuredMount = document.querySelector("[data-featured-routes]");
  const familyBoardMount = document.querySelector("[data-family-board]");
  const familyFiltersMount = document.querySelector("[data-family-filters]");
  const topicFiltersMount = document.querySelector("[data-tag-filters]");
  const resultsMount = document.querySelector("[data-page-results]");
  const queryInput = document.querySelector("[data-filter-query]");
  const sortSelect = document.querySelector("[data-sort-select]");
  const viewToggle = document.querySelector("[data-view-toggle]");

  if (!mount && !statsMount && !featuredMount && !familyBoardMount && !familyFiltersMount) {
    return;
  }

  try {
    const response = await fetch("./pages.json", { cache: "no-store" });
    const manifest = await response.json();
    const pages = manifest.map(enrichPage);
    const families = buildFamilyList(pages);
    const topics = buildTopicList(pages);
    const topicSet = new Set(topics.map(function (topic) {
      return topic.tag;
    }));
    const context = {
      maxAddedDate: getMaxAddedDate(pages),
      relatedSlugsBySlug: buildRelatedSlugsBySlug(pages),
    };
    const state = readHomeState();

    if (!FAMILY_CONFIGS[state.family] && state.family !== "all") {
      state.family = "all";
    }
    if (state.tag !== "all" && !topicSet.has(state.tag)) {
      state.tag = "all";
    }

    if (queryInput) {
      queryInput.value = state.query;
    }

    function render() {
      const filteredPages = applyHomeFilters(pages, state);
      renderHomeStats(statsMount, pages, families);
      renderFeaturedRoutes(featuredMount, pages, context);
      renderFamilyFilters(familyFiltersMount, families, state, function (familyKey) {
        state.family = familyKey;
        syncHomeState(state);
        render();
      });
      renderTopicFilters(topicFiltersMount, topics, pages.length, state, function (tag) {
        state.tag = tag;
        syncHomeState(state);
        render();
      });
      renderFamilyBoard(familyBoardMount, families, state, function (familyKey) {
        state.family = familyKey;
        syncHomeState(state);
        render();
      });
      renderResultsSummary(resultsMount, filteredPages, pages, state);
      renderPageList(mount, filteredPages, state, context, function () {
        state.family = "all";
        state.tag = "all";
        state.query = "";
        if (queryInput) {
          queryInput.value = "";
        }
        syncHomeState(state);
        render();
      });
    }

    renderHomeControls(sortSelect, viewToggle, state, function (sort) {
      state.sort = sort;
      syncHomeState(state);
      render();
    }, function (view) {
      state.view = view;
      syncHomeState(state);
      render();
    });

    queryInput?.addEventListener("input", function () {
      state.query = queryInput.value.trim();
      syncHomeState(state);
      render();
    });

    syncHomeState(state);
    render();
  } catch (error) {
    const message = '<div class="empty-state">The page manifest could not be loaded. Serve this folder over HTTP to render the route inventory.</div>';
    if (statsMount) {
      statsMount.innerHTML = message;
    }
    if (familyBoardMount) {
      familyBoardMount.innerHTML = message;
    }
    if (featuredMount) {
      featuredMount.innerHTML = message;
    }
    if (familyFiltersMount) {
      familyFiltersMount.innerHTML = message;
    }
    if (topicFiltersMount) {
      topicFiltersMount.innerHTML = message;
    }
    if (mount) {
      mount.innerHTML = message;
    }
    if (resultsMount) {
      resultsMount.textContent = "Route inventory unavailable";
    }
  }
}

async function initParity() {
  const mount = document.querySelector("[data-parity-list]");

  if (!mount) {
    return;
  }

  const parityUrl = document.body.dataset.parityUrl;
  const countTarget = document.querySelector("[data-module-count]");

  try {
    const response = await fetch(parityUrl, { cache: "no-store" });
    const modules = await response.json();

    if (countTarget) {
      countTarget.textContent = modules.length + " modules tracked";
      countTarget.className = "meta-pill";
    }

    mount.innerHTML = "";

    modules.forEach(function (module) {
      const article = document.createElement("article");
      article.className = "module-card";

      article.appendChild(createElement("h3", null, module.moduleId));

      const originalBehavior = createElement("p", "meta-line");
      originalBehavior.appendChild(createElement("strong", null, "Original behavior:"));
      originalBehavior.appendChild(document.createTextNode(" " + module.originalBehavior));
      article.appendChild(originalBehavior);

      const localStatus = createElement("p", "meta-line");
      localStatus.appendChild(createElement("strong", null, "Local status:"));
      localStatus.appendChild(document.createTextNode(" " + module.localStatus));
      article.appendChild(localStatus);

      const sourceFiles = createElement("div", "chip-list");
      module.sourceFiles.forEach(function (sourceFile) {
        sourceFiles.appendChild(createElement("span", "chip", sourceFile));
      });
      article.appendChild(sourceFiles);

      const notes = createElement("ul", "plain-list compact");
      module.notes.forEach(function (note) {
        notes.appendChild(createElement("li", null, note));
      });
      article.appendChild(notes);

      const evidence = createElement("ul", "plain-list compact");
      module.evidence.forEach(function (item) {
        evidence.appendChild(createElement("li", null, item));
      });
      article.appendChild(evidence);

      mount.appendChild(article);
    });
  } catch (error) {
    if (countTarget) {
      countTarget.textContent = "parity data unavailable";
      countTarget.className = "meta-pill";
    }

    mount.innerHTML =
      '<div class="empty-state">The parity contract could not be loaded. Serve this folder over HTTP to render the checklist.</div>';
  }
}

function enhanceAccessibility() {
  const main = document.querySelector("main.site-page");
  if (!main) {
    return;
  }

  if (!main.id) {
    main.id = "main";
  }
  if (!main.hasAttribute("tabindex")) {
    main.setAttribute("tabindex", "-1");
  }

  // Skip-to-content link (WCAG 2.4.1). Injected as the first focusable element.
  if (!document.querySelector(".skip-link")) {
    const skipLink = document.createElement("a");
    skipLink.className = "skip-link";
    skipLink.href = `#${main.id}`;
    skipLink.textContent = "Skip to main content";
    skipLink.addEventListener("click", function () {
      main.focus({ preventScroll: false });
    });
    document.body.insertBefore(skipLink, document.body.firstChild);
  }

  // Landmark labelling for the home atlas.
  if (document.body.dataset.pageType === "home") {
    main.setAttribute("aria-label", "Interactive explanation replica atlas");

    const inventoryToolbar = document.querySelector(".inventory-toolbar");
    if (inventoryToolbar && !inventoryToolbar.getAttribute("role")) {
      inventoryToolbar.setAttribute("role", "search");
      inventoryToolbar.setAttribute("aria-label", "Filter routes");
    }
  }

  // Wrap the docs back-link in a labelled navigation landmark.
  if (document.body.dataset.pageType === "docs") {
    main.setAttribute("aria-label", "Replica documentation");

    const backLink = document.querySelector(".back-link");
    if (backLink && backLink.parentElement && backLink.parentElement.tagName !== "NAV") {
      const nav = document.createElement("nav");
      nav.setAttribute("aria-label", "Documentation breadcrumb");
      backLink.parentElement.insertBefore(nav, backLink);
      nav.appendChild(backLink);
    }
  }
}

document.addEventListener("DOMContentLoaded", function () {
  enhanceAccessibility();
  initHome();
  initParity();
});
