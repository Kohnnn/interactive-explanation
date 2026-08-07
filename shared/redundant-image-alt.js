(function () {
  "use strict";

  function accessibleName(el) {
    if (!el) return "";
    var aria = (el.getAttribute("aria-label") || "").trim();
    if (aria) return aria;
    var labelledby = (el.getAttribute("aria-labelledby") || "").trim();
    if (labelledby) {
      var parts = labelledby.split(/\s+/);
      var text = "";
      for (var i = 0; i < parts.length; i++) {
        var ref = document.getElementById(parts[i]);
        if (ref) text += " " + (ref.textContent || "");
      }
      if (text.trim()) return text.trim();
    }
    var title = (el.getAttribute("title") || "").trim();
    if (title) return title;
    return (el.textContent || "").trim();
  }

  function describingBlock(img) {
    var block = img.closest("p, figcaption, li, td, th, dd");
    if (!block) return "";
    var copy = block.cloneNode(true);
    var imgs = copy.querySelectorAll("img");
    for (var i = 0; i < imgs.length; i++) {
      if (imgs[i].parentNode) imgs[i].parentNode.removeChild(imgs[i]);
    }
    return (copy.textContent || "").replace(/\s+/g, " ").trim();
  }

  function blankDecorative() {
    var imgs = document.querySelectorAll("img:not([alt])");
    for (var i = 0; i < imgs.length; i++) {
      var img = imgs[i];

      var host = img.closest("a, button");
      if (host && accessibleName(host)) {
        img.setAttribute("alt", "");
        continue;
      }

      var prose = describingBlock(img);
      if (prose.length >= 24) {
        img.setAttribute("alt", "");
      }
    }
  }

  function start() {
    blankDecorative();
    if (typeof MutationObserver !== "function") return;

    var scheduled = false;
    var run = function () {
      scheduled = false;
      blankDecorative();
    };
    var schedule =
      typeof requestAnimationFrame === "function"
        ? function () {
            requestAnimationFrame(run);
          }
        : function () {
            setTimeout(run, 100);
          };

    new MutationObserver(function () {
      if (scheduled) return;
      scheduled = true;
      schedule();
    }).observe(document.documentElement, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
