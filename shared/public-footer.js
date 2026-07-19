(function () {
  var SELF = document.currentScript;

  function applyStoredTheme() {
    try {
      var root = document.documentElement;
      if (!root) {
        return;
      }
      var stored = null;
      try {
        stored = window.localStorage.getItem("ie-theme");
      } catch (storageError) {
        stored = null;
      }
      if (stored === "dark") {
        root.setAttribute("data-theme", "dark");
      } else if (stored === "light") {
        root.setAttribute("data-theme", "light");
      }
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
      return fetch("./pages.json", { cache: "no-store" })
        .then(function (response) {
          return response.json();
        })
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
    if (!body) {
      return true;
    }
    if (body.dataset.topBar === "off") {
      return true;
    }
    if (body.dataset.pageType === "home") {
      return true;
    }
    if (body.dataset.storyShell === "engineering-sandbox") {
      return true;
    }
    return false;
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

  function readStoredTheme() {
    try {
      return window.localStorage.getItem("ie-theme");
    } catch (error) {
      return null;
    }
  }

  function writeStoredTheme(value) {
    try {
      window.localStorage.setItem("ie-theme", value);
    } catch (error) {}
  }

  function isDarkActive() {
    var root = document.documentElement;
    return !!root && root.getAttribute("data-theme") === "dark";
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
        root.setAttribute("data-theme", next);
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
      document.body.appendChild(bar);
      document.body.classList.add("has-top-bar");

      wireThemeButton(theme);
    } catch (error) {
      // Top-bar rendering is non-critical for the interactive runtime.
    }
  }

  function boot() {
    initFooter();
    initTopBar();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
