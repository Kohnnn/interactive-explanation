import * as THREE from "../../interactive-mechanical-watch/vendor/three/three.module.min.js";
import { OrbitControls } from "../../interactive-mechanical-watch/vendor/three/OrbitControls.js";
import {
  MODEL_TABLE,
  systemForMesh,
  angleForSystem,
  radiusScaleForSystem,
  memberIndex,
  systemSize,
} from "./model-table.js";

const STRIDE = 6;
const VERTICES_URL = "../shared/mechanical-watch/models/watch_vertices.dat";
const INDICES_URL = "../shared/mechanical-watch/models/watch_indices.dat";

const state = {
  vertices: null,
  indices: null,
  meshes: new Map(),      // name -> { tri: Mesh|null, line: LineSegments|null, group: Group, meta }
  selected: null,
  explode: 0,
  showSolid: true,
  showWire: false,
  spin: true,
};

const els = {};
let scene, camera, renderer, controls, root, raycaster, pointer;
let running = true;

function byId(id) { return document.getElementById(id); }

async function loadBinary() {
  const [vRes, iRes] = await Promise.all([fetch(VERTICES_URL), fetch(INDICES_URL)]);
  if (!vRes.ok || !iRes.ok) throw new Error(`geometry fetch failed ${vRes.status}/${iRes.status}`);
  const [vBuf, iBuf] = await Promise.all([vRes.arrayBuffer(), iRes.arrayBuffer()]);
  if (vBuf.byteLength % 24 !== 0) throw new Error("vertices not 24-byte aligned");
  if (iBuf.byteLength % 4 !== 0) throw new Error("indices not 4-byte aligned");
  state.vertices = new Float32Array(vBuf);
  state.indices = new Uint32Array(iBuf);
}

// Build a BufferGeometry from a block of indices (triangles or line pairs).
function buildGeometry(offset, count) {
  const positions = new Float32Array(count * 3);
  const normals = new Float32Array(count * 3);
  const v = state.vertices;
  const idx = state.indices;
  for (let i = 0; i < count; i += 1) {
    const src = idx[offset + i] * STRIDE;
    const o = i * 3;
    positions[o] = v[src];
    positions[o + 1] = v[src + 1];
    positions[o + 2] = v[src + 2];
    normals[o] = v[src + 3];
    normals[o + 1] = v[src + 4];
    normals[o + 2] = v[src + 5];
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  return geo;
}

const SYSTEM_COLORS = {
  Structure: 0x9ba1a8,
  Power: 0xd8a657,
  "Gear train": 0xcbb47a,
  Escapement: 0x6bb7d6,
  Regulator: 0xc7a86b,
  "Shock protection": 0x8899a6,
  "Motion works": 0xd2bc83,
  Display: 0xd8d3c8,
  Calendar: 0xebe8de,
  "Keyless works": 0x8795a8,
  "Automatic winding": 0x7991c8,
  Friction: 0xdc5574,
  Hardware: 0xa9b0b6,
  "Date digits": 0xf0c879,
  "Reference geometry": 0x5f6b74,
  Other: 0x8a8f96,
};

function buildScene() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0d11);

  const canvas = els.canvas;
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  camera = new THREE.PerspectiveCamera(38, 1, 0.1, 400);
  camera.position.set(0, -2, 62);

  controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 18;
  controls.maxDistance = 160;

  scene.add(new THREE.AmbientLight(0xffffff, 0.55));
  const key = new THREE.DirectionalLight(0xffffff, 1.1);
  key.position.set(18, 26, 34);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x88aaff, 0.5);
  rim.position.set(-24, -12, -20);
  scene.add(rim);

  root = new THREE.Group();
  scene.add(root);

  raycaster = new THREE.Raycaster();
  pointer = new THREE.Vector2();
}

// Robust framing center + radius. The .dat stores each mesh at its modeling
// origin, not an assembled position: the movement core is stacked coaxially on
// Z while ~20% of meshes (hands, date digits, keyless levers) sit parked far
// off-cluster. At rest we keep the pure raw .dat layout framed on the dense
// core; the explode slider fans every mesh into a depth-layered subsystem
// diagram, pulling the parked outliers back into their functional groups.
let globalCenter = new THREE.Vector3();
let globalRadius = 20;
let explodedRadius = 60;

