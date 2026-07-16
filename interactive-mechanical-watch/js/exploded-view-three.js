import * as THREE from "../vendor/three/three.module.min.js";
import { OrbitControls } from "../vendor/three/OrbitControls.js";

const modelRanges = {
  Balance_bridge: [23352, 6942],
  Balance_safety: [38826, 1224],
  Balance_shaft_end: [41298, 687],
  Balance_spring_base: [42141, 564],
  Balance_wheel: [43329, 3006],
  Barrel_arbor: [49353, 3483],
  Barrel_bridge: [56388, 8646],
  Barrel_lid: [83178, 3036],
  Barrel_main: [89250, 7020],
  Click_spring: [107934, 1140],
  Click: [110256, 672],
  Crown_wheel: [114396, 1620],
  Crown: [117096, 1200],
  Dial: [151356, 1524],
  Escape_wheel: [154440, 4938],
  Fourth_wheel: [164976, 2064],
  Hour_hand: [168660, 744],
  Jewel_bearing: [173064, 666],
  Mainplate: [180282, 28308],
  Mainspring_base: [237546, 1350],
  Minute_hand: [240834, 588],
  Pallet_fork_horn: [254610, 1134],
  Pallet_fork: [256914, 1848],
  Pallet_jewel_1: [260742, 48],
  Pallet_jewel_2: [260880, 36],
  Ratchet_wheel: [261966, 1128],
  Reversing_wheel_bottom: [263166, 5838],
  Reversing_wheel_lever: [283170, 960],
  Reversing_wheel_top: [285102, 4302],
  Second_hand: [294942, 372],
  Second_wheel: [295734, 2262],
  Third_wheel: [339651, 2112],
  Train_bridge: [343419, 6312],
  Weight: [360093, 4440],
  Winding_stem: [373155, 897],
  Yoke: [375186, 1512],
};

const componentConfigs = [
  { id: "case", color: "#66717c", home: [0, 0, 0], explode: [0, 0, 12], primitive: "case" },
  { id: "dial", color: "#d8d3c8", home: [0, 0, 1.9], explode: [0, 0, 10], models: ["Dial"] },
  { id: "hour-hand", color: "#d6dce2", home: [0, 0, 2.25], explode: [-1.2, 0, 12], models: ["Hour_hand"] },
  { id: "minute-hand", color: "#eef1f3", home: [0, 0, 2.5], explode: [0, 0, 14], models: ["Minute_hand"] },
  { id: "second-hand", color: "#c54b4b", home: [0, 0, 2.75], explode: [1.2, 0, 16], models: ["Second_hand"] },
  { id: "mainplate", color: "#aeb5bb", home: [0, 0, 0], explode: [0, 0, 0], models: ["Mainplate"] },
  { id: "barrel", color: "#d8a657", home: [5.78, 2.89, 0.45], explode: [2.2, 1.2, 4], models: ["Barrel_main", "Barrel_lid", "Barrel_arbor"] },
  { id: "mainspring", color: "#f0c879", home: [5.78, 2.89, 0.8], explode: [2.8, 1.5, 6], models: ["Mainspring_base"], primitive: "mainspring" },
  { id: "barrel-bridge", color: "#9ba1a8", home: [3.3, 3.2, -0.8], explode: [2.4, 2, -5], models: ["Barrel_bridge"] },
  { id: "ratchet-wheel", color: "#c98c4a", home: [5.78, 2.89, -1.2], explode: [3.8, 2.4, -7], models: ["Ratchet_wheel"] },
  { id: "click", color: "#7fb069", home: [-3.2, 6.1, -1.1], explode: [-2, 3.2, -7], models: ["Click", "Click_spring"] },
  { id: "crown-wheel", color: "#d0a05f", home: [0.58, 6.98, -1.1], explode: [0.4, 4, -7], models: ["Crown_wheel"] },
  { id: "crown-stem", color: "#768397", home: [0, 10.6, 0.2], explode: [0, 5.5, 1], models: ["Crown", "Winding_stem"] },
  { id: "yoke", color: "#87a7bd", home: [-5.7, 8.2, 0.35], explode: [-3.5, 4.4, 3], models: ["Yoke"] },
  { id: "center-wheel", color: "#cbb47a", home: [6.02, -4.14, 0.45], explode: [3.2, -2.2, 3], models: ["Second_wheel"] },
  { id: "third-wheel", color: "#b7c27a", home: [2.49, -2.77, 0.5], explode: [1.4, -2.4, 4], models: ["Third_wheel"] },
  { id: "fourth-wheel", color: "#86b989", home: [0, 0, 0.55], explode: [0, -1.4, 5], models: ["Fourth_wheel"] },
  { id: "escape-wheel", color: "#70b8c8", home: [-2.07, -3.03, 0.6], explode: [-1.5, -2.8, 5], models: ["Escape_wheel"] },
  { id: "train-bridge", color: "#9da5ad", home: [0.2, -3.5, -0.85], explode: [0, -3.4, -5], models: ["Train_bridge"] },
  { id: "pallet-fork", color: "#6bb7d6", home: [-4.3, -1.33, 0.75], explode: [-3, -1, 6], models: ["Pallet_fork", "Pallet_fork_horn"] },
  { id: "pallet-jewels", color: "#d95d78", home: [-4.3, -1.33, 0.95], explode: [-4, -1.5, 8], models: ["Pallet_jewel_1", "Pallet_jewel_2"], transparent: true },
  { id: "balance-wheel", color: "#c7a86b", home: [-6.54, 0.38, 0.65], explode: [-4, 1, 5], models: ["Balance_wheel", "Balance_spring_base", "Balance_safety", "Balance_shaft_end"] },
  { id: "hairspring", color: "#9ed0d8", home: [-6.54, 0.38, 1], explode: [-4.6, 1.4, 8], primitive: "hairspring" },
  { id: "balance-bridge", color: "#9ba1a8", home: [-6.2, 2.8, -0.75], explode: [-4.2, 2.8, -5], models: ["Balance_bridge"] },
  { id: "jewels", color: "#d95d78", home: [0, 0, 0.35], explode: [0, 0, 6], models: ["Jewel_bearing"], instances: [[6, -4, 0], [2.5, -2.8, 0], [0, 0, 0], [-2.1, -3, 0], [-4.3, -1.3, 0], [-6.5, 0.4, 0]], transparent: true },
  { id: "rotor", color: "#676d78", home: [0, 0, -1.8], explode: [0, 0, -12], models: ["Weight"] },
  { id: "reversers", color: "#7991c8", home: [-1.2, -4, -1.25], explode: [-1.2, -3.2, -9], models: ["Reversing_wheel_top", "Reversing_wheel_bottom", "Reversing_wheel_lever"], instances: [[-2.1, 0, 0], [2.1, 0, 0]] },
];

