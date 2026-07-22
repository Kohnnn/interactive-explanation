(() => {
  const KEY_STEP = 0.05;
  const Y_DRAG_ONLY = new Set(["hero_movement", "gears_base2", "gears_base3"]);

  function humanizeId(value) {
    return String(value || "")
      .replace(/_sl\d+$/, "")
      .replace(/_seg\d+$/, "")
      .replace(/[_-]+/g, " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  function controlLabel(element, fallback) {
    const host = element.closest("[id]");
    return host?.id ? humanizeId(host.id) : fallback;
  }

  function drawerUsesVerticalDrag(canvas) {
    const id = canvas.closest(".drawer_container")?.id || "";
    return Y_DRAG_ONLY.has(id) || id.startsWith("gear_train");
  }

  function sliderLabel(knob) {
    const host = knob.closest("[id]");
    if (!host?.id) return "Watch demonstration control";
    const match = host.id.match(/_sl(\d+)$/);
    const siblings = match
      ? document.querySelectorAll(`[id^="${CSS.escape(host.id.slice(0, match.index))}_sl"]`).length
      : 1;
    const position = match && siblings > 1 ? ` ${Number(match[1]) + 1} of ${siblings}` : "";
    return `${humanizeId(host.id)} control${position}`;
  }

  function dispatchMouse(target, type, clientX, clientY, buttons = 0) {
    target.dispatchEvent(new MouseEvent(type, {
      bubbles: true,
      cancelable: true,
      clientX,
      clientY,
      buttons,
    }));
  }

  function enhanceCanvas(canvas) {
    if (canvas.dataset.keyboardEnhanced === "true") return;
    canvas.dataset.keyboardEnhanced = "true";
    const verticalOnly = drawerUsesVerticalDrag(canvas);
    canvas.tabIndex = 0;
    canvas.setAttribute("aria-keyshortcuts", verticalOnly ? "ArrowUp ArrowDown Escape" : "ArrowLeft ArrowRight ArrowUp ArrowDown Escape");
    canvas.setAttribute("aria-label", `${controlLabel(canvas, "Mechanical watch model")}. Use ${verticalOnly ? "up and down" : "arrow"} keys to rotate the view.`);
    canvas.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        const rect = canvas.getBoundingClientRect();
        dispatchMouse(window, "mouseup", rect.left + rect.width / 2, rect.top + rect.height / 2);
        return;
      }
      const deltas = verticalOnly
        ? { ArrowUp: [0, -24], ArrowDown: [0, 24] }
        : {
          ArrowLeft: [-24, 0],
          ArrowRight: [24, 0],
          ArrowUp: [0, -24],
          ArrowDown: [0, 24],
        };
      const delta = deltas[event.key];
      if (!delta) return;
      event.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;
      dispatchMouse(canvas, "mousedown", x, y, 1);
      dispatchMouse(window, "mousemove", x + delta[0], y + delta[1], 1);
      dispatchMouse(window, "mouseup", x + delta[0], y + delta[1]);
    });
  }

  function sliderValue(knob) {
    return Math.max(0, Math.min(1, (parseFloat(knob.parentElement?.style.left) || 0) / 100));
  }

  function syncSlider(knob) {
    knob.setAttribute("aria-valuenow", String(Math.round(sliderValue(knob) * 100)));
  }

  function setSliderValue(knob, value) {
    const container = knob.closest(".slider_container");
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const knobRect = knob.getBoundingClientRect();
    const startX = knobRect.left + knobRect.width / 2;
    const startY = knobRect.top + knobRect.height / 2;
    const nextValue = Math.max(0, Math.min(1, value));
    const targetX = rect.left + nextValue * rect.width;
    const previousLeft = knob.parentElement.style.left;
    const gutter = container.querySelector(nextValue < sliderValue(knob) ? ".slider_left_gutter" : ".slider_right_gutter");
    if (gutter) dispatchMouse(gutter, "click", targetX, startY);
    if (knob.parentElement.style.left === previousLeft) {
      dispatchMouse(knob, "mousedown", startX, startY, 1);
      dispatchMouse(window, "mousemove", targetX, startY, 1);
      dispatchMouse(window, "mouseup", targetX, startY);
    }
    syncSlider(knob);
  }

  function enhanceSlider(knob) {
    if (knob.dataset.keyboardEnhanced === "true") return;
    knob.dataset.keyboardEnhanced = "true";
    knob.tabIndex = 0;
    knob.setAttribute("role", "slider");
    knob.setAttribute("aria-label", sliderLabel(knob));
    knob.setAttribute("aria-valuemin", "0");
    knob.setAttribute("aria-valuemax", "100");
    knob.setAttribute("aria-orientation", "horizontal");
    knob.setAttribute("aria-keyshortcuts", "ArrowLeft ArrowRight Home End");
    syncSlider(knob);
    knob.addEventListener("keydown", (event) => {
      const current = sliderValue(knob);
      const values = {
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
    new MutationObserver(() => syncSlider(knob)).observe(knob.parentElement, {
      attributes: true,
      attributeFilter: ["style"],
    });
  }

  function syncSegments(container) {
    const segments = Array.from(container.children);
    segments.forEach((segment) => {
      const selected = segment.classList.contains("segmented_control_on");
      segment.setAttribute("aria-checked", selected ? "true" : "false");
      segment.tabIndex = selected ? 0 : -1;
    });
  }

  function selectSegment(container, index) {
    const segment = container.children[index];
    if (!segment) return;
    const rect = segment.getBoundingClientRect();
    dispatchMouse(segment, "click", rect.left + rect.width / 2, rect.top + rect.height / 2);
    syncSegments(container);
    segment.focus();
  }

  function enhanceSegments(container) {
    if (container.dataset.keyboardEnhanced === "true") return;
    container.dataset.keyboardEnhanced = "true";
    container.setAttribute("role", "radiogroup");
    container.setAttribute("aria-label", `${controlLabel(container, "Watch demonstration")} options`);
    Array.from(container.children).forEach((segment) => {
      segment.setAttribute("role", "radio");
      segment.addEventListener("keydown", (event) => {
        const segments = Array.from(container.children);
        const current = segments.indexOf(segment);
        let next = current;
        if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = (current - 1 + segments.length) % segments.length;
        if (event.key === "ArrowRight" || event.key === "ArrowDown") next = (current + 1) % segments.length;
        if (event.key === "Home") next = 0;
        if (event.key === "End") next = segments.length - 1;
        if (next === current && !["Home", "End"].includes(event.key)) return;
        event.preventDefault();
        selectSegment(container, next);
      });
    });
    syncSegments(container);
    new MutationObserver(() => syncSegments(container)).observe(container, {
      subtree: true,
      attributes: true,
      attributeFilter: ["class"],
    });
  }

  function syncPlayButton(button) {
    const playing = button.classList.contains("playing");
    button.setAttribute("aria-pressed", playing ? "true" : "false");
    button.setAttribute("aria-label", playing ? "Pause animation" : "Play animation");
  }

  function enhanceButton(button) {
    if (button.dataset.keyboardEnhanced === "true") return;
    button.dataset.keyboardEnhanced = "true";
    button.tabIndex = 0;
    button.setAttribute("role", "button");
    if (button.classList.contains("play_pause_button")) {
      syncPlayButton(button);
      new MutationObserver(() => syncPlayButton(button)).observe(button, {
        attributes: true,
        attributeFilter: ["class"],
      });
    } else if (button.classList.contains("restart_button")) {
      button.setAttribute("aria-label", "Restart animation");
    } else {
      button.setAttribute("aria-label", "Undo last change");
    }
    button.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      button.click();
    });
  }

  function pauseAutomaticMotion() {
    if (typeof window.global_animate === "function") window.global_animate(false);
    document.querySelectorAll(".drawer_container").forEach((container) => {
      if (typeof container.drawer?.set_paused === "function") container.drawer.set_paused(true);
    });
    document.body.dataset.watchReducedMotion = "paused";
  }

  function init() {
    document.querySelectorAll(".drawer_container canvas").forEach(enhanceCanvas);
    document.querySelectorAll(".slider_knob").forEach(enhanceSlider);
    document.querySelectorAll(".segmented_control_container").forEach(enhanceSegments);
    document.querySelectorAll(".play_pause_button, .restart_button, .undo_button").forEach(enhanceButton);
    document.body.dataset.watchAccessibility = "ready";

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reducedMotion.matches) {
      pauseAutomaticMotion();
      requestAnimationFrame(pauseAutomaticMotion);
    }
    reducedMotion.addEventListener?.("change", (event) => {
      if (event.matches) pauseAutomaticMotion();
    });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