// Explode tuning constants.
const CORE_ZGAP = 3.6;     // vertical spacing between depth layers
const FAN_RADIUS = 30;     // base ring the subsystems fan out to
const MEMBER_GAP = 3.2;    // radial spacing between members of one subsystem
const MEMBER_WEDGE = 0.55; // angular spread of a subsystem's members (radians)

function median(values) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function percentile(values, p) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * p));
  return sorted[idx];
}

function signedSqrt(v) {
  return Math.sign(v) * Math.sqrt(Math.abs(v));
}

// Cubic ease so the explode feels like it settles into place.
function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function buildMeshes() {
  const names = Object.keys(MODEL_TABLE);
  const centroids = [];

  // First pass: build every mesh, record its own centroid + radius.
  for (const name of names) {
    const [triO, triC, lineO, lineC] = MODEL_TABLE[name];
    const system = systemForMesh(name);
    const color = SYSTEM_COLORS[system] ?? 0x8a8f96;
    const group = new THREE.Group();
    group.userData = {
      name, system,
      home: new THREE.Vector3(),
      explodeTarget: new THREE.Vector3(),
    };

    let tri = null;
    const centroid = new THREE.Vector3();
    let radius = 1;
    if (triC >= 3) {
      const geo = buildGeometry(triO, triC);
      geo.computeBoundingSphere();
      centroid.copy(geo.boundingSphere.center);
      radius = geo.boundingSphere.radius;
      const mat = new THREE.MeshStandardMaterial({
        color, metalness: 0.7, roughness: 0.35, side: THREE.DoubleSide,
      });
      tri = new THREE.Mesh(geo, mat);
      tri.userData.name = name;
      group.add(tri);
    }

    let line = null;
    if (lineC >= 2) {
      const geo = buildGeometry(lineO, lineC);
      const mat = new THREE.LineBasicMaterial({ color: 0xf3f0e8, transparent: true, opacity: 0.28 });
      line = new THREE.LineSegments(geo, mat);
      line.visible = state.showWire;
      group.add(line);
    }

    group.userData.centroid = centroid.clone();
    group.userData.radius = radius;
    if (triC >= 3) centroids.push(centroid.clone());

    root.add(group);
    state.meshes.set(name, { tri, line, group, system });
  }

  // Robust center = per-axis median of mesh centroids (ignores far outliers).
  globalCenter.set(
    median(centroids.map((c) => c.x)),
    median(centroids.map((c) => c.y)),
    median(centroids.map((c) => c.z)),
  );
  // Frame the dense core at rest: percentile of (core reach + radius) keeps the
  // stacked movement filling the frame while the parked outliers stay offscreen
  // until the user explodes (per the "pure raw .dat at rest" contract).
  const reachWithRadius = [];
  for (const name of names) {
    const [, triC] = MODEL_TABLE[name];
    if (triC < 3) continue;
    const g = state.meshes.get(name).group.userData;
    reachWithRadius.push(g.centroid.distanceTo(globalCenter) + g.radius);
  }
  globalRadius = Math.max(24, Math.min(48, percentile(reachWithRadius, 0.6) * 1.35));

  // Second pass: home = raw .dat position (recentered so the core sits at the
  // origin); explodeTarget = a depth-layered subsystem fan computed from each
  // mesh's centroid depth + its functional group. group.position is set so the
  // mesh CENTROID lands where we want, regardless of its raw modeling origin.
  let maxExploded = globalRadius;
  for (const { group } of state.meshes.values()) {
    const { centroid, system, name, radius } = group.userData;
    const homePos = globalCenter.clone().multiplyScalar(-1);
    group.userData.home.copy(homePos);

    // Depth layer: signed-sqrt compresses the runaway hands (z=-121 -> ~-11)
    // and expands the tightly packed core so layers read as clean strata.
    const zRel = centroid.z - globalCenter.z;
    const layerZ = signedSqrt(zRel) * CORE_ZGAP;

    // Radial fan: each subsystem gets a compass angle; members stagger across a
    // small wedge and step outward so coaxial wheels separate into a spoke.
    const n = systemSize(system);
    const i = memberIndex(name);
    const baseAngle = angleForSystem(system);
    const wedge = n > 1 ? (i / (n - 1) - 0.5) * MEMBER_WEDGE : 0;
    const angle = baseAngle + wedge;
    const centred = n > 1 ? i - (n - 1) / 2 : 0;
    const ring = FAN_RADIUS * radiusScaleForSystem(system) + centred * MEMBER_GAP;

    // Target CENTROID position (world/centered space).
    const targetCentroid = new THREE.Vector3(
      Math.cos(angle) * ring,
      Math.sin(angle) * ring,
      layerZ,
    );
    // group.position such that (centroid + position) == targetCentroid.
    group.userData.explodeTarget.copy(targetCentroid).sub(centroid);

    const reach = Math.hypot(targetCentroid.x, targetCentroid.y) + radius;
    if (reach > maxExploded) maxExploded = reach;
    if (Math.abs(targetCentroid.z) + radius > maxExploded) maxExploded = Math.abs(targetCentroid.z) + radius;

    group.position.copy(homePos);
  }
  explodedRadius = maxExploded * 1.06;

  fitCamera();
}

