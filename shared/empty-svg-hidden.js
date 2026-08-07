(function () {
  "use strict";

  function hasGraphicalContent(svg) {
    return !!svg.querySelector("rect, circle, path, line, polygon, polyline, ellipse, text, image, use");
  }

  function hasName(svg) {
    if ((svg.getAttribute("aria-label") || "").trim()) return true;
    if ((svg.getAttribute("aria-labelledby") || "").trim()) return true;
    if (svg.querySelector(":scope > title")) return true;
    return false;
  }

  function areaFigureName(svg) {
    var rects = svg.querySelectorAll("rect");
    if (rects.length < 3) return "";
    if (svg.querySelector("text, circle, path, line, polyline, polygon")) return "";

    var squares = 0;
    for (var i = 0; i < rects.length; i++) {
      var w = parseFloat(rects[i].getAttribute("width"));
      var h = parseFloat(rects[i].getAttribute("height"));
      if (!isFinite(w) || !isFinite(h) || w <= 0) return "";
      if (Math.abs(w - h) > 1) return "";
      squares++;
    }
    if (squares !== rects.length) return "";

    return (
      "Squared error diagram: " +
      squares +
      " squares whose areas add up to the total squared error. Each square's size is one point's error, and the areas shrink as the fitted line improves."
    );
  }

  function isSmallIcon(svg) {
    var box = svg.getBoundingClientRect();
    if (!box.width || !box.height) return false;
    if (box.width > 48 || box.height > 48) return false;
    return svg.querySelectorAll("text").length === 0;
  }


  function decorate() {
    var svgs = document.querySelectorAll("svg");
    for (var i = 0; i < svgs.length; i++) {
      var svg = svgs[i];
      if (svg.getAttribute("data-a11y-svg") === "labelled") {
        var refreshed = areaFigureName(svg);
        if (refreshed) svg.setAttribute("aria-label", refreshed);
        continue;
      }
      if (svg.getAttribute("data-a11y-svg")) continue;

      if (svg.classList.contains("rough-annotation")) {
        svg.setAttribute("aria-hidden", "true");
        svg.setAttribute("data-a11y-svg", "decoration");
        continue;
      }

      if (!hasGraphicalContent(svg)) {
        svg.setAttribute("aria-hidden", "true");
        svg.setAttribute("data-a11y-svg", "empty");
        continue;
      }

      if (hasName(svg)) {
        svg.setAttribute("data-a11y-svg", "named");
        continue;
      }

      var described = svg.getAttribute("data-a11y-figure-label");
      if (described) {
        svg.setAttribute("role", "img");
        svg.setAttribute("aria-label", described);
        svg.setAttribute("data-a11y-svg", "labelled");
        continue;
      }

      var inherited = svg.parentElement ? svg.parentElement.closest("[data-a11y-svg-label]") : null;
      if (inherited) {
        svg.setAttribute("role", "img");
        svg.setAttribute("aria-label", inherited.getAttribute("data-a11y-svg-label"));
        svg.setAttribute("data-a11y-svg", "labelled");
        continue;
      }

      var areaOnly = areaFigureName(svg);
      if (areaOnly) {
        svg.setAttribute("role", "img");
        svg.setAttribute("aria-label", areaOnly);
        svg.setAttribute("data-a11y-svg", "labelled");
        continue;
      }

      if (isSmallIcon(svg) && !svg.closest("button, a")) {
        svg.setAttribute("aria-hidden", "true");
        svg.setAttribute("data-a11y-svg", "icon");
        continue;
      }
    }
  }

  function start() {
    decorate();
    if (typeof MutationObserver !== "function") return;

    var scheduled = false;
    var run = function () {
      scheduled = false;
      decorate();
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
