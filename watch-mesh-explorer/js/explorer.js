import * as THREE from "../../interactive-mechanical-watch/vendor/three/three.module.min.js";
import { OrbitControls } from "../../interactive-mechanical-watch/vendor/three/OrbitControls.js";
import { MODEL_TABLE } from "./model-table.js";

const TAU = Math.PI * 2;
const STAGES = [
  { label: "Movement", systems: ["Casing", "Structure", "Power", "Winding", "Keyless works", "Automatic winding", "Friction", "Hardware"] },
  { label: "Train", systems: ["Gear train", "Motion works"] },
  { label: "Escapement", systems: ["Escapement", "Regulator", "Shock protection"] },
  { label: "Calendar", systems: ["Calendar"] },
  { label: "Dial", systems: ["Display"] },
  { label: "Hands", systems: ["Display"] },
];
const MODE_COPY = {
  service: "Build the calibre in service order. Each detent lowers the next mechanism onto the mainplate.",
  atlas: "Separate the movement into functional territories. Choose a subsystem to isolate its mechanical neighborhood.",
  energy: "Run the movement and follow stored torque from mainspring to display through the regulating organ.",
};
const MODE_LABEL = {
  lesson: "Guided lesson",
  service: "Service bench",
  atlas: "Exploded atlas",
  energy: "Living movement",
};
const TERRITORIES = {
  Foundation: { center: [0, 0, 0], color: "#777b73", systems: ["Casing", "Structure", "Friction", "Hardware"] },
  Power: { center: [15, 9, 1], color: "#b97b2f", systems: ["Power", "Winding", "Automatic winding"] },
  Control: { center: [-15, 10, 1], color: "#477d9b", systems: ["Keyless works"] },
  Train: { center: [15, -9, 1], color: "#8e9143", systems: ["Gear train", "Motion works"] },
  Escapement: { center: [-15, -9, 1], color: "#287c8d", systems: ["Escapement", "Regulator", "Shock protection"] },
  Calendar: { center: [0, 16, 1], color: "#657f88", systems: ["Calendar"] },
  Display: { center: [0, -16, 1], color: "#9a4931", systems: ["Display"] },
};
const ENERGY_PATHS = [
  ["mainspring", "barrel-drum", "center-wheel", "third-wheel", "fourth-wheel", "escape-wheel", "pallet-fork", "balance-wheel"],
  ["center-wheel", "cannon-pinion", "minute-hand"],
  ["cannon-pinion", "cannon-wheel", "hour-wheel", "hour-hand"],
  ["fourth-wheel", "second-hand"],
];
const ENERGY_COMPONENTS = new Set(ENERGY_PATHS.flat());
const ENERGY_COLOR = new THREE.Color(0xd05b32);
const SELECT_COLOR = new THREE.Color(0xc4542e);
const CAMERA_POSES = {
  lesson: { position: [27, -35, 29], target: [0, 0, 0] },
  service: { position: [31, -37, 32], target: [0, 0, 0] },
  atlas: { position: [0, -60, 50], target: [0, 0, 0] },
  energy: { position: [24, -35, 28], target: [0, 0, 0] },
};
const TOOTH_COUNTS = {
  barrel: 101,
  centerPinion: 17,
  centerWheel: 77,
  thirdPinion: 13,
  thirdWheel: 90,
  fourthPinion: 9,
  fourthWheel: 108,
  escapePinion: 9,
  escapeWheel: 20,
  cannonWheel: 78,
  cannonPinion: 16,
  hourWheel: 64,
};

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const state = {
  mode: "lesson",
  lessonIndex: 0,
  progress: 0,
  selectedId: "mainspring",
  selectedSystem: "All",
  playing: !reducedMotion,
  speed: 1,
  orbit: false,
  simulationTime: 0,
  visible: true,
};
const elements = {};
let lessons = [];
let parts = [];
let renderer;
let camera;
let controls;
let scene;
let componentGroups;
let pickables;
let mountingGuide;
let energyFlow;
let territoryLabels;
let targetCameraPosition;
let targetCameraTarget;
let resizeObserver;
let intersectionObserver;
let frameRequest = 0;
let transitionUntil = 0;
let lastFrameTime = performance.now();

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function ease(value) {
  const x = clamp01(value);
  return x * x * (3 - 2 * x);
}

function stageForPart(part) {
  if (["hour-hand", "minute-hand", "second-hand", "crystal"].includes(part.id)) return 5;
  if (part.id === "dial") return 4;
  const index = STAGES.findIndex((stage) => stage.systems.includes(part.system));
  return Math.max(0, index);
}

function territoryForSystem(system) {
  return Object.entries(TERRITORIES).find(([, territory]) => territory.systems.includes(system))?.[0] || "Foundation";
}

function validateSemanticModel() {
  const lessonIds = new Set();
  if (lessons.length !== 10) throw new Error(`Expected 10 guided lessons, got ${lessons.length}`);
  for (const lesson of lessons) {
    if (lessonIds.has(lesson.id) || !lesson.label || !lesson.title || !lesson.primaryPartId) {
      throw new Error(`Invalid guided lesson: ${lesson.id}`);
    }
    lessonIds.add(lesson.id);
  }
  const ids = new Set();
  for (const part of parts) {
    const lesson = lessons.find((candidate) => candidate.id === part.lessonId);
    if (ids.has(part.id) || !Array.isArray(part.home) || part.home.length !== 3 || !lesson) {
      throw new Error(`Invalid semantic component: ${part.id}`);
    }
    ids.add(part.id);
    for (const source of part.source || []) {
      if (!MODEL_TABLE[source]) throw new Error(`Missing source mesh: ${source}`);
    }
    for (const [source, transform] of Object.entries(part.sourceTransforms || {})) {
      if (!part.source?.includes(source)) throw new Error(`Unknown transformed source: ${part.id}/${source}`);
      for (const field of ["position", "rotation", "scale"]) {
        const vector = transform[field];
        if (vector && (vector.length !== 3 || vector.some((value) => !Number.isFinite(value)))) {
          throw new Error(`Invalid source ${field}: ${part.id}/${source}`);
        }
      }
      if (transform.scale?.some((value) => value === 0)) throw new Error(`Invalid source scale: ${part.id}/${source}`);
    }
  }
  for (const lesson of lessons) {
    if (!ids.has(lesson.primaryPartId)) throw new Error(`Missing lesson focus: ${lesson.primaryPartId}`);
  }
  for (const id of ENERGY_COMPONENTS) {
    if (!ids.has(id)) throw new Error(`Missing energy component: ${id}`);
  }
}

