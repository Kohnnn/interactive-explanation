(function () {
  const overviewComponents = {
    "front-wing": {
      group: "Aero control surface",
      title: "Front wing",
      summary: "The front wing creates front load and shapes the quality of the airflow that the rest of the car receives.",
      points: [
        "Sets the first big balance decision between front bite and straight-line cost.",
        "Conditions the flow feeding the floor and front tyre wake paths.",
        "Becomes especially sensitive in dirty air because disturbed flow hurts front authority first.",
      ],
    },
    floor: {
      group: "Ground-effect platform",
      title: "Floor",
      summary: "The floor is the main modern downforce device, accelerating airflow under the car to create low pressure and support.",
      points: [
        "Produces a huge share of total load once the ride platform is stable.",
        "Depends on ride height, pitch, yaw, and edge sealing quality.",
        "Can gain load quickly, but also becomes fragile when the operating window narrows too far.",
      ],
    },
    diffuser: {
      group: "Underbody recovery",
      title: "Diffuser",
      summary: "The diffuser is the rear expansion region that helps the underfloor recover its accelerated flow instead of separating abruptly.",
      points: [
        "Turns a fast low-pressure underbody stream into useful rear support.",
        "Works best when the floor upstream stays attached and predictable.",
        "Loses effectiveness quickly when the platform gets too low or too pitch-sensitive.",
      ],
    },
    "power-unit": {
      group: "Hybrid energy system",
      title: "Power unit",
      summary: "The modern Formula 1 power unit is a turbo-hybrid energy system built around combustion, recovery, deployment, and cooling limits.",
      points: [
        "Combines a turbocharged V6 with electrical recovery and deployment.",
        "Shapes acceleration, top speed, and energy availability later in the lap.",
        "Shares packaging and thermal constraints with the bodywork around it.",
      ],
    },
    tyres: {
      group: "Grip bottleneck",
      title: "Tyres",
      summary: "The tyres are the final performance limiter. Every aerodynamic and mechanical gain still has to survive inside their grip and thermal windows.",
      points: [
        "Translate vertical load into usable braking and cornering authority.",
        "Change behavior with compound, temperature, wear, pressure, and slip.",
        "Punish over-ambitious setup choices by overheating or falling away over a stint.",
      ],
    },
    brakes: {
      group: "Entry control",
      title: "Brakes",
      summary: "Brakes do more than stop the car. They move load forward, change floor attitude, and interact with recovery systems and tyre state.",
      points: [
        "Define braking distance and entry confidence.",
        "Interact with bias settings and front or rear lockup risk.",
        "Create one of the clearest tradeoffs between stability and rotation.",
      ],
    },
    "rear-wing": {
      group: "Rear load and drag",
      title: "Rear wing",
      summary: "The rear wing trades straight-line efficiency for rear support and confidence in high-speed corners.",
      points: [
        "Creates rear downforce and stabilizes the car on entry and through fast corners.",
        "Adds drag that hurts top speed on long straights.",
        "Works with DRS to shift the straight-line versus cornering balance on demand.",
      ],
    },
    sidepods: {
      group: "Cooling and flow shaping",
      title: "Sidepods",
      summary: "The sidepods are packaging tools for cooling and body-side flow management rather than simple visual styling features.",
      points: [
        "House and feed cooling hardware around the power unit package.",
        "Influence how airflow reaches the beam wing, coke bottle, and diffuser zone.",
        "Force compromises between thermal margin and aerodynamic cleanliness.",
      ],
    },
    gearbox: {
      group: "Driveline structure",
      title: "Gearbox",
      summary: "The gearbox transfers torque to the rear axle while also acting as a structural and packaging anchor for the rear of the car.",
      points: [
        "Connects power delivery to the rear wheels.",
        "Supports the rear suspension and shapes packaging around the diffuser inlet region.",
        "Contributes to both reliability and rear-end packaging constraints.",
      ],
    },
    halo: {
      group: "Safety structure",
      title: "Halo",
      summary: "The halo is primarily a safety device, but like every exposed piece on the car it also has aerodynamic consequences that the package has to absorb.",
      points: [
        "Protects the driver against large debris and severe impact scenarios.",
        "Adds mass high on the chassis and influences packaging around the cockpit.",
        "Creates a small aerodynamic disturbance that surrounding surfaces must manage.",
      ],
    },
  };

  const powerModes = {
    harvest: {
      ice: 68,
      deploy: 32,
      harvest: 78,
      cooling: 88,
      note: "Harvest mode trims peak deployment so the car can refill electrical energy and protect thermal headroom.",
    },
    balanced: {
      ice: 82,
      deploy: 58,
      harvest: 54,
      cooling: 68,
      note: "Balanced mode spreads the lap between sensible deployment and enough recovery to avoid an empty battery later in the run.",
    },
    attack: {
      ice: 94,
      deploy: 86,
      harvest: 24,
      cooling: 42,
      note: "Attack mode spends electrical energy aggressively for exits and straights, but it narrows thermal and energy margin very quickly.",
    },
  };

  const tyreCompounds = {
    soft: {
      title: "Soft compound",
      baseGrip: 95,
      wearRate: 1.15,
      loadPenalty: 0.34,
      windowLow: 88,
      windowHigh: 106,
      windowMid: 97,
      points: [
        "Best for short high-grip bursts and fast warm-up.",
        "Narrowest thermal margin of the dry compounds.",
        "Strong qualifying or short-attack option if the axle stays alive.",
      ],
    },
    medium: {
      title: "Medium compound",
      baseGrip: 88,
      wearRate: 0.82,
      loadPenalty: 0.28,
      windowLow: 86,
      windowHigh: 108,
      windowMid: 97,
      points: [
        "The best compromise compound for many race stints.",
        "Gives away a little bite to buy back more thermal range.",
        "Often the safest reference tire when the track is evolving.",
      ],
    },
    hard: {
      title: "Hard compound",
      baseGrip: 81,
      wearRate: 0.58,
      loadPenalty: 0.22,
      windowLow: 90,
      windowHigh: 112,
      windowMid: 101,
      points: [
        "Built for longer stints and higher abuse tolerance.",
        "Needs more energy before it feels fully alive.",
        "Can resist overheating well but may underdeliver in cool conditions.",
      ],
    },
    intermediate: {
      title: "Intermediate tyre",
      baseGrip: 74,
      wearRate: 0.72,
      loadPenalty: 0.24,
      windowLow: 62,
      windowHigh: 82,
      windowMid: 72,
      points: [
        "For crossover conditions where the track is damp, not flooded.",
        "Moves water well while still behaving closer to a slick than a full wet.",
        "Quickly overheats if the line dries too much.",
      ],
    },
    wet: {
      title: "Wet tyre",
      baseGrip: 66,
      wearRate: 0.64,
      loadPenalty: 0.18,
      windowLow: 48,
      windowHigh: 68,
      windowMid: 58,
      points: [
        "Built for standing water and heavy spray.",
        "Can survive deep wet conditions by moving a large water volume.",
        "Overheats immediately once the track becomes too dry.",
      ],
    },
  };

  const tracks = {
    monza: {
      title: "Monza",
      kicker: "Low-drag benchmark",
      note: "Long straights and heavy braking zones reward a car that can shed drag without becoming nervous in the stop-and-go sections.",
      aero: "Medium",
      tyre: "Moderate",
      brake: "High",
      pass: "Strong",
      path: "M68 140 C84 84, 152 60, 220 78 S346 142, 422 116 C454 106, 472 134, 450 160 C420 194, 336 204, 292 184 C236 158, 178 182, 150 216 C132 236, 90 228, 84 196 C80 176, 60 170, 68 140 Z",
      weights: { straight: 0.34, slow: 0.14, fast: 0.12, tyreLife: 0.14, braking: 0.26 },
    },
    monaco: {
      title: "Monaco",
      kicker: "Slow-speed precision",
      note: "Almost every gain here is bought through low-speed rotation, traction, and confidence near barriers rather than pure straight-line efficiency.",
      aero: "High",
      tyre: "Low",
      brake: "Medium",
      pass: "Minimal",
      path: "M132 214 C108 196, 98 166, 114 140 C132 110, 164 118, 176 88 C186 60, 216 54, 242 72 C274 94, 310 94, 348 86 C384 80, 410 98, 408 128 C406 168, 446 170, 452 204 C456 228, 430 236, 398 232 C348 226, 304 224, 268 244 C234 262, 194 256, 180 232 C168 210, 148 226, 132 214 Z",
      weights: { straight: 0.08, slow: 0.34, fast: 0.08, tyreLife: 0.16, braking: 0.34 },
    },
    silverstone: {
      title: "Silverstone",
      kicker: "High-speed confidence",
      note: "Fast directional changes and loaded corners reward a platform that can carry speed without destabilizing the floor or overworking the front tyres.",
      aero: "Very high",
      tyre: "High",
      brake: "Medium",
      pass: "Good",
      path: "M68 164 C72 114, 118 78, 170 82 C220 86, 244 126, 284 126 C338 126, 350 78, 402 70 C446 64, 486 90, 486 132 C486 164, 514 176, 544 156 C578 132, 618 138, 636 170 C654 202, 626 228, 580 226 C542 224, 504 208, 458 214 C404 222, 362 252, 308 250 C250 248, 220 216, 178 210 C130 204, 64 214, 68 164 Z",
      weights: { straight: 0.16, slow: 0.12, fast: 0.34, tyreLife: 0.22, braking: 0.16 },
    },
    spa: {
      title: "Spa",
      kicker: "Mixed altitude compromise",
      note: "Spa stretches the car in every direction at once: long power sections, loaded fast corners, elevation change, and braking zones that punish imbalance.",
      aero: "High",
      tyre: "Moderate",
      brake: "High",
      pass: "Strong",
      path: "M88 202 C62 174, 62 130, 96 112 C130 94, 180 114, 226 96 C268 80, 302 42, 348 48 C400 54, 418 112, 470 120 C520 128, 566 92, 608 118 C648 142, 638 188, 598 202 C556 216, 502 202, 470 224 C430 250, 392 250, 344 228 C286 200, 222 214, 168 230 C128 242, 102 224, 88 202 Z",
      weights: { straight: 0.24, slow: 0.12, fast: 0.24, tyreLife: 0.16, braking: 0.24 },
    },
    suzuka: {
      title: "Suzuka",
      kicker: "Flow and rhythm track",
      note: "Repeated direction changes and linked corners reward a car with rhythm, front confidence, and enough tyre control to keep the first sector alive.",
      aero: "High",
      tyre: "High",
      brake: "Medium",
      pass: "Limited",
      path: "M112 84 C146 52, 208 56, 236 92 C256 118, 246 148, 212 164 C178 180, 170 214, 198 228 C232 246, 296 246, 322 214 C344 186, 376 170, 410 184 C452 202, 492 188, 514 158 C540 122, 584 114, 616 138 C648 162, 642 204, 604 220 C564 236, 530 224, 496 206 C450 182, 418 206, 406 232 C386 272, 326 268, 290 246 C252 222, 192 216, 152 194 C112 172, 96 126, 112 84 Z",
      weights: { straight: 0.14, slow: 0.16, fast: 0.3, tyreLife: 0.24, braking: 0.16 },
    },
  };

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function setText(id, value) {
    const node = document.getElementById(id);
    if (node) {
      node.textContent = value;
    }
  }

  function setList(id, items) {
    const list = document.getElementById(id);
    if (!list) {
      return;
    }

    list.innerHTML = "";
    items.forEach((item) => {
      const element = document.createElement("li");
      element.textContent = item;
      list.appendChild(element);
    });
  }

  function setMeter(id, value) {
    const node = document.getElementById(id);
    if (node) {
      node.style.width = `${clamp(value, 0, 100)}%`;
    }
  }

  function setActiveByValue(nodes, value, attributeName) {
    nodes.forEach((node) => {
      const isActive = node.dataset[attributeName] === value;
      node.classList.toggle("is-active", isActive);
      node.setAttribute("aria-pressed", isActive ? "true" : "false");
    });
  }

  function initOverviewScene() {
    const buttons = Array.from(document.querySelectorAll("[data-component]"));
    const shapes = Array.from(document.querySelectorAll("[data-component-shape]"));
    if (!buttons.length || !shapes.length) {
      return;
    }

    function update(componentKey) {
      const component = overviewComponents[componentKey];
      if (!component) {
        return;
      }

      setActiveByValue(buttons, componentKey, "component");
      shapes.forEach((shape) => {
        shape.classList.toggle("is-active", shape.dataset.componentShape === componentKey);
      });
      setText("f1-component-group", component.group);
      setText("f1-component-title", component.title);
      setText("f1-component-summary", component.summary);
      setList("f1-component-points", component.points);
    }

    buttons.forEach((button) => {
      button.addEventListener("click", () => update(button.dataset.component || "front-wing"));
    });

    update("front-wing");
  }

  function initAirflowScene() {
    const speedInput = document.getElementById("f1-speed");
    const wingInput = document.getElementById("f1-wing");
    const rideInput = document.getElementById("f1-ride");
    const wake = document.getElementById("f1-wake");
    const frontWing = document.getElementById("f1-body-front-wing");
    const floor = document.getElementById("f1-body-floor");
    const rearWing = document.getElementById("f1-body-rear-wing");
    const lines = Array.from(document.querySelectorAll("#f1-airflow-scene .f1-flow-line"));
    if (!speedInput || !wingInput || !rideInput || !wake || !frontWing || !floor || !rearWing) {
      return;
    }

    function update() {
      const speed = Number(speedInput.value);
      const wing = Number(wingInput.value);
      const ride = Number(rideInput.value);
      const speedNorm = (speed - 180) / 160;
      const wingNorm = (wing - 1) / 10;
      const rideSweetness = clamp(1 - Math.abs(ride - 38) / 24, 0, 1);

      const frontShare = clamp(31 + wingNorm * 17 + speedNorm * 5 - (ride - 38) * 0.12, 28, 58);
      const floorEfficiency = clamp(48 + rideSweetness * 42 + speedNorm * 10 - wingNorm * 2.5, 24, 96);
      const dragCost = clamp(16 + wingNorm * 26 + speedNorm * 8 + Math.max(0, 36 - ride) * 0.35, 10, 64);

      let stability = "Calm";
      let note = "The platform is in a healthy range for predictable floor behavior.";
      if (ride < 30 || floorEfficiency < 58) {
        stability = "Nervous";
        note = "The car is generating load, but the floor window is tightening and the wake is getting less tidy.";
      }
      if (ride < 27 || (ride < 31 && wing > 8)) {
        stability = "Fragile";
        note = "The floor is close to a stall-prone posture. This can feel brilliant for a moment and then disappear once the platform moves.";
      }

      setText("f1-speed-value", `${speed} km/h`);
      setText("f1-wing-value", `${wing} clicks`);
      setText("f1-ride-value", `${ride} mm`);
      setText("f1-front-load", `${Math.round(frontShare)}%`);
      setText("f1-floor-load", `${Math.round(floorEfficiency)}%`);
      setText("f1-drag-cost", `${Math.round(dragCost)}%`);
      setText("f1-stability", stability);
      setText("f1-airflow-note", note);

      const frontFill = 0.18 + wingNorm * 0.28;
      const floorFill = 0.14 + floorEfficiency / 220;
      const rearFill = 0.18 + dragCost / 180;
      frontWing.setAttribute("fill", `rgba(180, 58, 51, ${frontFill.toFixed(3)})`);
      floor.setAttribute("fill", `rgba(41, 108, 127, ${floorFill.toFixed(3)})`);
      rearWing.setAttribute("fill", `rgba(201, 91, 49, ${rearFill.toFixed(3)})`);
      wake.setAttribute("fill", `rgba(53, 115, 149, ${(0.08 + dragCost / 180).toFixed(3)})`);
      wake.setAttribute("d", `M604 ${82 - dragCost * 0.12} C672 ${84 - dragCost * 0.08}, 712 92, 738 130 C710 176, 666 ${190 + dragCost * 0.12}, 604 ${180 + dragCost * 0.08} Z`);
      lines.forEach((line, index) => {
        line.style.strokeWidth = `${3 + speedNorm * 2.2 - index * 0.05}`;
        line.style.opacity = `${0.56 + speedNorm * 0.28}`;
        line.style.animationDuration = `${16 - speedNorm * 5 + index * 0.35}s`;
      });
    }

    speedInput.addEventListener("input", update);
    wingInput.addEventListener("input", update);
    rideInput.addEventListener("input", update);
    update();
  }

  function initFloorScene() {
    const rideInput = document.getElementById("f1-floor-ride");
    const pitchInput = document.getElementById("f1-floor-pitch");
    const platform = document.getElementById("f1-floor-platform");
    const pressureBand = document.getElementById("f1-floor-pressure-band");
    if (!rideInput || !pitchInput || !platform || !pressureBand) {
      return;
    }

    function update() {
      const ride = Number(rideInput.value);
      const pitch = Number(pitchInput.value);
      const rideSweetness = clamp(1 - Math.abs(ride - 34) / 20, 0, 1);
      const pitchPenalty = Math.max(0, pitch - 1.5) * 10 + Math.max(0, -pitch) * 4;
      const suction = clamp(42 + rideSweetness * 54 - pitchPenalty, 15, 96);

      let recovery = "Healthy";
      if (ride < 28 || pitch > 2.1) {
        recovery = "Tense";
      }
      if (ride < 24 || pitch > 3.1) {
        recovery = "Breaking up";
      }

      let risk = "Moderate";
      let note = "The floor is loaded, but still has enough margin before it becomes nervous.";
      if (ride < 29 || pitch > 2.1) {
        risk = "Elevated";
        note = "The throat is productive, but now pitch and plank contact can start eating the operating window.";
      }
      if (ride < 24 || pitch > 3.2) {
        risk = "High";
        note = "This is the kind of posture that can invite oscillation, local stall, or a suddenly inconsistent rear platform.";
      }

      setText("f1-floor-ride-value", `${ride} mm`);
      setText("f1-floor-pitch-value", `${pitch.toFixed(1)} deg`);
      setText("f1-floor-suction", `${Math.round(suction)}%`);
      setText("f1-floor-recovery", recovery);
      setText("f1-floor-risk", risk);
      setText("f1-floor-note", note);

      const translateY = (ride - 36) * 1.15;
      const rotation = -pitch * 1.4;
      platform.setAttribute("transform", `translate(0 ${translateY.toFixed(1)}) rotate(${rotation.toFixed(2)} 390 150)`);
      pressureBand.style.strokeWidth = `${7 + suction / 12}`;
      pressureBand.style.opacity = `${0.38 + suction / 180}`;
    }

    rideInput.addEventListener("input", update);
    pitchInput.addEventListener("input", update);
    update();
  }

  function initPowerScene() {
    const buttons = Array.from(document.querySelectorAll("[data-power-mode]"));
    if (!buttons.length) {
      return;
    }

    function update(modeKey) {
      const mode = powerModes[modeKey];
      if (!mode) {
        return;
      }

      setActiveByValue(buttons, modeKey, "powerMode");
      setMeter("f1-meter-ice", mode.ice);
      setMeter("f1-meter-deploy", mode.deploy);
      setMeter("f1-meter-harvest", mode.harvest);
      setMeter("f1-meter-cooling", mode.cooling);
      setText("f1-power-note", mode.note);
    }

    buttons.forEach((button) => {
      button.addEventListener("click", () => update(button.dataset.powerMode || "balanced"));
    });

    update("harvest");
  }

  function initTyreScene() {
    const buttons = Array.from(document.querySelectorAll("[data-compound]"));
    const tempInput = document.getElementById("f1-tyre-temp");
    const loadInput = document.getElementById("f1-tyre-load");
    const stintInput = document.getElementById("f1-tyre-stint");
    if (!buttons.length || !tempInput || !loadInput || !stintInput) {
      return;
    }

    let currentCompound = "soft";

    function update() {
      const compound = tyreCompounds[currentCompound];
      const temp = Number(tempInput.value);
      const load = Number(loadInput.value);
      const stint = Number(stintInput.value);
      const thermalDistance = Math.abs(temp - compound.windowMid);
      const thermalPenalty = thermalDistance * 1.2;
      const wearScore = clamp(stint * compound.wearRate + Math.max(0, load - 72) * compound.loadPenalty + Math.max(0, temp - compound.windowHigh) * 0.6, 0, 100);
      const grip = clamp(compound.baseGrip - thermalPenalty - wearScore * 0.18, 28, 98);

      let state = "In the window";
      let note = "The tyre is warm enough to produce strong bite without yet crossing into surface overheating.";
      if (temp < compound.windowLow) {
        state = "Too cold";
        note = "The compound is struggling to switch on. Grip exists, but the surface is not yet in its most useful working range.";
      }
      if (temp > compound.windowHigh) {
        state = "Overheated";
        note = "The surface is too hot for stable peak grip. The tyre will slide more and usually overwork itself again on the next demand spike.";
      }
      if (currentCompound === "intermediate" || currentCompound === "wet") {
        note = temp > compound.windowHigh
          ? "The treaded tyre is overheating because the track is effectively too dry for this choice."
          : "This treaded tyre is in its intended crossover or wet operating range.";
      }

      let wearLabel = "Low";
      if (wearScore > 28) {
        wearLabel = "Moderate";
      }
      if (wearScore > 52) {
        wearLabel = "High";
      }
      if (wearScore > 74) {
        wearLabel = "Critical";
      }

      setActiveByValue(buttons, currentCompound, "compound");
      setText("f1-tyre-temp-value", `${temp} C`);
      setText("f1-tyre-load-value", `${load}%`);
      setText("f1-tyre-stint-value", `${stint} laps`);
      setText("f1-tyre-grip", `${Math.round(grip)}%`);
      setText("f1-tyre-wear", wearLabel);
      setText("f1-tyre-state", state);
      setText("f1-tyre-title", compound.title);
      setText("f1-tyre-note", note);
      setList("f1-tyre-points", compound.points);
      setMeter("f1-heat-fill", clamp((temp - 40) / 95 * 100, 0, 100));
    }

    buttons.forEach((button) => {
      button.addEventListener("click", () => {
        currentCompound = button.dataset.compound || "soft";
        update();
      });
    });

    tempInput.addEventListener("input", update);
    loadInput.addEventListener("input", update);
    stintInput.addEventListener("input", update);
    update();
  }

  function initBrakingScene() {
    const speedInput = document.getElementById("f1-brake-speed");
    const biasInput = document.getElementById("f1-brake-bias");
    const harvestInput = document.getElementById("f1-brake-harvest");
    const marker = document.getElementById("f1-brake-marker");
    if (!speedInput || !biasInput || !harvestInput || !marker) {
      return;
    }

    function update() {
      const speed = Number(speedInput.value);
      const bias = Number(biasInput.value);
      const harvest = Number(harvestInput.value);
      const authority = clamp(72 + (speed - 180) * 0.08 - Math.abs(bias - 55.8) * 2.6 - harvest * 0.09, 28, 96);
      const rearRotationScore = clamp((56.5 - bias) * 8 + harvest * 0.15 + 50, 0, 100);

      let lockup = "Low";
      if (Math.abs(bias - 55.5) > 2 || harvest > 56) {
        lockup = "Moderate";
      }
      if (Math.abs(bias - 55.5) > 3.4 || harvest > 68 || speed > 315) {
        lockup = "High";
      }

      let rotation = "Controlled";
      let note = "The car is stable enough to commit, but still willing to change direction on release.";
      if (rearRotationScore < 35) {
        rotation = "Locked-in";
        note = "This is a front-led, stability-first posture. It will feel safe, but it may resist the last part of entry rotation.";
      } else if (rearRotationScore > 68) {
        rotation = "Aggressive";
        note = "The rear is being asked to help the car rotate more eagerly. That can be fast, but it narrows the comfort window under heavy entry demand.";
      }

      setText("f1-brake-speed-value", `${speed} km/h`);
      setText("f1-brake-bias-value", `${bias.toFixed(1)}% front`);
      setText("f1-brake-harvest-value", `${harvest}%`);
      setText("f1-brake-authority", `${Math.round(authority)}%`);
      setText("f1-brake-lockup", lockup);
      setText("f1-brake-rotation", rotation);
      setText("f1-brake-note", note);
      marker.style.left = `${rearRotationScore}%`;
    }

    speedInput.addEventListener("input", update);
    biasInput.addEventListener("input", update);
    harvestInput.addEventListener("input", update);
    update();
  }

  function initTrackScene() {
    const buttons = Array.from(document.querySelectorAll("[data-track]"));
    const path = document.getElementById("f1-track-path");
    if (!buttons.length || !path) {
      return "monza";
    }

    let currentTrack = "monza";

    function update(trackKey) {
      const track = tracks[trackKey];
      if (!track) {
        return;
      }

      currentTrack = trackKey;
      setActiveByValue(buttons, trackKey, "track");
      path.setAttribute("d", track.path);
      setText("f1-track-kicker", track.kicker);
      setText("f1-track-title", track.title);
      setText("f1-track-note", track.note);
      setText("f1-track-aero", track.aero);
      setText("f1-track-tyre", track.tyre);
      setText("f1-track-brake", track.brake);
      setText("f1-track-pass", track.pass);
      document.dispatchEvent(new CustomEvent("f1-track-change", { detail: { trackKey } }));
    }

    buttons.forEach((button) => {
      button.addEventListener("click", () => update(button.dataset.track || "monza"));
    });

    update(currentTrack);
    return currentTrack;
  }

  function initSetupScene(initialTrack) {
    const wingInput = document.getElementById("f1-setup-wing");
    const rideInput = document.getElementById("f1-setup-ride");
    const stiffnessInput = document.getElementById("f1-setup-stiffness");
    const biasInput = document.getElementById("f1-setup-bias");
    const buttons = Array.from(document.querySelectorAll("[data-setup-compound]"));
    if (!wingInput || !rideInput || !stiffnessInput || !biasInput || !buttons.length) {
      return;
    }

    let currentTrack = initialTrack || "monza";
    let currentCompound = "soft";

    function getCompoundSetupOffsets(compoundKey) {
      if (compoundKey === "soft") {
        return { slow: 10, fast: 6, tyreLife: -16, braking: 2 };
      }
      if (compoundKey === "medium") {
        return { slow: 6, fast: 4, tyreLife: -6, braking: 0 };
      }
      return { slow: 2, fast: 2, tyreLife: 8, braking: 4 };
    }

    function update() {
      const wing = Number(wingInput.value);
      const ride = Number(rideInput.value);
      const stiffness = Number(stiffnessInput.value);
      const bias = Number(biasInput.value);
      const track = tracks[currentTrack] || tracks.monza;
      const compound = getCompoundSetupOffsets(currentCompound);

      const straight = clamp(98 - wing * 3.6 - Math.max(0, 40 - ride) * 0.45 - stiffness * 0.05, 36, 98);
      const slow = clamp(46 + wing * 2.2 + compound.slow + (64 - stiffness) * 0.22 - Math.abs(bias - 55.4) * 1.3, 28, 96);
      const fast = clamp(44 + wing * 2.8 + (40 - Math.abs(ride - 33)) * 0.95 + stiffness * 0.18 + compound.fast, 28, 98);
      const tyreLife = clamp(92 - wing * 1.4 - Math.max(0, 38 - ride) * 0.55 - stiffness * 0.16 + compound.tyreLife, 22, 96);
      const braking = clamp(84 - Math.abs(bias - 55.8) * 4.1 - Math.max(0, 54 - stiffness) * 0.16 + compound.braking, 22, 98);

      const lapScore = (
        straight * track.weights.straight +
        slow * track.weights.slow +
        fast * track.weights.fast +
        tyreLife * track.weights.tyreLife +
        braking * track.weights.braking
      );
      const delta = clamp((86 - lapScore) / 18, -0.45, 1.6);

      let note = `${track.title}-biased setup: `;
      if (track.title === "Monza") {
        note += "this direction protects the straights, but every extra wing click needs to earn its drag penalty back in the chicanes.";
      } else if (track.title === "Monaco") {
        note += "low-speed rotation and confidence matter more than raw speed, so drag is easier to forgive than hesitation near the wall.";
      } else if (track.title === "Silverstone") {
        note += "high-speed commitment rewards a calmer platform and floor, which usually means accepting a little more drag than a pure straight-line setup.";
      } else if (track.title === "Spa") {
        note += "the circuit stretches the setup both ways, so the strongest answer is often the least punishing compromise rather than the single best local number.";
      } else {
        note += "the linked corners reward rhythm and front confidence, so abrupt imbalance is more expensive than one missing kilometer per hour on the straight.";
      }

      setActiveByValue(buttons, currentCompound, "setupCompound");
      setText("f1-setup-track", track.title);
      setText("f1-setup-wing-value", `${wing} clicks`);
      setText("f1-setup-ride-value", `${ride} mm`);
      setText("f1-setup-stiffness-value", `${stiffness}%`);
      setText("f1-setup-bias-value", `${bias.toFixed(1)}% front`);
      setText("f1-setup-straight", `${Math.round(straight)}%`);
      setText("f1-setup-slow", `${Math.round(slow)}%`);
      setText("f1-setup-fast", `${Math.round(fast)}%`);
      setText("f1-setup-tyre-life", `${Math.round(tyreLife)}%`);
      setText("f1-setup-braking", `${Math.round(braking)}%`);
      setText("f1-setup-lap", `${delta >= 0 ? "+" : ""}${delta.toFixed(2)} s`);
      setText("f1-setup-note", note);
    }

    buttons.forEach((button) => {
      button.addEventListener("click", () => {
        currentCompound = button.dataset.setupCompound || "soft";
        update();
      });
    });

    [wingInput, rideInput, stiffnessInput, biasInput].forEach((input) => {
      input.addEventListener("input", update);
    });

    document.addEventListener("f1-track-change", (event) => {
      currentTrack = event.detail?.trackKey || currentTrack;
      update();
    });

    update();
  }

  function init() {
    initOverviewScene();
    initAirflowScene();
    initFloorScene();
    initPowerScene();
    initTyreScene();
    initBrakingScene();
    const initialTrack = initTrackScene();
    initSetupScene(initialTrack);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
