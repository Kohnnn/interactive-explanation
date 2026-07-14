(() => {
  const SVG_NS = "http://www.w3.org/2000/svg";

  const components = [
    { id: "case", name: "Case ring", system: "Frame", role: "Protects the movement and defines the resin block's outer datum.", shape: "ring", x: 300, y: 190, rx: 122, ry: 92, dx: -48, dy: -34, color: "#5d6670" },
    { id: "dial", name: "Dial", system: "Display", role: "Sits above the motion works and gives the hands a readable reference surface.", shape: "disc", x: 300, y: 190, r: 92, dx: -36, dy: -24, color: "#d8d3c8" },
    { id: "hour-hand", name: "Hour hand", system: "Display", role: "Turns once every twelve hours from the motion works reduction train.", shape: "hand", x: 300, y: 190, length: 46, angle: -72, dx: -22, dy: -15, color: "#2d323a" },
    { id: "minute-hand", name: "Minute hand", system: "Display", role: "Tracks the cannon pinion and gives the motion works its primary output.", shape: "hand", x: 300, y: 190, length: 72, angle: 18, dx: -14, dy: -10, color: "#20242b" },
    { id: "second-hand", name: "Seconds hand", system: "Display", role: "Couples to the fourth wheel, making the regulated beat visible.", shape: "hand", x: 300, y: 190, length: 80, angle: 118, dx: -6, dy: -5, color: "#ad3c3c" },
    { id: "mainplate", name: "Mainplate", system: "Structure", role: "The base chassis; jewels, pivots, bridges, and works register from this plate.", shape: "plate", x: 300, y: 190, w: 190, h: 138, dx: 0, dy: 0, color: "#b7b9b8" },
    { id: "barrel", name: "Mainspring barrel", system: "Power", role: "Stores spring energy and releases it slowly into the train.", shape: "gear", x: 226, y: 164, r: 35, teeth: 24, dx: 26, dy: 18, color: "#d8a657" },
    { id: "mainspring", name: "Mainspring", system: "Power", role: "The coiled spring is the reservoir; winding packs energy into the spiral.", shape: "spiral", x: 226, y: 164, r: 27, dx: 34, dy: 24, color: "#f0c879" },
    { id: "barrel-bridge", name: "Barrel bridge", system: "Structure", role: "Holds the barrel arbor square while the barrel delivers torque.", shape: "bridge", x: 226, y: 119, w: 122, h: 32, dx: 46, dy: 32, color: "#9ba1a8" },
    { id: "ratchet-wheel", name: "Ratchet wheel", system: "Winding", role: "Accepts winding input while the click prevents reverse motion.", shape: "gear", x: 196, y: 101, r: 24, teeth: 18, dx: 56, dy: 39, color: "#c98c4a" },
    { id: "click", name: "Click + spring", system: "Winding", role: "Locks the ratchet wheel one tooth at a time so wound energy cannot unwind through the crown.", shape: "lever", x: 245, y: 104, w: 54, h: 12, dx: 63, dy: 44, color: "#7fb069" },
    { id: "crown-wheel", name: "Crown wheel", system: "Winding", role: "Turns the winding stem's rotation into torque on the ratchet wheel.", shape: "gear", x: 168, y: 130, r: 20, teeth: 16, dx: 70, dy: 49, color: "#d0a05f" },
    { id: "crown-stem", name: "Crown + stem", system: "Keyless works", role: "User input for winding and setting; the keyless works route this motion.", shape: "stem", x: 414, y: 190, w: 74, h: 12, dx: 82, dy: 57, color: "#768397" },
    { id: "yoke", name: "Yoke", system: "Keyless works", role: "Slides the clutch between winding and hand-setting positions.", shape: "lever", x: 365, y: 226, w: 74, h: 13, dx: 90, dy: 62, color: "#87a7bd" },
    { id: "center-wheel", name: "Center wheel", system: "Train", role: "Receives barrel torque and starts the timed reduction toward the escapement.", shape: "gear", x: 278, y: 224, r: 29, teeth: 22, dx: 102, dy: 70, color: "#cbb47a" },
    { id: "third-wheel", name: "Third wheel", system: "Train", role: "Transfers power while stepping speed upward and torque downward.", shape: "gear", x: 326, y: 224, r: 23, teeth: 20, dx: 112, dy: 77, color: "#b7c27a" },
    { id: "fourth-wheel", name: "Fourth wheel", system: "Train", role: "Turns once per minute in many layouts, often carrying the seconds hand.", shape: "gear", x: 365, y: 203, r: 20, teeth: 18, dx: 122, dy: 84, color: "#86b989" },
    { id: "escape-wheel", name: "Escape wheel", system: "Escapement", role: "Meters train energy into discrete impulses for the pallet fork.", shape: "gear", x: 396, y: 170, r: 18, teeth: 15, dx: 132, dy: 92, color: "#70b8c8" },
    { id: "train-bridge", name: "Train bridge", system: "Structure", role: "Captures the gear-train pivots against the mainplate.", shape: "bridge", x: 322, y: 254, w: 143, h: 28, dx: 142, dy: 98, color: "#9da5ad" },
    { id: "pallet-fork", name: "Pallet fork", system: "Escapement", role: "Alternately locks and releases the escape wheel, converting spin into ticks.", shape: "fork", x: 420, y: 142, dx: 154, dy: 107, color: "#6bb7d6" },
    { id: "pallet-jewels", name: "Pallet jewels", system: "Escapement", role: "Ruby contact faces take the impact and reduce friction at the lock surfaces.", shape: "jewels", x: 420, y: 142, dx: 166, dy: 114, color: "#d95d78" },
    { id: "balance-wheel", name: "Balance wheel", system: "Regulator", role: "Oscillates with the hairspring to provide the watch's time base.", shape: "ring", x: 431, y: 104, rx: 38, ry: 38, dx: 178, dy: 123, color: "#c7a86b" },
    { id: "hairspring", name: "Hairspring", system: "Regulator", role: "Returns the balance wheel toward center and sets the beat frequency.", shape: "spiral", x: 431, y: 104, r: 26, dx: 190, dy: 131, color: "#9ed0d8" },
    { id: "balance-bridge", name: "Balance bridge", system: "Structure", role: "Supports the balance staff and lets the regulator survive shocks.", shape: "bridge", x: 431, y: 64, w: 104, h: 28, dx: 202, dy: 139, color: "#9ba1a8" },
    { id: "jewels", name: "Jewel bearings", system: "Friction", role: "Ruby bearings support high-load pivots with low wear and low friction.", shape: "jewels", x: 300, y: 190, dx: 214, dy: 147, color: "#d95d78" },
    { id: "rotor", name: "Automatic rotor", system: "Automatic winding", role: "A weighted rotor harvests wrist motion and winds the mainspring through reversers.", shape: "rotor", x: 300, y: 190, dx: 226, dy: 156, color: "#676d78" },
    { id: "reversers", name: "Reversing wheels", system: "Automatic winding", role: "Route rotor motion so either direction can wind the ratchet train.", shape: "doubleGear", x: 248, y: 285, dx: 238, dy: 164, color: "#7991c8" },
  ];

  const state = { depth: 0.74, selectedId: "barrel" };

  function createSvg(tag, attrs = {}) {
    const node = document.createElementNS(SVG_NS, tag);
    setAttrs(node, attrs);
    return node;
  }

  function setAttrs(node, attrs) {
    Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, String(value)));
  }

  function pointOnCircle(center, radius, angle) {
    const rad = angle * Math.PI / 180;
    return [center.x + Math.cos(rad) * radius, center.y + Math.sin(rad) * radius];
  }

  function clamp(value) {
    return Math.max(0, Math.min(255, Math.round(value)));
  }

  function shade(hex, amount) {
    const raw = hex.replace("#", "");
    const r = parseInt(raw.slice(0, 2), 16);
    const g = parseInt(raw.slice(2, 4), 16);
    const b = parseInt(raw.slice(4, 6), 16);
    const mix = amount >= 0 ? 255 : 0;
    const t = Math.abs(amount);
    const cr = clamp(r + (mix - r) * t);
    const cg = clamp(g + (mix - g) * t);
    const cb = clamp(b + (mix - b) * t);
    return `#${cr.toString(16).padStart(2, "0")}${cg.toString(16).padStart(2, "0")}${cb.toString(16).padStart(2, "0")}`;
  }

  function gradientId(color) {
    return `gx-${color.replace("#", "")}`;
  }

  function fillRef(color) {
    return `url(#${gradientId(color)})`;
  }

  /* ponytail: metallic sheen via a top-left-lit radial gradient per unique fill
     color + a shared depth drop-shadow filter. Upgrade to per-material texture
     maps if flat sheen ever reads as insufficient. */
  function buildDefs() {
    const defs = createSvg("defs");
    const shadow = createSvg("filter", { id: "gx-depth", x: "-30%", y: "-30%", width: "160%", height: "160%" });
    shadow.append(createSvg("feDropShadow", { dx: 0, dy: 3, stdDeviation: 3, "flood-color": "#05070b", "flood-opacity": 0.55 }));
    defs.append(shadow);

    const seen = new Set();
    components.forEach((component) => {
      if (!component.color || seen.has(component.color)) return;
      seen.add(component.color);
      const grad = createSvg("radialGradient", { id: gradientId(component.color), cx: "34%", cy: "30%", r: "78%" });
      grad.append(createSvg("stop", { offset: "0%", "stop-color": shade(component.color, 0.42) }));
      grad.append(createSvg("stop", { offset: "48%", "stop-color": component.color }));
      grad.append(createSvg("stop", { offset: "100%", "stop-color": shade(component.color, -0.4) }));
      defs.append(grad);
    });
    return defs;
  }

  function gearPath(component) {
    const center = { x: component.x, y: component.y };
    const points = [];
    for (let i = 0; i < component.teeth * 2; i += 1) {
      const radius = i % 2 === 0 ? component.r : component.r * 0.84;
      points.push(pointOnCircle(center, radius, -90 + i * 180 / component.teeth).join(","));
    }
    return `M${points.join("L")}Z`;
  }

  function spiralPath(component) {
    const center = { x: component.x, y: component.y };
    const points = [];
    for (let i = 0; i < 82; i += 1) {
      const t = i / 81;
      points.push(pointOnCircle(center, component.r * t, -110 + t * 900).join(","));
    }
    return `M${points.join("L")}`;
  }

  function componentTransform(component) {
    return `translate(${component.dx * state.depth} ${component.dy * state.depth})`;
  }

  function depthValueText(value) {
    return `${Math.round(Number(value))} percent exploded`;
  }

  function syncDepthValue(depth) {
    depth.setAttribute("aria-valuetext", depthValueText(depth.value));
  }

  function jewel(parent, cx, cy, r, color) {
    parent.append(createSvg("circle", { cx, cy, r, fill: fillRef(color), stroke: shade(color, -0.35), "stroke-width": 1.2 }));
    parent.append(createSvg("circle", { cx: cx - r * 0.3, cy: cy - r * 0.3, r: r * 0.34, fill: "rgba(255,255,255,0.82)" }));
  }

  function drawShape(parent, component) {
    const common = { fill: fillRef(component.color), stroke: "rgba(255,255,255,0.62)", "stroke-width": 1.4, filter: "url(#gx-depth)" };
    switch (component.shape) {
      case "ring":
        parent.append(createSvg("ellipse", { cx: component.x, cy: component.y, rx: component.rx, ry: component.ry, fill: "none", stroke: fillRef(component.color), "stroke-width": 8, filter: "url(#gx-depth)" }));
        parent.append(createSvg("ellipse", { cx: component.x, cy: component.y, rx: component.rx, ry: component.ry, fill: "none", stroke: "rgba(255,255,255,0.45)", "stroke-width": 1.4 }));
        break;
      case "disc":
        parent.append(createSvg("circle", { ...common, cx: component.x, cy: component.y, r: component.r, opacity: 0.94 }));
        parent.append(createSvg("circle", { cx: component.x, cy: component.y, r: component.r * 0.62, fill: "none", stroke: "rgba(255,255,255,0.3)", "stroke-width": 1 }));
        break;
      case "plate":
        parent.append(createSvg("rect", { ...common, x: component.x - component.w / 2, y: component.y - component.h / 2, width: component.w, height: component.h, rx: 42 }));
        break;
      case "bridge":
        parent.append(createSvg("rect", { ...common, x: component.x - component.w / 2, y: component.y - component.h / 2, width: component.w, height: component.h, rx: 15 }));
        jewel(parent, component.x - component.w / 2 + 12, component.y, 3.4, "#d95d78");
        jewel(parent, component.x + component.w / 2 - 12, component.y, 3.4, "#d95d78");
        break;
      case "gear":
        parent.append(createSvg("path", { ...common, d: gearPath(component) }));
        for (let i = 0; i < 5; i += 1) {
          const [sx, sy] = pointOnCircle({ x: component.x, y: component.y }, component.r * 0.66, i * 72);
          parent.append(createSvg("line", { x1: component.x, y1: component.y, x2: sx, y2: sy, stroke: shade(component.color, -0.28), "stroke-width": component.r * 0.14, "stroke-linecap": "round" }));
        }
        parent.append(createSvg("circle", { cx: component.x, cy: component.y, r: component.r * 0.34, fill: shade(component.color, -0.22), stroke: "rgba(255,255,255,0.55)", "stroke-width": 1.1 }));
        parent.append(createSvg("circle", { cx: component.x, cy: component.y, r: component.r * 0.15, fill: "#14171c" }));
        break;
      case "doubleGear":
        [[-15, 0, 18, 14], [18, -6, 16, 13]].forEach(([ox, oy, r, teeth]) => {
          const g = { x: component.x + ox, y: component.y + oy, r, teeth, color: component.color };
          parent.append(createSvg("path", { ...common, d: gearPath(g) }));
          parent.append(createSvg("circle", { cx: g.x, cy: g.y, r: r * 0.3, fill: "#14171c", stroke: "rgba(255,255,255,0.5)", "stroke-width": 1 }));
        });
        break;
      case "spiral":
        parent.append(createSvg("path", { d: spiralPath(component), fill: "none", stroke: shade(component.color, 0.15), "stroke-width": 4.5, "stroke-linecap": "round", filter: "url(#gx-depth)" }));
        break;
      case "hand": {
        const [x2, y2] = pointOnCircle({ x: component.x, y: component.y }, component.length, component.angle);
        parent.append(createSvg("line", { x1: component.x, y1: component.y, x2, y2, stroke: component.color, "stroke-width": 5, "stroke-linecap": "round", filter: "url(#gx-depth)" }));
        parent.append(createSvg("circle", { cx: component.x, cy: component.y, r: 5, fill: fillRef(component.color), stroke: "rgba(255,255,255,0.55)", "stroke-width": 1 }));
        break;
      }
      case "stem":
        parent.append(createSvg("rect", { ...common, x: component.x - component.w / 2, y: component.y - component.h / 2, width: component.w, height: component.h, rx: 6 }));
        parent.append(createSvg("circle", { ...common, cx: component.x + component.w / 2 + 10, cy: component.y, r: 13 }));
        break;
      case "lever":
        parent.append(createSvg("rect", { ...common, x: component.x - component.w / 2, y: component.y - component.h / 2, width: component.w, height: component.h, rx: 7, transform: `rotate(-18 ${component.x} ${component.y})` }));
        break;
      case "fork":
        parent.append(createSvg("path", { ...common, d: `M${component.x - 25},${component.y + 10} L${component.x + 14},${component.y - 7} L${component.x + 34},${component.y - 25} L${component.x + 27},${component.y - 31} L${component.x + 8},${component.y - 15} L${component.x - 8},${component.y - 28} L${component.x - 15},${component.y - 21} L${component.x},${component.y - 4} L${component.x - 31},${component.y + 5} Z` }));
        break;
      case "jewels":
        [[-24, -16], [24, -16], [-28, 18], [28, 18], [0, 0]].forEach(([dx, dy]) => {
          jewel(parent, component.x + dx, component.y + dy, 7, component.color);
        });
        break;
      case "rotor":
        parent.append(createSvg("path", { ...common, d: `M${component.x - 104},${component.y + 86} A138,138 0 0 1 ${component.x + 108},${component.y + 86} L${component.x + 46},${component.y + 22} A54,54 0 0 0 ${component.x - 46},${component.y + 22} Z` }));
        parent.append(createSvg("circle", { cx: component.x, cy: component.y, r: 10, fill: shade(component.color, -0.25), stroke: "rgba(255,255,255,0.5)", "stroke-width": 1.2 }));
        break;
      default:
        break;
    }
  }

  function renderDiagram(canvas) {
    canvas.replaceChildren();
    const svg = createSvg("svg", { viewBox: "0 0 760 520", role: "group", "aria-label": "Exploded mechanical watch component stack" });
    const rails = createSvg("g", { class: "exploded-watch__rails" });
    const stack = createSvg("g", { class: "exploded-watch__stack" });

    components.forEach((component) => {
      const targetX = component.x + component.dx * state.depth;
      const targetY = component.y + component.dy * state.depth;
      rails.append(createSvg("line", { x1: component.x, y1: component.y, x2: targetX, y2: targetY }));
    });

    components.forEach((component) => {
      const group = createSvg("g", {
        class: `exploded-watch__component${component.id === state.selectedId ? " is-selected" : ""}`,
        transform: componentTransform(component),
        tabindex: 0,
        role: "button",
        "aria-label": `${component.name}: ${component.role}`,
        "aria-pressed": component.id === state.selectedId ? "true" : "false",
        "aria-controls": "exploded-watch-detail",
        "data-component-id": component.id,
      });
      drawShape(group, component);
      stack.append(group);
    });

    /* ponytail: shared exploded-sheet.png backdrop behind SVG contours.
       Generated at 1254×1254 by 9Router (cx/gpt-5.5-image). The <image>
       stretches to fill the viewBox. Upgrade when per-component files
       replace the shared sheet or a smaller equivalent asset is available. */
    const backdrop = createSvg("image", {
      href: "./images/generated/components/exploded-sheet.png",
      x: 0, y: 0,
      width: "100%",
      height: "100%",
      preserveAspectRatio: "xMidYMid meet",
      opacity: 0.52,
      "image-rendering": "auto",
      style: "pointer-events: none; filter: contrast(1.28) brightness(1.22) saturate(1.1);",
    });

    svg.append(buildDefs(), backdrop, rails, stack);
    canvas.append(svg);
  }

  function renderParts(parts) {
    parts.replaceChildren(...components.map((component) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `exploded-watch__part${component.id === state.selectedId ? " is-selected" : ""}`;
      button.dataset.componentId = component.id;
      button.setAttribute("aria-pressed", component.id === state.selectedId ? "true" : "false");
      button.setAttribute("aria-controls", "exploded-watch-detail");
      button.innerHTML = `<span>${component.name}</span><small>${component.system}</small>`;
      return button;
    }));
    parts.querySelector(".is-selected")?.scrollIntoView({ block: "nearest" });
  }

  function renderDetail(detail) {
    const component = components.find((item) => item.id === state.selectedId) || components[0];
    detail.innerHTML = `<p class="exploded-watch__system">${component.system}</p><h3>${component.name}</h3><p>${component.role}</p>`;
  }

  function selectComponent(id, root) {
    if (components.some((component) => component.id === id)) {
      const active = document.activeElement;
      const focusRegion = active?.matches?.("[data-component-id]")
        ? active.closest("[data-exploded-canvas]") ? "[data-exploded-canvas]" : "[data-exploded-parts]"
        : null;
      state.selectedId = id;
      render(root);
      if (focusRegion) {
        root.querySelector(`${focusRegion} [data-component-id="${id}"]`)?.focus();
      }
    }
  }

  function render(root) {
    const canvas = root.querySelector("[data-exploded-canvas]");
    const parts = root.querySelector("[data-exploded-parts]");
    const detail = root.querySelector("[data-exploded-detail]");
    if (!canvas || !parts || !detail) return;

    renderDiagram(canvas);
    renderParts(parts);
    renderDetail(detail);
  }

  function init(root) {
    const depth = root.querySelector("[data-exploded-depth]");
    if (!depth) return;

    syncDepthValue(depth);
    depth.addEventListener("input", () => {
      state.depth = Number(depth.value) / 100;
      syncDepthValue(depth);
      render(root);
    });
    root.addEventListener("click", (event) => {
      const target = event.target.closest("[data-component-id]");
      if (target) selectComponent(target.dataset.componentId, root);
    });
    root.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      const target = event.target.closest("[data-component-id]");
      if (target) {
        event.preventDefault();
        selectComponent(target.dataset.componentId, root);
      }
    });
    render(root);
  }

  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll("[data-exploded-watch]").forEach(init);
  });
})();
