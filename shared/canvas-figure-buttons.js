(function () {
  "use strict";

  var KEY_STEP = 0.05;
  var TYPES = [
    { cls: "play_pause_button", name: "Play/pause animation", toggle: true },
    { cls: "restart_button", name: "Restart animation", toggle: false },
    { cls: "undo_button", name: "Undo", toggle: false },
  ];
  var Y_DRAG_ONLY = new Set(["hero_movement", "gears_base2", "gears_base3"]);
  var canvasTargets = new WeakMap();

  function markCanvasTarget(target) {
    if (!target || !target.closest) return;
    var container = target.closest(".canvas_container, .drawer_container");
    if (!container) return;
    var canvas = target instanceof HTMLCanvasElement ? target : container.querySelector("canvas");
    if (!canvas) return;
    canvasTargets.set(canvas, target);
    canvas.dataset.a11yDrag = "1";
    if (target.dataset) target.dataset.a11yDragTarget = "1";
  }

  function wrapInputConstructor(name) {
    var Native = window[name];
    if (typeof Native !== "function" || Native.a11yWrapped) return true;
    function Wrapped(target) {
      markCanvasTarget(target);
      return Native.apply(this, arguments);
    }
    Wrapped.prototype = Native.prototype;
    Wrapped.a11yWrapped = true;
    window[name] = Wrapped;
    return true;
  }

  function wrapWhenDefined(name) {
    if (wrapInputConstructor(name) && window[name]) return;
    var pending;
    Object.defineProperty(window, name, {
      configurable: true,
      get: function () {
        return pending;
      },
      set: function (value) {
        if (typeof value !== "function" || value.a11yWrapped) {
          pending = value;
          return;
        }
        function Wrapped(target) {
          markCanvasTarget(target);
          return value.apply(this, arguments);
        }
        Wrapped.prototype = value.prototype;
        Wrapped.a11yWrapped = true;
        pending = Wrapped;
      },
    });
  }

  wrapWhenDefined("TouchHandler");
  wrapWhenDefined("Dragger");

  var nativeCanvasAddEventListener = HTMLCanvasElement.prototype.addEventListener;
  HTMLCanvasElement.prototype.addEventListener = function (type) {
    if (type === "click") this.dataset.a11yClick = "1";
    if (type === "mousedown" || type === "touchstart" || type === "pointerdown") markCanvasTarget(this);
    return nativeCanvasAddEventListener.apply(this, arguments);
  };

  ["onmousedown", "onpointerdown", "ontouchstart"].forEach(function (prop) {
    var descriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, prop);
    if (!descriptor || !descriptor.set) return;
    Object.defineProperty(HTMLCanvasElement.prototype, prop, {
      configurable: true,
      enumerable: descriptor.enumerable,
      get: function () {
        return descriptor.get.call(this);
      },
      set: function (value) {
        if (typeof value === "function") markCanvasTarget(this);
        return descriptor.set.call(this, value);
      },
    });
  });

  function humanize(value) {
    return String(value || "")
      .replace(/_sl\d+$/, "")
      .replace(/_seg\d+$/, "")
      .replace(/[_-]+/g, " ")
      .replace(/\b\w/g, function (letter) {
        return letter.toUpperCase();
      });
  }

  function hostId(el) {
    var host = el.closest ? el.closest("[id]") : null;
    return host ? host.id : "";
  }

  function dispatchMouse(target, type, clientX, clientY, buttons) {
    target.dispatchEvent(new MouseEvent(type, {
      bubbles: true,
      cancelable: true,
      clientX: clientX,
      clientY: clientY,
      buttons: buttons || 0,
    }));
  }

  function verticalCanvas(canvas) {
    var id = hostId(canvas);
    return Y_DRAG_ONLY.has(id) || id.indexOf("gear_train") === 0;
  }

  function enhanceCanvas(canvas) {
    if (canvas.dataset.a11yCanvas === "interactive") return;
    var label = humanize(hostId(canvas)) || "Interactive diagram";
    var dragTarget = canvasTargets.get(canvas);
    var clickable = typeof canvas.onclick === "function" || canvas.dataset.a11yClick === "1";
    if (!dragTarget && !clickable) {
      if (canvas.dataset.a11yCanvas === "static") return;
      canvas.dataset.a11yCanvas = "static";
      canvas.setAttribute("role", "img");
      canvas.setAttribute("aria-label", label);
      return;
    }
    canvas.dataset.a11yCanvas = "interactive";
    canvas.tabIndex = 0;
    if (clickable && !dragTarget) {
      canvas.setAttribute("role", "button");
      canvas.setAttribute("aria-label", label);
      canvas.addEventListener("keydown", function (event) {
        if (event.key !== "Enter" && event.key !== " " && event.key !== "Spacebar") return;
        event.preventDefault();
        var clickRect = canvas.getBoundingClientRect();
        dispatchMouse(canvas, "click", clickRect.left + clickRect.width / 2, clickRect.top + clickRect.height / 2);
      });
      return;
    }
    canvas.removeAttribute("role");
    var vertical = verticalCanvas(canvas);
    canvas.setAttribute("aria-label", label + ". Use " + (vertical ? "up and down" : "arrow") + " keys to rotate the view.");
    canvas.setAttribute("aria-keyshortcuts", vertical ? "ArrowUp ArrowDown Escape" : "ArrowLeft ArrowRight ArrowUp ArrowDown Escape");
    canvas.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        var escapeRect = canvas.getBoundingClientRect();
        dispatchMouse(window, "mouseup", escapeRect.left + escapeRect.width / 2, escapeRect.top + escapeRect.height / 2);
        return;
      }
      var deltas = vertical
        ? { ArrowUp: [0, -24], ArrowDown: [0, 24] }
        : {
            ArrowLeft: [-24, 0],
            ArrowRight: [24, 0],
            ArrowUp: [0, -24],
            ArrowDown: [0, 24],
          };
      var delta = deltas[event.key];
      if (!delta) return;
      event.preventDefault();
      var rect = canvas.getBoundingClientRect();
      var x = rect.left + rect.width / 2;
      var y = rect.top + rect.height / 2;
      dispatchMouse(dragTarget, "mousedown", x, y, 1);
      dispatchMouse(window, "mousemove", x + delta[0], y + delta[1], 1);
      dispatchMouse(window, "mouseup", x + delta[0], y + delta[1]);
    });
  }

  function sliderValue(knob) {
    return Math.max(0, Math.min(1, (parseFloat(knob.parentElement.style.left) || 0) / 100));
  }

  function syncSlider(knob) {
    var value = Math.round(sliderValue(knob) * 100);
    knob.setAttribute("aria-valuenow", String(value));
    knob.setAttribute("aria-valuetext", value + "%");
  }

  function setSliderValue(knob, value) {
    var container = knob.closest(".slider_container");
    if (!container) return;
    var rect = container.getBoundingClientRect();
    var knobRect = knob.getBoundingClientRect();
    var startX = knobRect.left + knobRect.width / 2;
    var startY = knobRect.top + knobRect.height / 2;
    var next = Math.max(0, Math.min(1, value));
    var targetX = rect.left + next * rect.width;
    var previousLeft = knob.parentElement.style.left;
    var gutter = container.querySelector(next < sliderValue(knob) ? ".slider_left_gutter" : ".slider_right_gutter");
    if (gutter) dispatchMouse(gutter, "click", targetX, startY);
    if (knob.parentElement.style.left === previousLeft) {
      dispatchMouse(knob, "mousedown", startX, startY, 1);
      dispatchMouse(window, "mousemove", targetX, startY, 1);
      dispatchMouse(window, "mouseup", targetX, startY);
    }
    syncSlider(knob);
  }

  function sliderLabel(knob) {
    var id = hostId(knob);
    if (!id) return "Interactive diagram control";
    var match = id.match(/_sl(\d+)$/);
    var count = match
      ? document.querySelectorAll('[id^="' + CSS.escape(id.slice(0, match.index)) + '_sl"]').length
      : 1;
    var position = match && count > 1 ? " " + (Number(match[1]) + 1) + " of " + count : "";
    return humanize(id) + " control" + position;
  }

  function enhanceLegacySlider(knob) {
    var container = knob.closest(".slider_container");
    if (!container || container.getAttribute("role") === "slider" || knob.dataset.a11ySlider) return;
    knob.dataset.a11ySlider = "1";
    knob.tabIndex = 0;
    knob.setAttribute("role", "slider");
    knob.setAttribute("aria-label", sliderLabel(knob));
    knob.setAttribute("aria-valuemin", "0");
    knob.setAttribute("aria-valuemax", "100");
    knob.setAttribute("aria-orientation", "horizontal");
    knob.setAttribute("aria-keyshortcuts", "ArrowLeft ArrowRight Home End");
    syncSlider(knob);
    knob.addEventListener("keydown", function (event) {
      var current = sliderValue(knob);
      var values = {
        ArrowLeft: current - KEY_STEP,
        ArrowDown: current - KEY_STEP,
        ArrowRight: current + KEY_STEP,
        ArrowUp: current + KEY_STEP,
        Home: 0,
        End: 1,
      };
      if (!(event.key in values)) return;
      event.preventDefault();
      setSliderValue(knob, values[event.key]);
    });
    new MutationObserver(function () {
      syncSlider(knob);
    }).observe(knob.parentElement, {
      attributes: true,
      attributeFilter: ["style"],
    });
  }

  function syncSegments(container) {
    var segments = Array.from(container.children);
    segments.forEach(function (segment) {
      var selected = segment.classList.contains("segmented_control_on");
      segment.setAttribute("aria-checked", selected ? "true" : "false");
      segment.tabIndex = selected ? 0 : -1;
    });
  }

  function selectSegment(container, index) {
    var segment = container.children[index];
    if (!segment) return;
    var rect = segment.getBoundingClientRect();
    dispatchMouse(segment, "click", rect.left + rect.width / 2, rect.top + rect.height / 2);
    syncSegments(container);
    segment.focus();
  }

  function enhanceLegacySegments(container) {
    if (container.getAttribute("role") === "radiogroup" || container.dataset.a11ySegments) return;
    container.dataset.a11ySegments = "1";
    container.setAttribute("role", "radiogroup");
    container.setAttribute("aria-label", (humanize(hostId(container)) || "Interactive diagram") + " options");
    Array.from(container.children).forEach(function (segment, index) {
      segment.setAttribute("role", "radio");
      if (!(segment.textContent || "").trim()) segment.setAttribute("aria-label", "Option " + (index + 1));
      segment.addEventListener("keydown", function (event) {
        var segments = Array.from(container.children);
        var current = segments.indexOf(segment);
        var next = current;
        if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = (current - 1 + segments.length) % segments.length;
        else if (event.key === "ArrowRight" || event.key === "ArrowDown") next = (current + 1) % segments.length;
        else if (event.key === "Home") next = 0;
        else if (event.key === "End") next = segments.length - 1;
        else return;
        event.preventDefault();
        selectSegment(container, next);
      });
    });
    syncSegments(container);
    new MutationObserver(function () {
      syncSegments(container);
    }).observe(container, {
      subtree: true,
      attributes: true,
      attributeFilter: ["class"],
    });
  }

  function typeFor(el) {
    for (var i = 0; i < TYPES.length; i++) {
      if (el.classList.contains(TYPES[i].cls)) return TYPES[i];
    }
    return null;
  }

  function figureIndex(el) {
    var wrapper = el.closest ? el.closest(".canvas_container") : null;
    if (!wrapper) return 0;
    var all = document.querySelectorAll(".canvas_container");
    for (var i = 0; i < all.length; i++) {
      if (all[i] === wrapper) return i + 1;
    }
    return 0;
  }

  function enhanceButton(el) {
    var type = typeFor(el);
    if (!type) return;
    if (!el.hasAttribute("role")) el.setAttribute("role", "button");
    if (!el.hasAttribute("tabindex")) el.tabIndex = 0;
    if (!(el.getAttribute("aria-label") || "").trim()) {
      var index = figureIndex(el);
      el.setAttribute("aria-label", index ? type.name + " (figure " + index + ")" : type.name);
    }
    if (type.toggle && !el.hasAttribute("aria-pressed")) {
      el.setAttribute("aria-pressed", el.classList.contains("playing") ? "true" : "false");
    }
    if (!el.dataset.a11yKeys) {
      el.dataset.a11yKeys = "1";
      el.addEventListener("keydown", function (event) {
        if (event.key !== "Enter" && event.key !== " " && event.key !== "Spacebar") return;
        event.preventDefault();
        el.click();
      });
    }
  }

  function syncPressed() {
    var nodes = document.querySelectorAll(".play_pause_button");
    for (var i = 0; i < nodes.length; i++) {
      var want = nodes[i].classList.contains("playing") ? "true" : "false";
      if (nodes[i].getAttribute("aria-pressed") !== want) nodes[i].setAttribute("aria-pressed", want);
    }
  }

  function enhanceGlobalAnimationToggle() {
    var button = document.getElementById("global-animation-toggle");
    if (!button || button.dataset.a11yToggle) return;
    button.dataset.a11yToggle = "1";
    button.addEventListener("click", function () {
      var paused = button.getAttribute("aria-pressed") !== "true";
      if (typeof window.global_animate === "function") window.global_animate(!paused);
      button.setAttribute("aria-pressed", paused ? "true" : "false");
    });
    var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reducedMotion.matches && typeof window.global_animate === "function") {
      window.global_animate(false);
      button.setAttribute("aria-pressed", "true");
    }
    if (reducedMotion.addEventListener) {
      reducedMotion.addEventListener("change", function (event) {
        if (!event.matches || typeof window.global_animate !== "function") return;
        window.global_animate(false);
        button.setAttribute("aria-pressed", "true");
      });
    }
  }

  function upgradeAll() {
    document.querySelectorAll(".canvas_container canvas").forEach(enhanceCanvas);
    document.querySelectorAll(".slider_knob").forEach(enhanceLegacySlider);
    document.querySelectorAll(".segmented_control_container").forEach(enhanceLegacySegments);
    document.querySelectorAll(".play_pause_button, .restart_button, .undo_button").forEach(enhanceButton);
  }

  function start() {
    upgradeAll();
    enhanceGlobalAnimationToggle();
    window.addEventListener("load", upgradeAll);
    [0, 250, 1000, 3000].forEach(function (delay) {
      window.setTimeout(upgradeAll, delay);
    });
    var queued = false;
    var observer = new MutationObserver(function () {
      if (queued) return;
      queued = true;
      requestAnimationFrame(function () {
        queued = false;
        upgradeAll();
        syncPressed();
      });
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class"],
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
