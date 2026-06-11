import test from "node:test";
import assert from "node:assert/strict";

import "../../shared/route-families.js";

const RouteFamilies = globalThis.RouteFamilies;

function route(slug, referenceUrl, extra) {
  return Object.assign({ slug, referenceUrl }, extra || {});
}

test("classifySiteFamily maps known hosts to site keys", () => {
  assert.equal(RouteFamilies.classifySiteFamily(route("trust", "https://ncase.me/trust/")), "nicky-case");
  assert.equal(RouteFamilies.classifySiteFamily(route("a", "https://mlu-explain.github.io/x/")), "mlu-explain");
  assert.equal(RouteFamilies.classifySiteFamily(route("pi", "https://setosa.io/ev/pi/")), "setosa");
  assert.equal(RouteFamilies.classifySiteFamily(route("b", "https://andersbrownworth.com/x/")), "anders-brownworth");
  assert.equal(RouteFamilies.classifySiteFamily(route("watch", "https://ciechanow.ski/mechanical-watch/")), "engineering-longform");
  assert.equal(RouteFamilies.classifySiteFamily(route("c", "https://learningmusic.ableton.com/x")), "ableton");
  assert.equal(RouteFamilies.classifySiteFamily(route("d", "https://learningsynths.ableton.com/x")), "ableton");
  assert.equal(RouteFamilies.classifySiteFamily(route("e", "https://teoria.com/x")), "teoria");
  assert.equal(RouteFamilies.classifySiteFamily(route("song", "https://musiclab.chromeexperiments.com/Song-Maker/")), "music-tools");
  assert.equal(RouteFamilies.classifySiteFamily(route("map", "https://musicmap.info/")), "music-tools");
  assert.equal(RouteFamilies.classifySiteFamily(route("f", "https://samwho.dev/x")), "samwho");
});

test("classifySiteFamily strips www and ignores path", () => {
  assert.equal(RouteFamilies.classifySiteFamily(route("g", "https://www.teoria.com/en/exercises/")), "teoria");
});

test("classifySiteFamily folds smaller families into independent-labs", () => {
  assert.equal(RouteFamilies.classifySiteFamily(route("h", "https://joshuahhh.com/x/")), "independent-labs");
  assert.equal(RouteFamilies.classifySiteFamily(route("i", "https://sassnow.ski/x/")), "independent-labs");
  assert.equal(RouteFamilies.classifySiteFamily(route("j", "https://example.com/unknown")), "independent-labs");
});

test("classifySiteFamily treats hubs, neutral, and missing url as local-hubs", () => {
  assert.equal(RouteFamilies.classifySiteFamily(route("blockchain-101-combined-flow", "https://ncase.me/x")), "local-hubs");
  assert.equal(RouteFamilies.classifySiteFamily(route("music-interactive-hub", "https://teoria.com/x")), "local-hubs");
  assert.equal(RouteFamilies.classifySiteFamily(route("primary-interactive-hub", "https://github.com/ncase")), "local-hubs");
  assert.equal(RouteFamilies.classifySiteFamily(route("k", undefined, { referenceMode: "neutral" })), "local-hubs");
  assert.equal(RouteFamilies.classifySiteFamily(route("l", "")), "local-hubs");
});

test("classifySmokeFamily maps reference urls to smoke keys", () => {
  assert.equal(RouteFamilies.classifySmokeFamily(route("trust", "https://ncase.me/trust/")), "ncase");
  assert.equal(RouteFamilies.classifySmokeFamily(route("a", "https://github.com/ncase?tab=repositories")), "ncase");
  assert.equal(RouteFamilies.classifySmokeFamily(route("b", "https://mlu-explain.github.io/x/")), "mlu");
  assert.equal(RouteFamilies.classifySmokeFamily(route("c", "https://andersbrownworth.com/x/")), "anders");
  assert.equal(RouteFamilies.classifySmokeFamily(route("d", "https://musicmap.info/")), "musicmap");
  assert.equal(RouteFamilies.classifySmokeFamily(route("e", "https://joshuahhh.com/x/")), "horowitz");
  assert.equal(RouteFamilies.classifySmokeFamily(route("f", "https://sassnow.ski/x/")), "sassnowski");
});

test("classifySmokeFamily defaults to custom for hubs and unknowns", () => {
  assert.equal(RouteFamilies.classifySmokeFamily(route("blockchain-101-combined-flow", "https://ncase.me/x")), "custom");
  assert.equal(RouteFamilies.classifySmokeFamily(route("music-interactive-hub", "https://teoria.com/x")), "custom");
  assert.equal(RouteFamilies.classifySmokeFamily(route("g", "https://example.com/unknown")), "custom");
  // Chrome Music Lab has a site family but no smoke family.
  assert.equal(RouteFamilies.classifySmokeFamily(route("song", "https://musiclab.chromeexperiments.com/Song-Maker/")), "custom");
});

test("classifySmokeGroups adds the music group for music families", () => {
  assert.deepEqual([...RouteFamilies.classifySmokeGroups(route("e", "https://teoria.com/x"))].sort(), ["music", "teoria"]);
  assert.deepEqual([...RouteFamilies.classifySmokeGroups(route("m", "https://musicmap.info/"))].sort(), ["music", "musicmap"]);
  assert.deepEqual([...RouteFamilies.classifySmokeGroups(route("c", "https://learningmusic.ableton.com/x"))].sort(), ["ableton", "music"]);
  assert.deepEqual(
    [...RouteFamilies.classifySmokeGroups(route("music-interactive-hub", "https://example.com/x"))].sort(),
    ["custom", "music"],
  );
});

test("classifySmokeGroups leaves non-music families single-group", () => {
  assert.deepEqual([...RouteFamilies.classifySmokeGroups(route("trust", "https://ncase.me/trust/"))], ["ncase"]);
  assert.deepEqual([...RouteFamilies.classifySmokeGroups(route("g", "https://example.com/unknown"))], ["custom"]);
});

test("getReferenceHost is robust to malformed urls", () => {
  assert.equal(RouteFamilies.getReferenceHost("not a url"), null);
  assert.equal(RouteFamilies.getReferenceHost(""), null);
  assert.equal(RouteFamilies.getReferenceHost("https://www.example.com/x"), "example.com");
});
