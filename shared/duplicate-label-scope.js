(function () {
  "use strict";

  var counter = 0;

  function duplicatedIds() {
    var seen = Object.create(null);
    var dupes = [];
    var all = document.querySelectorAll("[id]");
    for (var i = 0; i < all.length; i++) {
      var id = all[i].id;
      if (!id) continue;
      if (seen[id]) {
        if (seen[id] === 1) dupes.push(id);
        seen[id]++;
      } else {
        seen[id] = 1;
      }
    }
    return dupes;
  }

  function elementsWithId(id) {
    var out = [];
    var all = document.querySelectorAll("[id]");
    for (var i = 0; i < all.length; i++) {
      if (all[i].id === id) out.push(all[i]);
    }
    return out;
  }

  function labelsFor(id) {
    try {
      return Array.prototype.slice.call(document.querySelectorAll('label[for="' + CSS.escape(id) + '"]'));
    } catch (err) {
      return [];
    }
  }

  function ownerFor(label, id) {
    var scope = label.parentElement;
    for (var depth = 0; depth < 4 && scope; depth++) {
      var found = [];
      var candidates = scope.querySelectorAll("[id]");
      for (var i = 0; i < candidates.length; i++) {
        if (candidates[i].id === id) found.push(candidates[i]);
      }
      if (found.length === 1) return found[0];
      if (found.length > 1) return null;
      scope = scope.parentElement;
    }
    return null;
  }

  function uniqueId(base) {
    var next;
    do {
      counter++;
      next = base + "-a11y" + counter;
    } while (document.getElementById(next));
    return next;
  }

  function rescope() {
    var dupes = duplicatedIds();
    for (var d = 0; d < dupes.length; d++) {
      var id = dupes[d];
      var labels = labelsFor(id);
      if (labels.length < 2) continue;

      var first = elementsWithId(id)[0];
      for (var i = 0; i < labels.length; i++) {
        var label = labels[i];
        var owner = ownerFor(label, id);
        if (!owner || owner === first) continue;
        if (label.getAttribute("data-a11y-scoped") === id) continue;
        var fresh = uniqueId(id);
        owner.id = fresh;
        label.setAttribute("for", fresh);
        label.setAttribute("data-a11y-scoped", id);
      }
    }
  }

  function start() {
    rescope();
    if (typeof MutationObserver !== "function") return;

    var scheduled = false;
    var run = function () {
      scheduled = false;
      rescope();
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
    }).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ["id", "for"] });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
