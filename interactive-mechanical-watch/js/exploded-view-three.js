import * as THREE from "../vendor/three/three.module.min.js";
import { OrbitControls } from "../vendor/three/OrbitControls.js";

const { modelRanges, parts } = window.WATCH_EXPLORER;
const TAU = Math.PI * 2;
const toothCounts = {
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
  intermediateWheel: 36,
  intermediatePinion: 12,
  hourWheel: 64,
  rotor: 38,
  reverserTop: 28,
  reverserBottomPinion: 11,
  automaticWheel: 57,
  automaticPinion: 9,
  automaticOutput: 71,
  ratchet: 63,
  crown: 52,
};

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function sharpStep(edge0, edge1, value) {
  return clamp01((value - edge0) / (edge1 - edge0));
}

function rotorAngle(time) {
  return Math.sin(time * 0.72) * 1.65 + Math.sin(time * 0.19) * 0.42;
}

function rectifiedTravel(angleAt, startTime, endTime) {
  const steps = Math.max(1, Math.ceil((endTime - startTime) * 12));
  let travel = 0;
  let previous = angleAt(startTime);
  for (let step = 1; step <= steps; step += 1) {
    const current = angleAt(startTime + (endTime - startTime) * step / steps);
    travel += Math.abs(current - previous);
    previous = current;
  }
  return travel;
}

function rectifiedRotorTravel(startTime, endTime) {
  return rectifiedTravel(rotorAngle, startTime, endTime);
}

function balanceParams(time) {
  const t = time + 99.87;
  const period = 0.25;
  const amplitude = 2.26;
  const incoming = ((t + 0.0625) % 0.25) >= 0.125;
  let balance = amplitude * Math.sin(t * TAU / period);
  if (!incoming) balance *= -1;

  let correctedBalance = balance;
  let pallet = -0.125;
  pallet += sharpStep(0.475, 0.374, balance) * 0.023;
  pallet += sharpStep(0.374, -0.2, balance) * 0.12;
  pallet += sharpStep(0.374, -0.05, balance) ** 2 * 0.063;
  pallet += sharpStep(0.17, 0.02, balance) * 0.024;
  pallet += sharpStep(-0.05, -0.2, balance) * 0.02;
  if (!incoming) {
    pallet -= sharpStep(0.12, -0.1, balance) * 0.03;
    pallet += sharpStep(-0.025, -0.1, balance) * 0.03;
  }
  if (balance < 0.18 && balance > -amplitude * 0.9) {
    if (incoming) {
      correctedBalance -= (pallet + 0.04506) * 1.85;
      correctedBalance += sharpStep(-0.2, -amplitude * 0.9, balance) * 0.320161;
    } else {
      correctedBalance -= (pallet + 0.04506) * 1.55;
      correctedBalance -= sharpStep(-0.05, -0.2, balance) * 0.05;
      correctedBalance += sharpStep(-0.2, -amplitude * 0.9, balance) * 0.318243;
    }
  }
  if (!incoming) {
    correctedBalance *= -1;
    pallet *= -1;
  }

  let escape = incoming ? 0.302 : 0.465;
  escape -= sharpStep(0.475, 0.374, balance) * 0.004;
  escape += sharpStep(0.374, 0.2, balance) * 0.09 * (incoming ? 0.167 : 0.15516);
  escape += sharpStep(0.374, -0.18, balance) ** 2 * 0.91 * (incoming ? 0.167 : 0.15516);
  escape += Math.floor(t / period + 0.75) * TAU / toothCounts.escapeWheel;
  return { balance: correctedBalance, escape, pallet };
}