function createMaterial(config) {
  return new THREE.MeshStandardMaterial({
    color: config.color,
    metalness: config.transparent ? 0.12 : 0.72,
    roughness: config.transparent ? 0.24 : 0.34,
    transparent: Boolean(config.transparent),
    opacity: config.transparent ? 0.86 : 1,
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
      const vertexIndex = indices[i];
      const vertexOffset = vertexIndex * 6;
      if (vertexOffset + 5 >= vertices.length) {
        throw new Error(`Vertex index out of bounds for watch model: ${name}`);
      }
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

function createSpiralGeometry(radius, turns, tubeRadius) {
  const points = [];
  const segments = 128;
  for (let i = 0; i <= segments; i += 1) {
    const progress = i / segments;
    const angle = progress * turns * Math.PI * 2;
    const currentRadius = 0.55 + (radius - 0.55) * progress;
    points.push(new THREE.Vector3(
      Math.cos(angle) * currentRadius,
      Math.sin(angle) * currentRadius,
      0,
    ));
  }
  return new THREE.TubeGeometry(
    new THREE.CatmullRomCurve3(points),
    segments * 2,
    tubeRadius,
    6,
    false,
  );
}

function createCaseGeometry() {
  const shape = new THREE.Shape();
  shape.absarc(0, 0, 14.5, 0, Math.PI * 2, false);
  const hole = new THREE.Path();
  hole.absarc(0, 0, 13.2, 0, Math.PI * 2, true);
  shape.holes.push(hole);
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 1,
    bevelEnabled: true,
    bevelSegments: 2,
    bevelSize: 0.22,
    bevelThickness: 0.18,
    curveSegments: 96,
  });
  geometry.translate(0, 0, -0.5);
  return geometry;
}

function addMesh(group, geometry, material, componentId, position = [0, 0, 0]) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.fromArray(position);
  mesh.userData.componentId = componentId;
  group.add(mesh);
  return mesh;
}

function createComponent(config, vertices, indices) {
  const group = new THREE.Group();
  const material = createMaterial(config);
  let geometry = null;

  if (config.models) {
    geometry = createBinaryGeometry(config.models, vertices, indices);
    const positions = config.instances || [[0, 0, 0]];
    positions.forEach((position) => addMesh(group, geometry, material, config.id, position));
  }

  if (config.primitive === "case") {
    geometry = createCaseGeometry();
    addMesh(group, geometry, material, config.id);
  }

  if (config.primitive === "mainspring") {
    const spring = createSpiralGeometry(5, 6.5, 0.13);
    addMesh(group, spring, material, config.id, [0, 0, 0.45]);
  }

  if (config.primitive === "hairspring") {
    geometry = createSpiralGeometry(4.8, 7.5, 0.075);
    addMesh(group, geometry, material, config.id);
  }

  group.userData.config = config;
  group.userData.material = material;
  return group;
}

