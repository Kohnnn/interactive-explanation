(function () {
  "use strict";

  var ICON_NAMES = {
    "icon-play": "Play",
    "icon-record": "Record",
    "icon-stop": "Stop",
    "icon-pause": "Pause",
  };

  function widgetIndex(el) {
    var widget = el.closest ? el.closest(".widget") : null;
    if (!widget) return 0;
    var all = document.querySelectorAll(".widget");
    for (var i = 0; i < all.length; i++) {
      if (all[i] === widget) return i + 1;
    }
    return 0;
  }

  function suffix(el) {
    var total = document.querySelectorAll(".widget").length;
    if (total < 2) return "";
    var index = widgetIndex(el);
    return index ? " (player " + index + ")" : "";
  }

  function labelTransport(root) {
    var buttons = root.querySelectorAll(".widget__transport-btn");
    for (var i = 0; i < buttons.length; i++) {
      var button = buttons[i];
      if ((button.getAttribute("aria-label") || "").trim()) continue;
      if ((button.textContent || "").trim()) continue;
      var icon = button.querySelector("i[class^='icon-']");
      if (!icon) continue;
      var name = ICON_NAMES[icon.className];
      if (name) button.setAttribute("aria-label", name + suffix(button));
    }
  }

  function labelRanges(root) {
    var ranges = root.querySelectorAll("input.range, input[type='range']");
    for (var i = 0; i < ranges.length; i++) {
      var range = ranges[i];
      if ((range.getAttribute("aria-label") || "").trim()) continue;
      if (range.closest("label")) continue;
      if (range.id && document.querySelector('label[for="' + range.id + '"]')) continue;
      var ribbon = range.closest(".ribbon");
      var text = ribbon ? (ribbon.textContent || "").trim() : "";
      var base = /tempo/i.test(text) ? "Tempo in beats per minute" : "";
      if (!base && range.min === "30" && range.max === "240") base = "Tempo in beats per minute";
      if (base) range.setAttribute("aria-label", base + suffix(range));
    }
  }

  function label(root) {
    var scope = root && root.querySelectorAll ? root : document;
    labelTransport(scope);
    labelRanges(scope);
  }

  var PRESSED_RULES = [
    { selector: ".widget__choice", on: "widget__choice--selected" },
    { selector: ".widget__keyboard-button", on: "widget__keyboard-button--on" },
    { selector: ".widget__transport-btn", on: "widget-button--recording", iconOnly: "icon-record" },
  ];

  function syncPressed() {
    for (var r = 0; r < PRESSED_RULES.length; r++) {
      var rule = PRESSED_RULES[r];
      var nodes = document.querySelectorAll(rule.selector);
      for (var i = 0; i < nodes.length; i++) {
        var node = nodes[i];
        if (rule.iconOnly && !node.querySelector("i." + rule.iconOnly)) continue;
        var pressed = node.classList.contains(rule.on) ? "true" : "false";
        if (node.getAttribute("aria-pressed") !== pressed) {
          node.setAttribute("aria-pressed", pressed);
        }
      }
    }
  }

  function start() {
    label(document);
    syncPressed();
    if (typeof MutationObserver !== "function" || !document.body) return;

    var scheduled = false;
    var run = function () {
      scheduled = false;
      label(document);
      syncPressed();
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
    }).observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class"],
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();

