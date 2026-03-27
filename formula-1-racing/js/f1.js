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

  const powerBiases = {
    early: {
      label: "Early",
      splits: [0.5, 0.3, 0.2],
    },
    distributed: {
      label: "Distributed",
      splits: [0.34, 0.33, 0.33],
    },
    late: {
      label: "Late",
      splits: [0.2, 0.3, 0.5],
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

  const setupCompounds = {
    soft: {
      label: "Soft",
      slow: 10,
      fast: 6,
      tyreLife: -16,
      braking: 2,
      balance: 3,
    },
    medium: {
      label: "Medium",
      slow: 6,
      fast: 4,
      tyreLife: -6,
      braking: 0,
      balance: 1,
    },
    hard: {
      label: "Hard",
      slow: 2,
      fast: 2,
      tyreLife: 8,
      braking: 4,
      balance: -1,
    },
  };

  const lapPlans = {
    push: {
      title: "Qualifying push",
      note: "The lap is spending more tyre and thermal margin to maximize sector peak rather than stint stability.",
      adjustments: {
        straight: 6,
        slow: 5,
        fast: 4,
        tyreLife: -14,
        braking: -2,
        balance: 2,
      },
    },
    balanced: {
      title: "Balanced race lap",
      note: "This plan tries to keep the sectors coherent instead of chasing the largest single-corner or straight-line peak.",
      adjustments: {
        straight: 1,
        slow: 1,
        fast: 1,
        tyreLife: -2,
        braking: 1,
        balance: 0,
      },
    },
    protect: {
      title: "Protect the tyres",
      note: "This plan backs away from the lap peak so the tyres and rear platform stay usable deeper into the run.",
      adjustments: {
        straight: -4,
        slow: -2,
        fast: -3,
        tyreLife: 12,
        braking: 4,
        balance: 1,
      },
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
      pitLossBase: 21,
      undercutBias: 7,
      overcutBias: 4,
      tracePresets: {
        speed: [34, 94, 44, 58, 76, 54, 70, 90, 48],
        brake: [18, 96, 24, 44, 72, 20, 42, 84, 18],
        deploy: [52, 92, 44, 48, 68, 42, 58, 84, 46],
      },
      weights: { straight: 0.34, slow: 0.14, fast: 0.12, tyreLife: 0.14, braking: 0.26, balance: 0.0 },
      sectors: [
        {
          label: "Retifilo and launch",
          focus: "Braking and acceleration",
          weights: { straight: 0.22, slow: 0.12, fast: 0.06, tyreLife: 0.1, braking: 0.5, balance: 0.0 },
          lead: "Heavy braking still dominates this sector",
        },
        {
          label: "Lesmo sequence",
          focus: "Exit grip and medium speed flow",
          weights: { straight: 0.24, slow: 0.18, fast: 0.18, tyreLife: 0.16, braking: 0.18, balance: 0.06 },
          lead: "This sector starts rewarding cleaner exits and enough rear support",
        },
        {
          label: "Ascari to Parabolica",
          focus: "High-speed balance into final exit",
          weights: { straight: 0.2, slow: 0.14, fast: 0.28, tyreLife: 0.18, braking: 0.14, balance: 0.06 },
          lead: "Late-lap commitment here depends on the rear axle still feeling honest",
        },
      ],
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
      pitLossBase: 18.6,
      undercutBias: 4,
      overcutBias: 7,
      tracePresets: {
        speed: [30, 56, 34, 40, 52, 36, 42, 58, 38],
        brake: [28, 74, 36, 44, 62, 40, 48, 70, 34],
        deploy: [34, 58, 32, 36, 50, 34, 38, 56, 34],
      },
      weights: { straight: 0.08, slow: 0.34, fast: 0.08, tyreLife: 0.16, braking: 0.34, balance: 0.0 },
      sectors: [
        {
          label: "Sainte Devote to Massenet",
          focus: "Traction and confidence",
          weights: { straight: 0.08, slow: 0.26, fast: 0.12, tyreLife: 0.16, braking: 0.28, balance: 0.1 },
          lead: "The lap opens by asking for confidence near the walls",
        },
        {
          label: "Casino to hairpin",
          focus: "Rotation and patience",
          weights: { straight: 0.04, slow: 0.34, fast: 0.08, tyreLife: 0.22, braking: 0.24, balance: 0.08 },
          lead: "This middle sector punishes any setup that refuses to rotate cleanly",
        },
        {
          label: "Swimming pool to final corner",
          focus: "Direction change and traction",
          weights: { straight: 0.08, slow: 0.26, fast: 0.16, tyreLife: 0.2, braking: 0.18, balance: 0.12 },
          lead: "The final sector rewards agility without making the rear nervous over the direction changes",
        },
      ],
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
      pitLossBase: 20.4,
      undercutBias: 6,
      overcutBias: 5,
      tracePresets: {
        speed: [46, 84, 38, 54, 94, 62, 66, 86, 48],
        brake: [24, 58, 44, 30, 42, 26, 34, 54, 30],
        deploy: [42, 64, 38, 40, 68, 44, 48, 66, 42],
      },
      weights: { straight: 0.16, slow: 0.12, fast: 0.34, tyreLife: 0.22, braking: 0.16, balance: 0.0 },
      sectors: [
        {
          label: "Abbey to Village",
          focus: "Fast turn-in into low-speed reset",
          weights: { straight: 0.12, slow: 0.18, fast: 0.26, tyreLife: 0.18, braking: 0.18, balance: 0.08 },
          lead: "The first sector asks for a car that changes phase cleanly from brave entry to slow-speed rotation",
        },
        {
          label: "Maggotts and Becketts",
          focus: "Platform trust",
          weights: { straight: 0.08, slow: 0.08, fast: 0.42, tyreLife: 0.22, braking: 0.1, balance: 0.1 },
          lead: "This is where the car either earns high-speed trust or exposes its platform weakness",
        },
        {
          label: "Stowe to final complex",
          focus: "Rear stability and tyre survival",
          weights: { straight: 0.18, slow: 0.12, fast: 0.28, tyreLife: 0.24, braking: 0.1, balance: 0.08 },
          lead: "The end of the lap rewards a car that still has rear support and front tyre life left",
        },
      ],
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
      pitLossBase: 20.9,
      undercutBias: 7,
      overcutBias: 5,
      tracePresets: {
        speed: [38, 96, 46, 58, 82, 54, 60, 88, 44],
        brake: [22, 82, 30, 38, 58, 26, 44, 76, 28],
        deploy: [50, 90, 42, 46, 70, 40, 54, 82, 46],
      },
      weights: { straight: 0.24, slow: 0.12, fast: 0.24, tyreLife: 0.16, braking: 0.24, balance: 0.0 },
      sectors: [
        {
          label: "La Source to Kemmel",
          focus: "Traction to top speed",
          weights: { straight: 0.32, slow: 0.14, fast: 0.14, tyreLife: 0.12, braking: 0.2, balance: 0.08 },
          lead: "The lap opens by asking the setup to survive a hairpin and then stop dragging itself up the hill",
        },
        {
          label: "Middle sector flow",
          focus: "Mixed load commitment",
          weights: { straight: 0.18, slow: 0.12, fast: 0.28, tyreLife: 0.16, braking: 0.18, balance: 0.08 },
          lead: "The middle sector is all about whether the car can keep speed without becoming vague over the fast transitions",
        },
        {
          label: "Bus Stop finish",
          focus: "Braking and exit integrity",
          weights: { straight: 0.22, slow: 0.12, fast: 0.18, tyreLife: 0.18, braking: 0.22, balance: 0.08 },
          lead: "The final sector rewards a car that still brakes cleanly after being stretched for the whole lap",
        },
      ],
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
      pitLossBase: 22.1,
      undercutBias: 5,
      overcutBias: 6,
      tracePresets: {
        speed: [42, 78, 50, 60, 88, 58, 56, 82, 46],
        brake: [18, 52, 28, 36, 58, 26, 40, 74, 34],
        deploy: [40, 58, 36, 42, 64, 42, 48, 68, 40],
      },
      weights: { straight: 0.14, slow: 0.16, fast: 0.3, tyreLife: 0.24, braking: 0.16, balance: 0.0 },
      sectors: [
        {
          label: "Esses and Dunlop",
          focus: "Front confidence and rhythm",
          weights: { straight: 0.08, slow: 0.14, fast: 0.34, tyreLife: 0.24, braking: 0.1, balance: 0.1 },
          lead: "The first sector exposes any front-end hesitation immediately",
        },
        {
          label: "Degner to Spoon",
          focus: "Linked commitment",
          weights: { straight: 0.16, slow: 0.12, fast: 0.28, tyreLife: 0.18, braking: 0.14, balance: 0.12 },
          lead: "The middle of the lap rewards rhythm and punishments arrive whenever the platform breaks that rhythm",
        },
        {
          label: "130R to final chicane",
          focus: "High speed bravery into braking reset",
          weights: { straight: 0.18, slow: 0.14, fast: 0.24, tyreLife: 0.18, braking: 0.18, balance: 0.08 },
          lead: "The final sector demands a rear axle that still feels trustworthy after the earlier load cycles",
        },
      ],
    },
  };

  const setupDefaults = {
    wing: 5,
    ride: 39,
    stiffness: 58,
    bias: 55.5,
    compoundKey: "soft",
  };

  const trackPresets = {
    monza: {
      trackKey: "monza",
      wing: 3,
      ride: 41,
      stiffness: 66,
      bias: 56.5,
      compoundKey: "medium",
      lapPlan: "balanced",
      powerMode: "attack",
      powerBias: "early",
      note: "The Monza preset trims wing and keeps the car disciplined enough under braking that the long straights stay worth protecting.",
    },
    monaco: {
      trackKey: "monaco",
      wing: 10,
      ride: 48,
      stiffness: 42,
      bias: 54.5,
      compoundKey: "soft",
      lapPlan: "balanced",
      powerMode: "balanced",
      powerBias: "distributed",
      note: "The Monaco preset accepts drag so the car can rotate, ride the slow corners more willingly, and keep the front axle alive next to the barriers.",
    },
    silverstone: {
      trackKey: "silverstone",
      wing: 8,
      ride: 34,
      stiffness: 72,
      bias: 55.5,
      compoundKey: "medium",
      lapPlan: "push",
      powerMode: "attack",
      powerBias: "distributed",
      note: "The Silverstone preset protects high-speed trust, accepting more drag so the floor and rear stay believable through the fast sequences.",
    },
    spa: {
      trackKey: "spa",
      wing: 6,
      ride: 38,
      stiffness: 60,
      bias: 56,
      compoundKey: "medium",
      lapPlan: "balanced",
      powerMode: "attack",
      powerBias: "late",
      note: "The Spa preset splits the difference between long-straight power demand and enough support to survive the faster, more loaded sections.",
    },
    suzuka: {
      trackKey: "suzuka",
      wing: 7,
      ride: 35,
      stiffness: 64,
      bias: 55.2,
      compoundKey: "medium",
      lapPlan: "balanced",
      powerMode: "balanced",
      powerBias: "distributed",
      note: "The Suzuka preset leans into rhythm and front confidence so the car can survive the linked corners without breaking the platform's flow.",
    },
  };

  const weatherModes = {
    dry: {
      label: "Dry",
    },
    mixed: {
      label: "Mixed",
    },
    wet: {
      label: "Wet",
    },
  };

  const metricLabels = {
    straight: "straight-line speed",
    slow: "slow-corner authority",
    fast: "high-speed support",
    tyreLife: "tyre preservation",
    braking: "braking confidence",
    balance: "aero balance",
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

  function dispatchInputEvent(node) {
    if (!node) {
      return;
    }
    node.dispatchEvent(new Event("input", { bubbles: true }));
  }

  function setActiveByValue(nodes, value, attributeName) {
    nodes.forEach((node) => {
      const isActive = node.dataset[attributeName] === value;
      node.classList.toggle("is-active", isActive);
      node.setAttribute("aria-pressed", isActive ? "true" : "false");
    });
  }

  function formatSignedDelta(value) {
    return `${value >= 0 ? "+" : ""}${value.toFixed(2)} s`;
  }

  function getCompoundTitle(compoundKey) {
    return (setupCompounds[compoundKey] || setupCompounds.soft).label;
  }

  function computeSetupScores(trackKey, compoundKey, wing, ride, stiffness, bias) {
    const track = tracks[trackKey] || tracks.monza;
    const compound = setupCompounds[compoundKey] || setupCompounds.soft;

    const straight = clamp(98 - wing * 3.6 - Math.max(0, 40 - ride) * 0.45 - stiffness * 0.05, 36, 98);
    const slow = clamp(46 + wing * 2.2 + compound.slow + (64 - stiffness) * 0.22 - Math.abs(bias - 55.4) * 1.3, 28, 96);
    const fast = clamp(44 + wing * 2.8 + (40 - Math.abs(ride - 33)) * 0.95 + stiffness * 0.18 + compound.fast, 28, 98);
    const tyreLife = clamp(92 - wing * 1.4 - Math.max(0, 38 - ride) * 0.55 - stiffness * 0.16 + compound.tyreLife, 22, 96);
    const braking = clamp(84 - Math.abs(bias - 55.8) * 4.1 - Math.max(0, 54 - stiffness) * 0.16 + compound.braking, 22, 98);
    const balance = clamp(48 + wing * 3 + (35 - Math.abs(ride - 34)) * 0.55 - Math.max(0, stiffness - 72) * 0.28 + compound.balance, 20, 95);

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

    return {
      straight,
      slow,
      fast,
      tyreLife,
      braking,
      balance,
      note,
    };
  }

  function computePowerState(modeKey, biasKey, trackKey) {
    const mode = powerModes[modeKey] || powerModes.harvest;
    const bias = powerBiases[biasKey] || powerBiases.distributed;
    const track = tracks[trackKey] || tracks.monza;

    const sectorBars = track.sectors.map((sector, index) => {
      const split = bias.splits[index] || 0.33;
      const sensitivity = 0.58 + (sector.weights.straight || 0) * 0.9 + (sector.weights.fast || 0) * 0.35;
      return clamp(mode.deploy * split * sensitivity * 1.9, 12, 100);
    });

    let note = `${bias.label} deployment concentrates more of the usable electrical push into ${track.sectors[0].label.toLowerCase()}.`;
    if (biasKey === "distributed") {
      note = `Distributed deployment keeps the lap shape more even, so no single sector receives all the battery help.`;
    }
    if (biasKey === "late") {
      note = `${bias.label} deployment saves more of the electrical push for the back half of the lap when tyre and rear-platform confidence are already under pressure.`;
    }
    if (modeKey === "harvest") {
      note = `${note} In harvest mode the overall ceiling stays lower because the car is prioritizing energy refill and cooling headroom.`;
    }
    if (modeKey === "attack") {
      note = `${note} Attack mode raises the ceiling, but it also spends battery and thermal margin much faster.`;
    }

    return {
      modeKey,
      modeLabel: modeKey.charAt(0).toUpperCase() + modeKey.slice(1),
      biasKey,
      biasLabel: bias.label,
      sectorBars,
      deployValue: mode.deploy,
      note,
    };
  }

  function buildTracePoints(values, options) {
    const left = options.left;
    const top = options.top;
    const height = options.height;
    const width = options.width;
    const points = values.map((value, index) => {
      const ratio = values.length === 1 ? 0 : index / (values.length - 1);
      const x = left + width * ratio;
      const y = top + height * (1 - clamp(value, 0, 100) / 100);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });

    return points.join(" ");
  }

  function getRacecraftTrackCopy(trackKey) {
    if (trackKey === "monaco") {
      return {
        kicker: "Precision pass window",
        note: "Passing is rare here because the braking zones are short and the road punishes any move that begins without full front confidence.",
      };
    }
    if (trackKey === "silverstone") {
      return {
        kicker: "High-speed setup trap",
        note: "The biggest racecraft challenge here is staying close enough through the fast sections that the straight-line tools still matter at the end of them.",
      };
    }
    if (trackKey === "spa") {
      return {
        kicker: "Long-run draft battle",
        note: "The straights and elevation changes create good closing-speed windows, but the chase only works if the car survives the faster corners without losing front trust.",
      };
    }
    if (trackKey === "suzuka") {
      return {
        kicker: "Rhythm before reward",
        note: "Suzuka often forces the attacking car to earn the move several corners earlier by protecting the front tyres and staying inside the rhythm of the lap.",
      };
    }

    return {
      kicker: "Primary pass window",
      note: "The braking zones are long enough that a strong closing rate can turn into a decisive move rather than just a late defensive feint.",
    };
  }

  function computeWeatherStrategy(modeKey, trackKey, temp, lapsRemaining, rainPressure, compoundKey) {
    const track = tracks[trackKey] || tracks.monza;
    const compound = setupCompounds[compoundKey] || setupCompounds.soft;
    let recommendedTyre = "Medium";
    let urgency = "Low";
    let pit = "Measured";
    let bias = "Stay flexible";
    let note = "The track is still dry enough that the medium tyre is the calmer race answer unless a short, aggressive stint is needed.";
    let penalty = 0;

    if (modeKey === "dry") {
      if (temp < 22 && lapsRemaining < 14) {
        recommendedTyre = "Soft";
      } else if (temp > 35 || lapsRemaining > 24) {
        recommendedTyre = "Hard";
      }

      urgency = rainPressure > 48 ? "Rising" : "Low";
      pit = lapsRemaining < 10 ? "Late window" : temp > 35 ? "Protect rears" : "Measured";
      bias = temp > 35 ? "Manage heat" : "Stay flexible";
      note = recommendedTyre === "Soft"
        ? "The track is cool enough and the run is short enough that the soft tyre can make sense as a deliberate attack call."
        : recommendedTyre === "Hard"
          ? "The surface is hot or the run is long enough that keeping the tyre alive matters more than taking the first peak of grip."
          : "The track is still dry enough that the medium tyre is the calmer race answer unless a short, aggressive stint is needed.";

      if (compound.label !== recommendedTyre) {
        penalty = recommendedTyre === "Medium" ? 0.08 : 0.14;
      }
      penalty += Math.max(0, rainPressure - 55) * 0.004;
    } else if (modeKey === "mixed") {
      recommendedTyre = rainPressure > 58 ? "Intermediate" : "Crossover watch";
      urgency = rainPressure > 70 ? "High" : "Rising";
      pit = lapsRemaining < 10 ? "Reactive" : "Watch radar";
      bias = "Protect optionality";
      note = rainPressure > 58
        ? "The track is drifting toward a genuine intermediate window, so the important strategic skill becomes timing the crossover before the dry tyre suddenly falls away."
        : "Conditions are unstable rather than fully wet. The job is to keep enough tyre and battery margin that a sudden shower or safety car does not trap the strategy.";
      penalty = compoundKey === "medium" ? 0.35 : compoundKey === "hard" ? 0.42 : 0.5;
      penalty += rainPressure * 0.006;
    } else {
      recommendedTyre = rainPressure > 54 ? "Wet" : "Intermediate";
      urgency = "Immediate";
      pit = "Stop now";
      bias = "Stay on track";
      note = recommendedTyre === "Wet"
        ? "There is now enough standing water that the race is mostly about staying on the circuit and surviving the braking zones until visibility or grip improves."
        : "This is the awkward crossover where a full wet is no longer mandatory, but a dry tyre still cannot exploit the lap with any confidence.";
      penalty = compoundKey === "hard" ? 1.05 : compoundKey === "medium" ? 1.12 : 1.2;
      penalty += Math.max(0, rainPressure - 40) * 0.006;
    }

    const crossover = clamp(
      modeKey === "dry"
        ? rainPressure * 0.75
        : modeKey === "mixed"
          ? 34 + rainPressure * 0.46
          : 64 + rainPressure * 0.24,
      0,
      100,
    );
    const bandFill = clamp(
      modeKey === "dry"
        ? 16 + temp * 1.5 + rainPressure * 0.15
        : modeKey === "mixed"
          ? 42 + rainPressure * 0.42
          : 70 + rainPressure * 0.24,
      0,
      100,
    );

    return {
      modeKey,
      label: weatherModes[modeKey]?.label || "Dry",
      recommendedTyre,
      urgency,
      pit,
      bias,
      note,
      crossover,
      bandFill,
      penalty: clamp(penalty, 0, 1.8),
      trackTitle: track.title,
      lapsRemaining,
      rainPressure,
      temperature: temp,
    };
  }

  function computePitStrategy(trackKey, weatherState, tyreAge, traffic, safetyCarChance, compoundKey) {
    const track = tracks[trackKey] || tracks.monza;
    const weatherPenalty = weatherState?.penalty || 0;
    const modeKey = weatherState?.modeKey || "dry";
    const baseLoss = track.pitLossBase + (modeKey === "wet" ? 1.4 : modeKey === "mixed" ? 0.6 : 0);
    const rawLoss = clamp(baseLoss + traffic * 0.018 - Math.min(tyreAge, 20) * 0.03, 14, 29);
    const undercut = clamp(
      tyreAge * 0.26 + track.undercutBias * 0.58 + weatherPenalty * 5.5 - traffic * 0.08 - (compoundKey === "hard" ? 1.6 : 0),
      -2,
      9,
    );
    const overcut = clamp(
      track.overcutBias * 0.46 + traffic * 0.05 - tyreAge * 0.1 + (modeKey === "mixed" ? 0.8 : 0),
      -2,
      7,
    );
    const safetySwing = clamp(-(rawLoss * 0.16 + safetyCarChance * 0.1 + weatherPenalty * 2.2), -18, -2);

    let call = "Hold for now";
    let note = "The tyre is aging, but the current stop still gives away more time than the fresh rubber is likely to earn back immediately.";

    if (safetyCarChance > 58) {
      call = "Stretch for safety car";
      note = "The caution risk is high enough that staying out a little longer could turn a painful stop into a discounted one.";
    } else if (undercut > overcut + 1.2 && undercut > 2.4) {
      call = "Box for undercut";
      note = "Fresh rubber is now worth enough that pitting first has a real chance to beat the pit loss, especially if rejoin traffic stays manageable.";
    } else if (overcut > undercut + 1 && traffic > 52) {
      call = "Delay for overcut";
      note = "The traffic picture after the stop looks too costly, so the pit wall gains more by extending the stint and letting rivals rejoin into slower air.";
    }

    return {
      rawLoss,
      undercut,
      overcut,
      safetySwing,
      call,
      note,
      window: clamp(42 + undercut * 4 - traffic * 0.18 + safetyCarChance * 0.12, 12, 88),
    };
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

  function initFrontWingScene() {
    const flapInput = document.getElementById("f1-front-flap");
    const gapInput = document.getElementById("f1-front-gap");
    const steerInput = document.getElementById("f1-front-steer");
    const dirtyAir = document.getElementById("f1-front-dirty-air");
    const leader = document.getElementById("f1-front-leader");
    const flapMain = document.getElementById("f1-front-flap-main");
    const flapUpper = document.getElementById("f1-front-flap-upper");
    const feedRibbon = document.getElementById("f1-front-feed-ribbon");
    const flowLines = Array.from(document.querySelectorAll("#f1-front-wing-scene .f1-flow-line"));
    if (!flapInput || !gapInput || !steerInput || !dirtyAir || !leader || !flapMain || !flapUpper || !feedRibbon) {
      return;
    }

    function update() {
      const flap = Number(flapInput.value);
      const gapTenths = Number(gapInput.value);
      const steer = Number(steerInput.value);
      const dirtyFactor = clamp(1 - (gapTenths - 6) / 18, 0, 1);
      const steerNorm = (steer - 20) / 80;

      const bite = clamp(42 + flap * 3.2 + steerNorm * 14 - dirtyFactor * 28, 20, 97);
      const feed = clamp(84 - dirtyFactor * 42 + flap * 0.9 - Math.max(0, steer - 70) * 0.35, 18, 97);
      const drag = clamp(12 + flap * 2.3 + steer * 0.06, 6, 44);

      let state = "Usable";
      let note = "The wing still has enough clean structure in the flow to support a committed entry.";
      if (dirtyFactor > 0.45 || feed < 62) {
        state = "Fading";
        note = "The front wing is still making load, but the useful feed into the rest of the aero package is breaking down.";
      }
      if (dirtyFactor > 0.72 || bite < 46) {
        state = "Washed out";
        note = "The car is now close enough to another wake that front confidence is disappearing before the corner has even properly begun.";
      }

      setText("f1-front-flap-value", `${flap} clicks`);
      setText("f1-front-gap-value", `${(gapTenths / 10).toFixed(1)} s`);
      setText("f1-front-steer-value", `${steer}%`);
      setText("f1-front-bite", `${Math.round(bite)}%`);
      setText("f1-front-feed", `${Math.round(feed)}%`);
      setText("f1-front-drag", `${Math.round(drag)}%`);
      setText("f1-front-state", state);
      setText("f1-front-note", note);

      const leaderX = 72 - dirtyFactor * 18;
      leader.setAttribute("transform", `translate(${leaderX.toFixed(1)} 0)`);
      dirtyAir.style.opacity = `${0.15 + dirtyFactor * 0.55}`;
      dirtyAir.setAttribute("d", `M40 ${78 - dirtyFactor * 16} C${120 + dirtyFactor * 46} ${44 - dirtyFactor * 8}, ${206 + dirtyFactor * 18} 54, 246 90 C220 126, ${120 + dirtyFactor * 34} ${138 + dirtyFactor * 8}, 40 ${120 + dirtyFactor * 10} Z`);
      const mainAngle = -2 - flap * 1.6;
      const upperAngle = -3 - flap * 1.9;
      flapMain.setAttribute("transform", `rotate(${mainAngle.toFixed(1)} 258 138)`);
      flapUpper.setAttribute("transform", `rotate(${upperAngle.toFixed(1)} 254 118)`);
      feedRibbon.style.strokeWidth = `${6 + feed / 12}`;
      feedRibbon.style.opacity = `${0.28 + feed / 130}`;
      flowLines.forEach((line, index) => {
        line.style.opacity = `${0.4 + (1 - dirtyFactor) * 0.4}`;
        line.style.animationDuration = `${12 + dirtyFactor * 3 + index * 0.4}s`;
      });
    }

    flapInput.addEventListener("input", update);
    gapInput.addEventListener("input", update);
    steerInput.addEventListener("input", update);
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

  function initRearWingScene() {
    const wingInput = document.getElementById("f1-rear-wing-level");
    const speedInput = document.getElementById("f1-rear-speed");
    const buttons = Array.from(document.querySelectorAll("[data-drs-mode]"));
    const flap = document.getElementById("f1-rear-flap");
    const mainPlane = document.getElementById("f1-rear-main-plane");
    const airGap = document.getElementById("f1-rear-air-gap");
    if (!wingInput || !speedInput || !buttons.length || !flap || !mainPlane || !airGap) {
      return;
    }

    let currentMode = "closed";

    function update() {
      const wing = Number(wingInput.value);
      const speed = Number(speedInput.value);
      const speedNorm = (speed - 180) / 180;
      const drsOpen = currentMode === "open" ? 1 : 0;

      const support = clamp(38 + wing * 4.6 + speedNorm * 12 - drsOpen * 18, 18, 98);
      const drag = clamp(14 + wing * 3.7 + speedNorm * 10 - drsOpen * 12, 8, 68);
      const topSpeedDelta = Math.round((drsOpen ? 10 : 1) + (11 - wing) * 0.6 + (speed - 220) * 0.02);
      const braking = clamp(44 + support * 0.45 - drsOpen * 10, 18, 96);

      let state = "Anchored";
      let note = "The wing is still carrying enough load that the rear axle feels planted on the next fast commitment.";
      if (drsOpen) {
        state = support > 58 ? "Open but usable" : "Lightened";
        note = support > 58
          ? "DRS is open, but the rear wing level is still high enough to leave a believable rear platform for the braking zone ahead."
          : "The flap is open and the rear is now trading a meaningful amount of confidence for top speed. This works only if the straight is worth it.";
      }

      setActiveByValue(buttons, currentMode, "drsMode");
      setText("f1-rear-wing-value", `${wing} clicks`);
      setText("f1-rear-speed-value", `${speed} km/h`);
      setText("f1-rear-support", `${Math.round(support)}%`);
      setText("f1-rear-drag", `${Math.round(drag)}%`);
      setText("f1-rear-top-speed", `+${topSpeedDelta} km/h`);
      setText("f1-rear-state", state);
      setText("f1-rear-note", note);

      flap.setAttribute("transform", `rotate(${(-wing * 0.35 + (drsOpen ? -14 : 0)).toFixed(1)} 548 72)`);
      mainPlane.setAttribute("fill", `rgba(180, 58, 51, ${(0.16 + wing / 34).toFixed(3)})`);
      airGap.style.strokeWidth = `${4 + (drsOpen ? 8 : 3) + speedNorm * 2}`;
      airGap.style.opacity = `${0.32 + (drsOpen ? 0.34 : 0.14)}`;
    }

    buttons.forEach((button) => {
      button.addEventListener("click", () => {
        currentMode = button.dataset.drsMode || "closed";
        update();
      });
    });

    wingInput.addEventListener("input", update);
    speedInput.addEventListener("input", update);
    update();
  }

  function initChassisScene() {
    const stiffnessInput = document.getElementById("f1-platform-stiffness");
    const brakeInput = document.getElementById("f1-platform-brake");
    const kerbInput = document.getElementById("f1-platform-kerb");
    const speedInput = document.getElementById("f1-platform-speed");
    const car = document.getElementById("f1-platform-car");
    const frontDamper = document.getElementById("f1-platform-front-damper");
    const rearDamper = document.getElementById("f1-platform-rear-damper");
    const kerbBlock = document.getElementById("f1-platform-kerb-block");
    if (!stiffnessInput || !brakeInput || !kerbInput || !speedInput || !car || !frontDamper || !rearDamper || !kerbBlock) {
      return;
    }

    function update() {
      const stiffness = Number(stiffnessInput.value);
      const brake = Number(brakeInput.value);
      const kerb = Number(kerbInput.value);
      const speed = Number(speedInput.value);
      const speedNorm = (speed - 120) / 200;

      const frontCompression = clamp(brake * 0.72 + speedNorm * 14 - stiffness * 0.34 + 10, 4, 100);
      const rearCompression = clamp(kerb * 0.6 + speedNorm * 6 - stiffness * 0.22 + 8, 4, 100);
      const pitch = clamp(brake * 0.046 - stiffness * 0.018, -0.4, 4.8);
      const heave = clamp(kerb * 0.032 - stiffness * 0.012, 0, 3.4);

      const calm = clamp(92 - Math.abs(58 - stiffness) * 0.9 - brake * 0.18 - kerb * 0.14, 18, 96);
      const kerbScore = clamp(88 - stiffness * 0.58 - kerb * 0.22 + 12, 14, 94);
      const floorScore = clamp(42 + stiffness * 0.54 - pitch * 7 - heave * 8, 18, 97);
      const tyreScore = clamp(74 + (66 - stiffness) * 0.24 - kerb * 0.18, 18, 95);

      let note = "The chassis is holding shape well enough, but the kerb event is starting to tax the tyre's patience.";
      if (calm < 48) {
        note = "The platform is moving too much for the floor to stay consistently happy. The car may feel dramatic rather than dependable.";
      } else if (kerbScore < 40) {
        note = "The platform is disciplined, but the stiff response over the kerb is now turning compliance into a visible weakness.";
      } else if (tyreScore > 74 && floorScore > 72) {
        note = "This is the sweet spot the teams chase: enough discipline to protect the floor without making the tyre and kerb response hostile.";
      }

      setText("f1-platform-stiffness-value", `${stiffness}%`);
      setText("f1-platform-brake-value", `${brake}%`);
      setText("f1-platform-kerb-value", `${kerb} mm`);
      setText("f1-platform-speed-value", `${speed} km/h`);
      setText("f1-platform-calm", `${Math.round(calm)}%`);
      setText("f1-platform-kerb-score", `${Math.round(kerbScore)}%`);
      setText("f1-platform-floor-score", `${Math.round(floorScore)}%`);
      setText("f1-platform-tyre-score", `${Math.round(tyreScore)}%`);
      setText("f1-platform-note", note);
      setMeter("f1-platform-front-travel", frontCompression);
      setMeter("f1-platform-rear-travel", rearCompression);

      car.setAttribute("transform", `translate(0 ${heave.toFixed(2)}) rotate(${(-pitch).toFixed(2)} 400 170)`);
      frontDamper.setAttribute("y2", String(170 - frontCompression * 0.32));
      rearDamper.setAttribute("y2", String(164 - rearCompression * 0.3));
      kerbBlock.setAttribute("height", String(8 + kerb * 0.4));
      kerbBlock.setAttribute("y", String(214 - (8 + kerb * 0.4)));
    }

    stiffnessInput.addEventListener("input", update);
    brakeInput.addEventListener("input", update);
    kerbInput.addEventListener("input", update);
    speedInput.addEventListener("input", update);
    update();
  }

  function initPowerScene(initialTrack) {
    const modeButtons = Array.from(document.querySelectorAll("[data-power-mode]"));
    const biasButtons = Array.from(document.querySelectorAll("[data-power-bias]"));
    if (!modeButtons.length || !biasButtons.length) {
      return;
    }

    let currentTrack = initialTrack || "monza";
    let currentMode = "harvest";
    let currentBias = "early";

    function update() {
      const mode = powerModes[currentMode];
      const powerState = computePowerState(currentMode, currentBias, currentTrack);
      const track = tracks[currentTrack] || tracks.monza;

      setActiveByValue(modeButtons, currentMode, "powerMode");
      setActiveByValue(biasButtons, currentBias, "powerBias");
      setMeter("f1-meter-ice", mode.ice);
      setMeter("f1-meter-deploy", mode.deploy);
      setMeter("f1-meter-harvest", mode.harvest);
      setMeter("f1-meter-cooling", mode.cooling);
      setText("f1-power-note", mode.note);
      setText("f1-power-map-note", powerState.note);
      track.sectors.forEach((sector, index) => {
        setText(`f1-power-sector-${index + 1}-title`, `${sector.label} deploy`);
        setMeter(`f1-power-sector-${index + 1}-bar`, powerState.sectorBars[index]);
      });

      document.dispatchEvent(new CustomEvent("f1-power-change", {
        detail: {
          trackKey: currentTrack,
          powerState,
        },
      }));
    }

    modeButtons.forEach((button) => {
      button.addEventListener("click", () => {
        currentMode = button.dataset.powerMode || "balanced";
        update();
      });
    });

    biasButtons.forEach((button) => {
      button.addEventListener("click", () => {
        currentBias = button.dataset.powerBias || "distributed";
        update();
      });
    });

    document.addEventListener("f1-track-change", (event) => {
      currentTrack = event.detail?.trackKey || currentTrack;
      update();
    });

    update();
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
    const frontBar = document.getElementById("f1-brake-front-bar");
    const rearBar = document.getElementById("f1-brake-rear-bar");
    const car = document.getElementById("f1-brake-car");
    if (!speedInput || !biasInput || !harvestInput || !marker || !frontBar || !rearBar || !car) {
      return;
    }

    function update() {
      const speed = Number(speedInput.value);
      const bias = Number(biasInput.value);
      const harvest = Number(harvestInput.value);
      const speedNorm = (speed - 140) / 200;
      const authority = clamp(72 + (speed - 180) * 0.08 - Math.abs(bias - 55.8) * 2.6 - harvest * 0.09, 28, 96);
      const rearRotationScore = clamp((56.5 - bias) * 8 + harvest * 0.15 + 50, 0, 100);
      const frontLoad = clamp(56 + speedNorm * 16 + (bias - 55.5) * 3 + harvest * 0.05, 46, 84);
      const rearLoad = clamp(100 - frontLoad, 16, 54);

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
      setMeter("f1-brake-front-bar", frontLoad);
      setMeter("f1-brake-rear-bar", rearLoad);
      car.setAttribute("transform", `translate(0 ${(-speedNorm * 2.4).toFixed(2)}) rotate(${(-1.8 - speedNorm * 3.6 - harvest * 0.02).toFixed(2)} 410 172)`);
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

  function initTrackPresetScene() {
    const presetButtons = Array.from(document.querySelectorAll("[data-track-preset]"));
    if (!presetButtons.length) {
      return;
    }

    const wingInput = document.getElementById("f1-setup-wing");
    const rideInput = document.getElementById("f1-setup-ride");
    const stiffnessInput = document.getElementById("f1-setup-stiffness");
    const biasInput = document.getElementById("f1-setup-bias");
    const noteNode = document.getElementById("f1-preset-note");

    function applyPreset(presetKey) {
      const preset = trackPresets[presetKey];
      if (!preset) {
        return;
      }

      setActiveByValue(presetButtons, presetKey, "trackPreset");
      if (noteNode) {
        noteNode.textContent = preset.note;
      }

      document.querySelector(`[data-track="${preset.trackKey}"]`)?.click();
      document.querySelector(`[data-power-mode="${preset.powerMode}"]`)?.click();
      document.querySelector(`[data-power-bias="${preset.powerBias}"]`)?.click();
      document.querySelector(`[data-setup-compound="${preset.compoundKey}"]`)?.click();
      document.querySelector(`[data-lap-plan="${preset.lapPlan}"]`)?.click();

      if (wingInput) {
        wingInput.value = String(preset.wing);
        dispatchInputEvent(wingInput);
      }
      if (rideInput) {
        rideInput.value = String(preset.ride);
        dispatchInputEvent(rideInput);
      }
      if (stiffnessInput) {
        stiffnessInput.value = String(preset.stiffness);
        dispatchInputEvent(stiffnessInput);
      }
      if (biasInput) {
        biasInput.value = String(preset.bias);
        dispatchInputEvent(biasInput);
      }
    }

    presetButtons.forEach((button) => {
      button.addEventListener("click", () => {
        applyPreset(button.dataset.trackPreset || "monza");
      });
    });

    document.addEventListener("f1-track-change", (event) => {
      const trackKey = event.detail?.trackKey;
      if (!trackKey || !trackPresets[trackKey]) {
        return;
      }
      setActiveByValue(presetButtons, trackKey, "trackPreset");
      if (noteNode) {
        noteNode.textContent = trackPresets[trackKey].note;
      }
    });

    applyPreset("monza");
  }

  function initWeatherScene(initialTrack) {
    const buttons = Array.from(document.querySelectorAll("[data-weather-mode]"));
    const tempInput = document.getElementById("f1-weather-temp");
    const lapsInput = document.getElementById("f1-weather-laps");
    const rainInput = document.getElementById("f1-weather-rain");
    const marker = document.getElementById("f1-weather-crossover-marker");
    if (!buttons.length || !tempInput || !lapsInput || !rainInput || !marker) {
      return;
    }

    let currentTrack = initialTrack || "monza";
    let currentCompoundKey = setupDefaults.compoundKey;
    let currentMode = "dry";

    function update() {
      const temp = Number(tempInput.value);
      const laps = Number(lapsInput.value);
      const rain = Number(rainInput.value);
      const strategy = computeWeatherStrategy(currentMode, currentTrack, temp, laps, rain, currentCompoundKey);

      setActiveByValue(buttons, currentMode, "weatherMode");
      setText("f1-weather-temp-value", `${temp} C`);
      setText("f1-weather-laps-value", `${laps} laps`);
      setText("f1-weather-rain-value", `${rain}%`);
      setText("f1-weather-tyre", strategy.recommendedTyre);
      setText("f1-weather-urgency", strategy.urgency);
      setText("f1-weather-pit", strategy.pit);
      setText("f1-weather-bias", strategy.bias);
      setText("f1-weather-note", strategy.note);
      setText("f1-weather-strategy", `${strategy.trackTitle} now rewards a ${strategy.bias.toLowerCase()} approach because the tyre choice is drifting toward ${strategy.recommendedTyre.toLowerCase()}.`);
      setMeter("f1-weather-band-fill", strategy.bandFill);
      marker.style.left = `${strategy.crossover}%`;

      document.dispatchEvent(new CustomEvent("f1-weather-change", {
        detail: {
          trackKey: currentTrack,
          strategy,
        },
      }));
    }

    buttons.forEach((button) => {
      button.addEventListener("click", () => {
        currentMode = button.dataset.weatherMode || "dry";
        update();
      });
    });

    tempInput.addEventListener("input", update);
    lapsInput.addEventListener("input", update);
    rainInput.addEventListener("input", update);

    document.addEventListener("f1-track-change", (event) => {
      currentTrack = event.detail?.trackKey || currentTrack;
      update();
    });

    document.addEventListener("f1-setup-change", (event) => {
      currentCompoundKey = event.detail?.compoundKey || currentCompoundKey;
      update();
    });

    update();
  }

  function initPitScene(initialTrack) {
    const ageInput = document.getElementById("f1-pit-age");
    const trafficInput = document.getElementById("f1-pit-traffic");
    const safetyInput = document.getElementById("f1-pit-sc");
    const lossBand = document.getElementById("f1-pit-loss-band");
    const marker = document.getElementById("f1-pit-window-marker");
    if (!ageInput || !trafficInput || !safetyInput || !lossBand || !marker) {
      return;
    }

    let currentTrack = initialTrack || "monza";
    let currentCompoundKey = setupDefaults.compoundKey;
    let currentWeatherState = computeWeatherStrategy("dry", currentTrack, 31, 18, 18, currentCompoundKey);

    function update() {
      const tyreAge = Number(ageInput.value);
      const traffic = Number(trafficInput.value);
      const safetyChance = Number(safetyInput.value);
      const strategy = computePitStrategy(currentTrack, currentWeatherState, tyreAge, traffic, safetyChance, currentCompoundKey);

      setText("f1-pit-age-value", `${tyreAge} laps`);
      setText("f1-pit-traffic-value", `${traffic}%`);
      setText("f1-pit-sc-value", `${safetyChance}%`);
      setText("f1-pit-loss", `${strategy.rawLoss.toFixed(1)} s`);
      setText("f1-pit-undercut", `${strategy.undercut >= 0 ? "+" : ""}${strategy.undercut.toFixed(1)} s`);
      setText("f1-pit-overcut", `${strategy.overcut >= 0 ? "+" : ""}${strategy.overcut.toFixed(1)} s`);
      setText("f1-pit-safety", `${strategy.safetySwing.toFixed(1)} s`);
      setText("f1-pit-call", strategy.call);
      setText("f1-pit-call-note", strategy.note);
      setText("f1-pit-note", `${(tracks[currentTrack] || tracks.monza).title}: ${strategy.note}`);

      lossBand.style.width = `${clamp(strategy.rawLoss / 28 * 100, 18, 92)}%`;
      marker.style.left = `${strategy.window}%`;
    }

    ageInput.addEventListener("input", update);
    trafficInput.addEventListener("input", update);
    safetyInput.addEventListener("input", update);

    document.addEventListener("f1-track-change", (event) => {
      currentTrack = event.detail?.trackKey || currentTrack;
      update();
    });

    document.addEventListener("f1-weather-change", (event) => {
      currentTrack = event.detail?.trackKey || currentTrack;
      currentWeatherState = event.detail?.strategy || currentWeatherState;
      update();
    });

    document.addEventListener("f1-setup-change", (event) => {
      currentCompoundKey = event.detail?.compoundKey || currentCompoundKey;
      update();
    });

    update();
  }

  function initRacecraftScene(initialTrack) {
    const gapInput = document.getElementById("f1-race-gap");
    const deployInput = document.getElementById("f1-race-deploy");
    const brakeInput = document.getElementById("f1-race-brake");
    const drsButtons = Array.from(document.querySelectorAll("[data-racecraft-drs]"));
    const leader = document.getElementById("f1-race-leader");
    const chaser = document.getElementById("f1-race-chaser");
    const dirtyAir = document.getElementById("f1-race-dirty-air");
    const zone = document.getElementById("f1-race-drs-zone");
    const detection = document.getElementById("f1-race-detection");
    if (!gapInput || !deployInput || !brakeInput || !drsButtons.length || !leader || !chaser || !dirtyAir || !zone || !detection) {
      return;
    }

    let currentTrack = initialTrack || "monza";
    let drsMode = "off";

    function update() {
      const track = tracks[currentTrack] || tracks.monza;
      const raceCopy = getRacecraftTrackCopy(currentTrack);
      const gapTenths = Number(gapInput.value);
      const deploy = Number(deployInput.value);
      const brakeConfidence = Number(brakeInput.value);
      const dirtyFactor = clamp(1 - (gapTenths - 4) / 16, 0, 1);
      const drsOn = drsMode === "on";
      const straightFactor = (track.weights.straight || 0) * 100;
      const brakeFactor = (track.weights.braking || 0) * 100;
      const fastFactor = (track.weights.fast || 0) * 100;

      const dirtyPenalty = clamp(dirtyFactor * (44 + fastFactor * 0.45), 6, 92);
      const closingRate = clamp(deploy * 0.16 + straightFactor * 0.36 + (drsOn ? 8 + straightFactor * 0.08 : 0) - dirtyPenalty * 0.12, 4, 34);
      const brakingOpportunity = clamp(brakeConfidence * 0.48 + brakeFactor * 0.55 - dirtyPenalty * 0.12, 10, 100);
      const passChanceScore = clamp(closingRate * 2.1 + brakingOpportunity * 0.42 - dirtyPenalty * 0.3 + (drsOn ? 12 : 0), 0, 100);

      let windowLabel = "Narrow";
      if (brakingOpportunity > 48) {
        windowLabel = "Usable";
      }
      if (brakingOpportunity > 72) {
        windowLabel = "Wide";
      }

      let passLabel = "Hopeful";
      let note = "The attack might force a defensive move, but it still lacks the closing rate or braking margin to feel fully convincing.";
      if (passChanceScore > 45) {
        passLabel = "Promising";
        note = "The chaser has enough straight-line gain and braking margin to make the overtake worth attempting.";
      }
      if (passChanceScore > 68) {
        passLabel = "High odds";
        note = "This is a real passing window: the chaser is close enough through the dirty-air phase, then gains enough rate to attack the braking zone with confidence.";
      }
      if (!drsOn && straightFactor > 24) {
        note = "Without DRS the straight is doing less of the work, so the move depends much more heavily on exit quality and bravery under braking.";
      }

      const zoneWidth = 120 + straightFactor * 4.6 + (drsOn ? 60 : 0);
      const zoneX = clamp(330 - straightFactor * 0.8, 250, 380);

      setActiveByValue(drsButtons, drsMode, "racecraftDrs");
      setText("f1-race-gap-value", `${(gapTenths / 10).toFixed(1)} s`);
      setText("f1-race-deploy-value", `${deploy}%`);
      setText("f1-race-brake-value", `${brakeConfidence}%`);
      setText("f1-race-track-kicker", raceCopy.kicker);
      setText("f1-race-track-title", track.title);
      setText("f1-race-track-note", raceCopy.note);
      setText("f1-race-dirty", `${Math.round(dirtyPenalty)}%`);
      setText("f1-race-close", `${Math.round(closingRate)} km/h`);
      setText("f1-race-window", windowLabel);
      setText("f1-race-pass", passLabel);
      setText("f1-race-note", note);

      leader.setAttribute("transform", `translate(${Math.round(220 - dirtyFactor * 56)} 0)`);
      chaser.setAttribute("transform", `translate(${Math.round(0 - dirtyFactor * 42 + closingRate * 1.8)} 0)`);
      dirtyAir.style.opacity = `${0.18 + dirtyFactor * 0.52}`;
      dirtyAir.setAttribute("d", `M180 ${86 - dirtyFactor * 20} C${250 + dirtyFactor * 50} ${48 - dirtyFactor * 8}, ${344 + dirtyFactor * 18} 58, 390 102 C360 138, ${258 + dirtyFactor * 40} ${146 + dirtyFactor * 8}, 182 ${126 + dirtyFactor * 10} Z`);
      zone.setAttribute("x", String(zoneX));
      zone.setAttribute("width", String(zoneWidth));
      detection.setAttribute("x", String(zoneX - 46));
    }

    drsButtons.forEach((button) => {
      button.addEventListener("click", () => {
        drsMode = button.dataset.racecraftDrs || "off";
        update();
      });
    });

    gapInput.addEventListener("input", update);
    deployInput.addEventListener("input", update);
    brakeInput.addEventListener("input", update);
    document.addEventListener("f1-track-change", (event) => {
      currentTrack = event.detail?.trackKey || currentTrack;
      update();
    });

    update();
  }

  function initLapBuilderScene(initialTrack) {
    const buttons = Array.from(document.querySelectorAll("[data-lap-plan]"));
    if (!buttons.length) {
      return;
    }

    let currentTrack = initialTrack || "monza";
    let currentPlan = "push";
    let currentCompoundKey = setupDefaults.compoundKey;
    let currentPowerState = computePowerState("harvest", "early", currentTrack);
    let currentWeatherState = computeWeatherStrategy("dry", currentTrack, 31, 18, 18, currentCompoundKey);
    let currentScores = computeSetupScores(
      currentTrack,
      currentCompoundKey,
      setupDefaults.wing,
      setupDefaults.ride,
      setupDefaults.stiffness,
      setupDefaults.bias,
    );

    function render() {
      const track = tracks[currentTrack] || tracks.monza;
      const plan = lapPlans[currentPlan] || lapPlans.push;
      const adjusted = {
        straight: clamp(currentScores.straight + plan.adjustments.straight, 0, 100),
        slow: clamp(currentScores.slow + plan.adjustments.slow, 0, 100),
        fast: clamp(currentScores.fast + plan.adjustments.fast, 0, 100),
        tyreLife: clamp(currentScores.tyreLife + plan.adjustments.tyreLife, 0, 100),
        braking: clamp(currentScores.braking + plan.adjustments.braking, 0, 100),
        balance: clamp(currentScores.balance + plan.adjustments.balance, 0, 100),
      };

      setActiveByValue(buttons, currentPlan, "lapPlan");
      setText("f1-lap-plan-title", plan.title);
      setText("f1-lap-plan-note", plan.note);
      setText("f1-lap-track", track.title);
      setText("f1-lap-compound", getCompoundTitle(currentCompoundKey));
      setText("f1-lap-power-mode", currentPowerState.modeLabel);
      setText("f1-lap-power-bias", currentPowerState.biasLabel);
      setText("f1-lap-weather", currentWeatherState.label);
      setText("f1-lap-strategy-tyre", currentWeatherState.recommendedTyre);

      const speedTrace = [];
      const brakeTrace = [];
      const deployTrace = [];
      const speedPreset = track.tracePresets?.speed || [34, 94, 44, 58, 76, 54, 70, 90, 48];
      const brakePreset = track.tracePresets?.brake || [18, 96, 24, 44, 72, 20, 42, 84, 18];
      const deployPreset = track.tracePresets?.deploy || [52, 92, 44, 48, 68, 42, 58, 84, 46];
      const sectorDeltas = track.sectors.map((sector, index) => {
        const powerBoost = (currentPowerState.sectorBars[index] || 0) * 0.18;
        const weatherPenalty = currentWeatherState.penalty * (0.24 + (sector.weights.tyreLife || 0) * 1.2 + (sector.weights.braking || 0) * 0.4);
        const sectorScore = Object.keys(sector.weights).reduce((total, key) => {
          return total + (sector.weights[key] || 0) * adjusted[key];
        }, 0) + powerBoost;
        const sectorDelta = clamp((87 - sectorScore) / 20 + weatherPenalty, -0.35, 2.2);
        const dominantMetric = Object.keys(sector.weights).sort((left, right) => {
          return (sector.weights[right] || 0) - (sector.weights[left] || 0);
        })[0];
        const note = `${sector.lead}, and the current weak point is ${metricLabels[dominantMetric] || dominantMetric}.`;

        const baseIndex = index * 3;
        const straightTuning = (adjusted.straight - 60) * 0.18;
        const fastTuning = (adjusted.fast - 60) * 0.14;
        const slowTuning = (adjusted.slow - 60) * 0.14;
        const brakeTuning = (adjusted.braking - 60) * 0.16;
        const balanceTuning = (adjusted.balance - 60) * 0.1;

        speedTrace.push(
          clamp(speedPreset[baseIndex] + slowTuning + balanceTuning - currentWeatherState.penalty * 10, 8, 98),
          clamp(speedPreset[baseIndex + 1] + straightTuning + fastTuning + powerBoost * 0.28 - currentWeatherState.penalty * 14, 8, 98),
          clamp(speedPreset[baseIndex + 2] + fastTuning + balanceTuning - currentWeatherState.penalty * 9, 8, 98),
        );
        brakeTrace.push(
          clamp(brakePreset[baseIndex] + brakeTuning + currentWeatherState.penalty * 10, 4, 98),
          clamp(brakePreset[baseIndex + 1] + brakeTuning + currentWeatherState.penalty * 14, 4, 98),
          clamp(brakePreset[baseIndex + 2] + brakeTuning + currentWeatherState.penalty * 12, 4, 98),
        );
        deployTrace.push(
          clamp(deployPreset[baseIndex] + (currentPowerState.sectorBars[index] - 50) * 0.4, 8, 98),
          clamp(deployPreset[baseIndex + 1] + (currentPowerState.sectorBars[index] - 50) * 0.5 + plan.adjustments.straight * 1.4, 8, 98),
          clamp(deployPreset[baseIndex + 2] + (currentPowerState.sectorBars[index] - 50) * 0.34, 8, 98),
        );

        setText(`f1-sector-${index + 1}-title`, sector.label);
        setText(`f1-sector-${index + 1}-focus`, sector.focus);
        setText(`f1-sector-${index + 1}-delta`, formatSignedDelta(sectorDelta));
        setText(`f1-sector-${index + 1}-note`, note);
        setMeter(`f1-sector-${index + 1}-bar`, clamp(sectorScore, 0, 100));
        setText(`f1-telemetry-sector-${index + 1}`, sector.label);

        return sectorDelta;
      });

      const totalDelta = sectorDeltas.reduce((total, value) => total + value, 0);
      setText("f1-lap-total", formatSignedDelta(totalDelta));
      const traceOptions = { left: 40, top: 70, height: 140, width: 680 };
      const speedPoints = buildTracePoints(speedTrace, traceOptions);
      const brakePoints = buildTracePoints(brakeTrace, traceOptions);
      const deployPoints = buildTracePoints(deployTrace, traceOptions);
      document.getElementById("f1-trace-speed")?.setAttribute("points", speedPoints);
      document.getElementById("f1-trace-brake")?.setAttribute("points", brakePoints);
      document.getElementById("f1-trace-deploy")?.setAttribute("points", deployPoints);
    }

    buttons.forEach((button) => {
      button.addEventListener("click", () => {
        currentPlan = button.dataset.lapPlan || "push";
        render();
      });
    });

    document.addEventListener("f1-track-change", (event) => {
      currentTrack = event.detail?.trackKey || currentTrack;
      render();
    });

    document.addEventListener("f1-setup-change", (event) => {
      currentTrack = event.detail?.trackKey || currentTrack;
      currentCompoundKey = event.detail?.compoundKey || currentCompoundKey;
      currentScores = event.detail?.scores || currentScores;
      render();
    });

    document.addEventListener("f1-power-change", (event) => {
      currentTrack = event.detail?.trackKey || currentTrack;
      currentPowerState = event.detail?.powerState || currentPowerState;
      render();
    });

    document.addEventListener("f1-weather-change", (event) => {
      currentTrack = event.detail?.trackKey || currentTrack;
      currentWeatherState = event.detail?.strategy || currentWeatherState;
      render();
    });

    render();
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
    let currentCompound = setupDefaults.compoundKey;

    function update() {
      const wing = Number(wingInput.value);
      const ride = Number(rideInput.value);
      const stiffness = Number(stiffnessInput.value);
      const bias = Number(biasInput.value);
      const track = tracks[currentTrack] || tracks.monza;
      const scores = computeSetupScores(currentTrack, currentCompound, wing, ride, stiffness, bias);

      setActiveByValue(buttons, currentCompound, "setupCompound");
      setText("f1-setup-track", track.title);
      setText("f1-setup-wing-value", `${wing} clicks`);
      setText("f1-setup-ride-value", `${ride} mm`);
      setText("f1-setup-stiffness-value", `${stiffness}%`);
      setText("f1-setup-bias-value", `${bias.toFixed(1)}% front`);
      setText("f1-setup-straight", `${Math.round(scores.straight)}%`);
      setText("f1-setup-slow", `${Math.round(scores.slow)}%`);
      setText("f1-setup-fast", `${Math.round(scores.fast)}%`);
      setText("f1-setup-tyre-life", `${Math.round(scores.tyreLife)}%`);
      setText("f1-setup-braking", `${Math.round(scores.braking)}%`);
      setText("f1-setup-balance", `${Math.round(scores.balance)}%`);
      setText("f1-setup-note", scores.note);

      document.dispatchEvent(new CustomEvent("f1-setup-change", {
        detail: {
          trackKey: currentTrack,
          compoundKey: currentCompound,
          scores,
        },
      }));
    }

    buttons.forEach((button) => {
      button.addEventListener("click", () => {
        currentCompound = button.dataset.setupCompound || setupDefaults.compoundKey;
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
    initFrontWingScene();
    initFloorScene();
    initRearWingScene();
    initChassisScene();
    initTyreScene();
    initBrakingScene();
    const initialTrack = initTrackScene();
    initLapBuilderScene(initialTrack);
    initPowerScene(initialTrack);
    initRacecraftScene(initialTrack);
    initSetupScene(initialTrack);
    initWeatherScene(initialTrack);
    initPitScene(initialTrack);
    initTrackPresetScene();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
