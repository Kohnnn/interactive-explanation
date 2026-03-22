(() => {
  const appRoot = document.querySelector("main[data-ableton-synth-lesson]");
  if (!appRoot) {
    return;
  }

  const localLessonLinks = new Map([
    ["/en/get-started", "../ableton-learning-synths-get-started/"],
    ["/en/oscillators/how-synths-make-sound", "../ableton-learning-synths-how-synths-make-sound/"],
    ["/en/filters/filter-resonance", "../ableton-learning-synths-filter-resonance/"],
    ["/en/envelopes/modulating-amplitude-with-envelopes", "../ableton-learning-synths-modulating-amplitude-with-envelopes/"],
    ["/en/envelopes/matching-envelopes", "../ableton-learning-synths-matching-envelopes/"],
    ["/en/recipes", "../ableton-learning-synths-recipes/"],
  ]);
  const languagePathPattern = /^\/(?:en|zh-Hans|zh-Hant|de|es|fr|it|ja|ko|nl|pt|fi|th|tr|vi)(?:\/|$)/;
  const remoteAbletonPattern = /^https?:\/\/(?:www\.)?ableton\.com(?:\/|$)/i;
  const remoteLessonPattern = /^https?:\/\/learningsynths\.ableton\.com/i;
  const feedbackPattern = /^mailto:learning@ableton\.com/i;
  const archiveState = {
    footerRemoved: false,
  };

  function normalizeLessonHref(rawHref) {
    if (!rawHref) {
      return "";
    }
    return rawHref.replace(remoteLessonPattern, "");
  }

  function cloneToNeutralSpan(anchor) {
    const span = document.createElement("span");
    span.className = anchor.className;
    span.style.cssText = anchor.style.cssText;
    span.innerHTML = anchor.innerHTML;
    span.dataset.archiveNeutralized = "true";
    return span;
  }

  function neutralizeAnchor(anchor) {
    if (!anchor || anchor.dataset.archiveNeutralized === "true") {
      return;
    }
    anchor.replaceWith(cloneToNeutralSpan(anchor));
  }

  function removeFooterShell(root) {
    if (archiveState.footerRemoved) {
      return;
    }
    const feedbackLink = root.querySelector("a[href^='mailto:learning@ableton.com']");
    const footerBlock = feedbackLink?.closest("div");
    if (footerBlock) {
      footerBlock.remove();
      archiveState.footerRemoved = true;
    }
  }

  function sanitizeAnchor(anchor) {
    if (!anchor || anchor.closest("#reference-footer")) {
      return;
    }

    const rawHref = anchor.getAttribute("href") || "";
    if (!rawHref || rawHref.startsWith("#") || rawHref.startsWith("javascript:")) {
      return;
    }

    const normalizedHref = normalizeLessonHref(rawHref);
    if (localLessonLinks.has(normalizedHref)) {
      anchor.setAttribute("href", localLessonLinks.get(normalizedHref));
      anchor.removeAttribute("target");
      anchor.removeAttribute("rel");
      anchor.dataset.archiveLocalized = "true";
      return;
    }

    if (
      feedbackPattern.test(rawHref) ||
      remoteAbletonPattern.test(rawHref) ||
      remoteLessonPattern.test(rawHref) ||
      languagePathPattern.test(rawHref)
    ) {
      neutralizeAnchor(anchor);
    }
  }

  function sanitizeLessonShell() {
    removeFooterShell(appRoot);
    appRoot.querySelectorAll("a[href]").forEach((anchor) => {
      sanitizeAnchor(anchor);
    });
  }

  sanitizeLessonShell();

  const observer = new MutationObserver(() => {
    sanitizeLessonShell();
  });
  observer.observe(appRoot, {
    childList: true,
    subtree: true,
  });
})();
