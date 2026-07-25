import fs from "node:fs";
import path from "node:path";

// Ciechanowski-format binary mesh decoder.
// vertices.dat: Float32 interleaved, stride 6 floats (pos.xyz, normal.xyz).
// indices.dat:  Uint32 triangle indices; vertex float offset = index * 6.
// A ranges map { name: [indexOffset, indexCount] } slices the shared index
// buffer into named components (see watch-parts.js modelRanges).

const STRIDE = 6;

function readBinaryMesh(verticesPath, indicesPath) {
  const vBuf = fs.readFileSync(verticesPath);
  const iBuf = fs.readFileSync(indicesPath);
  if (vBuf.byteLength % 24 !== 0) {
    throw new Error(`vertices byte length ${vBuf.byteLength} not a multiple of 24`);
  }
  if (iBuf.byteLength % 4 !== 0) {
    throw new Error(`indices byte length ${iBuf.byteLength} not a multiple of 4`);
  }
  const vertices = new Float32Array(vBuf.buffer, vBuf.byteOffset, vBuf.byteLength / 4);
  const indices = new Uint32Array(iBuf.buffer, iBuf.byteOffset, iBuf.byteLength / 4);
  return { vertices, indices };
}

function extractComponent(name, range, vertices, indices) {
  const [offset, count] = range;
  if (offset < 0 || count < 3 || count % 3 !== 0 || offset + count > indices.length) {
    throw new Error(`Invalid index range for "${name}": [${offset}, ${count}]`);
  }
  const positions = new Float32Array(count * 3);
  const normals = new Float32Array(count * 3);
  const unique = new Set();
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  for (let i = 0; i < count; i += 1) {
    const srcIndex = indices[offset + i];
    unique.add(srcIndex);
    const v = srcIndex * STRIDE;
    if (v + 5 >= vertices.length) throw new Error(`Vertex index out of bounds in "${name}"`);
    const x = vertices[v], y = vertices[v + 1], z = vertices[v + 2];
    const o = i * 3;
    positions[o] = x; positions[o + 1] = y; positions[o + 2] = z;
    normals[o] = vertices[v + 3]; normals[o + 1] = vertices[v + 4]; normals[o + 2] = vertices[v + 5];
    if (x < minX) minX = x; if (y < minY) minY = y; if (z < minZ) minZ = z;
    if (x > maxX) maxX = x; if (y > maxY) maxY = y; if (z > maxZ) maxZ = z;
  }
  return {
    name,
    indexOffset: offset,
    indexCount: count,
    triangles: count / 3,
    uniqueVertices: unique.size,
    bbox: {
      min: [minX, minY, minZ],
      max: [maxX, maxY, maxZ],
      size: [maxX - minX, maxY - minY, maxZ - minZ],
    },
    positions,
    normals,
  };
}

function toObj(component) {
  const lines = [`# ${component.name} (${component.triangles} triangles)`];
  const { positions, normals } = component;
  const vertexCount = positions.length / 3;
  for (let i = 0; i < vertexCount; i += 1) {
    const o = i * 3;
    lines.push(`v ${positions[o]} ${positions[o + 1]} ${positions[o + 2]}`);
  }
  for (let i = 0; i < vertexCount; i += 1) {
    const o = i * 3;
    lines.push(`vn ${normals[o]} ${normals[o + 1]} ${normals[o + 2]}`);
  }
  for (let i = 0; i < vertexCount; i += 3) {
    const a = i + 1, b = i + 2, c = i + 3;
    lines.push(`f ${a}//${a} ${b}//${b} ${c}//${c}`);
  }
  return lines.join("\n") + "\n";
}

function loadRanges(rangesArg) {
  // Accept either a JSON file of { name: [offset, count] } or the
  // watch-parts.js module (extract modelRanges via a tolerant parse).
  const raw = fs.readFileSync(rangesArg, "utf8");
  if (rangesArg.endsWith(".json")) return JSON.parse(raw);
  const match = raw.match(/modelRanges\s*=\s*(\{[\s\S]*?\});/);
  if (!match) throw new Error("Could not locate modelRanges object in ranges source");
  const body = match[1]
    .replace(/([A-Za-z_][A-Za-z0-9_]*)\s*:/g, '"$1":')
    .replace(/,(\s*[}\]])/g, "$1");
  return JSON.parse(body);
}