function activeLesson() {
  return lessons[state.lessonIndex];
}

function movementState(time) {
  const escape = Math.floor(time * 8) * TAU / TOOTH_COUNTS.escapeWheel;
  const fourth = -escape * TOOTH_COUNTS.escapePinion / TOOTH_COUNTS.fourthWheel;
  const third = escape * TOOTH_COUNTS.escapePinion / TOOTH_COUNTS.fourthWheel
    * TOOTH_COUNTS.fourthPinion / TOOTH_COUNTS.thirdWheel;
  const center = -third * TOOTH_COUNTS.thirdPinion / TOOTH_COUNTS.centerWheel;
  const barrel = -center * TOOTH_COUNTS.centerPinion / TOOTH_COUNTS.barrel;
  const cannon = -center * TOOTH_COUNTS.centerWheel / TOOTH_COUNTS.cannonWheel;
  const hour = cannon * TOOTH_COUNTS.cannonPinion / TOOTH_COUNTS.hourWheel;
  const balance = Math.sin(time * TAU * 4) * 1.95;
  const pallet = Math.sin(time * TAU * 4) >= 0 ? 0.115 : -0.115;
  const rotor = Math.sin(time * 0.72) * 1.7 + Math.sin(time * 0.19) * 0.4;
  return {
    arbor: -barrel * 1.12,
    automatic: -rotor * 1.8,
    automaticOutput: rotor * 0.68,
    balance,
    barrel,
    cannon,
    center,
    click: Math.max(0, Math.sin(time * 5)) * 0.045,
    clickSpring: Math.max(0, Math.sin(time * 5)) * 0.018,
    crown: 0,
    date: -Math.floor(time / 86400) * TAU / 31,
    dateJumper: Math.max(0, Math.sin(time / 86400 * TAU)) * 0.06,
    escape,
    fourth,
    hairspringScale: 1 + Math.sin(time * TAU * 4) * 0.035,
    hour,
    minute: hour * 12,
    pallet,
    reverserA: -rotor * 1.35,
    reverserB: rotor * 1.35,
    rotor,
    seconds: fourth,
    third,
  };
}

function validateMovementRatios() {
  const sample = movementState(123.456);
  if (Math.abs(sample.minute / sample.hour - 12) > 1e-9 || sample.balance < -2 || sample.balance > 2) {
    throw new Error("Movement ratio self-check failed");
  }
}

function createMaterial(part) {
  return new THREE.MeshStandardMaterial({
    color: part.color,
    metalness: part.transparent ? 0.12 : part.system === "Display" ? 0.36 : 0.68,
    roughness: part.transparent ? 0.13 : 0.38,
    transparent: true,
    opacity: part.transparent ? 0.5 : 1,
    side: THREE.DoubleSide,
  });
}

function createBinaryGeometry(modelNames, vertices, indices) {
  const positions = [];
  const normals = [];
  const bounds = new THREE.Box3();
  const point = new THREE.Vector3();
  for (const name of modelNames) {
    const [offset, count] = MODEL_TABLE[name];
    if (offset < 0 || count < 3 || count % 3 !== 0 || offset + count > indices.length) {
      throw new Error(`Invalid source range: ${name}`);
    }
    for (let index = offset; index < offset + count; index += 1) {
      const vertex = indices[index] * 6;
      if (vertex + 5 >= vertices.length) throw new Error(`Source index out of bounds: ${name}`);
      const x = vertices[vertex];
      const y = vertices[vertex + 1];
      const z = vertices[vertex + 2];
      positions.push(x, y, z);
      normals.push(vertices[vertex + 3], vertices[vertex + 4], vertices[vertex + 5]);
      bounds.expandByPoint(point.set(x, y, z));
    }
  }
  const center = bounds.getCenter(new THREE.Vector3());
  for (let index = 0; index < positions.length; index += 3) {
    positions[index] -= center.x;
    positions[index + 1] -= center.y;
    positions[index + 2] -= center.z;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geometry.computeBoundingSphere();
  return geometry;
}

function createGearGeometry(radius, teeth, depth = 0.35, toothDepth = radius * 0.13) {
  const shape = new THREE.Shape();
  const root = Math.max(0.12, radius - toothDepth * 0.45);
  const tip = radius + toothDepth;
  for (let index = 0; index < teeth * 4; index += 1) {
    const angle = index / (teeth * 4) * TAU;
    const r = index % 4 === 1 || index % 4 === 2 ? tip : root;
    const x = Math.cos(angle) * r;
    const y = Math.sin(angle) * r;
    if (index === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  const hole = new THREE.Path();
  hole.absarc(0, 0, Math.min(radius * 0.22, 0.32), 0, TAU, true);
  shape.holes.push(hole);
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelSegments: 1,
    bevelSize: Math.min(0.05, depth * 0.12),
    bevelThickness: Math.min(0.05, depth * 0.12),
    curveSegments: 2,
  });
  geometry.translate(0, 0, -depth / 2);
  return geometry;
}

function createRingGeometry(outerRadius, innerRadius, depth) {
  const shape = new THREE.Shape();
  shape.absarc(0, 0, outerRadius, 0, TAU, false);
  const hole = new THREE.Path();
  hole.absarc(0, 0, innerRadius, 0, TAU, true);
  shape.holes.push(hole);
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelSegments: 1,
    bevelSize: 0.14,
    bevelThickness: 0.12,
    curveSegments: 72,
  });
  geometry.translate(0, 0, -depth / 2);
  return geometry;
}

function createSpiralGeometry(radius, turns, tubeRadius, segments = 160) {
  const points = [];
  for (let index = 0; index <= segments; index += 1) {
    const progress = index / segments;
    const angle = progress * turns * TAU;
    const currentRadius = 0.5 + (radius - 0.5) * progress;
    points.push(new THREE.Vector3(
      Math.cos(angle) * currentRadius,
      Math.sin(angle) * currentRadius,
      0,
    ));
  }
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), segments * 2, tubeRadius, 6, false);
}

function addMesh(parent, geometry, material, componentId, position = [0, 0, 0]) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.fromArray(position);
  mesh.userData.componentId = componentId;
  parent.add(mesh);
  pickables.push(mesh);
  const outline = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({
    color: 0x25261f,
    side: THREE.BackSide,
    transparent: true,
    opacity: 0.28,
  }));
  outline.scale.setScalar(1.012);
  outline.userData.isOutline = true;
  mesh.add(outline);
  return mesh;
}

