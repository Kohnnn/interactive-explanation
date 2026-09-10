import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { sourceIdentity } from "./diagnose-baseline.mjs";
import { geometryRuntimeRequests, geometrySourceBinding, runtimeRequestsFromJournal, verifyRuntimeRequestCoverage } from "./geometry-review.mjs";

const [root = ".", journal] = process.argv.slice(2);
assert(journal, "Usage: node tools/verify-geometry-runtime-requests.mjs <root> <qualification.jsonl>");
const raw = fs.readFileSync(journal);
assert.equal(createHash("sha256").update(raw).digest("hex"), geometryRuntimeRequests.rawSha256, "Geometry raw artifact differs");
const pages = JSON.parse(fs.readFileSync(path.join(root, "pages.json"), "utf8"));
const manifest = JSON.parse(fs.readFileSync(path.join(root, "routes.manifest.json"), "utf8"));
const identity = sourceIdentity(root);
const { inventories } = geometrySourceBinding(identity, pages, manifest, file => fs.readFileSync(path.join(root, file)));
const requests = runtimeRequestsFromJournal(raw.toString("utf8"));
verifyRuntimeRequestCoverage(requests.paths, inventories, requests.ignoredSchemes);
process.stdout.write(`Verified ${geometryRuntimeRequests.uniqueLocalFiles} local runtime geometry dependencies.\n`);
