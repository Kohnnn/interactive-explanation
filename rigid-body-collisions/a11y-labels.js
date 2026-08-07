(function () {
  "use strict";

  var PLAY_PATH = "M4.5 5.653";

  var SLIDER_NAMES = [
    { min: "0", max: "15", name: "Progress time in the collision simulation" },
    { min: "-1.5", max: "1.5", name: "Move the point along the surface" },
    { min: "-1.0470975511965976", max: "5.235987755982989", name: "Rotate the vector angle" },
  ];

  function iconPath(button) {
    var path = button.querySelector("svg path");
    return path ? path.getAttribute("d") || "" : "";
  }

  function isTransport(button) {
    return !!button.querySelector("svg") && !(button.textContent || "").trim();
  }

  function labelButtons() {
    var buttons = document.querySelectorAll("button");
    var seen = { Play: 0, Reset: 0 };
    var transport = [];
    for (var i = 0; i < buttons.length; i++) {
      if (isTransport(buttons[i])) transport.push(buttons[i]);
    }
    var counts = { Play: 0, Reset: 0 };
    for (var j = 0; j < transport.length; j++) {
      counts[iconPath(transport[j]).indexOf(PLAY_PATH) === 0 ? "Play" : "Reset"]++;
    }
    for (var k = 0; k < transport.length; k++) {
      var button = transport[k];
      var kind = iconPath(button).indexOf(PLAY_PATH) === 0 ? "Play" : "Reset";
      seen[kind]++;
      if ((button.getAttribute("aria-label") || "").trim()) continue;
      var base = kind === "Play" ? "Play the simulation" : "Reset the simulation";
      var name = counts[kind] > 1 ? base + " (demo " + seen[kind] + ")" : base;
      button.setAttribute("aria-label", name);
    }
  }

  function labelSliders() {
    var sliders = document.querySelectorAll("input[type='range']");
    var used = {};
    for (var i = 0; i < sliders.length; i++) {
      var slider = sliders[i];
      if ((slider.getAttribute("aria-label") || "").trim()) continue;
      if (slider.closest("label")) continue;
      for (var j = 0; j < SLIDER_NAMES.length; j++) {
        var entry = SLIDER_NAMES[j];
        if (slider.min !== entry.min || slider.max !== entry.max) continue;
        used[entry.name] = (used[entry.name] || 0) + 1;
        var total = 0;
        for (var k = 0; k < sliders.length; k++) {
          if (sliders[k].min === entry.min && sliders[k].max === entry.max) total++;
        }
        slider.setAttribute(
          "aria-label",
          total > 1 ? entry.name + " (demo " + used[entry.name] + ")" : entry.name
        );
        break;
      }
    }
  }

  function labelBackLink() {
    var links = document.querySelectorAll("a[href='../']");
    for (var i = 0; i < links.length; i++) {
      var link = links[i];
      if ((link.getAttribute("aria-label") || "").trim()) continue;
      if ((link.textContent || "").trim()) continue;
      if (!link.querySelector("svg")) continue;
      link.setAttribute("aria-label", "Back to replicas");
    }
  }

  function label() {
    labelButtons();
    labelSliders();
    labelBackLink();
  }

  function start() {
    label();
    if (typeof MutationObserver !== "function") return;
    new MutationObserver(function () {
      label();
    }).observe(document.documentElement, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();

