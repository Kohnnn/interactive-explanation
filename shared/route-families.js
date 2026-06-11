// Single source of truth for route source-family classification.
//
// Two consumers with deliberately different vocabularies read from one table:
//   - shared/site.js (atlas UI) uses site keys ("nicky-case", "music-tools", ...)
//     and matches by parsed reference host.
//   - tools/smoke-bundle.mjs uses smoke keys ("ncase", "musicmap", ...) and matches
//     by regex over the reference URL.
//
// This file is dual-consumable with no build step: included as a classic <script>
// in the atlas page (exposes window.RouteFamilies) and imported for its side effect
// from Node ESM tooling (exposes globalThis.RouteFamilies).
(function () {
  // Slugs that are local editorial hub pages regardless of any referenceUrl they
  // carry. site.js treats these as "local-hubs"; smoke treats them as "custom".
  const LOCAL_HUB_SLUGS = [
    "blockchain-101-combined-flow",
    "music-interactive-hub",
    "primary-interactive-hub",
  ];

  // Ordered family table. site.js matches `hosts` (exact, www-stripped); smoke
  // matches `urlPattern` (regex over the full referenceUrl). A null on either side
  // means "no rule for that consumer" and falls through to its default.
  const FAMILY_ENTRIES = [
    {
      hosts: ["ncase.me", "ncase.itch.io"],
      urlPattern: /ncase\.me|ncase\.itch\.io|github\.com\/ncase/i,
      site: "nicky-case",
      smoke: "ncase",
    },
    {
      hosts: ["mlu-explain.github.io"],
      urlPattern: /mlu-explain\.github\.io/i,
      site: "mlu-explain",
      smoke: "mlu",
    },
    {
      hosts: ["setosa.io"],
      urlPattern: /setosa\.io/i,
      site: "setosa",
      smoke: "setosa",
    },
    {
      hosts: ["andersbrownworth.com"],
      urlPattern: /andersbrownworth\.com/i,
      site: "anders-brownworth",
      smoke: "anders",
    },
    {
      hosts: ["ciechanow.ski"],
      urlPattern: /ciechanow\.ski/i,
      site: "engineering-longform",
      smoke: "engineering-longform",
    },
    {
      hosts: ["learningmusic.ableton.com", "learningsynths.ableton.com"],
      urlPattern: /learningmusic\.ableton\.com|learningsynths\.ableton\.com/i,
      site: "ableton",
      smoke: "ableton",
    },
    {
      hosts: ["teoria.com"],
      urlPattern: /teoria\.com/i,
      site: "teoria",
      smoke: "teoria",
    },
    {
      // Chrome Music Lab has a site family but no dedicated smoke family (falls to custom).
      hosts: ["musiclab.chromeexperiments.com"],
      urlPattern: null,
      site: "music-tools",
      smoke: null,
    },
    {
      hosts: ["musicmap.info"],
      urlPattern: /musicmap\.info/i,
      site: "music-tools",
      smoke: "musicmap",
    },
    {
      hosts: ["samwho.dev"],
      urlPattern: /samwho\.dev/i,
      site: "samwho",
      smoke: "samwho",
    },
    {
      // Smaller source families: smoke tracks them individually; site folds them
      // into the generic "independent-labs" bucket (site default).
      hosts: [],
      urlPattern: /joshuahhh\.com/i,
      site: "independent-labs",
      smoke: "horowitz",
    },
    {
      hosts: [],
      urlPattern: /sassnow\.ski/i,
      site: "independent-labs",
      smoke: "sassnowski",
    },
  ];

  const SITE_DEFAULT_FAMILY = "independent-labs";
  const SITE_LOCAL_HUB_FAMILY = "local-hubs";
  const SMOKE_DEFAULT_FAMILY = "custom";

  function getReferenceHost(referenceUrl) {
    if (!referenceUrl) {
      return null;
    }
    try {
      return new URL(referenceUrl).host.replace(/^www\./, "");
    } catch (error) {
      return null;
    }
  }

  function isLocalHubSlug(slug) {
    return LOCAL_HUB_SLUGS.indexOf(slug) !== -1;
  }

  // Mirrors the original shared/site.js getFamilyKey host logic. Callers that
  // support an explicit page.familyKey override should apply it before calling.
  function classifySiteFamily(page) {
    if (isLocalHubSlug(page.slug) || page.referenceMode === "neutral" || !page.referenceUrl) {
      return SITE_LOCAL_HUB_FAMILY;
    }

    const host = getReferenceHost(page.referenceUrl);
    for (let i = 0; i < FAMILY_ENTRIES.length; i += 1) {
      const entry = FAMILY_ENTRIES[i];
      if (host && entry.hosts.indexOf(host) !== -1) {
        return entry.site;
      }
    }
    return SITE_DEFAULT_FAMILY;
  }

  // Mirrors the original tools/smoke-bundle.mjs inferRouteFamily regex logic.
  function classifySmokeFamily(route) {
    if (isLocalHubSlug(route.slug)) {
      return SMOKE_DEFAULT_FAMILY;
    }

    const referenceUrl = route.referenceUrl || "";
    for (let i = 0; i < FAMILY_ENTRIES.length; i += 1) {
      const entry = FAMILY_ENTRIES[i];
      if (entry.smoke && entry.urlPattern && entry.urlPattern.test(referenceUrl)) {
        return entry.smoke;
      }
    }
    return SMOKE_DEFAULT_FAMILY;
  }

  // Mirrors the original tools/smoke-bundle.mjs inferRouteGroups logic.
  function classifySmokeGroups(route) {
    const family = classifySmokeFamily(route);
    const groups = new Set([family]);

    if (
      ["teoria", "musicmap"].includes(family) ||
      route.slug === "music-interactive-hub" ||
      /learningmusic\.ableton\.com|learningsynths\.ableton\.com|musiclab\.chromeexperiments\.com/i.test(
        route.referenceUrl || "",
      )
    ) {
      groups.add("music");
    }

    return groups;
  }

  const RouteFamilies = {
    LOCAL_HUB_SLUGS: LOCAL_HUB_SLUGS,
    FAMILY_ENTRIES: FAMILY_ENTRIES,
    getReferenceHost: getReferenceHost,
    classifySiteFamily: classifySiteFamily,
    classifySmokeFamily: classifySmokeFamily,
    classifySmokeGroups: classifySmokeGroups,
  };

  const globalScope = typeof globalThis !== "undefined" ? globalThis : this;
  globalScope.RouteFamilies = RouteFamilies;
})();
