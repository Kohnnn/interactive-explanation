(function () {
  var SELF = document.currentScript;
  var routeManifestPromise;

  function loadRouteManifest() {
    if (!routeManifestPromise) {
      routeManifestPromise = fetch(new URL("routes.manifest.json", atlasHref()).href, { cache: "no-store" })
        .then(function (response) {
          if (!response.ok) {
            throw new Error("Route manifest unavailable");
          }
          return response.json();
        })
        .then(function (pages) {
          const slugs = new Set();
          const valid = Array.isArray(pages) && pages.length > 0 && pages.every(function (page) {
            if (!page ||
              typeof page.slug !== "string" || !page.slug ||
              typeof page.title !== "string" || !page.title ||
              typeof page.suggestedNextSlug !== "string" || !page.suggestedNextSlug ||
              slugs.has(page.slug)) {
              return false;
            }
            slugs.add(page.slug);
            return true;
          });
          if (!valid || pages.some(function (page) {
            return page.suggestedNextSlug === page.slug || !slugs.has(page.suggestedNextSlug);
          })) {
            throw new Error("Route manifest is invalid");
          }
          return pages;
        });
    }
    return routeManifestPromise;
  }

  function applyStoredTheme() {
    try {
      var root = document.documentElement;
      if (!root) {
        return;
      }
      if (root.getAttribute("saved-theme")) {
        return;
      }
      var stored = null;
      try {
        stored = window.localStorage.getItem("theme");
      } catch (storageError) {
        stored = null;
      }
      var userPref = window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
      var theme = stored === "dark" || stored === "light" ? stored : userPref;
      root.setAttribute("saved-theme", theme);
    } catch (error) {
      // Theme application is non-critical chrome behavior.
    }
  }

  applyStoredTheme();

  function ensurePageUrlMetadata() {
    const pageUrl = new URL(document.body?.dataset.canonicalUrl || "./", window.location.href).href;
    const sharing = document.querySelector("sharing");
    const ogUrl = document.querySelector('meta[property="og:url"]');
    let canonical = document.querySelector('link[rel="canonical"]');

    if (sharing) {
      sharing.setAttribute("link", pageUrl);
    }

    if (ogUrl) {
      ogUrl.setAttribute("content", pageUrl);
    }

    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }

    canonical.href = pageUrl;
  }

  function createLink(href, label) {
    const link = document.createElement("a");
    link.href = href;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.textContent = label;
    return link;
  }

  function removeStoredLearningProgress(key) {
    try {
      window.localStorage.removeItem(key);
    } catch (error) {}
  }

  function readStoredLearningProgress(key, stepCount) {
    try {
      const stored = JSON.parse(window.localStorage.getItem(key));
      const now = Date.now();
      const valid = stored &&
        Number.isInteger(stored.step) &&
        stored.step >= 1 &&
        stored.step <= stepCount &&
        Number.isFinite(stored.updatedAt) &&
        stored.updatedAt <= now &&
        now - stored.updatedAt <= 30 * 24 * 60 * 60 * 1000;
      if (valid) {
        return stored;
      }
    } catch (error) {}

    removeStoredLearningProgress(key);
    return null;
  }

  function writeStoredLearningProgress(key, step) {
    const progress = { step, updatedAt: Date.now() };
    try {
      window.localStorage.setItem(key, JSON.stringify(progress));
      return progress;
    } catch (error) {
      return null;
    }
  }

  function initLearningProgress() {
    const body = document.body;
    const slug = body?.dataset.learningProgressSlug;
    const stepCount = Number(body?.dataset.learningStepCount);
    if (!slug || !Number.isInteger(stepCount) || stepCount < 1) {
      return;
    }

    const key = `ie-learning-progress:v1:${slug}`;
    const start = document.querySelector("[data-learning-start]");
    const resume = document.querySelector("[data-learning-resume]");
    const status = document.querySelector("[data-learning-progress-status]");
    const steps = Array.from(document.querySelectorAll("[data-learning-step]"));

    function render(progress, message) {
      const step = progress && document.querySelector(`[data-learning-step="${progress.step}"]`);
      if (start) {
        start.hidden = Boolean(step);
      }
      if (resume) {
        resume.hidden = !step;
        if (step) {
          resume.href = step.href;
          resume.textContent = `Resume at step ${progress.step}`;
          resume.setAttribute("aria-label", `Resume learning path at step ${progress.step} of ${stepCount}`);
        }
      }
      if (status) {
        status.textContent = message || (step
          ? `Progress saved at step ${progress.step} of ${stepCount}.`
          : "Path not started. Choose Start or a numbered step.");
      }
    }

    function save(step, message) {
      const progress = writeStoredLearningProgress(key, step);
      render(progress, progress ? message : "Progress is unavailable in this browser.");
    }

    let progress = readStoredLearningProgress(key, stepCount);
    render(progress);

    if (start) {
      start.addEventListener("click", function () {
        save(1, `Started at step 1 of ${stepCount}.`);
      });
    }

    if (resume) {
      resume.addEventListener("click", function () {
        progress = readStoredLearningProgress(key, stepCount);
        if (progress) {
          save(progress.step, `Resuming at step ${progress.step} of ${stepCount}.`);
        }
      });
    }

    steps.forEach(function (step) {
      const stepNumber = Number(step.dataset.learningStep);
      if (!Number.isInteger(stepNumber) || stepNumber < 1 || stepNumber > stepCount) {
        return;
      }
      step.addEventListener("click", function () {
        save(stepNumber, `Step ${stepNumber} of ${stepCount} selected.`);
      });
    });
  }

  function copyLearningPathUrl(url, status) {
    if (!navigator.clipboard || typeof navigator.clipboard.writeText !== "function") {
      status.textContent = "Copy unavailable. Copy the page URL from your browser.";
      return Promise.resolve();
    }

    return navigator.clipboard.writeText(url).then(function () {
      status.textContent = "Path link copied.";
    }).catch(function () {
      status.textContent = "Copy unavailable. Copy the page URL from your browser.";
    });
  }

  function initLearningShare() {
    const buttons = document.querySelectorAll("[data-share-route]");
    const status = document.querySelector("[data-share-status]");
    if (!buttons.length || !status) {
      return;
    }

    buttons.forEach(function (button) {
      button.addEventListener("click", async function () {
        const url = new URL(window.location.href);
        url.hash = "";
        if (typeof navigator.share === "function") {
          try {
            await navigator.share({
              title: document.title,
              text: "Continue this interactive learning path.",
              url: url.href,
            });
            status.textContent = "Path shared.";
            return;
          } catch (error) {
            if (error?.name === "AbortError") {
              status.textContent = "Sharing canceled.";
              return;
            }
          }
        }
        await copyLearningPathUrl(url.href, status);
      });
    });
  }

  function hideFooterFromFocusOrder(footer) {
    if ("inert" in footer) {
      footer.inert = true;
    } else {
      footer.setAttribute("inert", "");
    }
    footer.setAttribute("aria-hidden", "true");
    const focusable = footer.querySelectorAll(
      "a[href], button, input, select, textarea, [tabindex]",
    );
    focusable.forEach(function (element) {
      element.tabIndex = -1;
    });
  }

  function mountFooter(definition) {
    if (!definition) {
      return;
    }

    if (document.querySelector(".public-footer")) {
      return;
    }

    const footer = document.createElement("footer");
    footer.id = "reference-footer";
    footer.className = "public-footer";

    const footerVisible = document.body?.dataset.showReferenceFooter === "true";
    if (!footerVisible) {
      footer.dataset.visibility = "hidden";
      footer.style.setProperty("display", "block", "important");
      footer.style.setProperty("width", "1px", "important");
      footer.style.setProperty("max-width", "1px", "important");
      footer.style.setProperty("height", "1px", "important");
      footer.style.setProperty("padding", "0", "important");
      footer.style.setProperty("margin", "0 auto", "important");
      footer.style.setProperty("overflow", "hidden", "important");
      footer.style.setProperty("border", "0", "important");
      footer.style.setProperty("opacity", "0", "important");
      footer.style.setProperty("pointer-events", "none", "important");
    }

    const inner = document.createElement("div");
    inner.className = "public-footer__inner";

    const label = document.createElement("p");
    label.className = "public-footer__label";
    label.textContent = definition.label;
    inner.appendChild(label);

    if (definition.note) {
      const note = document.createElement("p");
      note.className = "public-footer__note";
      note.textContent = definition.note;
      inner.appendChild(note);
    }

    if (definition.links && definition.links.length) {
      const links = document.createElement("div");
      links.className = "public-footer__links";

      definition.links.forEach(function (item, index) {
        if (index > 0) {
          const divider = document.createElement("span");
          divider.className = "public-footer__divider";
          divider.textContent = "•";
          links.appendChild(divider);
        }

        links.appendChild(createLink(item.href, item.label));
      });

      inner.appendChild(links);
    }

    if (!definition.note && (!definition.links || !definition.links.length)) {
      return;
    }

    footer.appendChild(inner);
    document.body.appendChild(footer);

    if (!footerVisible) {
      hideFooterFromFocusOrder(footer);
    }
  }

  function createRouteContinuationSection() {
    const section = document.createElement("section");
    section.className = "route-continuation";
    section.dataset.routeContinuation = "";
    section.setAttribute("aria-labelledby", "route-continuation-heading");

    const heading = document.createElement("h2");
    heading.id = "route-continuation-heading";
    heading.className = "route-continuation__heading";
    heading.dataset.routeContinuationHeading = "";
    heading.textContent = "Suggested Next Route";
    section.appendChild(heading);
    return section;
  }

  function insertRouteContinuation(section) {
    const footer = document.querySelector("#reference-footer");
    if (!footer) {
      throw new Error("Reference footer unavailable");
    }
    footer.before(section);
  }

  function mountRouteContinuation(pages) {
    const body = document.body;
    const slug = body?.dataset.storyRoute;
    const main = document.querySelector("main");
    if (!slug || document.querySelector("[data-route-continuation]")) {
      return;
    }
    if (!main) {
      throw new Error("Route main unavailable");
    }

    const current = pages.find(function (page) {
      return page.slug === slug;
    });
    const target = pages.find(function (page) {
      return page.slug === current?.suggestedNextSlug;
    });
    if (!target?.title) {
      throw new Error("Suggested Next Route unavailable");
    }

    const section = createRouteContinuationSection();
    const link = document.createElement("a");
    link.className = "route-continuation__link";
    link.dataset.routeContinuationLink = "";
    link.href = new URL(target.slug + "/", atlasHref()).href;
    link.textContent = target.title;
    section.appendChild(link);
    insertRouteContinuation(section);
  }

  function mountRouteContinuationFallback() {
    if (document.querySelector("[data-route-continuation]")) {
      return;
    }
    const section = createRouteContinuationSection();
    section.dataset.routeContinuationStatus = "unavailable";
    const status = document.createElement("p");
    status.className = "route-continuation__status";
    status.textContent = "Suggestion unavailable. Return to the Atlas to choose another Route.";
    section.appendChild(status);
    insertRouteContinuation(section);
  }

  function initRouteContinuation() {
    if (!document.body?.dataset.storyRoute) {
      return;
    }
    loadRouteManifest().then(mountRouteContinuation).catch(function (error) {
      console.error("Suggested Next Route unavailable.", error);
      try {
        mountRouteContinuationFallback();
      } catch (fallbackError) {
        console.error("Suggested Next Route fallback unavailable.", fallbackError);
      }
    });
  }

  function parseReferenceLinks(serializedLinks) {
    if (!serializedLinks) {
      return [];
    }

    try {
      const parsed = JSON.parse(serializedLinks);
      if (!Array.isArray(parsed)) {
        return [];
      }

      return parsed
        .map(function (entry) {
          if (typeof entry === "string") {
            return { href: entry, label: entry };
          }

          if (!entry || typeof entry !== "object" || typeof entry.href !== "string" || !entry.href) {
            return null;
          }

          return {
            href: entry.href,
            label: entry.label || entry.href,
          };
        })
        .filter(Boolean);
    } catch (error) {
      return [];
    }
  }

  function getFooterDefinition() {
    const body = document.body;

    if (!body) {
      return null;
    }

    if (body.dataset.pageType === "home") {
      return loadRouteManifest()
        .then(function (pages) {
          return {
            label: "References",
            links: pages
              .filter(function (page) {
                return page.referenceUrl;
              })
              .map(function (page) {
                return {
                  href: page.referenceUrl,
                  label: page.title,
                };
              }),
          };
        });
    }

    if (body.dataset.referenceMode === "neutral") {
      return {
        label: body.dataset.footerLabel || "Provenance",
        note: body.dataset.referenceNote || "This curated route combines multiple upstream families. See the local docs for full provenance.",
      };
    }

    if (body.dataset.referenceLinks) {
      const links = parseReferenceLinks(body.dataset.referenceLinks);
      if (links.length) {
        return {
          label: body.dataset.footerLabel || "Original pages",
          links,
        };
      }
    }

    if (body.dataset.referenceUrl) {
      return {
        label: body.dataset.footerLabel || "Original page",
        links: [
          {
            href: body.dataset.referenceUrl,
            label: body.dataset.referenceText || body.dataset.referenceUrl,
          },
        ],
      };
    }

    return null;
  }

  function initFooter() {
    ensurePageUrlMetadata();

    try {
      const definition = getFooterDefinition();
      if (definition && typeof definition.then === "function") {
        definition.then(mountFooter).catch(function () {});
      } else {
        mountFooter(definition);
      }
    } catch (error) {
      // Footer rendering is non-critical for the interactive runtime.
    }
  }

  function atlasHref() {
    try {
      if (SELF && SELF.src) {
        var root = new URL(SELF.src, window.location.href).href.replace(/shared\/public-footer\.js(?:[?#].*)?$/, "");
        return root + "index.html";
      }
    } catch (e) {}
    return "./index.html";
  }

  function docsHref() {
    var data = document.body.dataset;
    var slug = data.storyRoute;
    if (!slug) {
      var segments = window.location.pathname.split("/").filter(Boolean);
      var rootIndex = segments.indexOf("interactive-explanation");
      slug = rootIndex >= 0 ? segments[rootIndex + 1] : segments[0];
    }
    return new URL("docs/" + slug + "/", atlasHref()).href;
  }

  function topBarDisabled() {
    var body = document.body;
    return !body || body.dataset.pageType === "home";
  }

  function formatSlug(slug) {
    return String(slug)
      .replace(/-/g, " ")
      .replace(/\S+/g, function (word) {
        return word.charAt(0).toUpperCase() + word.slice(1);
      });
  }

  function topBarLabel() {
    var data = document.body.dataset;
    if (data.footerLabel && data.pageType === "docs") {
      return "Documentation";
    }
    if (data.storyRoute) {
      return formatSlug(data.storyRoute);
    }
    var segs = window.location.pathname.split("/").filter(Boolean);
    var idx = segs.indexOf("interactive-explanation");
    var slug = idx >= 0 ? segs[idx + 1] : segs[0];
    if (slug === "docs") {
      return "Documentation";
    }
    return slug ? formatSlug(slug) : "Interactive";
  }

  function writeStoredTheme(value) {
    try {
      window.localStorage.setItem("theme", value);
    } catch (error) {}
  }

  function isDarkActive() {
    var root = document.documentElement;
    return !!root && root.getAttribute("saved-theme") === "dark";
  }

  function updateThemeButton(button) {
    var dark = isDarkActive();
    button.setAttribute("aria-pressed", dark ? "true" : "false");
    button.textContent = dark ? "Theme: Dark" : "Theme: Light";
  }

  function wireThemeButton(button) {
    updateThemeButton(button);
    button.addEventListener("click", function () {
      try {
        var root = document.documentElement;
        if (!root) {
          return;
        }
        var next = isDarkActive() ? "light" : "dark";
        root.setAttribute("saved-theme", next);
        writeStoredTheme(next);
        updateThemeButton(button);
      } catch (error) {}
    });
  }

  function initTopBar() {
    try {
      if (topBarDisabled()) {
        return;
      }
      if (document.getElementById("top-bar")) {
        return;
      }

      var bar = document.createElement("div");
      bar.id = "top-bar";
      bar.className = "top-bar";
      if (document.body.dataset.topBar === "off") {
        bar.classList.add("top-bar--overlay");
      }
      bar.setAttribute("role", "navigation");
      bar.setAttribute("aria-label", "Site");

      var inner = document.createElement("div");
      inner.className = "top-bar__inner";

      var back = document.createElement("a");
      back.className = "top-bar__back";
      back.href = atlasHref();
      back.textContent = "Atlas";
      inner.appendChild(back);

      var docs = document.createElement("a");
      docs.className = "top-bar__docs";
      docs.href = docsHref();
      docs.textContent = "Docs";
      inner.appendChild(docs);

      var label = document.createElement("span");
      label.className = "top-bar__label";
      label.textContent = topBarLabel();
      inner.appendChild(label);

      var theme = document.createElement("button");
      theme.className = "top-bar__theme";
      theme.type = "button";
      inner.appendChild(theme);

      bar.appendChild(inner);
      document.body.prepend(bar);
      if (document.body.dataset.topBar === "off") {
        document.body.classList.add("has-top-bar-overlay");
      } else {
        document.body.classList.add("has-top-bar");
      }

      wireThemeButton(theme);
    } catch (error) {
      // Top-bar rendering is non-critical for the interactive runtime.
    }
  }

  function initHomeThemeToggle() {
    try {
      var button = document.querySelector("[data-home-theme-toggle]");
      if (button) {
        wireThemeButton(button);
      }
    } catch (error) {
      // Theme toggle is non-critical chrome behavior.
    }
  }

  function boot() {
    initFooter();
    initRouteContinuation();
    initTopBar();
    initHomeThemeToggle();
    initLearningProgress();
    initLearningShare();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