// Frame the diagram. Radius grows with the explode amount so the fanned layout
// never clips at full explode, while the rest view stays tight on the core. A
// selected mesh focuses the camera on that single part.
function fitCamera(focusName = null) {
  const fov = (camera.fov * Math.PI) / 180;
  let target = new THREE.Vector3(0, 0, 0);
  const framed = globalRadius + (explodedRadius - globalRadius) * state.explode;
  let radius = framed;

  if (focusName && state.meshes.has(focusName)) {
    const { group } = state.meshes.get(focusName);
    // World-space centroid = modeling centroid + current group position.
    target = group.userData.centroid.clone().add(group.position);
    radius = Math.max(2, group.userData.radius * 1.4);
  }

  const dist = radius / Math.sin(fov / 2);
  const dir = new THREE.Vector3(0, -0.15, 1).normalize();
  camera.position.copy(target).addScaledVector(dir, dist);
  camera.near = Math.max(0.05, dist - explodedRadius * 6);
  camera.far = dist + explodedRadius * 12;
  camera.updateProjectionMatrix();
  controls.target.copy(target);
  controls.minDistance = radius * 0.4;
  controls.maxDistance = explodedRadius * 8;
  controls.update();
}

function applyExplode() {
  const t = easeInOutCubic(state.explode);
  for (const { group } of state.meshes.values()) {
    group.position.lerpVectors(group.userData.home, group.userData.explodeTarget, t);
  }
  // Keep the whole fanned diagram in frame as it expands (only when no single
  // part is focused, so selection framing is not overridden mid-drag).
  if (!state.selected) fitCamera();
}

function applyVisibility() {
  for (const { tri, line } of state.meshes.values()) {
    if (tri) tri.visible = state.showSolid;
    if (line) line.visible = state.showWire;
  }
}

function setSelected(name, { focus = true } = {}) {
  state.selected = name;
  for (const [n, entry] of state.meshes.entries()) {
    const isSel = n === name;
    if (entry.tri) {
      entry.tri.material.emissive = new THREE.Color(isSel ? 0x2a5a7a : 0x000000);
      const dimmed = name && !isSel;
      entry.tri.material.opacity = dimmed ? 0.12 : 1;
      entry.tri.material.transparent = dimmed;
    }
  }
  // Recenter on the picked mesh so far-off parts (hands, date digits, keyless
  // works) become reachable; deselecting reframes the movement core.
  if (focus) fitCamera(name);
  updateInfoPanel(name);
  updateListSelection(name);
}

function updateListSelection(name) {
  els.list.querySelectorAll("button.mesh-item").forEach((btn) => {
    btn.classList.toggle("is-selected", btn.dataset.name === name);
  });
}

