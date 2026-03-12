(function () {
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

  function mountFooter(definition) {
    if (!definition || !definition.links || !definition.links.length) {
      return;
    }

    if (document.querySelector(".public-footer")) {
      return;
    }

    const footer = document.createElement("footer");
    footer.id = "reference-footer";
    footer.className = "public-footer";

    const inner = document.createElement("div");
    inner.className = "public-footer__inner";

    const label = document.createElement("p");
    label.className = "public-footer__label";
    label.textContent = definition.label;
    inner.appendChild(label);

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
    footer.appendChild(inner);
    document.body.appendChild(footer);
  }

  async function getFooterDefinition() {
    const body = document.body;

    if (!body) {
      return null;
    }

    if (body.dataset.pageType === "home") {
      const response = await fetch("./pages.json", { cache: "no-store" });
      const pages = await response.json();

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

  async function initFooter() {
    ensurePageUrlMetadata();

    try {
      const definition = await getFooterDefinition();
      mountFooter(definition);
    } catch (error) {
      // Footer rendering is non-critical for the interactive runtime.
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initFooter, { once: true });
  } else {
    initFooter();
  }
})();
