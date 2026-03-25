const LOCAL_HUB_SLUGS = new Set([
  "blockchain-101-combined-flow",
  "music-interactive-hub",
  "primary-interactive-hub",
]);

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

function getFamilyKey(page) {
  if (LOCAL_HUB_SLUGS.has(page.slug) || page.referenceMode === "neutral" || !page.referenceUrl) {
    return "local-hubs";
  }

  const host = getReferenceHost(page);

  if (host === "ncase.me" || host === "ncase.itch.io") {
    return "nicky-case";
  }
  if (host === "mlu-explain.github.io") {
    return "mlu-explain";
  }
  if (host === "setosa.io") {
    return "setosa";
  }
  if (host === "andersbrownworth.com") {
    return "anders-brownworth";
  }
  if (host === "ciechanow.ski") {
    return "engineering-longform";
  }
  if (host === "learningmusic.ableton.com" || host === "learningsynths.ableton.com") {
    return "ableton";
  }
  if (host === "teoria.com") {
    return "teoria";
  }
  if (host === "musiclab.chromeexperiments.com" || host === "musicmap.info") {
    return "music-tools";
  }
  if (host === "samwho.dev") {
    return "samwho";
  }
  return "independent-labs";
}

function enrichPage(page, manifestIndex) {
  const familyKey = getFamilyKey(page);
  const family = FAMILY_CONFIGS[familyKey] || FAMILY_CONFIGS["independent-labs"];
  const referenceHost = familyKey === "engineering-longform"
    ? "Reference archive"
    : getReferenceHost(page);

  return {
    manifestIndex: manifestIndex,
    slug: page.slug,
    title: page.title,
    summary: page.summary,
    docsUrl: page.docsUrl,
    referenceUrl: page.referenceUrl || "",
    referenceMode: page.referenceMode || "",
    family: family,
    referenceHost: referenceHost,
    searchText: [
      page.title,
      page.slug,
      page.summary,
      family.label,
      referenceHost,
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
    if (right.count !== left.count) {
      return right.count - left.count;
    }
    return left.label.localeCompare(right.label);
  });
}

function syncHomeState(state) {
  const url = new URL(window.location.href);
  if (state.family && state.family !== "all") {
    url.searchParams.set("family", state.family);
  } else {
    url.searchParams.delete("family");
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

function createPageCard(page) {
  const article = createElement("article", "page-card");
  article.dataset.familyTone = page.family.tone;

  const header = createElement("div", "page-card__header");
  header.appendChild(createElement("p", "eyebrow", page.family.label));
  header.appendChild(createElement("span", "status-pill", page.referenceHost));
  article.appendChild(header);

  article.appendChild(createElement("h2", null, page.title));

  const chipList = createElement("div", "chip-list page-card__chips");
  chipList.appendChild(createElement("span", "chip", page.slug));
  chipList.appendChild(createElement("span", "chip", "docs linked"));
  article.appendChild(chipList);

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

  return article;
}

function applyHomeFilters(pages, state) {
  return pages.filter(function (page) {
    if (state.family !== "all" && page.family.key !== state.family) {
      return false;
    }
    if (state.query && !page.searchText.includes(state.query.toLowerCase())) {
      return false;
    }
    return true;
  });
}

function renderPageList(mount, pages, state, onReset) {
  if (!mount) {
    return;
  }

  mount.innerHTML = "";

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

  pages.forEach(function (page) {
    mount.appendChild(createPageCard(page));
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
  if (state.query) {
    text += ' Search: "' + state.query + '".';
  }

  mount.textContent = text;
}

function readHomeState() {
  const params = new URLSearchParams(window.location.search);
  return {
    family: params.get("family") || "all",
    query: params.get("q") || "",
  };
}

async function initHome() {
  const mount = document.querySelector("[data-page-list]");
  const statsMount = document.querySelector("[data-home-stats]");
  const familyBoardMount = document.querySelector("[data-family-board]");
  const familyFiltersMount = document.querySelector("[data-family-filters]");
  const resultsMount = document.querySelector("[data-page-results]");
  const queryInput = document.querySelector("[data-filter-query]");

  if (!mount && !statsMount && !familyBoardMount && !familyFiltersMount) {
    return;
  }

  try {
    const response = await fetch("./pages.json", { cache: "no-store" });
    const manifest = await response.json();
    const pages = manifest.map(enrichPage);
    const families = buildFamilyList(pages);
    const state = readHomeState();

    if (!FAMILY_CONFIGS[state.family] && state.family !== "all") {
      state.family = "all";
    }

    if (queryInput) {
      queryInput.value = state.query;
    }

    function render() {
      const filteredPages = applyHomeFilters(pages, state);
      renderHomeStats(statsMount, pages, families);
      renderFamilyFilters(familyFiltersMount, families, state, function (familyKey) {
        state.family = familyKey;
        syncHomeState(state);
        render();
      });
      renderFamilyBoard(familyBoardMount, families, state, function (familyKey) {
        state.family = familyKey;
        syncHomeState(state);
        render();
      });
      renderResultsSummary(resultsMount, filteredPages, pages, state);
      renderPageList(mount, filteredPages, state, function () {
        state.family = "all";
        state.query = "";
        if (queryInput) {
          queryInput.value = "";
        }
        syncHomeState(state);
        render();
      });
    }

    queryInput?.addEventListener("input", function () {
      state.query = queryInput.value.trim();
      syncHomeState(state);
      render();
    });

    render();
  } catch (error) {
    const message = '<div class="empty-state">The page manifest could not be loaded. Serve this folder over HTTP to render the route inventory.</div>';
    if (statsMount) {
      statsMount.innerHTML = message;
    }
    if (familyBoardMount) {
      familyBoardMount.innerHTML = message;
    }
    if (familyFiltersMount) {
      familyFiltersMount.innerHTML = message;
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

      const sourceFiles = module.sourceFiles
        .map(function (sourceFile) {
          return '<span class="chip">' + sourceFile + "</span>";
        })
        .join("");

      const notes = module.notes
        .map(function (note) {
          return "<li>" + note + "</li>";
        })
        .join("");

      const evidence = module.evidence
        .map(function (item) {
          return "<li>" + item + "</li>";
        })
        .join("");

      article.innerHTML =
        "<h3>" +
        module.moduleId +
        "</h3>" +
        '<p class="meta-line"><strong>Original behavior:</strong> ' +
        module.originalBehavior +
        "</p>" +
        '<p class="meta-line"><strong>Local status:</strong> ' +
        module.localStatus +
        "</p>" +
        '<div class="chip-list">' +
        sourceFiles +
        "</div>" +
        '<ul class="plain-list compact">' +
        notes +
        "</ul>" +
        '<ul class="plain-list compact">' +
        evidence +
        "</ul>";

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

document.addEventListener("DOMContentLoaded", function () {
  initHome();
  initParity();
});
