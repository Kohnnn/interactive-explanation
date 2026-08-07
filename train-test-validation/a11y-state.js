(function () {
  "use strict";

  var SELECTOR = "button.button";

  function sync() {
    var buttons = document.querySelectorAll(SELECTOR);
    for (var i = 0; i < buttons.length; i++) {
      var btn = buttons[i];
      var pressed = btn.classList.contains("active") ? "true" : "false";
      if (btn.getAttribute("aria-pressed") !== pressed) {
        btn.setAttribute("aria-pressed", pressed);
      }
    }
  }

  function start() {
    sync();
    if (typeof MutationObserver !== "function") return;

    var scheduled = false;
    var run = function () {
      scheduled = false;
      sync();
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
    }).observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
      childList: true,
      subtree: true,
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();

