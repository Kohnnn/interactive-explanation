import fs from "node:fs";
import path from "node:path";

const rootDir = path.resolve(process.argv[2] || path.join(process.cwd(), "interactive-explanation"));
const rootPublicFiles = ["index.html", "pages.json", "routes.manifest.json"];
const siteDirs = fs
  .readdirSync(rootDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .filter((name) => !name.startsWith("."))
  .filter((name) => !["docs", "shared", "tools"].includes(name));

const includeExtensions = new Set([".html", ".js", ".md"]);
const ignoredPathFragments = [
  `${path.sep}README`,
  `${path.sep}LICENSE`,
  `${path.sep}js${path.sep}lib${path.sep}`,
  `${path.sep}angular.js`,
  `${path.sep}angular.min.js`,
  `${path.sep}mathjax${path.sep}`,
];

const teoriaPathPattern = new RegExp(
  `^(?:teoria-[^\\${path.sep}]+(?:\\${path.sep}|$)|docs\\${path.sep}teoria-[^\\${path.sep}]+(?:\\${path.sep}|$))`,
  "i",
);
const abletonPublicRouteHtmlPathPattern = new RegExp(
  `^(?:ableton-learning-music-[^\\${path.sep}]+(?:\\${path.sep}index\\.html)?)$`,
  "i",
);
const abletonSynthPublicRouteHtmlPathPattern = new RegExp(
  `^(?:ableton-learning-synths-[^\\${path.sep}]+(?:\\${path.sep}index\\.html)?)$`,
  "i",
);
const chromeMusicLabPublicRouteHtmlPathPattern = new RegExp(
  `^(?:chrome-music-lab-song-maker(?:\\${path.sep}index\\.html)?)$`,
  "i",
);
const musicmapPublicRouteHtmlPathPattern = new RegExp(
  `^(?:musicmap(?:\\${path.sep}index\\.html)?)$`,
  "i",
);
const musicPublicRoutePathPattern = new RegExp(
  `^(?:(?:teoria|ableton|chrome-music-lab)-[^\\${path.sep}]+(?:\\${path.sep}|$))`,
  "i",
);

const policyTables = {
  general: [
    { label: "translation guide note", regex: /TRANSLATION GUIDE|FAN TRANSLATION GUIDE|how-to-translate|original English version|TO TRANSLATE|TRANSLATE THIS|TRANSLATE note|need you to TRANSLATE|bulk of what you need to TRANSLATE/i },
    { label: "upstream share url", regex: /facebook\.com\/sharer\/sharer\.php[^"'>\n]*(?:ncase\.me|setosa\.io|ciechanow\.ski)|twitter\.com\/intent\/tweet[^"'>\n]*(?:ncase\.me|setosa\.io|ciechanow\.ski)|mailto:\?[^"'>\n]*(?:ncase\.me|setosa\.io|ciechanow\.ski)/i },
    { label: "supporter branding", regex: /\bPatreon\b|\bpatreons?\b|Patreon Supporters|My Patreon Supporters|supporters\/|SHOWING_SUPPORTERS|Playtesting support for this release included|<!--\s*Playtesters\s*-->|reference id="supporters"|reference id="playtesters"|ref_id=="supporters"/i },
    { label: "external promo widget", regex: /setosa\.us9\.list-manage\.com|disqus\.com|google-analytics\.com|googletagmanager\.com|twitter-share-button|facebook\.com\/plugins\/like\.php|buttondown\.email\/api\/emails\/embed-subscribe\/samwho|plausible\.io\/js\/plausible\.js|static\.cloudflareinsights\.com\/beacon|cdn\.usefathom\.com/i },
  ],
  ncase: [
    { label: "creator name", regex: /\bNicky Case\b|\bVi Hart\b|@ncasenmare/i },
    { label: "upstream domain reference", regex: /https?:\/\/ncase\.me\//i },
    { label: "creator self-link", regex: /https?:\/\/github\.com\/ncase|https?:\/\/(?:www\.)?twitter\.com\/ncasenmare|https?:\/\/blog\.ncase\.me/i },
  ],
  ev: [
    { label: "creator name", regex: /\bJared Wilber\b|\bLuc[ií]a Santamar[ií]a\b|\bJenny Yeon\b|\bVictor Powell\b|\bLewis Lehe\b/i },
    { label: "upstream project branding", regex: /\bExplained Visually\b/i },
    { label: "upstream domain reference", regex: /https?:\/\/setosa\.io\//i },
    { label: "creator self-link", regex: /https?:\/\/(?:www\.)?twitter\.com\/jdwlbr|https?:\/\/(?:www\.)?twitter\.com\/lusantala|https?:\/\/hjyeon\.github\.io\/?|https?:\/\/(?:www\.)?twitter\.com\/vicapow|https?:\/\/(?:www\.)?twitter\.com\/lewislehe/i },
  ],
  mlu: [
    { label: "upstream project branding", regex: /\bMLU-Explain\b|\bMLU-explAI?n\b/i },
    { label: "upstream domain reference", regex: /https?:\/\/mlu-explain\.github\.io\//i },
    { label: "creator self-link", regex: /https?:\/\/github\.com\/aws-samples\/aws-mlu-explain/i },
    { label: "upstream promo link", regex: /https?:\/\/aws\.amazon\.com\/machine-learning\/mlu\/|https?:\/\/(?:www\.)?youtube\.com\/channel\/UC12LqyqTQYbXatYS9AA7Nuw/i },
    { label: "upstream contributor callout", regex: /A special thanks goes out to Brent Werness/i },
  ],
  ciechanowski: [
    { label: "creator name", regex: /\bBartosz Ciechanowski\b/i },
    { label: "upstream ciechanow article link", regex: /https?:\/\/ciechanow\.ski\/(?!atom\.xml)(?!images\/)(?!css\/)(?!js\/)[^"'>\s)]+/i },
    { label: "creator self-link", regex: /https?:\/\/(?:www\.)?twitter\.com\/bciechanowski|https?:\/\/(?:www\.)?instagram\.com\/bartoszciechanowski\/?|https?:\/\/(?:www\.)?patreon\.com\/ciechanowski|mailto:bartosz@ciechanow\.ski|https?:\/\/ciechanow\.ski\/atom\.xml/i },
  ],
  teoria: [
    {
      label: "upstream domain reference",
      pathPattern: teoriaPathPattern,
      regex: /href="(?:https?:)?\/\/(?:www\.)?teoria\.com\/(?!en\/exercises\/(?:ie|ne|kne|kner|sc|iv)\.php)[^"]*"/i,
    },
    {
      label: "teoria shell link",
      pathPattern: teoriaPathPattern,
      regex: /href="[^"]*(?:members\/index\.php|help\/search\.php|help\/email\.php|index\.php)"/i,
    },
    {
      label: "creator name",
      pathPattern: teoriaPathPattern,
      regex: /\bJos[eé]\s+Rodr[ií]guez\s+Alvira\b/i,
    },
    {
      label: "donation or license promo",
      pathPattern: teoriaPathPattern,
      regex: /(?:src|href)="(?:https?:)?\/\/(?:www\.)?paypal(?:objects)?\.com\/[^"]*"/i,
    },
  ],
  ableton: [
    {
      label: "upstream ableton body link",
      pathPattern: abletonPublicRouteHtmlPathPattern,
      regex: /https?:\/\/(?:www\.)?ableton\.com\/(?!the-playground\b)(?!$)[^"'>\s)]+/i,
    },
    {
      label: "ableton shell or feedback surface",
      pathPattern: abletonPublicRouteHtmlPathPattern,
      regex: /Send us your feedback|Reset all lessons|Privacy Policy|Imprint|lang-chooser|js-toggle-nav|main-header__logo/i,
    },
    {
      label: "ableton analytics or cookie surface",
      pathPattern: abletonPublicRouteHtmlPathPattern,
      regex: /biscuits\.js|analytics\.ableton\.com|cookie-banner|matomo|biscuits-overlay/i,
    },
  ],
  abletonSynths: [
    {
      label: "upstream ableton synth body link",
      pathPattern: abletonSynthPublicRouteHtmlPathPattern,
      regex: /https?:\/\/(?:www\.)?ableton\.com\/|https?:\/\/learningsynths\.ableton\.com\/(?!en\/(?:get-started|oscillators\/how-synths-make-sound|filters\/filter-resonance|envelopes\/modulating-amplitude-with-envelopes|envelopes\/matching-envelopes|recipes\/?)\b)[^"'>\s)]+/i,
    },
    {
      label: "ableton synth shell or feedback surface",
      pathPattern: abletonSynthPublicRouteHtmlPathPattern,
      regex: /Send us your feedback|Privacy Policy|Imprint|switch language|components_lesson-viewer__footer-feedback|components_lesson-viewer__footer-language|mailto:learning@ableton\.com/i,
    },
    {
      label: "ableton synth analytics or cookie surface",
      pathPattern: abletonSynthPublicRouteHtmlPathPattern,
      regex: /analytics\.ableton\.com|googletagmanager\.com|google-analytics\.com|cookie-banner|matomo|biscuits\.js|biscuits-overlay/i,
    },
  ],
  chromeMusicLab: [
    {
      label: "chrome music lab shell link",
      pathPattern: chromeMusicLabPublicRouteHtmlPathPattern,
      regex: /https?:\/\/musiclab\.chromeexperiments\.com\/(?!Song-Maker\/?$)[^"'>\s)]+/i,
    },
    {
      label: "chrome music lab analytics or cookie surface",
      pathPattern: chromeMusicLabPublicRouteHtmlPathPattern,
      regex: /googletagmanager\.com|google-analytics\.com|gtag\/js|cookienotificationbar|gstatic\.com\/glue/i,
    },
    {
      label: "chrome music lab remote font",
      pathPattern: chromeMusicLabPublicRouteHtmlPathPattern,
      regex: /fonts\.googleapis\.com|fonts\.gstatic\.com/i,
    },
  ],
  musicmap: [
    {
      label: "musicmap shell or promo surface",
      pathPattern: musicmapPublicRouteHtmlPathPattern,
      regex: /social-media-buttons|store-announcement-banner|privacy-policy-banner|on-screen-disclaimer|facebook-share-button|about-side-pane|methodology-side-pane|acknowledgements-side-pane|abstract-side-pane|privacy-policy-side-pane/i,
    },
    {
      label: "musicmap creator or contact surface",
      pathPattern: musicmapPublicRouteHtmlPathPattern,
      regex: /\bKwinten\s+Crauwels\b|info@musicmap\.info|write to us|donate|store-button/i,
    },
    {
      label: "musicmap analytics or sdk surface",
      pathPattern: musicmapPublicRouteHtmlPathPattern,
      regex: /google-analytics\.com|googletagmanager\.com|gtag\(|connect\.facebook\.net|facebook\.com\/plugins/i,
    },
    {
      label: "musicmap disallowed remote media surface",
      pathPattern: musicmapPublicRouteHtmlPathPattern,
      regex: /<(?:audio|video|source|iframe)\b[^>]+(?:src|poster)=["']https?:\/\/(?!(?:www\.)?(?:youtube\.com|youtube-nocookie\.com|youtu\.be|open\.spotify\.com|player\.spotify\.com)\/)[^"']+/i,
    },
    {
      label: "musicmap disallowed remote media asset",
      pathPattern: musicmapPublicRouteHtmlPathPattern,
      regex: /(?:src|href|poster)=["']https?:\/\/(?!(?:www\.)?(?:youtube\.com|youtube-nocookie\.com|youtu\.be|open\.spotify\.com|player\.spotify\.com)\/)[^"']*(?:\.(?:mp3|ogg|wav|m4a|opus|mp4|webm|jpg|jpeg|png|gif|webp)|\/embed\/)/i,
    },
  ],
  music: [
    {
      label: "remote media element",
      pathPattern: musicPublicRoutePathPattern,
      regex: /<(?:audio|video|source)\b[^>]+(?:src|poster)=["']https?:\/\//i,
    },
    {
      label: "remote embed",
      pathPattern: musicPublicRoutePathPattern,
      regex: /<iframe\b[^>]+src=["']https?:\/\/(?:www\.)?(?:youtube\.com|youtube-nocookie\.com|youtu\.be|open\.spotify\.com|player\.spotify\.com|soundcloud\.com)\//i,
    },
    {
      label: "remote playable media asset",
      pathPattern: musicPublicRoutePathPattern,
      regex: /https?:\/\/[^"'\s)]+(?:\.mp3|\.ogg|\.wav|\.m4a|\.opus|\.mp4|\.webm)(?:[?#][^"'\s)]*)?/i,
    },
    {
      label: "remote playable media fetch",
      pathPattern: musicPublicRoutePathPattern,
      regex: /(?:fetch\s*\(|XMLHttpRequest|new\s+Audio\s*\(|Howl\s*\(|Tone\.(?:Player|Players)\b|audio\.src\s*=|video\.src\s*=)[\s\S]{0,240}https?:\/\//i,
    },
  ],
  samwho: [
    { label: "upstream domain reference", regex: /https?:\/\/samwho\.dev\//i },
    { label: "creator self-link", regex: /https?:\/\/github\.com\/samwho\/visualisations|https?:\/\/(?:www\.)?twitter\.com\/samwhoo|https?:\/\/bsky\.app\/profile\/samwho\.dev|https?:\/\/buttondown\.email\/(?:samwho|refer\/samwho)|https?:\/\/octodon\.social\/@samwho|https?:\/\/hachyderm\.io\/@samwho/i },
  ],
  horowitz: [
    { label: "upstream domain reference", regex: /https?:\/\/joshuahhh\.com\//i },
    { label: "creator self-link", regex: /https?:\/\/joshuahhh\.com\/?$/i },
  ],
  sassnowski: [
    { label: "upstream domain reference", regex: /https?:\/\/(?:www\.)?sassnow\.ski\//i },
    { label: "creator self-link", regex: /https?:\/\/(?:www\.)?sassnow\.ski\/feed\.xml|https?:\/\/twitter\.com\/warsh33p|mailto:me@kai-sassnowski\.com/i },
  ],
};

const checks = Object.entries(policyTables).flatMap(([family, entries]) => {
  return entries.map((entry) => ({ ...entry, family }));
});

const issues = [];

function allowKnownReferenceConfig(relativePath, source) {
  if (relativePath === "pages.json" || relativePath === "routes.manifest.json") {
    return source.replace(
      /"referenceUrl"\s*:\s*"https?:\/\/[^"]*"/gi,
      '"referenceUrl":"ALLOWED_REFERENCE_URL"',
    );
  }

  let normalizedSource = source;

  if (relativePath === path.join("reading-qr-codes-without-a-computer", "assets", "index-m4DBYcND.js")) {
    normalizedSource = normalizedSource.replace(/\bto translate\b/gi, "ALLOWED_TRANSLATE_VERB");
  }

  if (relativePath.startsWith(`docs${path.sep}`) && path.extname(relativePath) === ".html") {
    normalizedSource = normalizedSource
      .replace(
        /(<a class="action-link secondary" href=")https?:\/\/[^"]+(" target="_blank" rel="noreferrer">Open original<\/a>)/gi,
        '$1ALLOWED_REFERENCE_URL$2',
      )
      .replace(
        /(Live original verified against <code>)https?:\/\/[^<]+(<\/code>)/gi,
        '$1ALLOWED_REFERENCE_URL$2',
      );
  }

  return normalizedSource;
}

function scanFile(fullPath) {
  const ext = path.extname(fullPath);
  const relativePath = path.relative(rootDir, fullPath);

  if (!includeExtensions.has(ext) && !["pages.json", "routes.manifest.json"].includes(relativePath)) {
    return;
  }

  if (ignoredPathFragments.some((fragment) => fullPath.includes(fragment))) {
    return;
  }

  let source = fs.readFileSync(fullPath, "utf8");

  source = source.replace(/data-reference-url="https?:\/\/[^"]*"/gi, 'data-reference-url="ALLOWED_REFERENCE_URL"');
  source = source.replace(/https?:\/\/ncase\.me\/mental-health\/?/gi, "ALLOWED_EDUCATIONAL_URL");
  source = allowKnownReferenceConfig(relativePath, source);

  for (const check of checks) {
    if (check.pathPattern && !check.pathPattern.test(relativePath)) {
      continue;
    }

    const match = check.regex.exec(source);
    if (!match) {
      continue;
    }

    const line = source.slice(0, match.index).split(/\r?\n/).length;
    const contextLine = source.split(/\r?\n/)[line - 1]?.trim() || "";
    issues.push({
      file: relativePath,
      line,
      label: check.label,
      context: contextLine,
    });
  }
}

function walk(dirPath) {
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      walk(fullPath);
      continue;
    }

    scanFile(fullPath);
  }
}

for (const rootPublicFile of rootPublicFiles) {
  scanFile(path.join(rootDir, rootPublicFile));
}

for (const siteDir of siteDirs) {
  walk(path.join(rootDir, siteDir));
}

if (issues.length > 0) {
  console.error("Public-surface audit failed:");
  for (const issue of issues) {
    console.error(`- ${issue.file}:${issue.line} [${issue.label}] ${issue.context}`);
  }
  process.exit(1);
}

console.log(`Public-surface audit passed for ${siteDirs.join(", ")}`);