function mechanismState(time, windingTravel) {
  const escapement = balanceParams(time);
  const center = -escapement.escape * toothCounts.escapePinion / toothCounts.fourthWheel
    * toothCounts.fourthPinion / toothCounts.thirdWheel
    * toothCounts.thirdPinion / toothCounts.centerWheel;
  const barrel = escapement.escape * toothCounts.escapePinion / toothCounts.fourthWheel
    * toothCounts.fourthPinion / toothCounts.thirdWheel
    * toothCounts.thirdPinion / toothCounts.centerWheel
    * toothCounts.centerPinion / toothCounts.barrel;
  const third = escapement.escape * toothCounts.escapePinion / toothCounts.fourthWheel
    * toothCounts.fourthPinion / toothCounts.thirdWheel;
  const fourth = -escapement.escape * toothCounts.escapePinion / toothCounts.fourthWheel;
  const cannon = escapement.escape * toothCounts.escapePinion / toothCounts.fourthWheel
    * toothCounts.fourthPinion / toothCounts.thirdWheel
    * toothCounts.thirdPinion / toothCounts.cannonWheel;
  const intermediate = cannon * toothCounts.cannonPinion / toothCounts.intermediateWheel;
  const hour = -intermediate * toothCounts.intermediatePinion / toothCounts.hourWheel;
  const minute = hour * 12;
  const rotor = rotorAngle(time);
  const reverserA = -rotor * toothCounts.rotor / toothCounts.reverserTop;
  const reverserB = reverserA + Math.PI / toothCounts.reverserTop;
  const automatic = -windingTravel * toothCounts.rotor / toothCounts.reverserTop
    * toothCounts.reverserBottomPinion / toothCounts.automaticWheel;
  const automaticOutput = automatic * toothCounts.automaticPinion / toothCounts.automaticOutput;
  const arbor = automaticOutput;
  const clickPhase = ((arbor * toothCounts.ratchet / TAU) % 1 + 1) % 1;
  const dayProgress = -hour / TAU / 2;
  const dayPhase = ((dayProgress % 1) + 1) % 1;
  return {
    ...escapement,
    arbor,
    automatic,
    automaticOutput,
    barrel,
    cannon,
    center,
    click: -0.05 + Math.sin(clickPhase * Math.PI) * 0.055,
    clickSpring: Math.sin(clickPhase * Math.PI) * 0.025,
    crown: 0,
    date: -Math.floor(dayProgress) * TAU / 31,
    dateJumper: Math.sin(dayPhase * Math.PI) * 0.08,
    fourth,
    hairspringScale: 1 + Math.sin(time * TAU / 0.25) * 0.035,
    hour,
    minute,
    pallet: escapement.pallet,
    reverserA,
    reverserB,
    rotor,
    seconds: fourth,
    third,
  };
}

function assertMechanismRatios() {
  const start = mechanismState(1200, 10);
  const next = mechanismState(1201, 11);
  const nextDay = mechanismState(1200 + 86400, 10);
  const dateStep = TAU / 31;
  const travel = rectifiedRotorTravel(0, 10);
  const separateTravel = rectifiedTravel((time) => Math.sin(time * 0.72) * 1.65, 0, 10)
    + rectifiedTravel((time) => Math.sin(time * 0.19) * 0.42, 0, 10);
  if (
    Math.abs(start.minute / start.hour - 12) > 1e-9 ||
    Math.abs(start.automaticOutput / start.automatic - toothCounts.automaticPinion / toothCounts.automaticOutput) > 1e-9 ||
    next.automaticOutput > start.automaticOutput ||
    travel < Math.abs(rotorAngle(10) - rotorAngle(0)) ||
    travel >= separateTravel ||
    Math.abs(travel - rectifiedRotorTravel(0, 5) - rectifiedRotorTravel(5, 10)) > 1e-9 ||
    Math.abs(nextDay.date - start.date + dateStep) > 1e-9
  ) {
    throw new Error("Mechanical watch ratio self-check failed");
  }
}

assertMechanismRatios();

function createMaterial(part) {
  const transmission = part.transparent ? 0.3 : 0;
  return new THREE.MeshPhysicalMaterial({
    color: part.color,
    metalness: part.transparent ? 0.08 : part.system === "Display" ? 0.45 : 0.78,
    roughness: part.transparent ? 0.16 : part.system === "Friction" ? 0.2 : 0.3,
    transparent: Boolean(part.transparent),
    opacity: part.transparent ? 0.62 : 1,
    transmission,
    thickness: part.transparent ? 0.8 : 0,
    clearcoat: part.transparent ? 0.8 : 0.24,
    clearcoatRoughness: 0.2,
    side: THREE.DoubleSide,
  });
}

