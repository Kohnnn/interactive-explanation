import { collide } from "./physics.js";

const form = document.querySelector("#collision-controls");
const results = document.querySelector("#collision-results");
const status = document.querySelector("#collision-status");
const format = (value) => (Math.abs(value) < 0.0005 ? 0 : value).toFixed(3);
const direction = (value) => `${format(Math.abs(value))} m/s ${value === 0 ? "(stationary)" : value > 0 ? "right" : "left"}`;

function setText(id, text) {
  const node = document.getElementById(id);
  if (node) node.textContent = text;
}

function update() {
  try {
    const inputs = Object.fromEntries(["mA", "mB", "uA", "uB", "e"].map((key) => [key, form.elements.namedItem(key).valueAsNumber]));
    const result = collide(inputs);
    for (const [key, value] of Object.entries(inputs)) {
      const unit = key.startsWith("m") ? " kg" : key.startsWith("u") ? " m/s" : "";
      setText(`${key}-value`, value.toFixed(key === "e" ? 2 : 1) + unit);
      form.elements.namedItem(key).setAttribute("aria-valuetext", value.toFixed(key === "e" ? 2 : 1) + unit);
    }
    for (const [id, value] of Object.entries({
      "a-before": inputs.uA, "b-before": inputs.uB, "a-after": result.vA, "b-after": result.vB,
      "momentum-before": result.momentumBefore, "momentum-after": result.momentumAfter,
      "energy-before": result.energyBefore, "energy-after": result.energyAfter,
    })) setText(id, format(value));
    setText("before-diagram", `Before: A ${direction(inputs.uA)}; B ${direction(inputs.uB)}.`);
    setText("after-diagram", `After: A ${direction(result.vA)}; B ${direction(result.vB)}.`);
    setText("energy-explanation", `Kinetic energy lost: ${format(result.energyLost)} J. Total momentum remains ${format(result.momentumAfter)} kg·m/s. ${result.approaching ? inputs.e === 1 ? "Elastic impact: velocities change, but total kinetic energy does not." : inputs.e === 0 ? "Perfectly inelastic limit: both carts leave with the same velocity, not necessarily zero." : "Partially inelastic impact: some translational kinetic energy becomes unmodeled internal energy." : "No impact: the carts are separating or maintaining their gap."}`);
    status.textContent = result.approaching ? `Collision resolved. A leaves at ${format(result.vA)} m/s; B at ${format(result.vB)} m/s. Kinetic energy lost: ${format(result.energyLost)} J.` : "No approach: no collision impulse. Both velocities stay unchanged.";
    results.hidden = false;
    form.dataset.ready = "true";
  } catch (error) {
    results.hidden = true;
    status.textContent = `Calculation unavailable: ${error.message} Use Reset inputs to recover.`;
  }
}

if (form && results && status) {
  form.addEventListener("input", update);
  form.addEventListener("submit", (event) => event.preventDefault());
  form.addEventListener("reset", (event) => {
    event.preventDefault();
    for (const input of form.querySelectorAll("input")) input.value = input.defaultValue;
    update();
  });
  update();
}