function addTransformedSources(parent, part, vertices, indices, geometryCache, material) {
  let count = 0;
  for (const source of part.source) {
    let geometry = geometryCache.get(source);
    if (!geometry) {
      geometry = createBinaryGeometry([source], vertices, indices);
      geometryCache.set(source, geometry);
    }
    const transform = part.sourceTransforms[source];
    for (const position of part.instances || [[0, 0, 0]]) {
      const instance = new THREE.Group();
      instance.position.fromArray(position);
      const sourceGroup = new THREE.Group();
      sourceGroup.position.fromArray(transform.position || [0, 0, 0]);
      sourceGroup.rotation.order = "ZYX";
      sourceGroup.rotation.fromArray(transform.rotation || [0, 0, 0]);
      sourceGroup.scale.fromArray(transform.scale || [1, 1, 1]);
      instance.add(sourceGroup);
      parent.add(instance);
      addMesh(sourceGroup, geometry, material, part.id);
      count += 1;
    }
  }
  return count;
}

function addDialMarkers(parent, material, componentId) {
  const geometry = new THREE.BoxGeometry(0.18, 1.15, 0.12);
  for (let index = 0; index < 60; index += 1) {
    const angle = index / 60 * TAU;
    const marker = addMesh(parent, geometry, material, componentId);
    marker.position.set(Math.sin(angle) * 11.8, Math.cos(angle) * 11.8, 0.18);
    marker.rotation.z = -angle;
    marker.scale.y = index % 5 === 0 ? 1.5 : 0.65;
  }
}

function addScrews(parent, geometry, material, componentId) {
  const positions = [
    [-7.15, -1.89, 0], [-4.97, 2.98, 0], [4.67, -8.16, 0], [-6.1, -7.06, 0],
    [3.43, 9.48, 0], [-4.25, 7.67, 0], [10.08, -2.59, 0], [-6.32, 8.12, 0],
    [0.58, 6.98, 0], [0.8, -6.26, 0], [-2.29, 6.6, 0], [-2.06, -6.3, 0],
  ];
  const shaftGeometry = new THREE.CylinderGeometry(0.14, 0.14, 1.1, 12);
  shaftGeometry.rotateX(Math.PI / 2);
  positions.forEach((position, index) => {
    const head = addMesh(parent, geometry, material, componentId, position);
    head.scale.setScalar(0.82);
    head.rotation.z = index * 0.73;
    addMesh(parent, shaftGeometry, material, componentId, [position[0], position[1], position[2] - 0.55]).scale.setScalar(0.78);
  });
}

function createComponent(part, vertices, indices, geometryCache) {
  const assembly = new THREE.Group();
  const pivot = new THREE.Group();
  const material = createMaterial(part);
  let transformedSourceCount = 0;
  assembly.add(pivot);
  if (part.source?.length) {
    if (part.sourceTransforms) {
      transformedSourceCount = addTransformedSources(pivot, part, vertices, indices, geometryCache, material);
    } else {
      const key = part.source.join("|");
      let geometry = geometryCache.get(key);
      if (!geometry) {
        geometry = createBinaryGeometry(part.source, vertices, indices);
        geometryCache.set(key, geometry);
      }
      if (part.kind === "screws") addScrews(pivot, geometry, material, part.id);
      else for (const position of part.instances || [[0, 0, 0]]) addMesh(pivot, geometry, material, part.id, position);
    }
  }
  if (part.kind === "case") addMesh(pivot, createRingGeometry(14.6, 13.25, 1.15), material, part.id);
  if (part.kind === "caseback") addMesh(pivot, createRingGeometry(14.35, 11.9, 0.75), material, part.id);
  if (part.kind === "crystal") addMesh(pivot, new THREE.CylinderGeometry(13.15, 13.15, 0.42, 72), material, part.id).rotation.x = Math.PI / 2;
  if (part.kind === "dial") addDialMarkers(pivot, material, part.id);
  if (part.kind === "mainspring") addMesh(pivot, createSpiralGeometry(5.1, 7.2, 0.12), material, part.id, [0, 0, 0.35]);
  if (part.kind === "hairspring") addMesh(pivot, createSpiralGeometry(4.85, 12.9, 0.055), material, part.id);
  if (part.kind === "gear") addMesh(pivot, createGearGeometry(...part.gear), material, part.id);
  if (part.kind === "shaft") {
    const [radius, length] = part.shaft;
    const geometry = new THREE.CylinderGeometry(radius, radius * 0.72, length, 16);
    geometry.rotateX(Math.PI / 2);
    addMesh(pivot, geometry, material, part.id);
  }
  if (part.kind === "automatic-gears") {
    addMesh(pivot, createGearGeometry(2.15, 57, 0.32, 0.16), material, part.id, [-1.1, -0.8, 0]);
    addMesh(pivot, createGearGeometry(1.85, 71, 0.32, 0.14), material, part.id, [1.35, 0.7, 0.18]);
  }
  const serviceDirection = part.home[2] < -0.3 || part.explode?.[2] < 0 ? -1 : 1;
  const stage = stageForPart(part);
  const serviceOffset = new THREE.Vector3(0, 0, serviceDirection * (7.5 + stage * 1.7 + parts.indexOf(part) % 5 * 0.35));
  assembly.position.fromArray(part.home);
  const outlines = [];
  pivot.traverse((child) => {
    if (child.userData.isOutline) outlines.push(child);
  });
  assembly.userData = {
    part,
    pivot,
    material,
    outlines,
    baseColor: new THREE.Color(part.color),
    interactive: true,
    serviceOffset,
    targetPosition: new THREE.Vector3().fromArray(part.home),
    targetScale: 1,
    targetOpacity: part.transparent ? 0.5 : 1,
    transformedSourceCount,
  };
  return assembly;
}

async function loadGeometry() {
  const [vertexResponse, indexResponse] = await Promise.all([
    fetch("../shared/mechanical-watch/models/watch_vertices.dat"),
    fetch("../shared/mechanical-watch/models/watch_indices.dat"),
  ]);
  if (!vertexResponse.ok || !indexResponse.ok) {
    throw new Error(`Movement geometry request failed: ${vertexResponse.status}/${indexResponse.status}`);
  }
  const [vertexBuffer, indexBuffer] = await Promise.all([
    vertexResponse.arrayBuffer(),
    indexResponse.arrayBuffer(),
  ]);
  if (vertexBuffer.byteLength % 24 !== 0 || indexBuffer.byteLength % 4 !== 0) {
    throw new Error("Movement geometry has invalid byte alignment");
  }
  return { vertices: new Float32Array(vertexBuffer), indices: new Uint32Array(indexBuffer) };
}

