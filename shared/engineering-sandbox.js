(function () {
  const routeChapterConfigs = {
    "rigid-body-collisions": [
      { selector: "#before-we-start", title: "Set the frame" },
      { selector: "#what-are-we-trying-to-do", title: "Define the motion problem" },
      { selector: "#what-is-a-collision", title: "Formalize collision" },
      { selector: "#conclusion", title: "Wrap the intuition" },
    ],
    "linear-regression": [
      { selector: "#intro", title: "Meet linear regression" },
      { selector: "#scrolly", title: "Fit the line" },
      { selector: "#mse-container", title: "Read model fit", closest: "section", id: "model-evaluation" },
      { selector: "#gd-container", title: "Watch gradient descent", closest: "div", id: "gradient-descent" },
      { selector: "#tab-container", title: "Interpret the coefficients", closest: "div", id: "interpretation" },
      { selector: "#resources", title: "References" },
    ],
    "logistic-regression": [
      { selector: "#intro", title: "Meet logistic regression" },
      { selector: "#tempSlider", title: "Move the boundary", closest: "section", id: "boundary-scene" },
      { selector: "#ll-container", title: "Evaluate the model", closest: "section", id: "model-evaluation" },
      { selector: "#gd-container", title: "Estimate coefficients", closest: "section", id: "estimating-coefficients" },
      { selector: "#tab-container", title: "Interpret the model", closest: "div", id: "interpreting-the-model" },
      { selector: "#resources", title: "References" },
    ],
    "precision-recall": [
      { selector: "#intro", title: "Meet precision and recall" },
      { selector: "#heatmap-container", title: "Read the confusion matrix", closest: "div", id: "confusion-matrix" },
      { selector: "#f1-container", title: "Balance the metrics", closest: "div", id: "f1-balance" },
      { selector: "#error-chart", title: "Move the threshold", closest: "div", id: "threshold-tradeoff" },
      { selector: "#resources", title: "References" },
    ],
    "roc-auc": [
      { selector: "#intro", title: "Meet ROC and AUC" },
      { selector: "#roc-scatter-chart", title: "Move the threshold", closest: "section", id: "first-threshold" },
      { selector: "#roc-section", title: "Read the ROC curve" },
      { selector: "#auc-chart", title: "Interpret AUC", closest: "section", id: "auc-section" },
      { selector: "#conclusion", title: "Considerations" },
      { selector: "#resources", title: "References" },
    ],
  };

  const routeChapterNavLabels = {
    "mechanical-watch": {
      "motion-works": "Motion",
      "automatic-winding": "Auto winding",
      "the-size-of-it-all": "Scale",
      "further-watching-and-reading": "References",
    },
    gears: {
      transmission: "Gear train",
      torque: "Torque",
      "tangent--normal": "Contact",
      "strings-attached": "Belts",
      "multiple-gears": "Multi-gear",
      "further-watching-and-reading": "References",
    },
    airfoil: {
      "visualizing-flow": "Flow",
      velocity: "Velocity",
      "relative-velocity": "Relative flow",
      pressure: "Pressure",
      "visualizing-pressure": "Pressure map",
      "airfoil-flow": "Lift scene",
      viscosity: "Viscosity",
      "boundary-layer": "Boundary",
      "airfoil-shapes": "Shapes",
      "further-reading-and-watching": "References",
    },
    tesseract: {
      "building-cubes": "Cubes",
      "ambiguous-representation": "Projection",
      "fourth-dimension": "4D space",
      tesseract: "Tesseract",
      "stepping-into-the-shadows": "Shadows",
      "plane-of-rotation": "Rotation",
      "in-n-out": "Slicing",
      "leaving-platos-cave": "Plato's cave",
      "further-watching-and-reading": "References",
    },
  };

  const routeCompanionConfigs = {
    gears: {
      eyebrow: "Companion routes",
      title: "Keep the motion model alive in related machines.",
      summary: "If this gear train clicked, continue into the watch for a compact timing machine or the bicycle for force flow through a larger mechanical frame.",
      links: [
        {
          href: "../mechanical-watch/",
          label: "Mechanical Watch",
          description: "See the same transmission logic inside a regulated timekeeping system.",
        },
        {
          href: "../bicycle/",
          label: "Bicycle",
          description: "Carry torque, force, and load transfer into a larger moving system.",
        },
      ],
    },
    "mechanical-watch": {
      eyebrow: "Companion routes",
      title: "Branch outward once the movement starts feeling legible.",
      summary: "The watch compresses gears, stored energy, and controlled release into one tiny machine. These routes expand those same ideas into cleaner or larger systems.",
      links: [
        {
          href: "../gears/",
          label: "Gears",
          description: "Strip the train down to meshing teeth, ratios, torque, and contact geometry.",
        },
        {
          href: "../internal-combustion-engine/",
          label: "Internal Combustion Engine",
          description: "Compare another timed machine built from linked motion and constrained energy flow.",
        },
      ],
    },
    tesseract: {
      eyebrow: "Companion routes",
      title: "Take the 4D intuition into other geometry-heavy routes.",
      summary: "Once projections and slices start making sense, it helps to visit routes that keep the same spatial thinking but swap dimensions, surfaces, or linear structure.",
      links: [
        {
          href: "../curves-and-surfaces/",
          label: "Curves and Surfaces",
          description: "Stay in geometry mode and trade 4D slicing for editable smooth forms and control meshes.",
        },
        {
          href: "../eigenvectors-and-eigenvalues/",
          label: "Eigenvectors and Eigenvalues",
          description: "Shift from shape intuition into transformation intuition with another visual math route.",
        },
      ],
    },
    "curves-and-surfaces": {
      eyebrow: "Companion routes",
      title: "Jump sideways into geometry that deforms space differently.",
      summary: "This route focuses on shaping smooth objects. If you want a sharper sense of dimensional thinking and projection, move next into the tesseract route.",
      links: [
        {
          href: "../tesseract/",
          label: "Tesseract",
          description: "Use projections, slices, and higher-dimensional scaffolding to stretch geometric intuition further.",
        },
      ],
    },
  };

  function getSlug() {
    const explicitRoute = document.body?.dataset.storyRoute;
    if (explicitRoute) {
      return explicitRoute;
    }

    const parts = window.location.pathname.split("/").filter(Boolean);
    const interactiveIndex = parts.indexOf("interactive-explanation");
    if (interactiveIndex === -1) {
      return "";
    }
    return parts[interactiveIndex + 1] || "";
  }

  function sanitizeChapterTitle(value) {
    return String(value || "")
      .replace(/\s+/g, " ")
      .replace(/^[|:;.,\-\u2013\u2014\u2022\u00b7\s]+/, "")
      .trim();
  }

  function getChapterTitle(section, index) {
    const explicit = sanitizeChapterTitle(section.dataset.storyChapter);
    if (explicit) {
      return explicit;
    }

    const heading = section.querySelector("h1, h2, h3");
    if (heading && heading.textContent) {
      const headingTitle = sanitizeChapterTitle(heading.textContent);
      if (headingTitle) {
        return headingTitle;
      }
    }

    return `Chapter ${index + 1}`;
  }

  function getChapterLabel(section, index) {
    return sanitizeChapterTitle(section.dataset.storyNavLabel) || getChapterTitle(section, index);
  }

  function ensureSectionId(section, index, fallbackId) {
    if (!section.id) {
      section.id = fallbackId || `story-chapter-${index + 1}`;
    }
  }

  function buildGeneratedLink(section, index) {
    ensureSectionId(section, index);
    const chapterTitle = getChapterTitle(section, index);
    const chapterLabel = getChapterLabel(section, index);

    const link = document.createElement("a");
    link.className = "story-rail__link";
    link.href = `#${section.id}`;
    link.dataset.storyTarget = section.id;
    link.dataset.storyFullTitle = chapterTitle;
    link.title = chapterTitle;
    link.setAttribute("aria-label", chapterTitle);
    link.textContent = chapterLabel;
    return link;
  }

  function buildMobileLink(section, index) {
    ensureSectionId(section, index);
    const chapterTitle = getChapterTitle(section, index);
    const chapterLabel = getChapterLabel(section, index);

    const link = document.createElement("a");
    link.className = "story-mobile-bar__link";
    link.href = `#${section.id}`;
    link.dataset.storyTarget = section.id;
    link.dataset.storyFullTitle = chapterTitle;
    link.title = chapterTitle;
    link.setAttribute("aria-label", chapterTitle);
    link.textContent = chapterLabel;
    return link;
  }

  function buildSheetLink(section, index) {
    ensureSectionId(section, index);
    const chapterTitle = getChapterTitle(section, index);
    const chapterLabel = getChapterLabel(section, index);

    const link = document.createElement("a");
    link.className = "story-mobile-sheet__link";
    link.href = `#${section.id}`;
    link.dataset.storyTarget = section.id;
    link.dataset.storyFullTitle = chapterTitle;
    link.title = chapterTitle;
    link.setAttribute("aria-label", chapterTitle);
    link.textContent = chapterLabel;
    return link;
  }

  function applyRouteChapterNavLabels(slug, sections) {
    const labels = routeChapterNavLabels[slug];
    if (!labels) {
      return;
    }

    sections.forEach((section) => {
      const label = labels[section.id];
      if (label) {
        section.dataset.storyNavLabel = label;
      }
    });
  }

  function renderCompanionRoutes(slug) {
    const config = routeCompanionConfigs[slug];
    const hero = document.querySelector(".story-hero");
    if (!config || !hero || document.querySelector("[data-story-companions]")) {
      return;
    }

    const section = document.createElement("section");
    section.className = "story-callout story-companion-panel";
    section.dataset.storyCallout = "story";
    section.dataset.storyCompanions = "true";

    const intro = document.createElement("div");
    intro.className = "story-companion-panel__intro";
    const eyebrow = document.createElement("span");
    eyebrow.className = "story-callout__label";
    eyebrow.textContent = config.eyebrow;
    intro.appendChild(eyebrow);

    const title = document.createElement("h2");
    title.className = "story-companion-panel__title";
    title.textContent = config.title;
    intro.appendChild(title);

    const summary = document.createElement("p");
    summary.className = "story-shell-caption";
    summary.textContent = config.summary;
    intro.appendChild(summary);
    section.appendChild(intro);

    const grid = document.createElement("div");
    grid.className = "story-companion-grid";
    config.links.forEach((item) => {
      const article = document.createElement("article");
      article.className = "story-companion-card";

      const link = document.createElement("a");
      link.className = "story-companion-card__link";
      link.href = item.href;
      link.textContent = item.label;
      article.appendChild(link);

      const description = document.createElement("p");
      description.textContent = item.description;
      article.appendChild(description);

      grid.appendChild(article);
    });

    section.appendChild(grid);
    hero.insertAdjacentElement("afterend", section);
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function revealActiveLinks(links, activeId) {
    links.forEach((link) => {
      if (link.dataset.storyTarget !== activeId) {
        return;
      }
      link.scrollIntoView({
        block: "nearest",
        inline: link.classList.contains("story-mobile-bar__link") ? "center" : "nearest",
      });
    });
  }

  function setProgress(progress, activeIndex, totalSections) {
    const clampedProgress = clamp(progress, 0, 1);
    const percentLabel = `${Math.round(clampedProgress * 100)}% through`;
    const positionLabel = `${Math.min(activeIndex + 1, totalSections)} / ${totalSections}`;

    document.querySelectorAll(".story-progress__bar").forEach((bar) => {
      bar.style.width = `${clampedProgress * 100}%`;
    });
    document.querySelectorAll(".story-progress__value").forEach((node) => {
      node.textContent = percentLabel;
    });
    document.querySelectorAll(".story-rail__position, .story-mobile-bar__position, .story-mobile-sheet__position").forEach((node) => {
      node.textContent = positionLabel;
    });
  }

  function setActive(linkGroups, activeId, activeIndex) {
    let activeLabel = "";

    linkGroups.forEach((links, index) => {
      links.forEach((link) => {
        const isActive = link.dataset.storyTarget === activeId;
        const isComplete = index < activeIndex;
        link.classList.toggle("is-active", isActive);
        link.classList.toggle("is-complete", isComplete);
        if (isActive) {
          link.setAttribute("aria-current", "true");
          activeLabel = link.dataset.storyFullTitle || link.textContent?.trim() || "";
        } else {
          link.removeAttribute("aria-current");
        }
      });
    });

    revealActiveLinks(linkGroups.flat(), activeId);
    document.querySelectorAll(".story-rail__current, .story-mobile-bar__current, .story-mobile-sheet__current").forEach((node) => {
      node.textContent = activeLabel;
    });
  }

  function setMobileSheetOpen(isOpen) {
    const body = document.body;
    const sheet = document.querySelector(".story-mobile-sheet");
    if (!body || !sheet) {
      return;
    }

    body.dataset.storyNavOpen = isOpen ? "true" : "false";
    sheet.hidden = !isOpen;
    document.querySelectorAll(".story-mobile-bar__toggle").forEach((button) => {
      button.setAttribute("aria-expanded", isOpen ? "true" : "false");
    });
  }

  function wireMobileSheet() {
    const toggle = document.querySelector(".story-mobile-bar__toggle");
    const sheet = document.querySelector(".story-mobile-sheet");
    const closeButton = document.querySelector(".story-mobile-sheet__close");
    const backdrop = document.querySelector(".story-mobile-sheet__backdrop");
    if (!toggle || !sheet) {
      return;
    }

    toggle.addEventListener("click", () => {
      setMobileSheetOpen(sheet.hidden);
    });
    closeButton?.addEventListener("click", () => setMobileSheetOpen(false));
    backdrop?.addEventListener("click", () => setMobileSheetOpen(false));
    sheet.querySelectorAll(".story-mobile-sheet__link").forEach((link) => {
      link.addEventListener("click", () => setMobileSheetOpen(false));
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !sheet.hidden) {
        setMobileSheetOpen(false);
      }
    });
  }

  function observeActiveSection(sections, linkGroups) {
    if (!sections.length || !linkGroups.length) {
      return;
    }

    const normalizedLinkGroups = Array.isArray(linkGroups[0]) ? linkGroups : linkGroups.map((link) => [link]);
    let frameId = 0;

    const updateActiveSection = () => {
      frameId = 0;
      const marker = Math.max(120, window.innerHeight * 0.3);
      let activeSection = sections[0];
      let activeIndex = 0;

      sections.forEach((section, index) => {
        const rect = section.getBoundingClientRect();
        if (rect.top <= marker) {
          activeSection = section;
          activeIndex = index;
        }
      });

      const firstTop = window.scrollY + sections[0].getBoundingClientRect().top;
      const lastBottom = window.scrollY + sections[sections.length - 1].getBoundingClientRect().bottom;
      const progressRange = Math.max(lastBottom - firstTop - marker, 1);
      const progress = (window.scrollY + marker - firstTop) / progressRange;

      setActive(normalizedLinkGroups, activeSection.id, activeIndex);
      setProgress(progress, activeIndex, sections.length);
    };

    const requestUpdate = () => {
      if (frameId) {
        return;
      }
      frameId = window.requestAnimationFrame(updateActiveSection);
    };

    updateActiveSection();
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);
  }

  function buildGeneratedNavigation(sections) {
    const existingRail = document.querySelector(".story-rail");
    const existingMobile = document.querySelector(".story-mobile-bar");
    if (existingRail || existingMobile) {
      return;
    }

    const rail = document.createElement("aside");
    rail.className = "story-rail";
    rail.setAttribute("aria-label", "Chapter navigation");
    rail.innerHTML = `
      <div class="story-callout story-rail__panel">
        <div class="story-rail__header">
          <div class="story-rail__label">Story rail</div>
          <div class="story-rail__summary">
            <div class="story-rail__meta">
              <div class="story-rail__count">${sections.length} chapters</div>
              <div class="story-rail__position">1 / ${sections.length}</div>
            </div>
            <div class="story-progress" aria-hidden="true"><div class="story-progress__bar"></div></div>
            <div class="story-progress__value">0% through</div>
            <div class="story-rail__current"></div>
          </div>
        </div>
        <nav class="story-rail__nav"></nav>
      </div>
    `;
    const railNav = rail.querySelector(".story-rail__nav");

    const mobile = document.createElement("nav");
    mobile.className = "story-mobile-bar";
    mobile.setAttribute("aria-label", "Mobile chapter navigation");
    mobile.innerHTML = `
      <div class="story-mobile-bar__header">
        <div class="story-mobile-bar__meta">
          <div class="story-mobile-bar__eyebrow">Jump to</div>
          <div class="story-mobile-bar__current"></div>
          <div class="story-mobile-bar__status">
            <div class="story-mobile-bar__position">1 / ${sections.length}</div>
            <div class="story-progress__value">0% through</div>
          </div>
        </div>
        <button
          type="button"
          class="story-mobile-bar__toggle"
          aria-expanded="false"
          aria-controls="story-mobile-sheet-nav"
        >Browse</button>
      </div>
      <div class="story-progress story-mobile-bar__progress" aria-hidden="true"><div class="story-progress__bar"></div></div>
      <div class="story-mobile-bar__nav"></div>
    `;
    const mobileNav = mobile.querySelector(".story-mobile-bar__nav");

    const sheet = document.createElement("div");
    sheet.className = "story-mobile-sheet";
    sheet.hidden = true;
    sheet.innerHTML = `
      <button type="button" class="story-mobile-sheet__backdrop" aria-label="Close chapter navigation"></button>
      <div class="story-callout story-mobile-sheet__panel" role="dialog" aria-modal="true" aria-labelledby="story-mobile-sheet-title">
        <div class="story-mobile-sheet__header">
          <div class="story-mobile-sheet__meta">
            <div class="story-mobile-bar__eyebrow">Chapter rail</div>
            <h2 class="story-mobile-sheet__title" id="story-mobile-sheet-title">Browse the story</h2>
            <div class="story-mobile-sheet__current"></div>
            <div class="story-mobile-sheet__status">
              <div class="story-mobile-sheet__position">1 / ${sections.length}</div>
              <div class="story-progress__value">0% through</div>
            </div>
            <div class="story-progress story-mobile-sheet__progress" aria-hidden="true"><div class="story-progress__bar"></div></div>
          </div>
          <button type="button" class="story-mobile-sheet__close">Close</button>
        </div>
        <nav class="story-mobile-sheet__nav" id="story-mobile-sheet-nav"></nav>
      </div>
    `;
    const sheetNav = sheet.querySelector(".story-mobile-sheet__nav");

    const linkGroups = sections.map((section, index) => {
      const railLink = buildGeneratedLink(section, index);
      const mobileLink = buildMobileLink(section, index);
      const sheetLink = buildSheetLink(section, index);
      railNav.appendChild(railLink);
      mobileNav.appendChild(mobileLink);
      sheetNav.appendChild(sheetLink);
      return [railLink, mobileLink, sheetLink];
    });

    document.body.appendChild(rail);
    document.body.appendChild(mobile);
    document.body.appendChild(sheet);
    wireMobileSheet();
    observeActiveSection(sections, linkGroups);
  }

  function getNativeLinks(body) {
    const selector = body.dataset.storyNavSelector || "#toc a[href^='#'], nav a[href^='#']";
    return Array.from(document.querySelectorAll(selector))
      .map((link) => {
        const href = link.getAttribute("href") || "";
        return {
          link,
          targetId: href.startsWith("#") && document.querySelector(href) ? href.slice(1) : "",
        };
      });
  }

  function enhanceNativeNavigation(sections, body) {
    const nativeLinks = getNativeLinks(body);
    if (!nativeLinks.length) {
      return;
    }

    nativeLinks.forEach(({ link, targetId }) => {
      link.classList.add("story-native-link");
      if (targetId) {
        link.dataset.storyTarget = targetId;
      }
    });

    const observableLinks = nativeLinks
      .filter(({ targetId }) => Boolean(targetId))
      .map(({ link }) => link);

    observeActiveSection(sections, observableLinks);
  }

  function resolveConfigTarget(entry) {
    const directTarget = document.querySelector(entry.selector);
    if (!directTarget) {
      return null;
    }

    if (!entry.closest) {
      return directTarget;
    }

    return directTarget.closest(entry.closest);
  }

  function getLegacyHeadingTitle(heading) {
    const clone = heading.cloneNode(true);
    clone.querySelectorAll("a").forEach((link) => link.remove());
    return sanitizeChapterTitle(clone.textContent);
  }

  function wrapLegacyHeadingSections(contentRoot) {
    if (!contentRoot || contentRoot.querySelector(":scope > [data-story-chapter]")) {
      return;
    }

    const children = Array.from(contentRoot.children).filter((child) => {
      return !child.classList.contains("post_date") && !child.classList.contains("post_title");
    });
    let currentSection = null;

    children.forEach((child) => {
      if (child.matches("h1[id]")) {
        const section = document.createElement("section");
        section.className = "story-auto-section";
        section.id = child.id;
        section.dataset.storyChapter = getLegacyHeadingTitle(child);
        child.removeAttribute("id");
        contentRoot.insertBefore(section, child);
        section.appendChild(child);
        currentSection = section;
        return;
      }

      if (currentSection) {
        currentSection.appendChild(child);
      }
    });
  }

  function prepareLongformEngineeringArticle(body) {
    if (body.dataset.storyFamily !== "engineering-longform") {
      return;
    }

    const article = document.querySelector(".article");
    if (!article) {
      return;
    }

    const articleChildren = Array.from(article.children);
    const wrapperRoot = article.querySelector(".padding_wrapper");
    const hasWrapperChapters = wrapperRoot && Array.from(wrapperRoot.children).some((child) => child.matches("h1[id]"));
    const hasArticleChapters = articleChildren.some((child) => child.matches("h1[id]"));
    const nestedRoots = Array.from(article.querySelectorAll("*")).filter((candidate) => {
      return Array.from(candidate.children).some((child) => child.matches("h1[id]"));
    });
    const contentRoot = hasWrapperChapters ? wrapperRoot : (hasArticleChapters ? article : null);
    if (!contentRoot && !nestedRoots.length) {
      return;
    }

    article.querySelector(".post_date")?.classList.add("story-legacy-title");
    article.querySelector(".post_title")?.classList.add("story-legacy-title");

    const chapterRoots = [];
    if (contentRoot) {
      if (contentRoot.querySelector("[data-story-chapter]")) {
        return;
      }
      chapterRoots.push(contentRoot);
    }
    nestedRoots.forEach((root) => {
      if (!chapterRoots.includes(root)) {
        chapterRoots.push(root);
      }
    });

    chapterRoots.forEach((root) => {
      wrapLegacyHeadingSections(root);
    });
  }

  async function applyRouteChapterConfig(slug) {
    const entries = routeChapterConfigs[slug];
    if (!entries || !entries.length) {
      return;
    }

    const deadline = Date.now() + 15000;

    while (Date.now() < deadline) {
      const targets = entries.map((entry) => resolveConfigTarget(entry));
      if (targets.every(Boolean)) {
        targets.forEach((target, index) => {
          ensureSectionId(target, index, entries[index].id);
          target.dataset.storyChapter = entries[index].title;
        });
        return;
      }

      await new Promise((resolve) => window.requestAnimationFrame(resolve));
    }
  }

  async function initStoryShell() {
    const body = document.body;
    if (!body || body.dataset.storyShell !== "engineering-sandbox") {
      return;
    }

    const navMode = body.dataset.storyNav || "generated";
    prepareLongformEngineeringArticle(body);
    await applyRouteChapterConfig(getSlug());

    const sections = Array.from(document.querySelectorAll("[data-story-chapter]"));
    applyRouteChapterNavLabels(getSlug(), sections);
    renderCompanionRoutes(getSlug());
    if (navMode === "none") {
      return;
    }

    if (!sections.length) {
      if (navMode === "native") {
        enhanceNativeNavigation([], body);
      }
      return;
    }

    sections.forEach((section, index) => ensureSectionId(section, index));

    if (navMode === "native") {
      enhanceNativeNavigation(sections, body);
      return;
    }

    buildGeneratedNavigation(sections);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      initStoryShell();
    }, { once: true });
  } else {
    initStoryShell();
  }
})();