function createBinaryGeometry(modelNames, vertices, indices) {
  const positions = [];
  const normals = [];
  const bounds = new THREE.Box3();
  const point = new THREE.Vector3();
  modelNames.forEach((name) => {
    const range = modelRanges[name];
    if (!range) throw new Error(`Unknown watch model: ${name}`);
    const [offset, count] = range;
    if (offset < 0 || count < 3 || count % 3 !== 0 || offset + count > indices.length) {
      throw new Error(`Invalid index range for watch model: ${name}`);
    }
    for (let i = offset; i < offset + count; i += 1) {
      const vertexOffset = indices[i] * 6;
      if (vertexOffset + 5 >= vertices.length) throw new Error(`Vertex index out of bounds: ${name}`);
      const x = vertices[vertexOffset];
      const y = vertices[vertexOffset + 1];
      const z = vertices[vertexOffset + 2];
      positions.push(x, y, z);
      normals.push(vertices[vertexOffset + 3], vertices[vertexOffset + 4], vertices[vertexOffset + 5]);
      bounds.expandByPoint(point.set(x, y, z));
    }
  });
  const center = bounds.getCenter(new THREE.Vector3());
  for (let i = 0; i < positions.length; i += 3) {
    positions[i] -= center.x;
    positions[i + 1] -= center.y;
    positions[i + 2] -= center.z;
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
  for (let i = 0; i < teeth * 4; i += 1) {
    const angle = i / (teeth * 4) * TAU;
    const phase = i % 4;
    const r = phase === 1 || phase === 2 ? tip : root;
    const x = Math.cos(angle) * r;
    const y = Math.sin(angle) * r;
    if (i === 0) shape.moveTo(x, y);
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
    bevelSegments: 2,
    bevelSize: 0.18,
    bevelThickness: 0.14,
    curveSegments: 96,
  });
  geometry.translate(0, 0, -depth / 2);
  return geometry;
}