// The authoritative ciechanowski model table (e.g. watch.js `models = {...}`)
// stores two consecutive index blocks per mesh: a triangle block
// (index_offset/index_count) followed by a wireframe line block
// (line_index_offset/line_index_count). This parses that table into
// { name: [index_offset, index_count] } triangle ranges covering every mesh.
function loadModelTable(tableArg) {
  const raw = fs.readFileSync(tableArg, "utf8");
  const match = raw.match(/models\s*=\s*(\{[\s\S]*?\n\s*\};)/);
  if (!match) throw new Error("Could not locate `models = {...}` table in source");
  const ranges = {};
  const entry = /"([^"]+)"\s*:\s*\{[^}]*?"index_offset"\s*:\s*(\d+)[^}]*?"index_count"\s*:\s*(\d+)/g;
  let m;
  while ((m = entry.exec(match[1])) !== null) {
    ranges[m[1]] = [Number(m[2]), Number(m[3])];
  }
  if (Object.keys(ranges).length === 0) throw new Error("Parsed model table but found no entries");
  return ranges;
}

function parseArgs(argv) {
  const args = { emitObj: false };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--vertices") args.vertices = argv[++i];
    else if (a === "--indices") args.indices = argv[++i];
    else if (a === "--ranges") args.ranges = argv[++i];
    else if (a === "--model-table") args.modelTable = argv[++i];
    else if (a === "--out") args.out = argv[++i];
    else if (a === "--obj") args.emitObj = true;
  }
  return args;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.vertices || !args.indices || (!args.ranges && !args.modelTable)) {
    console.error("Usage: node decode-dat.mjs --vertices <v.dat> --indices <i.dat> (--ranges <watch-parts.js|ranges.json> | --model-table <watch.js>) [--out <dir>] [--obj]");
    process.exit(2);
  }
  const { vertices, indices } = readBinaryMesh(args.vertices, args.indices);
  const ranges = args.modelTable ? loadModelTable(args.modelTable) : loadRanges(args.ranges);
  const names = Object.keys(ranges);

  const components = [];
  let coveredTris = 0;
  for (const name of names) {
    const c = extractComponent(name, ranges[name], vertices, indices);
    coveredTris += c.triangles;
    components.push(c);
    if (args.out && args.emitObj) {
      fs.mkdirSync(args.out, { recursive: true });
      fs.writeFileSync(path.join(args.out, `${name}.obj`), toObj(c));
    }
  }

  // The index buffer holds triangle blocks plus (for ciechanowski model
  // tables) wireframe line blocks. coverageRatio is covered triangle indices
  // over the whole buffer, so a table that also carries line blocks reports
  // ~0.5 by design; coveredTriangles is the authoritative extraction count.
  const coveredIndices = coveredTris * 3;
  const manifest = {
    source: {
      vertices: path.basename(args.vertices),
      indices: path.basename(args.indices),
      vertexCount: vertices.length / STRIDE,
      indexCount: indices.length,
      totalTriangles: indices.length / 3,
    },
    componentCount: components.length,
    coveredTriangles: coveredTris,
    coveredIndices,
    coverageRatio: Number((coveredIndices / indices.length).toFixed(4)),
    components: components.map((c) => ({
      name: c.name,
      indexOffset: c.indexOffset,
      indexCount: c.indexCount,
      triangles: c.triangles,
      uniqueVertices: c.uniqueVertices,
      bbox: c.bbox,
    })),
  };

  if (args.out) {
    fs.mkdirSync(args.out, { recursive: true });
    fs.writeFileSync(path.join(args.out, "manifest.json"), JSON.stringify(manifest, null, 2));
  }
  console.log(JSON.stringify({
    vertexCount: manifest.source.vertexCount,
    totalTriangles: manifest.source.totalTriangles,
    componentCount: manifest.componentCount,
    coveredTriangles: manifest.coveredTriangles,
    coverageRatio: manifest.coverageRatio,
  }, null, 2));
}

main();