async function loadMovementGeometry() {
  const [vertexResponse, indexResponse] = await Promise.all([
    fetch("./models/watch_vertices.dat"),
    fetch("./models/watch_indices.dat"),
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
  return {
    vertices: new Float32Array(vertexBuffer),
    indices: new Uint32Array(indexBuffer),
  };
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
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 180);
    camera.position.set(27, -31, 28);
    camera.up.set(0, 0, 1);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0, 0.5);
    controls.enableDamping = false;
    controls.minDistance = 24;
    controls.maxDistance = 72;
    controls.maxPolarAngle = Math.PI * 0.94;
    controls.update();

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x080a0d, 0);
    renderer.domElement.className = "exploded-watch__webgl";
    renderer.domElement.setAttribute("aria-hidden", "true");
    renderer.domElement.dataset.componentCount = String(componentConfigs.length);

    scene.add(new THREE.HemisphereLight(0xf8f2e8, 0x161d28, 2.3));
    const keyLight = new THREE.DirectionalLight(0xffe0a3, 4.2);
    keyLight.position.set(12, -18, 32);
    scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight(0x8fc8ef, 2.2);
    fillLight.position.set(-24, 16, 18);
    scene.add(fillLight);

    const componentGroups = new Map();
    const pickables = [];
    componentConfigs.forEach((config) => {
      const group = createComponent(config, vertices, indices);
      componentGroups.set(config.id, group);
      group.traverse((object) => {
        if (object.isMesh) pickables.push(object);
      });
      scene.add(group);
    });

    let visible = true;
    let disposed = false;
    let renderQueued = false;
    let renderCount = 0;
    let depth = Number(root.querySelector("[data-exploded-depth]")?.value || 74) / 100;
    let selectedId = root.querySelector("[data-exploded-parts] .is-selected")?.dataset.componentId || "barrel";

    function renderScene() {
      renderQueued = false;
      if (!disposed && visible) {
        renderer.render(scene, camera);
        renderCount += 1;
        renderer.domElement.dataset.renderCount = String(renderCount);
      }
    }

    function requestRender() {
      if (!renderQueued && !disposed) {
        renderQueued = true;
        requestAnimationFrame(renderScene);
      }
    }

    function applyState() {
      componentGroups.forEach((group, id) => {
        const { config, material } = group.userData;
        group.position.set(
          config.home[0] + config.explode[0] * depth,
          config.home[1] + config.explode[1] * depth,
          config.home[2] + config.explode[2] * depth,
        );
        const selected = id === selectedId;
        group.scale.setScalar(selected ? 1.045 : 1);
        material.color.set(config.color).lerp(new THREE.Color(0xffffff), selected ? 0.2 : 0);
        material.emissive.set(selected ? config.color : 0x000000);
        material.emissiveIntensity = selected ? 0.24 : 0;
      });
      requestRender();
    }

    const resizeObserver = new ResizeObserver(([entry]) => {
      const width = Math.max(1, Math.round(entry.contentRect.width));
      const height = Math.max(1, Math.round(entry.contentRect.height));
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      requestRender();
    });
    resizeObserver.observe(mount);

    const intersectionObserver = "IntersectionObserver" in window
      ? new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        if (visible) requestRender();
      }, { rootMargin: "160px" })
      : null;
    intersectionObserver?.observe(mount);

    controls.addEventListener("change", requestRender);

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
      if (componentId) {
        root.dispatchEvent(new CustomEvent("exploded-watch:select", { detail: { id: componentId } }));
      }
    });

    root.addEventListener("exploded-watch:state", (event) => {
      depth = event.detail.depth;
      selectedId = event.detail.selectedId;
      applyState();
    });

    function handlePageHide(event) {
      if (!event.persisted) dispose();
    }

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

    window.addEventListener("pagehide", handlePageHide);
    mount.replaceChildren(renderer.domElement);
    mount.dataset.renderMode = "three";
    root.dataset.threeReady = "true";
    applyState();
  }).catch((error) => {
    root.dataset.threeError = error.message;
    renderer.dispose();
  });
}

function init() {
  document.querySelectorAll("[data-exploded-watch]").forEach(initExploder);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
