(function () {
  "use strict";

  var SELECTOR = "button.button";

  function sync() {
    var controls = document.querySelector(".button-container");
    if (controls) {
      controls.inert = controls.style.opacity !== "1";
    }
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

    new MutationObserver(function (records) {
      if (!records.some(function (record) {
        return record.attributeName !== "style" || record.target.matches(".button-container");
      })) return;
      if (scheduled) return;
      scheduled = true;
      schedule();
    }).observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "style"],
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