function buildTerritoryCentroids() {
  const centroids = new Map();
  for (const name of Object.keys(TERRITORIES)) {
    const members = parts.filter((part) => territoryForSystem(part.system) === name && part.id !== "mainplate");
    const centroid = new THREE.Vector3();
    for (const part of members) centroid.add(new THREE.Vector3().fromArray(part.home));
    if (members.length) centroid.divideScalar(members.length);
    centroids.set(name, centroid);
  }
  return centroids;
}

function serviceMount(part, progress) {
  const stage = stageForPart(part);
  if (stage === 0) return 1;
  return ease(progress - stage + 1);
}

function setPresentationTargets() {
  if (!componentGroups) return;
  const centroids = buildTerritoryCentroids();
  const lesson = activeLesson();
  let lessonPlacementError = 0;
  componentGroups.forEach((assembly) => {
    const { part, serviceOffset, targetPosition } = assembly.userData;
    const home = new THREE.Vector3().fromArray(part.home);
    const inLesson = state.mode !== "lesson" || part.lessonId === lesson.id;
    const systemMatch = state.selectedSystem === "All" || part.system === state.selectedSystem;
    const filterMatch = (inLesson && systemMatch) || part.id === "mainplate";
    let opacity = part.transparent ? 0.5 : 1;
    let installed = true;
    if (state.mode === "lesson") {
      if (inLesson || part.id === "mainplate") targetPosition.copy(home);
      if (!inLesson && part.id !== "mainplate") opacity = 0;
      else if (part.id === "mainplate" && lesson.id !== "mainplate") opacity *= 0.2;
    }
    if (state.mode === "service") {
      const mounted = serviceMount(part, state.progress);
      installed = mounted > 0.98;
      targetPosition.copy(home).addScaledVector(serviceOffset, 1 - mounted);
      opacity *= 0.16 + mounted * 0.84;
    }
    if (state.mode === "atlas") {
      if (part.id === "mainplate") targetPosition.copy(home);
      else {
        const territoryName = territoryForSystem(part.system);
        const territory = TERRITORIES[territoryName];
        targetPosition.fromArray(territory.center)
          .add(home.clone().sub(centroids.get(territoryName)).multiplyScalar(0.58));
      }
    }
    if (state.mode === "energy") {
      targetPosition.copy(home);
      if (["Casing", "Display"].includes(part.system) && !ENERGY_COMPONENTS.has(part.id)) opacity *= 0.08;
      else if (["Structure", "Hardware", "Automatic winding", "Keyless works"].includes(part.system)) opacity *= 0.22;
      else if (!ENERGY_COMPONENTS.has(part.id)) opacity *= 0.46;
    }
    if (!filterMatch) opacity = 0;
    assembly.visible = opacity > 0 || assembly.userData.material.opacity > 0.02;
    assembly.userData.filtered = filterMatch;
    assembly.userData.interactive = filterMatch && installed && opacity > 0.12
      && (state.mode !== "lesson" || inLesson);
    assembly.userData.targetScale = part.id === state.selectedId && filterMatch ? 1.06 : 1;
    assembly.userData.targetOpacity = opacity;
    if (state.mode === "lesson" && filterMatch) {
      lessonPlacementError = Math.max(lessonPlacementError, targetPosition.distanceTo(home));
    }
  });
  renderer.domElement.dataset.lessonPlacementError = lessonPlacementError.toFixed(6);
  updateMountingGuide();
  updateCameraPose();
  requestRender(700);
}

function updateMountingGuide() {
  if (!mountingGuide || !componentGroups) return;
  const assembly = componentGroups.get(state.selectedId);
  if (!assembly) return;
  const { part, serviceOffset } = assembly.userData;
  const start = new THREE.Vector3().fromArray(part.home);
  mountingGuide.geometry.setFromPoints([start, start.clone().add(serviceOffset)]);
  mountingGuide.computeLineDistances();
  mountingGuide.visible = ["lesson", "service"].includes(state.mode) && part.id !== "mainplate" && assembly.userData.filtered;
}

function applyMovementAnimation(movement) {
  componentGroups.forEach((assembly) => {
    const { part, pivot } = assembly.userData;
    let angle = 0;
    switch (part.animation) {
      case "automatic-train":
        if (pivot.children[0]) pivot.children[0].rotation.z = movement.automatic;
        if (pivot.children[1]) pivot.children[1].rotation.z = movement.automaticOutput;
        break;
      case "balance": angle = movement.balance; break;
      case "barrel": angle = movement.barrel; break;
      case "barrel-arbor": angle = movement.arbor; break;
      case "cannon": angle = movement.cannon; break;
      case "center": angle = movement.center; break;
      case "click": angle = movement.click; break;
      case "click-spring": angle = movement.clickSpring; break;
      case "crown-wheel": angle = movement.crown; break;
      case "date": angle = movement.date; break;
      case "date-jumper": angle = movement.dateJumper; break;
      case "date-spring": angle = -movement.dateJumper * 0.6; break;
      case "escape": angle = movement.escape; break;
      case "fourth": angle = movement.fourth; break;
      case "hairspring": angle = movement.balance * 0.16; break;
      case "hour": angle = movement.hour; break;
      case "minute": angle = movement.minute; break;
      case "pallet": angle = movement.pallet; break;
      case "reverser-a": angle = movement.reverserA; break;
      case "reverser-b": angle = movement.reverserB; break;
      case "rotor": angle = movement.rotor; break;
      case "seconds": angle = movement.seconds; break;
      case "third": angle = movement.third; break;
      default: break;
    }
    pivot.rotation.z = angle;
    if (part.animation === "hairspring") pivot.scale.setScalar(movement.hairspringScale);
  });
}

