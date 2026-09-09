import test from "node:test";
import assert from "node:assert/strict";
import { collide } from "../../rigid-body-collisions/physics.js";

const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} != ${expected}`);
const initial = { mA: 1, mB: 1, uA: 2, uB: 0, e: 1 };

test("equal masses exchange velocities in an elastic impact", () => {
  const r = collide(initial);
  close(r.vA, 0);
  close(r.vB, 2);
  close(r.energyBefore, r.energyAfter);
});

test("unequal masses and perfectly inelastic limits", () => {
  const elastic = collide({ ...initial, mB: 3 });
  close(elastic.vA, -1);
  close(elastic.vB, 1);
  const inelastic = collide({ ...initial, mB: 3, e: 0 });
  close(inelastic.vA, 0.5);
  close(inelastic.vB, 0.5);
  close(inelastic.energyLost, 1.5);
});

test("separating, stationary and co-moving carts get no impulse", () => {
  for (const [uA, uB] of [[-2, 2], [0, 0], [2, 2], [-5, -2]]) {
    const r = collide({ ...initial, uA, uB, e: 0 });
    assert.equal(r.approaching, false);
    close(r.vA, uA);
    close(r.vB, uB);
    close(r.energyLost, 0);
  }
});

test("bounded grid conserves momentum, restitution and energy accounting without NaN", () => {
  for (const mA of [0.1, 1, 3, 10]) for (const mB of [0.1, 1, 3, 10]) {
    for (const uA of [-10, -2, 0, 2, 10]) for (const uB of [-10, -2, 0, 2, 10]) {
      for (const e of [0, 0.05, 0.5, 0.95, 1]) {
        const r = collide({ mA, mB, uA, uB, e });
        for (const value of Object.values(r)) if (typeof value === "number") assert.ok(Number.isFinite(value));
        close(r.momentumAfter, r.momentumBefore);
        close(r.energyAfter + r.energyLost, r.energyBefore);
        assert.ok(r.energyAfter <= r.energyBefore + 1e-9);
        if (r.approaching) close(r.vB - r.vA, e * (uA - uB));
      }
    }
  }
});

test("invalid inputs are rejected rather than coerced or propagated", () => {
  for (const key of Object.keys(initial)) {
    for (const value of [NaN, Infinity, -Infinity, undefined, null, "1", {}, true]) {
      assert.throws(() => collide({ ...initial, [key]: value }), RangeError);
    }
  }
  for (const invalid of [{ mA: 0 }, { mB: -1 }, { mA: 0.01 }, { mB: 11 }, { uA: 11 }, { uB: -11 }, { e: -0.1 }, { e: 1.1 }]) {
    assert.throws(() => collide({ ...initial, ...invalid }), RangeError);
  }
  assert.throws(() => collide(), RangeError);
});