function updateInfoPanel(name) {
  if (!name) {
    els.info.innerHTML = `<p class="info-hint">Select a mesh from the list or click it in the viewport.</p>`;
    return;
  }
  const [triO, triC, lineO, lineC] = MODEL_TABLE[name];
  const entry = state.meshes.get(name);
  const geo = entry.tri?.geometry;
  let bboxSize = [0, 0, 0];
  if (geo) {
    geo.computeBoundingBox();
    const s = new THREE.Vector3();
    geo.boundingBox.getSize(s);
    bboxSize = [s.x, s.y, s.z].map((n) => n.toFixed(2));
  }
  els.info.innerHTML = `
    <h3>${name.replace(/_/g, " ")}</h3>
    <p class="info-system">${entry.system}</p>
    <dl class="info-grid">
      <div><dt>Triangles</dt><dd>${(triC / 3).toLocaleString()}</dd></div>
      <div><dt>Tri indices</dt><dd>${triC.toLocaleString()}</dd></div>
      <div><dt>Tri offset</dt><dd>${triO.toLocaleString()}</dd></div>
      <div><dt>Line pairs</dt><dd>${(lineC / 2).toLocaleString()}</dd></div>
      <div><dt>Line offset</dt><dd>${lineO.toLocaleString()}</dd></div>
      <div><dt>BBox (mm)</dt><dd>${bboxSize.join(" × ")}</dd></div>
    </dl>`;
}

function buildList() {
  const bySystem = new Map();
  for (const name of Object.keys(MODEL_TABLE)) {
    const sys = systemForMesh(name);
    if (!bySystem.has(sys)) bySystem.set(sys, []);
    bySystem.get(sys).push(name);
  }
  const frag = document.createDocumentFragment();
  for (const [sys, names] of bySystem.entries()) {
    const group = document.createElement("div");
    group.className = "mesh-group";
    const h = document.createElement("h4");
    h.textContent = `${sys} · ${names.length}`;
    group.appendChild(h);
    for (const name of names) {
      const [, triC] = MODEL_TABLE[name];
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "mesh-item";
      btn.dataset.name = name;
      btn.innerHTML = `<span>${name.replace(/_/g, " ")}</span><small>${(triC / 3).toLocaleString()} tris</small>`;
      btn.addEventListener("click", () => {
        setSelected(state.selected === name ? null : name);
      });
      group.appendChild(btn);
    }
    frag.appendChild(group);
  }
  els.list.appendChild(frag);
}

function onPointerDown(event) {
  const rect = els.canvas.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const targets = [];
  for (const { tri } of state.meshes.values()) if (tri && tri.visible) targets.push(tri);
  const hits = raycaster.intersectObjects(targets, false);
  if (hits.length) setSelected(hits[0].object.userData.name);
}

function resize() {
  const rect = els.canvas.parentElement.getBoundingClientRect();
  const w = Math.max(1, Math.floor(rect.width));
  const h = Math.max(1, Math.floor(rect.height));
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}

function animate() {
  if (!running) return;
  requestAnimationFrame(animate);
  if (state.spin && !state.selected) root.rotation.z += 0.0016;
  controls.update();
  renderer.render(scene, camera);
}

function wireControls() {
  els.explode.addEventListener("input", () => {
    state.explode = Number(els.explode.value) / 100;
    els.explodeVal.textContent = `${els.explode.value}%`;
    applyExplode();
  });
  els.solid.addEventListener("change", () => { state.showSolid = els.solid.checked; applyVisibility(); });
  els.wire.addEventListener("change", () => { state.showWire = els.wire.checked; applyVisibility(); });
  els.spin.addEventListener("change", () => { state.spin = els.spin.checked; });
  els.reset.addEventListener("click", () => {
    setSelected(null);
    state.explode = 0; els.explode.value = 0; els.explodeVal.textContent = "0%";
    applyExplode();
    root.rotation.set(0, 0, 0);
    fitCamera();
  });
  els.search.addEventListener("input", () => {
    const q = els.search.value.trim().toLowerCase();
    els.list.querySelectorAll("button.mesh-item").forEach((btn) => {
      const match = btn.dataset.name.toLowerCase().includes(q);
      btn.style.display = match ? "" : "none";
    });
    els.list.querySelectorAll(".mesh-group").forEach((g) => {
      const anyVisible = [...g.querySelectorAll("button.mesh-item")].some((b) => b.style.display !== "none");
      g.style.display = anyVisible ? "" : "none";
    });
  });
  els.canvas.addEventListener("pointerdown", onPointerDown);
  window.addEventListener("resize", resize);
}

