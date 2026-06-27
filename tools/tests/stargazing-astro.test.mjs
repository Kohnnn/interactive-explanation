import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Module } from "node:module";

// The module under test is a classic (non-ESM) browser script that assigns to
// module.exports via a dual-export shim. The repo's package.json sets
// "type": "module", so a bare require() would load the file as ESM and miss the
// shim; we instead compile it as CommonJS via node:module, which runs the
// module.exports branch exactly as a classic <script> + window shim would.
const here = path.dirname(fileURLToPath(import.meta.url));
const astroPath = path.resolve(here, "..", "..", "stargazing-dashboard", "js", "astro.js");

function loadClassicScript(filePath) {
  const source = fs.readFileSync(filePath, "utf8");
  const mod = new Module(filePath, null);
  mod.filename = filePath;
  mod.paths = Module._nodeModulePaths(path.dirname(filePath));
  mod._compile(source, filePath);
  return mod.exports;
}

const astro = loadClassicScript(astroPath);

// Reference epoch J2000.0 = 2000-01-01T12:00:00Z -> JD 2451545.0.
const J2000_DATE = new Date(Date.UTC(2000, 0, 1, 12, 0, 0));
const J2000_JD = 2451545.0;

// Ground-truth geocentric J2000 coordinates at JD 2451545.0 sampled from the
// JPL Horizons API (CENTER=500@399, ANG_FORMAT=DEG, REF_SYSTEM=J2000):
//   Sun    RA 281.28898 deg  dec -23.03325 deg
//   Moon   RA 222.45893 deg  dec -10.90338 deg  illum 23.006%
//   Venus  RA 239.90118 deg  dec -18.45185 deg
const REF = {
  sun: { raHours: 281.28898 / 15, decDeg: -23.03325 },
  moon: { raHours: 222.45893 / 15, decDeg: -10.90338, phaseFraction: 0.23006 },
  venus: { raHours: 239.90118 / 15, decDeg: -18.45185 },
};

test("julianDate: J2000 epoch maps to JD 2451545.0", () => {
  assert.ok(Math.abs(astro.julianDate(J2000_DATE) - J2000_JD) < 1e-6);
});

test("julianDate: one day later advances JD by exactly 1.0", () => {
  const next = new Date(Date.UTC(2000, 0, 2, 12, 0, 0));
  assert.ok(Math.abs(astro.julianDate(next) - (J2000_JD + 1)) < 1e-6);
});

test("gmstHours: matches Meeus reference 18.697374558h at J2000", () => {
  assert.ok(Math.abs(astro.gmstHours(J2000_JD) - 18.697374558) < 1e-4);
});

test("gmstHours: result is normalized into [0, 24)", () => {
  const g = astro.gmstHours(J2000_JD + 123.456);
  assert.ok(g >= 0 && g < 24);
});

test("lstHours: longitude 0 equals GMST", () => {
  assert.ok(Math.abs(astro.lstHours(J2000_JD, 0) - astro.gmstHours(J2000_JD)) < 1e-9);
});

test("lstHours: +15 deg longitude advances LST by 1 hour", () => {
  const base = astro.lstHours(J2000_JD, 0);
  const shifted = astro.lstHours(J2000_JD, 15);
  const diff = ((shifted - base) % 24 + 24) % 24;
  assert.ok(Math.abs(diff - 1) < 1e-6);
});

test("equatorialToHorizontal: object at observer zenith has alt ~90", () => {
  const observer = { latDeg: 40, lonDeg: -100 };
  const lst = astro.lstHours(J2000_JD, observer.lonDeg);
  // At the zenith hour angle = 0 (RA == LST) and dec == latitude.
  const horiz = astro.equatorialToHorizontal(
    { raHours: lst, decDeg: observer.latDeg },
    observer,
    J2000_JD,
  );
  assert.ok(Math.abs(horiz.altDeg - 90) < 1e-6);
});

test("equatorialToHorizontal: celestial pole altitude equals latitude", () => {
  const observer = { latDeg: 35, lonDeg: 12 };
  const horiz = astro.equatorialToHorizontal(
    { raHours: 6, decDeg: 90 },
    observer,
    J2000_JD,
  );
  assert.ok(Math.abs(horiz.altDeg - observer.latDeg) < 1e-6);
});

test("equatorialToHorizontal: azimuth stays within [0, 360)", () => {
  const observer = { latDeg: 51.5, lonDeg: -0.13 };
  const horiz = astro.equatorialToHorizontal(
    { raHours: 10, decDeg: 20 },
    observer,
    J2000_JD,
  );
  assert.ok(horiz.azDeg >= 0 && horiz.azDeg < 360);
});

test("sunPosition: RA close to 18.75h at J2000", () => {
  const sun = astro.sunPosition(J2000_JD);
  assert.ok(Math.abs(sun.raHours - REF.sun.raHours) < 0.05);
});

test("sunPosition: declination close to -23.03 deg at J2000", () => {
  const sun = astro.sunPosition(J2000_JD);
  assert.ok(Math.abs(sun.decDeg - REF.sun.decDeg) < 0.5);
});

test("moonPosition: RA within 1.5 deg of reference", () => {
  const moon = astro.moonPosition(J2000_JD);
  const raDeg = moon.raHours * 15;
  assert.ok(Math.abs(raDeg - REF.moon.raHours * 15) < 1.5);
});

test("moonPosition: declination within 1.5 deg of reference", () => {
  const moon = astro.moonPosition(J2000_JD);
  assert.ok(Math.abs(moon.decDeg - REF.moon.decDeg) < 1.5);
});

test("moonPosition: phaseFraction in [0,1] and within 0.05 of reference", () => {
  const moon = astro.moonPosition(J2000_JD);
  assert.ok(moon.phaseFraction >= 0 && moon.phaseFraction <= 1);
  assert.ok(Math.abs(moon.phaseFraction - REF.moon.phaseFraction) < 0.05);
});

test("planetPosition: Venus RA within 1 deg of reference", () => {
  const venus = astro.planetPosition("venus", J2000_JD);
  const raDeg = venus.raHours * 15;
  assert.ok(Math.abs(raDeg - REF.venus.raHours * 15) < 1);
});

test("planetPosition: Venus declination within 1 deg of reference", () => {
  const venus = astro.planetPosition("venus", J2000_JD);
  assert.ok(Math.abs(venus.decDeg - REF.venus.decDeg) < 1);
});
