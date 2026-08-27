(function () {
  "use strict";

  var CLEF_NAMES = {
    g: "Treble clef",
    g8: "Treble clef, transposed an octave down",
    f: "Bass clef",
    c1: "Soprano clef",
    c2: "Mezzo-soprano clef",
    c3: "Alto clef",
    c4: "Tenor clef",
    f3: "Baritone clef",
  };

  var NOTE_NAMES = {
    c: "C",
    d: "D",
    e: "E",
    f: "F",
    g: "G",
    a: "A",
    b: "B",
  };

  function keyName(suffix) {
    var letter = NOTE_NAMES[suffix.charAt(0)];
    if (!letter) return "";
    var accidental = suffix.slice(1);
    if (accidental === "s") return "Key of " + letter + " sharp";
    if (accidental === "b") return "Key of " + letter + " flat";
    if (accidental === "") return "Key of " + letter;
    return "";
  }

  function nameFor(id) {
    if (!id) return "";
    if (id.indexOf("mkcl_b") === 0) {
      return CLEF_NAMES[id.slice("mkcl_b".length)] || "";
    }
    if (id.indexOf("mkcl_s") === 0) {
      var selection = id.slice("mkcl_s".length);
      if (selection === "elected") return "";
      return CLEF_NAMES[selection] || "";
    }
    if (id.indexOf("mkks") === 0) {
      var suffix = id.slice("mkks".length);
      if (suffix === "major" || suffix === "minor") return "";
      return keyName(suffix);
    }
    return "";
  }

  function label(root) {
    if (!root || !root.querySelectorAll) return;
    var buttons = root.querySelectorAll("button[id^='mkcl_b'], button[id^='mkcl_s'], button[id^='mkks']");
    for (var i = 0; i < buttons.length; i++) {
      var button = buttons[i];
      if ((button.getAttribute("aria-label") || "").trim()) continue;
      if ((button.textContent || "").trim()) continue;
      var name = nameFor(button.id);
      if (name) button.setAttribute("aria-label", name);
    }
  }

  function syncPressed() {
    var toggles = document.querySelectorAll("#opts button:not(.btn-primary)");
    for (var i = 0; i < toggles.length; i++) {
      var toggle = toggles[i];
      var pressed = toggle.classList.contains("btn-success") ? "true" : "false";
      if (toggle.getAttribute("aria-pressed") !== pressed) {
        toggle.setAttribute("aria-pressed", pressed);
      }
    }
  }

  function start() {
    label(document);
    syncPressed();
    document.addEventListener("keydown", function (event) {
      var target = event.target;
      if (!target || target.id !== "pp_tellMe" || target.disabled || event.repeat) return;
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      setTimeout(function () {
        if (document.contains(target) && !target.disabled) target.click();
      }, 0);
    });
    if (typeof MutationObserver !== "function" || !document.body) return;

    var scheduled = false;
    var run = function () {
      scheduled = false;
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

    new MutationObserver(function (records) {
      for (var i = 0; i < records.length; i++) {
        var added = records[i].addedNodes;
        for (var j = 0; j < added.length; j++) {
          if (added[j].nodeType === 1) label(added[j].parentNode || added[j]);
        }
      }
      if (!scheduled) {
        scheduled = true;
        schedule();
      }
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