function updateMaterials() {
  const energyPhase = state.simulationTime * 0.42 % 1;
  componentGroups.forEach((assembly, id) => {
    const { material, outlines, baseColor, targetOpacity, part } = assembly.userData;
    let highlight = 0;
    let highlightColor = ENERGY_COLOR;
    if (state.mode === "energy" && ENERGY_COMPONENTS.has(id)) {
      for (const path of ENERGY_PATHS) {
        const pathIndex = path.indexOf(id);
        if (pathIndex < 0) continue;
        const position = pathIndex / Math.max(1, path.length - 1);
        const distance = Math.min(Math.abs(position - energyPhase), 1 - Math.abs(position - energyPhase));
        highlight = Math.max(highlight, clamp01(1 - distance * 8));
      }
    }
    if (id === state.selectedId && assembly.userData.filtered) {
      highlight = Math.max(highlight, 0.7);
      highlightColor = SELECT_COLOR;
    }
    material.color.copy(baseColor).lerp(highlightColor, highlight * 0.62);
    material.emissive.copy(highlightColor);
    material.emissiveIntensity = highlight * 0.42;
    material.opacity = reducedMotion ? targetOpacity : THREE.MathUtils.lerp(material.opacity, targetOpacity, 0.12);
    material.depthWrite = material.opacity > 0.55 && !part.transparent;
    outlines.forEach((outline) => {
      outline.visible = id === state.selectedId && assembly.userData.filtered;
    });
    if (targetOpacity === 0 && material.opacity < 0.015) assembly.visible = false;
  });
}

function createEnergyFlow() {
  const group = new THREE.Group();
  const beadGeometry = new THREE.SphereGeometry(0.18, 12, 8);
  const beadMaterial = new THREE.MeshBasicMaterial({ color: 0xf2a44d });
  const paths = ENERGY_PATHS.map((ids, pathIndex) => {
    const points = ids.map((id) => new THREE.Vector3().fromArray(parts.find((part) => part.id === id).home));
    const curve = new THREE.CatmullRomCurve3(points);
    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(curve.getPoints(Math.max(40, ids.length * 20))),
      new THREE.LineBasicMaterial({ color: 0xc4542e, transparent: true, opacity: pathIndex ? 0.42 : 0.62 }),
    );
    group.add(line);
    const beads = [];
    for (let index = 0; index < (pathIndex ? 2 : 5); index += 1) {
      const bead = new THREE.Mesh(beadGeometry, beadMaterial);
      beads.push(bead);
      group.add(bead);
    }
    return { curve, beads };
  });
  group.userData = { paths };
  group.visible = false;
  scene.add(group);
  return group;
}

function updateEnergyFlow() {
  energyFlow.visible = state.mode === "energy";
  if (!energyFlow.visible) return;
  energyFlow.userData.paths.forEach(({ curve, beads }, pathIndex) => {
    beads.forEach((bead, index) => {
      const progress = (state.simulationTime * 0.18 + index / beads.length + pathIndex * 0.08) % 1;
      bead.position.copy(curve.getPointAt(progress));
    });
  });
}

function updateCameraPose(focusSelection = true) {
  if (!targetCameraPosition || state.orbit) return;
  const pose = CAMERA_POSES[state.mode];
  const posePosition = new THREE.Vector3().fromArray(pose.position);
  const poseTarget = new THREE.Vector3().fromArray(pose.target);
  targetCameraPosition.copy(posePosition);
  targetCameraTarget.copy(poseTarget);
  const selected = componentGroups?.get(state.selectedId);
  if (!focusSelection || state.selectedId === "mainplate" || !selected?.userData.filtered) return;
  const focus = selected.userData.targetPosition;
  const distance = state.mode === "atlas" ? 42 : 36;
  targetCameraTarget.copy(focus);
  targetCameraPosition.copy(focus).add(posePosition.sub(poseTarget).normalize().multiplyScalar(distance));
}

function updateTerritoryLabels() {
  if (state.mode !== "atlas" || !camera || !territoryLabels) return;
  const width = elements.viewport.clientWidth;
  const height = elements.viewport.clientHeight;
  for (const [name, label] of territoryLabels) {
    const projected = new THREE.Vector3().fromArray(TERRITORIES[name].center).project(camera);
    label.style.left = `${(projected.x * 0.5 + 0.5) * width}px`;
    label.style.top = `${(-projected.y * 0.5 + 0.5) * height}px`;
  }
}

function requestRender(duration = 0) {
  if (!renderer || !state.visible || document.hidden) return;
  transitionUntil = Math.max(transitionUntil, performance.now() + (reducedMotion ? 0 : duration));
  if (!frameRequest) frameRequest = requestAnimationFrame(updateScene);
}

function updateScene(now) {
  frameRequest = 0;
  const delta = Math.min(0.05, Math.max(0, (now - lastFrameTime) / 1000));
  lastFrameTime = now;
  if (state.playing) state.simulationTime += delta * state.speed;
  const motion = reducedMotion ? 1 : 0.12;
  componentGroups.forEach((assembly) => {
    assembly.position.lerp(assembly.userData.targetPosition, motion);
    const scale = THREE.MathUtils.lerp(assembly.scale.x, assembly.userData.targetScale, motion);
    assembly.scale.setScalar(scale);
  });
  applyMovementAnimation(movementState(state.simulationTime));
  updateMaterials();
  updateEnergyFlow();
  if (!state.orbit) {
    camera.position.lerp(targetCameraPosition, reducedMotion ? 1 : 0.07);
    controls.target.lerp(targetCameraTarget, reducedMotion ? 1 : 0.07);
  }
  controls.update();
  updateTerritoryLabels();
  renderer.render(scene, camera);
  const filteredCount = Array.from(componentGroups.values()).filter((assembly) => assembly.userData.filtered).length;
  renderer.domElement.dataset.renderCount = String(Number(renderer.domElement.dataset.renderCount || 0) + 1);
  renderer.domElement.dataset.mode = state.mode;
  renderer.domElement.dataset.lessonId = activeLesson().id;
  renderer.domElement.dataset.playing = String(state.playing);
  renderer.domElement.dataset.speed = String(state.speed);
  renderer.domElement.dataset.simulationTime = state.simulationTime.toFixed(3);
  renderer.domElement.dataset.selectedId = state.selectedId;
  renderer.domElement.dataset.filteredCount = String(filteredCount);
  renderer.domElement.dataset.systemFilter = state.selectedSystem;
  renderer.domElement.dataset.cameraPosition = camera.position.toArray().map((value) => value.toFixed(3)).join(",");
  renderer.domElement.dataset.cameraTarget = controls.target.toArray().map((value) => value.toFixed(3)).join(",");
  if (state.playing || now < transitionUntil) requestRender();
}

function sourceStats(part) {
  const sources = part.source || [];
  const triangles = sources.reduce((total, name) => total + MODEL_TABLE[name][1] / 3, 0);
  return {
    source: sources.length ? sources.join(", ") : "Procedural geometry",
    triangles,
  };
}

