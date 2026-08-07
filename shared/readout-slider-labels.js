(function () {
  "use strict";

  var READOUT = "p, h1, h2, h3, h4, h5, h6, label, span, div";

  function visibleText(el) {
    if (!el) return "";
    var copy = el.cloneNode(true);
    var noise = copy.querySelectorAll("annotation, .katex-html, [aria-hidden='true'], script, style");
    for (var i = 0; i < noise.length; i++) {
      if (noise[i].parentNode) noise[i].parentNode.removeChild(noise[i]);
    }
    return copy.textContent || "";
  }

  function cleanName(raw) {
    var text = (raw || "").replace(/\s+/g, " ").trim();
    if (!text) return "";
    if (/[.!?]\s+\S/.test(text)) return "";
    var colon = text.lastIndexOf(":");
    if (colon > 0 && /[0-9]/.test(text.slice(colon + 1))) {
      text = text.slice(0, colon).trim();
    }
    text = text.replace(/[\s:=]*[-+]?[0-9][0-9.,]*\s*%?\s*$/, "").trim();
    text = text.replace(/[:=]\s*$/, "").trim();
    text = text.replace(/\\[a-zA-Z]+\{[^}]*\}/g, "").trim();
    text = text.replace(/\(\s*\)/g, "").trim();
    if (text.length > 60) return "";
    return text;
  }

  function readoutFor(control) {
    var sib = control.previousElementSibling;
    while (sib) {
      if (sib.matches && sib.matches(READOUT)) {
        var name = cleanName(visibleText(sib));
        if (name) return name;
      }
      sib = sib.previousElementSibling;
    }
    var parent = control.parentElement;
    if (parent) {
      var candidates = parent.querySelectorAll(READOUT);
      for (var i = 0; i < candidates.length; i++) {
        if (candidates[i].contains(control)) continue;
        var text = cleanName(visibleText(candidates[i]));
        if (text) return text;
      }
      var own = "";
      for (var j = 0; j < parent.childNodes.length; j++) {
        var node = parent.childNodes[j];
        if (node.nodeType === 3) own += node.nodeValue;
      }
      var bare = cleanName(own);
      if (bare) return bare;
    }
    var after = control.nextElementSibling;
    while (after) {
      if (after.matches && after.matches("label, p, h1, h2, h3, h4, h5, h6")) {
        var trailing = cleanName(visibleText(after));
        if (trailing) return trailing;
      }
      after = after.nextElementSibling;
    }
    var host = control.parentElement;
    for (var k = 0; k < 3 && host; k++) {
      var orphan = host.parentElement ? host.parentElement.querySelector("label") : null;
      if (orphan && !orphan.contains(control)) {
        var forId = orphan.getAttribute("for");
        if (!forId || !document.getElementById(forId)) {
          var borrowed = cleanName(visibleText(orphan));
          if (borrowed) return borrowed;
        }
      }
      host = host.parentElement;
    }
    return "";
  }

  function alreadyNamed(control) {
    if ((control.getAttribute("aria-label") || "").trim()) return true;
    if ((control.getAttribute("aria-labelledby") || "").trim()) return true;
    if ((control.getAttribute("title") || "").trim()) return true;
    if (control.id) {
      var explicit = document.querySelector('label[for="' + CSS.escape(control.id) + '"]');
      if (explicit && document.querySelectorAll("#" + CSS.escape(control.id)).length === 1) {
        if (explicit.textContent.trim()) return true;
      }
    }
    var wrapping = control.closest("label");
    if (wrapping && wrapping.textContent.trim()) return true;
    return false;
  }

  function label() {
    var controls = document.querySelectorAll(
      "input[type='range'], input[type='number'], input.input-number, input[type='text'], select, textarea"
    );
    var applied = [];
    for (var i = 0; i < controls.length; i++) {
      var control = controls[i];
      if (alreadyNamed(control)) continue;
      var name = readoutFor(control);
      if (!name) continue;
      control.setAttribute("aria-label", name);
      applied.push(control);
    }
    disambiguate(applied);
  }

  function disambiguate(controls) {
    var byName = {};
    for (var i = 0; i < controls.length; i++) {
      var key = controls[i].getAttribute("aria-label") || "";
      (byName[key] = byName[key] || []).push(controls[i]);
    }
    Object.keys(byName).forEach(function (key) {
      var group = byName[key];
      if (group.length < 2) return;

      var kinds = group.map(function (el) {
        return el.type === "range" ? "slider" : "value";
      });
      var mixed = kinds.some(function (k) {
        return k !== kinds[0];
      });
      if (mixed) {
        for (var j = 0; j < group.length; j++) {
          group[j].setAttribute("aria-label", key + " " + kinds[j]);
        }
        return;
      }

      for (var k = 0; k < group.length; k++) {
        group[k].setAttribute("aria-label", key + " (chart " + (k + 1) + ")");
      }
    });
  }

  function start() {
    label();
    if (typeof MutationObserver !== "function") return;

    var scheduled = false;
    var run = function () {
      scheduled = false;
      label();
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

