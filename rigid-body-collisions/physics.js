export function collide({ mA, mB, uA, uB, e } = {}) {
  for (const [name, value, min, max] of [
    ["mA", mA, 0.1, 10], ["mB", mB, 0.1, 10],
    ["uA", uA, -10, 10], ["uB", uB, -10, 10], ["e", e, 0, 1],
  ]) {
    if (!Number.isFinite(value) || value < min || value > max) {
      throw new RangeError(`${name} must be a finite number from ${min} to ${max}.`);
    }
  }
  const approaching = uA > uB;
  const impulse = approaching ? (1 + e) * (uA - uB) / (1 / mA + 1 / mB) : 0;
  const vA = uA - impulse / mA;
  const vB = uB + impulse / mB;
  const momentumBefore = mA * uA + mB * uB;
  const momentumAfter = mA * vA + mB * vB;
  const energyBefore = (mA * uA ** 2 + mB * uB ** 2) / 2;
  const energyAfter = (mA * vA ** 2 + mB * vB ** 2) / 2;
  const energyLost = approaching ? mA * mB / (mA + mB) * (1 - e ** 2) * (uA - uB) ** 2 / 2 : 0;
  return { approaching, vA, vB, momentumBefore, momentumAfter, energyBefore, energyAfter, energyLost };
}