function mechanicalNeighbors(part) {
  const origin = new THREE.Vector3().fromArray(part.home);
  return parts
    .filter((candidate) => candidate.id !== part.id
      && !["Casing", "Display"].includes(candidate.system)
      && (state.mode !== "lesson" || candidate.lessonId === activeLesson().id))
    .map((candidate) => ({
      candidate,
      distance: origin.distanceTo(new THREE.Vector3().fromArray(candidate.home)),
    }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 3)
    .map(({ candidate }) => candidate);
}

function showPart(id) {
  const part = parts.find((candidate) => candidate.id === id);
  if (!part) return;
  state.selectedId = id;
  const stats = sourceStats(part);
  const direction = componentGroups?.get(id)?.userData.serviceOffset.z < 0 ? "Movement side −Z" : "Dial side +Z";
  const neighbors = mechanicalNeighbors(part);
  const stage = stageForPart(part);
  elements.detail.innerHTML = `
    <p class="part-detail__system"><span>${part.system}</span><span>${String(parts.indexOf(part) + 1).padStart(2, "0")}</span></p>
    <h2>${part.name}</h2>
    <p class="part-detail__role">${part.role}</p>
    <dl>
      <div><dt>Mounting axis</dt><dd>${direction}</dd></div>
      <div><dt>Service stage</dt><dd>${STAGES[stage].label}</dd></div>
      <div><dt>Guided lesson</dt><dd>${activeLesson().id === part.lessonId ? activeLesson().label : part.lessonLabel}</dd></div>
      <div><dt>Source</dt><dd>${stats.source}</dd></div>
      <div><dt>Triangles</dt><dd>${stats.triangles ? stats.triangles.toLocaleString() : "Generated"}</dd></div>
      <div class="part-detail__neighbors"><dt>Nearest components</dt><dd>${neighbors.map((neighbor) => `<button type="button" data-neighbor="${neighbor.id}">${neighbor.name}</button>`).join("")}</dd></div>
    </dl>
    <button class="part-detail__install" type="button" data-install-stage>Show ${STAGES[stage].label} stage</button>`;
  elements.detail.querySelectorAll("[data-neighbor]").forEach((button) => {
    button.addEventListener("click", () => showPart(button.dataset.neighbor));
  });
  elements.detail.querySelector("[data-install-stage]").addEventListener("click", () => {
    setMode("service");
    setStage(stage);
  });
  elements.partList.querySelectorAll("button").forEach((button) => {
    const selected = button.dataset.componentId === id;
    button.classList.toggle("is-selected", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
  setPresentationTargets();
}

function filterParts() {
  const query = elements.search.value.trim().toLowerCase();
  const lesson = activeLesson();
  let visibleCount = 0;
  elements.partList.querySelectorAll("button").forEach((button) => {
    const part = parts.find((candidate) => candidate.id === button.dataset.componentId);
    const visible = (state.mode !== "lesson" || part.lessonId === lesson.id)
      && (state.selectedSystem === "All" || part.system === state.selectedSystem)
      && `${part.name} ${part.system}`.toLowerCase().includes(query);
    button.hidden = !visible;
    if (visible) visibleCount += 1;
  });
  elements.visibleCount.textContent = String(visibleCount).padStart(2, "0");
}

function setSystemFilter(system) {
  state.selectedSystem = system;
  elements.systemFilter.querySelectorAll("button").forEach((button) => {
    const active = button.dataset.system === system;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  filterParts();
  const selected = parts.find((part) => part.id === state.selectedId);
  if (system !== "All" && selected?.system !== system) {
    const lessonId = state.mode === "lesson" ? activeLesson().id : null;
    showPart(parts.find((part) => part.system === system && (!lessonId || part.lessonId === lessonId))?.id);
  } else {
    setPresentationTargets();
  }
}

function buildLessonList() {
  lessons.forEach((lesson, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.lessonId = lesson.id;
    button.innerHTML = `<span>${String(index + 1).padStart(2, "0")}</span><b>${lesson.label}</b>`;
    button.addEventListener("click", () => setLesson(index));
    elements.lessonList.appendChild(button);
  });
}

function buildPartRegister() {
  const systems = ["All", ...new Set(parts.map((part) => part.system))];
  for (const system of systems) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = system;
    button.className = system === "All" ? "is-active" : "";
    button.dataset.system = system;
    button.setAttribute("aria-pressed", String(system === "All"));
    button.addEventListener("click", () => setSystemFilter(system));
    elements.systemFilter.appendChild(button);
  }
  for (const part of parts) {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.componentId = part.id;
    button.setAttribute("aria-pressed", "false");
    button.innerHTML = `<span>${part.name}</span><small>${part.system}</small>`;
    button.addEventListener("click", () => showPart(part.id));
    elements.partList.appendChild(button);
  }
}

function setLesson(index) {
  state.lessonIndex = (index + lessons.length) % lessons.length;
  state.mode = "lesson";
  state.selectedSystem = "All";
  const lesson = activeLesson();
  elements.root.dataset.mode = "lesson";
  elements.root.dataset.lessonId = lesson.id;
  elements.lessonCount.textContent = `${String(state.lessonIndex + 1).padStart(2, "0")} / ${String(lessons.length).padStart(2, "0")}`;
  elements.lessonKicker.textContent = `Lesson ${String(state.lessonIndex + 1).padStart(2, "0")} · ${lesson.label}`;
  elements.lessonTitle.textContent = lesson.title;
  elements.lessonProblem.textContent = lesson.problem;
  elements.lessonMechanism.textContent = lesson.mechanism;
  elements.lessonResult.textContent = lesson.result;
  elements.modeCopy.textContent = "Only the parts needed for this step remain active. Select one to inspect its job.";
  elements.modeLabel.textContent = "Guided lesson";
  elements.stageLabel.textContent = lesson.label;
  elements.registerTitle.textContent = "Parts in this lesson";
  elements.prevLesson.disabled = state.lessonIndex === 0;
  elements.nextLesson.textContent = state.lessonIndex === lessons.length - 1 ? "Restart guide" : "Next lesson";
  elements.lessonList.querySelectorAll("button").forEach((button, buttonIndex) => {
    const active = buttonIndex === state.lessonIndex;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-current", active ? "step" : "false");
  });
  document.querySelectorAll("button[data-mode]").forEach((button) => {
    button.classList.remove("is-active");
    button.setAttribute("aria-pressed", "false");
  });
  setSystemFilter("All");
  filterParts();
  if (componentGroups) showPart(lesson.primaryPartId);
  else state.selectedId = lesson.primaryPartId;
  setPresentationTargets();
}

function setStage(progress) {
  state.progress = Math.max(0, Math.min(STAGES.length - 1, progress));
  elements.stageRange.value = String(state.progress);
  const active = Math.round(state.progress);
  elements.stageCount.textContent = `${String(active + 1).padStart(2, "0")} / ${String(STAGES.length).padStart(2, "0")}`;
  elements.stageLabel.textContent = active === 0 ? "Movement datum" : `${STAGES[active].label} installation`;
  elements.stageRange.setAttribute("aria-valuetext", STAGES[active].label);
  elements.stageList.querySelectorAll("button").forEach((button, index) => {
    button.classList.toggle("is-active", index === active);
    button.classList.toggle("is-complete", index < active);
    button.setAttribute("aria-current", index === active ? "step" : "false");
  });
  setPresentationTargets();
}

function setMode(mode) {
  state.mode = mode;
  state.selectedSystem = "All";
  elements.root.dataset.mode = mode;
  elements.modeCopy.textContent = MODE_COPY[mode];
  elements.modeLabel.textContent = MODE_LABEL[mode];
  elements.registerTitle.textContent = "Component register";
  elements.stageLabel.textContent = mode === "atlas"
    ? "Functional territories"
    : mode === "energy"
      ? "Torque path active"
      : Math.round(state.progress) === 0
        ? "Movement datum"
        : `${STAGES[Math.round(state.progress)].label} installation`;
  document.querySelectorAll("button[data-mode]").forEach((button) => {
    const active = button.dataset.mode === mode;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  elements.partList.querySelectorAll("button").forEach((button) => {
    button.classList.toggle("is-flowing", mode === "energy" && ENERGY_COMPONENTS.has(button.dataset.componentId));
  });
  setSystemFilter("All");
  filterParts();
  setPresentationTargets();
}

function buildStageList() {
  STAGES.forEach((stage, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.innerHTML = `<span>${String(index + 1).padStart(2, "0")}</span>${stage.label}`;
    button.addEventListener("click", () => {
      setMode("service");
      setStage(index);
    });
    elements.stageList.appendChild(button);
  });
}

function createTerritoryLabels() {
  const labels = new Map();
  for (const [name, territory] of Object.entries(TERRITORIES)) {
    const label = document.createElement("span");
    label.className = "territory-label";
    label.textContent = name;
    label.style.color = territory.color;
    elements.territoryLabels.appendChild(label);
    labels.set(name, label);
  }
  return labels;
}

function setSpeed(speed) {
  state.speed = speed;
  document.querySelectorAll("button[data-speed]").forEach((button) => {
    const active = Number(button.dataset.speed) === speed;
    button.setAttribute("aria-checked", String(active));
    button.tabIndex = active ? 0 : -1;
  });
  requestRender();
}

function resetView() {
  if (!camera || !controls) return;
  state.orbit = false;
  controls.enabled = false;
  elements.orbit.setAttribute("aria-pressed", "false");
  elements.orbit.textContent = "Free orbit";
  elements.stage.dataset.orbitActive = "false";
  renderer.domElement.style.touchAction = "pan-y";
  updateCameraPose(false);
  requestRender(700);
}

function bindInterface() {
  elements.prevLesson.addEventListener("click", () => setLesson(Math.max(0, state.lessonIndex - 1)));
  elements.nextLesson.addEventListener("click", () => setLesson(state.lessonIndex + 1));
  elements.returnGuide.addEventListener("click", () => setLesson(state.lessonIndex));
  document.querySelectorAll("button[data-mode]").forEach((button) => {
    button.addEventListener("click", () => setMode(button.dataset.mode));
  });
  elements.stageRange.addEventListener("input", () => {
    if (state.mode !== "service") setMode("service");
    setStage(Number(elements.stageRange.value));
  });
  elements.search.addEventListener("input", filterParts);
  elements.play.addEventListener("click", () => {
    state.playing = !state.playing;
    elements.play.setAttribute("aria-pressed", String(state.playing));
    elements.play.textContent = state.playing ? "Pause movement" : "Run movement";
    requestRender();
  });
  const speedButtons = Array.from(document.querySelectorAll("[data-speed]"));
  speedButtons.forEach((button) => {
    button.addEventListener("click", () => setSpeed(Number(button.dataset.speed)));
    button.addEventListener("keydown", (event) => {
      const current = speedButtons.indexOf(button);
      const next = event.key === "Home" ? 0
        : event.key === "End" ? speedButtons.length - 1
          : ["ArrowRight", "ArrowDown"].includes(event.key) ? (current + 1) % speedButtons.length
            : ["ArrowLeft", "ArrowUp"].includes(event.key) ? (current - 1 + speedButtons.length) % speedButtons.length
              : -1;
      if (next < 0) return;
      event.preventDefault();
      setSpeed(Number(speedButtons[next].dataset.speed));
      speedButtons[next].focus();
    });
  });
  setSpeed(state.speed);
  elements.resetView.addEventListener("click", resetView);
  elements.orbit.addEventListener("click", () => {
    state.orbit = !state.orbit;
    controls.enabled = state.orbit;
    elements.orbit.setAttribute("aria-pressed", String(state.orbit));
    elements.stage.dataset.orbitActive = String(state.orbit);
    elements.orbit.textContent = state.orbit ? "Lock camera" : "Free orbit";
    renderer.domElement.style.touchAction = state.orbit ? "none" : "pan-y";
    if (!state.orbit) updateCameraPose();
    requestRender(500);
  });
}

function bindPicking() {
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let pointerStart;
  renderer.domElement.addEventListener("pointerdown", (event) => {
    pointerStart = [event.clientX, event.clientY];
  });
  renderer.domElement.addEventListener("pointerup", (event) => {
    if (!pointerStart || Math.hypot(event.clientX - pointerStart[0], event.clientY - pointerStart[1]) > 5) return;
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.set(
      (event.clientX - rect.left) / rect.width * 2 - 1,
      -(event.clientY - rect.top) / rect.height * 2 + 1,
    );
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(pickables, false).find(({ object }) => {
      return componentGroups.get(object.userData.componentId)?.userData.interactive;
    });
    if (hit) showPart(hit.object.userData.componentId);
  });
}

function initializeScene(vertices, indices) {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(27, 1, 0.1, 220);
  camera.up.set(0, 0, 1);
  camera.position.fromArray(CAMERA_POSES.lesson.position);
  targetCameraPosition = camera.position.clone();
  targetCameraTarget = new THREE.Vector3().fromArray(CAMERA_POSES.lesson.target);
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0xf0ecdf, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.domElement.setAttribute("aria-hidden", "true");
  renderer.domElement.style.touchAction = "pan-y";
  renderer.domElement.dataset.componentCount = String(parts.length);
  controls = new OrbitControls(camera, renderer.domElement);
  controls.target.copy(targetCameraTarget);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 24;
  controls.maxDistance = 90;
  controls.enabled = false;
  renderer.domElement.style.touchAction = "pan-y";
  controls.addEventListener("change", () => {
    if (state.orbit) requestRender();
  });
  scene.add(new THREE.HemisphereLight(0xfffcf1, 0x696b62, 2.8));
  const key = new THREE.DirectionalLight(0xfff0ce, 4.4);
  key.position.set(18, -22, 38);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xb7d9df, 2.2);
  fill.position.set(-30, 18, 24);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(0xf0b76f, 1.8);
  rim.position.set(0, 24, -16);
  scene.add(rim);
  componentGroups = new Map();
  pickables = [];
  const geometryCache = new Map();
  for (const part of parts) {
    const assembly = createComponent(part, vertices, indices, geometryCache);
    componentGroups.set(part.id, assembly);
    scene.add(assembly);
  }
  renderer.domElement.dataset.transformedSourceCount = String(Array.from(componentGroups.values())
    .reduce((count, assembly) => count + assembly.userData.transformedSourceCount, 0));
  renderer.domElement.dataset.sourceRotationOrder = "ZYX";
  mountingGuide = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineDashedMaterial({
    color: 0xc4542e,
    dashSize: 0.35,
    gapSize: 0.22,
    transparent: true,
    opacity: 0.75,
  }));
  scene.add(mountingGuide);
  energyFlow = createEnergyFlow();
  resizeObserver = new ResizeObserver(([entry]) => {
    const width = Math.max(1, Math.round(entry.contentRect.width));
    const height = Math.max(1, Math.round(entry.contentRect.height));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    requestRender();
  });
  resizeObserver.observe(elements.viewport);
  intersectionObserver = "IntersectionObserver" in window
    ? new IntersectionObserver(([entry]) => {
      const wasVisible = state.visible;
      state.visible = entry.isIntersecting;
      lastFrameTime = performance.now();
      if (!wasVisible && state.visible) requestRender();
    }, { rootMargin: "160px" })
    : null;
  intersectionObserver?.observe(elements.viewport);
  bindPicking();
  elements.viewport.replaceChildren(renderer.domElement, elements.territoryLabels, elements.flowReadout, elements.axisReadout);
  elements.viewport.setAttribute("aria-busy", "false");
  elements.orbit.disabled = false;
  elements.root.dataset.threeReady = "true";
  showPart(state.selectedId);
  requestRender(700);
}

async function init() {
  elements.root = document.querySelector("[data-watch-workbench]");
  elements.lessonList = document.querySelector("[data-lesson-list]");
  elements.lessonCount = document.querySelector("[data-lesson-count]");
  elements.lessonKicker = document.querySelector("[data-lesson-kicker]");
  elements.lessonTitle = document.querySelector("[data-lesson-title]");
  elements.lessonProblem = document.querySelector("[data-lesson-problem]");
  elements.lessonMechanism = document.querySelector("[data-lesson-mechanism]");
  elements.lessonResult = document.querySelector("[data-lesson-result]");
  elements.prevLesson = document.querySelector("[data-prev-lesson]");
  elements.nextLesson = document.querySelector("[data-next-lesson]");
  elements.returnGuide = document.querySelector("[data-return-guide]");
  elements.modeCopy = document.querySelector("[data-mode-copy]");
  elements.modeLabel = document.querySelector("[data-mode-label]");
  elements.stage = document.querySelector("[data-stage]");
  elements.viewport = document.querySelector("[data-viewport]");
  elements.viewportStatus = document.querySelector("[data-viewport-status]");
  elements.axisReadout = document.querySelector(".axis-readout");
  elements.flowReadout = document.querySelector("[data-flow-readout]");
  elements.territoryLabels = document.querySelector("[data-territory-labels]");
  elements.stageList = document.querySelector("[data-stage-list]");
  elements.stageRange = document.querySelector("[data-stage-range]");
  elements.stageCount = document.querySelector("[data-stage-count]");
  elements.stageLabel = document.querySelector("[data-stage-label]");
  elements.play = document.querySelector("[data-play]");
  elements.resetView = document.querySelector("[data-reset-view]");
  elements.orbit = document.querySelector("[data-orbit]");
  elements.search = document.querySelector("[data-part-search]");
  elements.systemFilter = document.querySelector("[data-system-filter]");
  elements.partList = document.querySelector("[data-part-list]");
  elements.detail = document.querySelector("[data-part-detail]");
  elements.visibleCount = document.querySelector("[data-visible-count]");
  elements.registerTitle = document.querySelector("[data-register-title]");
  lessons = Array.from(window.WATCH_EXPLORER?.lessons || []);
  parts = Array.from(window.WATCH_EXPLORER?.parts || []);
  if (!parts.length) {
    elements.viewportStatus.textContent = "Semantic watch inventory is unavailable.";
    elements.viewportStatus.classList.add("is-error");
    return;
  }
  validateSemanticModel();
  validateMovementRatios();
  buildLessonList();
  buildStageList();
  buildPartRegister();
  territoryLabels = createTerritoryLabels();
  bindInterface();
  elements.play.setAttribute("aria-pressed", String(state.playing));
  elements.play.textContent = state.playing ? "Pause movement" : "Run movement";
  setStage(0);
  setLesson(0);
  try {
    const geometry = await loadGeometry();
    initializeScene(geometry.vertices, geometry.indices);
  } catch (error) {
    elements.viewport.setAttribute("aria-busy", "false");
    elements.viewportStatus.textContent = `Movement unavailable: ${error.message}`;
    elements.viewportStatus.classList.add("is-error");
    elements.root.dataset.threeError = error.message;
  }
}

function handleVisibilityChange() {
  lastFrameTime = performance.now();
  if (!document.hidden) requestRender();
}

function dispose() {
  cancelAnimationFrame(frameRequest);
  resizeObserver?.disconnect();
  intersectionObserver?.disconnect();
  renderer?.dispose();
}

document.addEventListener("visibilitychange", handleVisibilityChange);
window.addEventListener("pagehide", dispose, { once: true });
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
else init();