function createSpiralGeometry(radius, turns, tubeRadius, segments = 180) {
  const points = [];
  for (let i = 0; i <= segments; i += 1) {
    const progress = i / segments;
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

function tagMesh(mesh, componentId, pickables) {
  mesh.userData.componentId = componentId;
  pickables.push(mesh);
  return mesh;
}

function addMesh(parent, geometry, material, componentId, pickables, position = [0, 0, 0]) {
  const mesh = tagMesh(new THREE.Mesh(geometry, material), componentId, pickables);
  mesh.position.fromArray(position);
  parent.add(mesh);
  return mesh;
}

function addTransformedSources(parent, part, vertices, indices, pickables, geometryCache, material) {
  let count = 0;
  part.source.forEach((source) => {
    let geometry = geometryCache.get(source);
    if (!geometry) {
      geometry = createBinaryGeometry([source], vertices, indices);
      geometryCache.set(source, geometry);
    }
    const transform = part.sourceTransforms[source];
    (part.instances || [[0, 0, 0]]).forEach((position) => {
      const instance = new THREE.Group();
      instance.position.fromArray(position);
      const sourceGroup = new THREE.Group();
      sourceGroup.position.fromArray(transform.position || [0, 0, 0]);
      sourceGroup.rotation.order = "ZYX";
      sourceGroup.rotation.fromArray(transform.rotation || [0, 0, 0]);
      sourceGroup.scale.fromArray(transform.scale || [1, 1, 1]);
      instance.add(sourceGroup);
      parent.add(instance);
      addMesh(sourceGroup, geometry, material, part.id, pickables);
      count += 1;
    });
  });
  return count;
}

function addDialMarkers(parent, material, componentId, pickables) {
  const geometry = new THREE.BoxGeometry(0.18, 1.15, 0.12);
  for (let i = 0; i < 60; i += 1) {
    const angle = i / 60 * TAU;
    const marker = addMesh(parent, geometry, material, componentId, pickables);
    marker.position.set(Math.sin(angle) * 11.8, Math.cos(angle) * 11.8, 0.18);
    marker.rotation.z = -angle;
    marker.scale.y = i % 5 === 0 ? 1.5 : 0.65;
  }
}

function addScrews(parent, sourceGeometry, material, componentId, pickables) {
  const positions = [
    [-7.15, -1.89, 0], [-4.97, 2.98, 0], [4.67, -8.16, 0], [-6.1, -7.06, 0],
    [3.43, 9.48, 0], [-4.25, 7.67, 0], [10.08, -2.59, 0], [-6.32, 8.12, 0],
    [0.58, 6.98, 0], [0.8, -6.26, 0], [-2.29, 6.6, 0], [-2.06, -6.3, 0],
    [-3.08, 4.67, 0], [-0.74, -7.35, 0], [0, 0, 0], [5.78, 2.89, 0],
  ];
  const shaftGeometry = new THREE.CylinderGeometry(0.14, 0.14, 1.1, 14);
  shaftGeometry.rotateX(Math.PI / 2);
  positions.forEach((position, index) => {
    const head = addMesh(parent, sourceGeometry, material, componentId, pickables, position);
    head.scale.setScalar(index === 8 ? 1.5 : 0.82);
    head.rotation.z = index * 0.73;
    const shaft = addMesh(parent, shaftGeometry, material, componentId, pickables, [position[0], position[1], position[2] - 0.55]);
    shaft.scale.setScalar(index === 8 ? 1.2 : 0.78);
  });
}

function createComponent(part, vertices, indices, pickables, geometryCache) {
  const assembly = new THREE.Group();
  const pivot = new THREE.Group();
  const material = createMaterial(part);
  let transformedSourceCount = 0;
  assembly.add(pivot);

  if (part.source?.length) {
    if (part.sourceTransforms) {
      transformedSourceCount = addTransformedSources(pivot, part, vertices, indices, pickables, geometryCache, material);
    } else {
      const cacheKey = part.source.join("|");
      let sourceGeometry = geometryCache.get(cacheKey);
      if (!sourceGeometry) {
        sourceGeometry = createBinaryGeometry(part.source, vertices, indices);
        geometryCache.set(cacheKey, sourceGeometry);
      }
      if (part.kind === "screws") addScrews(pivot, sourceGeometry, material, part.id, pickables);
      else {
        const positions = part.instances || [[0, 0, 0]];
        positions.forEach((position) => addMesh(pivot, sourceGeometry, material, part.id, pickables, position));
      }
    }
  }

  if (part.kind === "case") addMesh(pivot, createRingGeometry(14.6, 13.25, 1.15), material, part.id, pickables);
  if (part.kind === "caseback") addMesh(pivot, createRingGeometry(14.35, 11.9, 0.75), material, part.id, pickables);
  if (part.kind === "crystal") addMesh(pivot, new THREE.CylinderGeometry(13.15, 13.15, 0.42, 96), material, part.id, pickables).rotation.x = Math.PI / 2;
  if (part.kind === "dial") addDialMarkers(pivot, material, part.id, pickables);
  if (part.kind === "mainspring") addMesh(pivot, createSpiralGeometry(5.1, 7.2, 0.12), material, part.id, pickables, [0, 0, 0.35]);
  if (part.kind === "hairspring") addMesh(pivot, createSpiralGeometry(4.85, 12.9, 0.055), material, part.id, pickables);
  if (part.kind === "gear") addMesh(pivot, createGearGeometry(...part.gear), material, part.id, pickables);
  if (part.kind === "shaft") {
    const [radius, length] = part.shaft;
    const geometry = new THREE.CylinderGeometry(radius, radius * 0.72, length, 18);
    geometry.rotateX(Math.PI / 2);
    addMesh(pivot, geometry, material, part.id, pickables);
  }
  if (part.kind === "automatic-gears") {
    const gearA = createGearGeometry(2.15, 57, 0.32, 0.16);
    const gearB = createGearGeometry(1.85, 71, 0.32, 0.14);
    addMesh(pivot, gearA, material, part.id, pickables, [-1.1, -0.8, 0]);
    addMesh(pivot, gearB, material, part.id, pickables, [1.35, 0.7, 0.18]);
  }

  assembly.userData = { config: part, material, pivot, transformedSourceCount };
  return assembly;
}

async function loadMovementGeometry() {
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

function applyAnimation(componentGroups, state) {
  componentGroups.forEach((assembly) => {
    const { config, pivot } = assembly.userData;
    let angle = 0;
    switch (config.animation) {
      case "automatic-train":
        pivot.children[0].rotation.z = state.automatic;
        pivot.children[1].rotation.z = state.automaticOutput;
        break;
      case "balance": angle = state.balance; break;
      case "barrel": angle = state.barrel; break;
      case "barrel-arbor": angle = state.arbor; break;
      case "cannon": angle = state.cannon; break;
      case "center": angle = state.center; break;
      case "click": angle = state.click; break;
      case "click-spring": angle = state.clickSpring; break;
      case "crown-wheel": angle = state.crown; break;
      case "date": angle = state.date; break;
      case "date-jumper": angle = state.dateJumper; break;
      case "date-spring": angle = -state.dateJumper * 0.6; break;
      case "escape": angle = state.escape; break;
      case "fourth": angle = state.fourth; break;
      case "hairspring": angle = state.balance * 0.16; break;
      case "hour": angle = state.hour; break;
      case "minute": angle = state.minute; break;
      case "pallet": angle = state.pallet; break;
      case "reverser-a": angle = state.reverserA; break;
      case "reverser-b": angle = state.reverserB; break;
      case "rotor": angle = state.rotor; break;
      case "seconds": angle = state.seconds; break;
      case "third": angle = state.third; break;
      default: break;
    }
    pivot.rotation.z = angle;
    if (config.animation === "hairspring") pivot.scale.setScalar(state.hairspringScale);
  });
}

function initExploder(root) {
  const mount = root.querySelector("[data-exploded-canvas]");
  if (!mount) return;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
  } catch {
    return;
  }

  loadMovementGeometry().then(({ vertices, indices }) => {
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x080a0d, 0.012);
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 220);
    camera.position.set(32, -38, 34);
    camera.up.set(0, 0, 1);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0, 0.5);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 26;
    controls.maxDistance = 92;
    controls.maxPolarAngle = Math.PI * 0.96;
    controls.update();

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x080a0d, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.domElement.className = "exploded-watch__webgl";
    renderer.domElement.setAttribute("aria-hidden", "true");
    renderer.domElement.dataset.componentCount = String(parts.length);

    scene.add(new THREE.HemisphereLight(0xf8f2e8, 0x111827, 2.4));
    const keyLight = new THREE.DirectionalLight(0xffdfaa, 5.2);
    keyLight.position.set(18, -24, 38);
    scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight(0x8fc8ef, 3.1);
    fillLight.position.set(-28, 18, 22);
    scene.add(fillLight);
    const rimLight = new THREE.DirectionalLight(0xd4a75d, 2.4);
    rimLight.position.set(0, 24, -20);
    scene.add(rimLight);

    const componentGroups = new Map();
    const pickables = [];
    const geometryCache = new Map();
    parts.forEach((part) => {
      const assembly = createComponent(part, vertices, indices, pickables, geometryCache);
      componentGroups.set(part.id, assembly);
      scene.add(assembly);
    });
    renderer.domElement.dataset.transformedSourceCount = String(Array.from(componentGroups.values())
      .reduce((count, assembly) => count + assembly.userData.transformedSourceCount, 0));
    renderer.domElement.dataset.sourceRotationOrder = "ZYX";

    const guideMaterial = new THREE.LineBasicMaterial({ color: 0xd8a657, transparent: true, opacity: 0.16 });
    const guidePositions = [];
    for (let x = -14; x <= 14; x += 2) guidePositions.push(x, -14, -2.8, x, 14, -2.8);
    for (let y = -14; y <= 14; y += 2) guidePositions.push(-14, y, -2.8, 14, y, -2.8);
    const guideGeometry = new THREE.BufferGeometry();
    guideGeometry.setAttribute("position", new THREE.Float32BufferAttribute(guidePositions, 3));
    scene.add(new THREE.LineSegments(guideGeometry, guideMaterial));

    let visible = true;
    let disposed = false;
    let frameRequested = false;
    let renderCount = 0;
    let simulationTime = 0;
    let windingTravel = 0;
    let lastFrameTime = performance.now();
    let depth = Number(root.querySelector("[data-exploded-depth]")?.value || 74) / 100;
    let selectedId = root.querySelector("[data-exploded-parts] .is-selected")?.dataset.componentId || "barrel-drum";
    let playing = root.querySelector("[data-exploded-play]")?.getAttribute("aria-pressed") !== "false";
    let speed = Number(root.querySelector("[data-exploded-speed] [aria-checked='true']")?.dataset.speed || 8);

    function applyPresentationState() {
      componentGroups.forEach((assembly, id) => {
        const { config, material } = assembly.userData;
        assembly.position.set(
          config.home[0] + config.explode[0] * depth,
          config.home[1] + config.explode[1] * depth,
          config.home[2] + config.explode[2] * depth,
        );
        const selected = id === selectedId;
        assembly.scale.setScalar(selected ? 1.055 : 1);
        material.color.set(config.color).lerp(new THREE.Color(0xffffff), selected ? 0.24 : 0);
        material.emissive.set(selected ? config.color : 0x000000);
        material.emissiveIntensity = selected ? 0.32 : 0;
      });
    }

    function renderFrame(now) {
      frameRequested = false;
      if (disposed || !visible) return;
      const delta = Math.min(0.05, Math.max(0, (now - lastFrameTime) / 1000));
      lastFrameTime = now;
      if (playing) {
        const nextTime = simulationTime + delta * speed;
        windingTravel += rectifiedRotorTravel(simulationTime, nextTime);
        simulationTime = nextTime;
      }
      applyAnimation(componentGroups, mechanismState(simulationTime, windingTravel));
      const controlsChanged = controls.update();
      renderer.render(scene, camera);
      renderCount += 1;
      renderer.domElement.dataset.renderCount = String(renderCount);
      renderer.domElement.dataset.simulationTime = simulationTime.toFixed(3);
      renderer.domElement.dataset.windingTravel = windingTravel.toFixed(4);
      renderer.domElement.dataset.speed = String(speed);
      renderer.domElement.dataset.playing = String(playing);
      renderer.domElement.dataset.cameraPosition = camera.position.toArray().map((value) => value.toFixed(4)).join(",");
      if (playing || controlsChanged) requestFrame();
    }

    function requestFrame() {
      if (!frameRequested && !disposed && visible) {
        frameRequested = true;
        requestAnimationFrame(renderFrame);
      }
    }

    const resizeObserver = new ResizeObserver(([entry]) => {
      const width = Math.max(1, Math.round(entry.contentRect.width));
      const height = Math.max(1, Math.round(entry.contentRect.height));
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      requestFrame();
    });
    resizeObserver.observe(mount);

    const intersectionObserver = "IntersectionObserver" in window
      ? new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        lastFrameTime = performance.now();
        if (visible) requestFrame();
      }, { rootMargin: "160px" })
      : null;
    intersectionObserver?.observe(mount);
    controls.addEventListener("change", requestFrame);

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let pointerStart = null;
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
      const componentId = raycaster.intersectObjects(pickables, false)[0]?.object.userData.componentId;
      if (componentId) root.dispatchEvent(new CustomEvent("exploded-watch:select", { detail: { id: componentId } }));
    });

    root.addEventListener("exploded-watch:state", (event) => {
      depth = event.detail.depth;
      selectedId = event.detail.selectedId;
      playing = event.detail.playing;
      speed = event.detail.speed;
      root.dataset.animationState = playing ? "playing" : "paused";
      applyPresentationState();
      requestFrame();
    });

    function dispose() {
      if (disposed) return;
      disposed = true;
      window.removeEventListener("pagehide", handlePageHide);
      resizeObserver.disconnect();
      intersectionObserver?.disconnect();
      controls.dispose();
      const geometries = new Set();
      const materials = new Set();
      scene.traverse((object) => {
        if (object.geometry) geometries.add(object.geometry);
        if (object.material) materials.add(object.material);
      });
      geometries.forEach((geometry) => geometry.dispose());
      materials.forEach((material) => material.dispose());
      renderer.dispose();
    }

    function handlePageHide(event) {
      if (!event.persisted) dispose();
    }

    window.addEventListener("pagehide", handlePageHide);
    mount.replaceChildren(renderer.domElement);
    mount.dataset.renderMode = "three";
    root.dataset.threeReady = "true";
    root.dataset.partCount = String(parts.length);
    root.dataset.objectCount = String(pickables.length);
    root.dataset.animationState = playing ? "playing" : "paused";
    applyPresentationState();
    lastFrameTime = performance.now();
    requestFrame();
  }).catch((error) => {
    root.dataset.threeError = error.message;
    renderer.dispose();
  });
}

function init() {
  document.querySelectorAll("[data-exploded-watch]").forEach(initExploder);
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
else init();
