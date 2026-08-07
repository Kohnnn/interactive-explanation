(function () {
  "use strict";

  var STEPPER_UNITS = {
    ev_st: "note range",
    tempo: "tempo",
    TLC_dur: "duration",
    TLC_exe: "exercise length",
    TLC_ans: "answer time",
  };

  var STEPPER_KINDS = [
    { suffix: "menosmenos", verb: "Decrease", amount: " by a large step" },
    { suffix: "masmas", verb: "Increase", amount: " by a large step" },
    { suffix: "menos", verb: "Decrease", amount: "" },
    { suffix: "mas", verb: "Increase", amount: "" },
    { suffix: "l2", verb: "Decrease", amount: " by a large step" },
    { suffix: "m2", verb: "Increase", amount: " by a large step" },
    { suffix: "l", verb: "Decrease", amount: "" },
    { suffix: "m", verb: "Increase", amount: "" },
  ];

  var NOTE_LETTERS = { c: "C", d: "D", e: "E", f: "F", g: "G", a: "A", b: "B" };

  function stepperName(id) {
    var lower = id.toLowerCase();
    for (var unit in STEPPER_UNITS) {
      if (!Object.prototype.hasOwnProperty.call(STEPPER_UNITS, unit)) continue;
      if (lower.indexOf(unit.toLowerCase()) !== 0) continue;
      var rest = lower.slice(unit.length).replace(/^[_-]*(ctrl)?/, "");
      for (var i = 0; i < STEPPER_KINDS.length; i++) {
        var kind = STEPPER_KINDS[i];
        if (rest !== kind.suffix) continue;
        return kind.verb + " " + STEPPER_UNITS[unit] + kind.amount;
      }
    }
    return "";
  }

  function blackKeyName(id) {
    var match = id.match(/^mknp_ev_note([a-g])s$/);
    if (!match) return "";
    var letter = NOTE_LETTERS[match[1]];
    var order = ["C", "D", "E", "F", "G", "A", "B"];
    var next = order[(order.indexOf(letter) + 1) % order.length];
    return letter + " sharp, also known as " + next + " flat";
  }

  function accidentalCellName(id) {
    var match = id.match(/^mknp_ev_note([A-G])(x|bb|s|b)$/);
    if (!match) return "";
    var letter = match[1];
    var kinds = { x: " double sharp", bb: " double flat", s: " sharp", b: " flat" };
    return letter + kinds[match[2]];
  }

  function setName(el, name) {
    if (!el || !name) return;
    if ((el.getAttribute("aria-label") || "").trim()) return;
    if ((el.textContent || "").trim()) return;
    el.setAttribute("aria-label", name);
    if (!el.hasAttribute("role")) el.setAttribute("role", "button");
  }

  function labelSteppers(root) {
    var images = root.querySelectorAll("img[id]");
    for (var i = 0; i < images.length; i++) {
      var image = images[i];
      var name = stepperName(image.id);
      if (!name) continue;
      image.setAttribute("alt", name);
      if (!image.hasAttribute("role")) image.setAttribute("role", "button");
    }
  }

  function labelNotePicker(root) {
    var cells = root.querySelectorAll('[id^="mknp_ev_note"]');
    for (var i = 0; i < cells.length; i++) {
      var cell = cells[i];
      var name = blackKeyName(cell.id) || accidentalCellName(cell.id);
      if (!name) continue;
      setName(cell, name);
      var images = cell.querySelectorAll("img:not([alt])");
      for (var j = 0; j < images.length; j++) images[j].setAttribute("alt", "");
    }
  }

  function labelListen(root) {
    var buttons = root.querySelectorAll("#pp_play, button#pp_play");
    for (var i = 0; i < buttons.length; i++) {
      var button = buttons[i];
      if ((button.getAttribute("aria-label") || "").trim()) continue;
      if ((button.textContent || "").trim()) continue;
      button.setAttribute("aria-label", "Play the exercise again");
    }
  }

  function labelNoteSetSelector(root) {
    var block = root.querySelector("#mkkns_block");
    if (!block || (block.getAttribute("alt") || "").trim()) return;
    block.setAttribute("alt", "Notes to use: cycle between all notes, white keys only, and black keys only");
    if (!block.hasAttribute("role")) block.setAttribute("role", "button");
  }

  function decorateRemainingImages(root) {
    var images = root.querySelectorAll("img:not([alt])");
    for (var i = 0; i < images.length; i++) {
      var image = images[i];
      var holder = image.closest("button, a, [role='button']");
      if (holder && (holder.getAttribute("aria-label") || "").trim()) {
        image.setAttribute("alt", "");
      }
    }
  }

  function label(root) {
    if (!root || !root.querySelectorAll) return;
    labelSteppers(root);
    labelNotePicker(root);
    labelListen(root);
    labelNoteSetSelector(root);
    decorateRemainingImages(root);
  }

  function start() {
    label(document);
    if (typeof MutationObserver !== "function" || !document.body) return;
    var scheduled = false;
    new MutationObserver(function () {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(function () {
        scheduled = false;
        label(document);
      });
    }).observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
