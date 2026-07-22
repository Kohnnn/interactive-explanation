(() => {
  const SVG_NS = "http://www.w3.org/2000/svg";
  const { parts } = window.WATCH_EXPLORER;
  const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches || false;
  const state = {
    depth: 0.74,
    selectedId: "barrel-drum",
    playing: !reducedMotion,
    speed: 8,
  };

  function createSvg(tag, attrs = {}) {
    const node = document.createElementNS(SVG_NS, tag);
    Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, String(value)));
    return node;
  }

  function shade(hex, amount) {
    const raw = hex.replace("#", "");
    const mix = amount >= 0 ? 255 : 0;
    const blend = (start) => Math.max(0, Math.min(255, Math.round(start + (mix - start) * Math.abs(amount))));
    const r = blend(parseInt(raw.slice(0, 2), 16));
    const g = blend(parseInt(raw.slice(2, 4), 16));
    const b = blend(parseInt(raw.slice(4, 6), 16));
    return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
  }

  function fallbackPoint(part) {
    const explodedZ = part.explode[2] * state.depth;
    return {
      x: 380 + part.home[0] * 12 + part.explode[0] * state.depth * 5.5 + explodedZ * 1.4,
      y: 250 - part.home[1] * 11 - part.explode[1] * state.depth * 5.2 - part.home[2] * 2.2 - explodedZ * 2.4,
    };
  }

  function fallbackRadius(part) {
    if (part.id === "case" || part.id === "crystal" || part.id === "caseback") return 72;
    if (part.id === "dial" || part.id === "date-ring") return 55;
    if (part.system === "Structure") return 16;
    if (part.system === "Display") return 10;
    if (part.system === "Friction" || part.system === "Shock protection") return 7;
    return 11;
  }

  function buildDefs() {
    const defs = createSvg("defs");
    const shadow = createSvg("filter", { id: "watch-fallback-depth", x: "-50%", y: "-50%", width: "200%", height: "200%" });
    shadow.append(createSvg("feDropShadow", { dx: 0, dy: 3, stdDeviation: 3, "flood-color": "#020407", "flood-opacity": 0.7 }));
    defs.append(shadow);
    return defs;
  }

  function renderDiagram(canvas) {
    canvas.replaceChildren();
    const svg = createSvg("svg", { viewBox: "0 0 760 520", role: "group", "aria-label": `Exploded mechanical watch with ${parts.length} inspectable components` });
    const rails = createSvg("g", { class: "exploded-watch__rails" });
    const stack = createSvg("g", { class: "exploded-watch__stack" });
    parts.forEach((part) => {
      const start = fallbackPoint({ ...part, explode: [0, 0, 0] });
      const end = fallbackPoint(part);
      rails.append(createSvg("line", { x1: start.x, y1: start.y, x2: end.x, y2: end.y }));
    });
    parts.forEach((part) => {
      const point = fallbackPoint(part);
      const radius = fallbackRadius(part);
      const selected = part.id === state.selectedId;
      const group = createSvg("g", {
        class: `exploded-watch__component${selected ? " is-selected" : ""}`,
        tabindex: 0,
        role: "button",
        "aria-label": `${part.name}: ${part.role}`,
        "aria-pressed": selected ? "true" : "false",
        "aria-controls": "exploded-watch-detail",
        "data-component-id": part.id,
      });
      if (["case", "crystal", "caseback", "date-ring"].includes(part.id)) {
        group.append(createSvg("circle", {
          cx: point.x,
          cy: point.y,
          r: radius,
          fill: part.id === "crystal" ? "rgba(185,230,239,0.18)" : "none",
          stroke: part.color,
          "stroke-width": part.id === "crystal" ? 3 : 8,
          filter: "url(#watch-fallback-depth)",
        }));
      } else if (part.system === "Structure") {
        group.append(createSvg("rect", {
          x: point.x - radius * 1.45,
          y: point.y - radius * 0.62,
          width: radius * 2.9,
          height: radius * 1.24,
          rx: radius * 0.45,
          fill: part.color,
          stroke: shade(part.color, 0.42),
          "stroke-width": 1.5,
          filter: "url(#watch-fallback-depth)",
        }));
      } else {
        const outer = [];
        const teeth = Math.max(8, Math.min(24, part.gear?.[1] || 14));
        for (let i = 0; i < teeth * 2; i += 1) {
          const angle = i / (teeth * 2) * Math.PI * 2;
          const r = i % 2 === 0 ? radius : radius * 0.8;
          outer.push(`${point.x + Math.cos(angle) * r},${point.y + Math.sin(angle) * r}`);
        }
        group.append(createSvg("polygon", {
          points: outer.join(" "),
          fill: part.color,
          stroke: shade(part.color, 0.42),
          "stroke-width": 1.3,
          filter: "url(#watch-fallback-depth)",
        }));
        group.append(createSvg("circle", { cx: point.x, cy: point.y, r: radius * 0.26, fill: "#11161d" }));
      }
      stack.append(group);
    });
    const backdrop = createSvg("image", {
      href: "./images/generated/components/exploded-sheet.png",
      x: 0,
      y: 0,
      width: "100%",
      height: "100%",
      preserveAspectRatio: "xMidYMid meet",
      opacity: 0.18,
      style: "pointer-events: none; filter: contrast(1.2) brightness(1.15) saturate(0.8);",
    });
    svg.append(buildDefs(), backdrop, rails, stack);
    canvas.append(svg);
  }

  function renderParts(partsRoot) {
    partsRoot.replaceChildren(...parts.map((part) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `exploded-watch__part${part.id === state.selectedId ? " is-selected" : ""}`;
      button.dataset.componentId = part.id;
      button.setAttribute("aria-pressed", part.id === state.selectedId ? "true" : "false");
      button.setAttribute("aria-controls", "exploded-watch-detail");
      const swatch = document.createElement("span");
      swatch.className = "exploded-watch__swatch";
      swatch.style.backgroundColor = part.color;
      swatch.setAttribute("aria-hidden", "true");
      const label = document.createElement("span");
      label.textContent = part.name;
      const system = document.createElement("small");
      system.textContent = part.system;
      button.append(swatch, label, system);
      return button;
    }));
  }

  function updateParts(partsRoot) {
    partsRoot.querySelectorAll("[data-component-id]").forEach((button) => {
      const selected = button.dataset.componentId === state.selectedId;
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-pressed", selected ? "true" : "false");
    });
    partsRoot.querySelector(".is-selected")?.scrollIntoView({ block: "nearest" });
  }

  function renderDetail(detail) {
    const part = parts.find((item) => item.id === state.selectedId) || parts[0];
    detail.replaceChildren();
    const system = document.createElement("p");
    system.className = "exploded-watch__system";
    system.textContent = part.system;
    const heading = document.createElement("h3");
    heading.textContent = part.name;
    const role = document.createElement("p");
    role.textContent = part.role;
    const link = document.createElement("a");
    link.className = "exploded-watch__lesson-link";
    link.href = `#${part.lessonId}`;
    link.textContent = `Read ${part.lessonLabel}`;
    detail.append(system, heading, role, link);
  }

  function syncPlayback(root) {
    const button = root.querySelector("[data-exploded-play]");
    if (button) {
      button.setAttribute("aria-pressed", String(state.playing));
      button.textContent = state.playing ? "Pause mechanism" : "Play mechanism";
    }
    root.querySelectorAll("[data-exploded-speed] [data-speed]").forEach((control) => {
      const checked = Number(control.dataset.speed) === state.speed;
      control.setAttribute("aria-checked", String(checked));
      control.tabIndex = checked ? 0 : -1;
      control.classList.toggle("is-selected", checked);
    });
    root.dataset.animationState = state.playing ? "playing" : "paused";
  }

  function syncDepthValue(depth) {
    depth.setAttribute("aria-valuetext", `${Math.round(Number(depth.value))} percent exploded`);
  }

  function dispatchState(root) {
    root.dispatchEvent(new CustomEvent("exploded-watch:state", {
      detail: {
        depth: state.depth,
        selectedId: state.selectedId,
        playing: state.playing,
        speed: state.speed,
      },
    }));
  }

  function updateDiagram(root) {
    const canvas = root.querySelector("[data-exploded-canvas]");
    if (canvas && root.dataset.threeReady !== "true") renderDiagram(canvas);
    dispatchState(root);
  }

  function selectComponent(id, root) {
    if (!parts.some((part) => part.id === id)) return;
    const active = document.activeElement;
    const focusRegion = active?.matches?.("[data-component-id]")
      ? active.closest("[data-exploded-canvas]") ? "[data-exploded-canvas]" : "[data-exploded-parts]"
      : null;
    state.selectedId = id;
    if (root.dataset.threeReady !== "true") renderDiagram(root.querySelector("[data-exploded-canvas]"));
    updateParts(root.querySelector("[data-exploded-parts]"));
    renderDetail(root.querySelector("[data-exploded-detail]"));
    dispatchState(root);
    if (focusRegion) root.querySelector(`${focusRegion} [data-component-id="${id}"]`)?.focus();
  }

  function init(root) {
    const depth = root.querySelector("[data-exploded-depth]");
    const partsRoot = root.querySelector("[data-exploded-parts]");
    const detail = root.querySelector("[data-exploded-detail]");
    const canvas = root.querySelector("[data-exploded-canvas]");
    if (!depth || !partsRoot || !detail || !canvas) return;

    root.dataset.partCount = String(parts.length);
    syncDepthValue(depth);
    syncPlayback(root);
    renderDiagram(canvas);
    renderParts(partsRoot);
    renderDetail(detail);

    depth.addEventListener("input", () => {
      state.depth = Number(depth.value) / 100;
      syncDepthValue(depth);
      updateDiagram(root);
    });
    root.addEventListener("click", (event) => {
      const target = event.target.closest("[data-component-id]");
      if (target) selectComponent(target.dataset.componentId, root);
      const speed = event.target.closest("[data-exploded-speed] [data-speed]");
      if (speed) {
        state.speed = Number(speed.dataset.speed);
        syncPlayback(root);
        dispatchState(root);
      }
      if (event.target.closest("[data-exploded-play]")) {
        state.playing = !state.playing;
        syncPlayback(root);
        dispatchState(root);
      }
    });
    root.addEventListener("exploded-watch:select", (event) => selectComponent(event.detail.id, root));
    root.addEventListener("keydown", (event) => {
      const speed = event.target.closest("[data-exploded-speed] [data-speed]");
      if (speed && ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) {
        event.preventDefault();
        const controls = Array.from(root.querySelectorAll("[data-exploded-speed] [data-speed]"));
        const index = controls.indexOf(speed);
        const nextIndex = event.key === "Home"
          ? 0
          : event.key === "End"
            ? controls.length - 1
            : (index + (["ArrowRight", "ArrowDown"].includes(event.key) ? 1 : -1) + controls.length) % controls.length;
        controls[nextIndex].click();
        controls[nextIndex].focus();
        return;
      }
      if (event.key !== "Enter" && event.key !== " ") return;
      const target = event.target.closest("[data-component-id]");
      if (target) {
        event.preventDefault();
        selectComponent(target.dataset.componentId, root);
      }
    });
    dispatchState(root);
  }

  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll("[data-exploded-watch]").forEach(init);
  });
})();