function fillStats() {
  const names = Object.keys(MODEL_TABLE);
  let tris = 0, lines = 0;
  for (const name of names) { const [, tc, , lc] = MODEL_TABLE[name]; tris += tc / 3; lines += lc / 2; }
  els.stats.innerHTML = `
    <span><strong>${names.length}</strong> meshes</span>
    <span><strong>${state.vertices.length / STRIDE > 0 ? (state.vertices.length / STRIDE).toLocaleString() : "?"}</strong> vertices</span>
    <span><strong>${tris.toLocaleString()}</strong> triangles</span>
    <span><strong>${lines.toLocaleString()}</strong> line pairs</span>`;
}

async function init() {
  els.canvas = byId("viewport");
  els.list = byId("mesh-list");
  els.info = byId("mesh-info");
  els.explode = byId("explode");
  els.explodeVal = byId("explode-val");
  els.solid = byId("toggle-solid");
  els.wire = byId("toggle-wire");
  els.spin = byId("toggle-spin");
  els.reset = byId("reset");
  els.search = byId("search");
  els.stats = byId("stats");
  els.status = byId("status");

  buildScene();
  buildList();
  wireControls();
  resize();

  try {
    await loadBinary();
  } catch (err) {
    els.status.textContent = `Failed to load geometry: ${err.message}`;
    els.status.classList.add("is-error");
    return;
  }
  buildMeshes();
  fitCamera();
  const rb = new THREE.Box3().setFromObject(root);
  const rbSize = new THREE.Vector3(); rb.getSize(rbSize);
  window.__EXPLORER_DEBUG__ = {
    globalRadius,
    explodedRadius,
    globalCenter: globalCenter.toArray(),
    rootSize: rbSize.toArray(),
    cameraPos: camera.position.toArray(),
    near: camera.near, far: camera.far,
    minD: controls.minDistance, maxD: controls.maxDistance,
  };
  // Test hook: drive explode programmatically and read back framing.
  window.__EXP_SET_EXPLODE__ = (pct) => {
    state.explode = Math.max(0, Math.min(1, pct / 100));
    els.explode.value = String(Math.round(state.explode * 100));
    els.explodeVal.textContent = `${els.explode.value}%`;
    applyExplode();
    return { explode: state.explode, framed: globalRadius + (explodedRadius - globalRadius) * state.explode };
  };
  // Test hook: project every mesh centroid to normalized screen space so a probe
  // can quantify separation/overlap of the exploded diagram.
  window.__EXP_PROJECT__ = () => {
    const rect = els.canvas.getBoundingClientRect();
    const out = [];
    const v = new THREE.Vector3();
    for (const [name, { group, tri }] of state.meshes.entries()) {
      if (!tri) continue;
      v.copy(group.userData.centroid).add(group.position).project(camera);
      out.push({
        name, system: group.userData.system,
        x: (v.x + 1) / 2, y: (1 - v.y) / 2,
        onScreen: v.x >= -1 && v.x <= 1 && v.y >= -1 && v.y <= 1 && v.z < 1,
      });
    }
    return out;
  };
  fillStats();
  applyVisibility();
  setSelected(null);
  els.status.remove();

  // Pause rAF when tab hidden / element offscreen.
  document.addEventListener("visibilitychange", () => {
    running = !document.hidden;
    if (running) animate();
  });
  window.addEventListener("pagehide", () => {
    running = false;
    renderer?.dispose();
  });

  animate();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
