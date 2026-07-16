"use strict";

(function () {
  const scale = Math.min(window.devicePixelRatio || 1, 2);

  const COLORS = {
    red: [214, 92, 74],
    orange: [216, 135, 66],
    yellow: [215, 170, 53],
    green: [119, 168, 79],
    cyan: [78, 176, 171],
    blue: [61, 135, 183],
    violet: [155, 103, 184],
    gray: [146, 151, 158],
    dark: [30, 35, 42],
    paper: [248, 242, 234],
    ink: [38, 43, 51],
    wake: [74, 132, 169],
    ground: [214, 204, 193],
  };

  const COMPONENTS = [
    {
      key: "front-wing",
      label: "Front wing",
      color: COLORS.red,
      caption: "The front wing is the first aerodynamic negotiator. It buys front bite, but it also decides how cleanly the floor and the rest of the car are being fed.",
    },
    {
      key: "floor",
      label: "Floor",
      color: COLORS.cyan,
      caption: "The floor is the main downforce machine in the current era. It wants speed and proximity to the ground, but only inside a narrow geometric window.",
    },
    {
      key: "diffuser",
      label: "Diffuser",
      color: COLORS.orange,
      caption: "The diffuser tries to recover the fast underfloor flow without letting it separate abruptly. That makes it sensitive to how healthy the whole platform has been upstream.",
    },
    {
      key: "power-unit",
      label: "Power unit",
      color: COLORS.red,
      caption: "The power unit is a hybrid energy manager, not just a combustion engine. It decides how much electrical and thermal margin to spend now and how much to save for later sectors.",
    },
    {
      key: "tyres",
      label: "Tyres",
      color: COLORS.gray,
      caption: "Every clever idea on the car has to survive inside the tyre window. Grip, overheating, and wear are where abstract engineering choices finally become real or fail.",
    },
    {
      key: "brakes",
      label: "Brakes",
      color: COLORS.yellow,
      caption: "The brakes do more than stop the car. They move load, change pitch, interact with energy recovery, and decide how much entry confidence the driver still has at turn-in.",
    },
    {
      key: "rear-wing",
      label: "Rear wing",
      color: COLORS.orange,
      caption: "The rear wing is the cleanest straight-line versus support tradeoff on the car. Its load helps the rear axle trust the next corner, but that support is expensive in drag.",
    },
    {
      key: "sidepods",
      label: "Sidepods",
      color: COLORS.blue,
      caption: "Sidepods are cooling and flow-shaping devices. They help package the power unit and influence how the body feeds the rear of the car.",
    },
    {
      key: "gearbox",
      label: "Gearbox",
      color: COLORS.violet,
      caption: "The gearbox is both a driveline component and a rear packaging anchor. It matters mechanically, structurally, and aerodynamically.",
    },
    {
      key: "halo",
      label: "Halo",
      color: COLORS.green,
      caption: "The halo is primarily a safety structure, but like every exposed object on the car it also creates an aerodynamic disturbance that the surrounding surfaces must absorb.",
    },
  ];

  const TYRES = [
    {
      key: "soft",
      label: "Soft",
      color: COLORS.red,
      window: [0.44, 0.66],
      baseGrip: 0.93,
      wear: 1.18,
    },
    {
      key: "medium",
      label: "Medium",
      color: COLORS.yellow,
      window: [0.42, 0.7],
      baseGrip: 0.87,
      wear: 0.86,
    },
    {
      key: "hard",
      label: "Hard",
      color: COLORS.gray,
      window: [0.48, 0.76],
      baseGrip: 0.8,
      wear: 0.62,
    },
    {
      key: "intermediate",
      label: "Intermediate",
      color: COLORS.green,
      window: [0.26, 0.46],
      baseGrip: 0.73,
      wear: 0.78,
    },
    {
      key: "wet",
      label: "Wet",
      color: COLORS.blue,
      window: [0.18, 0.38],
      baseGrip: 0.66,
      wear: 0.7,
    },
  ];

  const POWER_MODES = [
    { key: "harvest", label: "Harvest", ice: 0.68, deploy: 0.32, harvest: 0.78, cooling: 0.88 },
    { key: "balanced", label: "Balanced", ice: 0.82, deploy: 0.58, harvest: 0.54, cooling: 0.68 },
    { key: "attack", label: "Attack", ice: 0.94, deploy: 0.86, harvest: 0.24, cooling: 0.42 },
  ];

  const POWER_BIASES = [
    { key: "early", label: "Early", splits: [0.5, 0.3, 0.2] },
    { key: "split", label: "Split", splits: [0.34, 0.33, 0.33] },
    { key: "late", label: "Late", splits: [0.2, 0.3, 0.5] },
  ];

  const LAP_PLANS = [
    { key: "push", label: "Qualifying push", adjustments: { straight: 6, slow: 5, fast: 4, tyre: -14, braking: -2, balance: 2 } },
    { key: "race", label: "Balanced race", adjustments: { straight: 1, slow: 1, fast: 1, tyre: -2, braking: 1, balance: 0 } },
    { key: "protect", label: "Protect tyres", adjustments: { straight: -4, slow: -2, fast: -3, tyre: 12, braking: 4, balance: 1 } },
  ];

  const WEATHER_MODES = [
    { key: "dry", label: "Dry" },
    { key: "mixed", label: "Mixed" },
    { key: "wet", label: "Wet" },
  ];

  const TRACKS = [
    {
      key: "monza",
      label: "Monza",
      pitLossBase: 21.0,
      undercutBias: 7,
      overcutBias: 4,
      path: "M68 140 C84 84, 152 60, 220 78 S346 142, 422 116 C454 106, 472 134, 450 160 C420 194, 336 204, 292 184 C236 158, 178 182, 150 216 C132 236, 90 228, 84 196 C80 176, 60 170, 68 140 Z",
      caption: "Monza rewards low drag, heavy braking stability, and enough rear security that the straights do not come at the price of panic in the chicanes.",
      traces: {
        speed: [34, 94, 44, 58, 76, 54, 70, 90, 48],
        brake: [18, 96, 24, 44, 72, 20, 42, 84, 18],
        deploy: [52, 92, 44, 48, 68, 42, 58, 84, 46],
      },
      sectors: ["Retifilo", "Lesmo", "Ascari / Parabolica"],
      preset: { wing: 0.24, ride: 0.45, stiffness: 0.66, bias: 0.74, tyre: 1, powerMode: 2, powerBias: 0, lapPlan: 1 },
    },
    {
      key: "monaco",
      label: "Monaco",
      pitLossBase: 18.6,
      undercutBias: 4,
      overcutBias: 7,
      path: "M132 214 C108 196, 98 166, 114 140 C132 110, 164 118, 176 88 C186 60, 216 54, 242 72 C274 94, 310 94, 348 86 C384 80, 410 98, 408 128 C406 168, 446 170, 452 204 C456 228, 430 236, 398 232 C348 226, 304 224, 268 244 C234 262, 194 256, 180 232 C168 210, 148 226, 132 214 Z",
      caption: "Monaco spends the lap at low speed, near barriers, and with tiny margins for error. Rotation, traction, and confidence matter more than raw top speed.",
      traces: {
        speed: [30, 56, 34, 40, 52, 36, 42, 58, 38],
        brake: [28, 74, 36, 44, 62, 40, 48, 70, 34],
        deploy: [34, 58, 32, 36, 50, 34, 38, 56, 34],
      },
      sectors: ["Sainte Devote", "Casino / Hairpin", "Pool / Rascasse"],
      preset: { wing: 0.88, ride: 0.68, stiffness: 0.34, bias: 0.48, tyre: 0, powerMode: 1, powerBias: 1, lapPlan: 1 },
    },
    {
      key: "silverstone",
      label: "Silverstone",
      pitLossBase: 20.4,
      undercutBias: 6,
      overcutBias: 5,
      path: "M68 164 C72 114, 118 78, 170 82 C220 86, 244 126, 284 126 C338 126, 350 78, 402 70 C446 64, 486 90, 486 132 C486 164, 514 176, 544 156 C578 132, 618 138, 636 170 C654 202, 626 228, 580 226 C542 224, 504 208, 458 214 C404 222, 362 252, 308 250 C250 248, 220 216, 178 210 C130 204, 64 214, 68 164 Z",
      caption: "Silverstone is a platform-confidence track. High-speed direction changes reward a car that keeps the floor alive while staying believable on the front axle.",
      traces: {
        speed: [46, 84, 38, 54, 94, 62, 66, 86, 48],
        brake: [24, 58, 44, 30, 42, 26, 34, 54, 30],
        deploy: [42, 64, 38, 40, 68, 44, 48, 66, 42],
      },
      sectors: ["Abbey / Village", "Maggotts / Becketts", "Stowe / Vale"],
      preset: { wing: 0.72, ride: 0.26, stiffness: 0.8, bias: 0.62, tyre: 1, powerMode: 2, powerBias: 1, lapPlan: 0 },
    },
    {
      key: "spa",
      label: "Spa",
      pitLossBase: 20.9,
      undercutBias: 7,
      overcutBias: 5,
      path: "M88 202 C62 174, 62 130, 96 112 C130 94, 180 114, 226 96 C268 80, 302 42, 348 48 C400 54, 418 112, 470 120 C520 128, 566 92, 608 118 C648 142, 638 188, 598 202 C556 216, 502 202, 470 224 C430 250, 392 250, 344 228 C286 200, 222 214, 168 230 C128 242, 102 224, 88 202 Z",
      caption: "Spa stretches the car in every direction at once: long power sections, elevation, loaded corners, and braking zones that punish any imbalance.",
      traces: {
        speed: [38, 96, 46, 58, 82, 54, 60, 88, 44],
        brake: [22, 82, 30, 38, 58, 26, 44, 76, 28],
        deploy: [50, 90, 42, 46, 70, 40, 54, 82, 46],
      },
      sectors: ["La Source / Kemmel", "Middle flow", "Bus Stop"],
      preset: { wing: 0.5, ride: 0.42, stiffness: 0.58, bias: 0.68, tyre: 1, powerMode: 2, powerBias: 2, lapPlan: 1 },
    },
    {
      key: "suzuka",
      label: "Suzuka",
      pitLossBase: 22.1,
      undercutBias: 5,
      overcutBias: 6,
      path: "M112 84 C146 52, 208 56, 236 92 C256 118, 246 148, 212 164 C178 180, 170 214, 198 228 C232 246, 296 246, 322 214 C344 186, 376 170, 410 184 C452 202, 492 188, 514 158 C540 122, 584 114, 616 138 C648 162, 642 204, 604 220 C564 236, 530 224, 496 206 C450 182, 418 206, 406 232 C386 272, 326 268, 290 246 C252 222, 192 216, 152 194 C112 172, 96 126, 112 84 Z",
      caption: "Suzuka rewards rhythm, front confidence, and enough tyre control to survive linked corners without breaking the platform's flow.",
      traces: {
        speed: [42, 78, 50, 60, 88, 58, 56, 82, 46],
        brake: [18, 52, 28, 36, 58, 26, 40, 74, 34],
        deploy: [40, 58, 36, 42, 64, 42, 48, 68, 40],
      },
      sectors: ["Esses / Dunlop", "Degner / Spoon", "130R / Chicane"],
      preset: { wing: 0.62, ride: 0.3, stiffness: 0.64, bias: 0.58, tyre: 1, powerMode: 1, powerBias: 1, lapPlan: 1 },
    },
  ];

  const controls = {};
  const scenes = [];
  const captionCache = {};

  const state = {
    component: 0,
    track: 0,
    powerMode: 0,
    powerBias: 0,
    lapPlan: 0,
    tyreCompound: 0,
    weatherMode: 0,
    overviewRotation: mat3_mul(rot_x_mat3(-0.9), mat3_mul(rot_y_mat3(0.42), rot_z_mat3(0.34))),
    airflowSpeed: 0.44,
    airflowWing: 0.54,
    airflowRide: 0.36,
    frontGap: 0.42,
    frontFlap: 0.48,
    frontDemand: 0.62,
    floorRide: 0.38,
    floorPitch: 0.54,
    rearDrc: 0,
    rearWing: 0.62,
    rearSpeed: 0.7,
    chassisStiffness: 0.58,
    chassisKerb: 0.32,
    chassisBrake: 0.5,
    tyreTemp: 0.58,
    tyreLoad: 0.56,
    tyreStint: 0.4,
    brakeSpeed: 0.75,
    brakeBias: 0.56,
    brakeRecovery: 0.48,
    raceDrc: 0,
    raceGap: 0.42,
    raceDeploy: 0.62,
    raceBrake: 0.74,
    setupWing: 0.24,
    setupRide: 0.45,
    setupStiffness: 0.66,
    setupBias: 0.74,
    weatherTemp: 0.53,
    weatherLaps: 0.38,
    weatherRain: 0.18,
    pitAge: 0.42,
    pitTraffic: 0.36,
    pitSafety: 0.18,
  };

  function clamp(value, min, max) {
    return Math.max(min, Math.min(value, max));
  }

  function lerpNumber(a, b, t) {
    return a * (1 - t) + b * t;
  }

  function mixRgb(a, b, t) {
    return [
      lerpNumber(a[0], b[0], t),
      lerpNumber(a[1], b[1], t),
      lerpNumber(a[2], b[2], t),
    ];
  }

  function rgba(rgb, alpha) {
    return "rgba(" + Math.round(rgb[0]) + "," + Math.round(rgb[1]) + "," + Math.round(rgb[2]) + "," + alpha + ")";
  }

  function getTrack() {
    return TRACKS[state.track];
  }

  function getTyre() {
    return TYRES[state.tyreCompound];
  }

  function getPowerMode() {
    return POWER_MODES[state.powerMode];
  }

  function getPowerBias() {
    return POWER_BIASES[state.powerBias];
  }

  function getLapPlan() {
    return LAP_PLANS[state.lapPlan];
  }

  function getWeatherMode() {
    return WEATHER_MODES[state.weatherMode];
  }

  function setCaption(id, text) {
    if (captionCache[id] === text) {
      return;
    }
    captionCache[id] = text;
    const node = document.getElementById(id);
    if (node) {
      node.innerHTML = text;
    }
  }

  function isVisible(element) {
    const rect = element.getBoundingClientRect();
    const wh = window.innerHeight || document.documentElement.clientHeight;
    const ww = window.innerWidth || document.documentElement.clientWidth;
    return !(rect.top > wh || rect.bottom < 0 || rect.left > ww || rect.right < 0);
  }

  function makeScene(id, options, drawFn) {
    const container = document.getElementById(id);
    if (!container) {
      return null;
    }

    const wrapper = document.createElement("div");
    wrapper.className = "canvas_container non_selectable";
    const canvas = document.createElement("canvas");
    canvas.className = "non_selectable";
    wrapper.appendChild(canvas);
    container.appendChild(wrapper);

    let width = 0;
    let height = 0;
    let dirty = true;
    let rotation = options.rotation ? options.rotation.slice() : null;

    const ctx = canvas.getContext("2d");

    function resize() {
      const rect = container.getBoundingClientRect();
      const nextWidth = Math.max(1, Math.round(rect.width));
      const nextHeight = Math.max(1, Math.round(rect.height));
      if (nextWidth !== width || nextHeight !== height) {
        width = nextWidth;
        height = nextHeight;
        canvas.width = Math.round(width * scale);
        canvas.height = Math.round(height * scale);
        canvas.style.width = width + "px";
        canvas.style.height = height + "px";
        dirty = true;
        if (scene.arcball) {
          scene.arcball.set_viewport_size(width, height);
        }
      }
    }

    canvas.tabIndex = -1;
    const scene = {
      id,
      canvas,
      ctx,
      options,
      arcball: null,
      get width() {
        return width;
      },
      get height() {
        return height;
      },
      get rotation() {
        return rotation;
      },
      set rotation(value) {
        rotation = value.slice();
        dirty = true;
      },
      requestRepaint() {
        dirty = true;
      },
      maybeDraw(time) {
        resize();
        if (!isVisible(canvas)) {
          return;
        }
        if (options.animated || dirty) {
          ctx.setTransform(scale, 0, 0, scale, 0, 0);
          ctx.clearRect(0, 0, width, height);
          drawFn(ctx, width, height, time || 0, scene);
          dirty = false;
        }
      },
    };

    if (options.arcball) {
      const arcball = new ArcBall(rotation, function () {
        rotation = arcball.matrix.slice();
        dirty = true;
      });
      scene.arcball = arcball;

      function canvasPoint(event) {
        const rect = canvas.getBoundingClientRect();
        return [width - (event.clientX - rect.left), event.clientY - rect.top];
      }

      canvas.style.cursor = "grab";
      new TouchHandler(canvas,
        function (event) {
          resize();
          canvas.style.cursor = "grabbing";
          const point = canvasPoint(event);
          arcball.start(point[0], point[1]);
          return true;
        },
        function (event) {
          const point = canvasPoint(event);
          arcball.update(point[0], point[1], event.timeStamp);
          rotation = arcball.matrix.slice();
          dirty = true;
          return true;
        },
        function (event) {
          canvas.style.cursor = "grab";
          arcball.end(event.timeStamp);
        }
      );
    }

    scenes.push(scene);
    return scene;
  }

  function repaintAll() {
    scenes.forEach((scene) => {
      scene.requestRepaint();
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) scene.maybeDraw(0);
    });
  }

  function loop(time) {
    scenes.forEach((scene) => scene.maybeDraw(time * 0.001));
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      window.requestAnimationFrame(loop);
    }
  }

  function roundedRectPoints(cx, cy, w, h, r, steps) {
    const pts = [];
    const segs = steps || 3;
    const corners = [
      { x: cx + w / 2 - r, y: cy - h / 2 + r, start: -Math.PI / 2, end: 0 },
      { x: cx + w / 2 - r, y: cy + h / 2 - r, start: 0, end: Math.PI / 2 },
      { x: cx - w / 2 + r, y: cy + h / 2 - r, start: Math.PI / 2, end: Math.PI },
      { x: cx - w / 2 + r, y: cy - h / 2 + r, start: Math.PI, end: Math.PI * 1.5 },
    ];

    corners.forEach((corner) => {
      for (let i = 0; i <= segs; i += 1) {
        const t = i / segs;
        const a = lerpNumber(corner.start, corner.end, t);
        pts.push([corner.x + Math.cos(a) * r, corner.y + Math.sin(a) * r]);
      }
    });

    return pts;
  }

  function projectPoint(point, rot, sceneScale, cx, cy) {
    const q = mat3_mul_vec(rot, point);
    const perspective = 2.4 + q[2] * 0.5;
    return {
      x: cx + q[0] * sceneScale / perspective,
      y: cy - q[1] * sceneScale / perspective,
      z: q[2],
    };
  }

  function pushExtrudedShape(polys, shape, z0, z1, topColor, sideColor, rot, sceneScale, cx, cy) {
    const top = shape.map((point) => projectPoint([point[0], point[1], z1], rot, sceneScale, cx, cy));
    const bottom = shape.map((point) => projectPoint([point[0], point[1], z0], rot, sceneScale, cx, cy));

    polys.push({
      depth: top.reduce((sum, point) => sum + point.z, 0) / top.length,
      fill: topColor,
      stroke: rgba(COLORS.dark, 0.18),
      points: top,
    });

    for (let i = 0; i < shape.length; i += 1) {
      const next = (i + 1) % shape.length;
      const side = [bottom[i], bottom[next], top[next], top[i]];
      polys.push({
        depth: side.reduce((sum, point) => sum + point.z, 0) / side.length,
        fill: sideColor,
        stroke: rgba(COLORS.dark, 0.12),
        points: side,
      });
    }
  }

  function drawPolygon(ctx, poly) {
    ctx.beginPath();
    poly.points.forEach((point, index) => {
      if (index === 0) {
        ctx.moveTo(point.x, point.y);
      } else {
        ctx.lineTo(point.x, point.y);
      }
    });
    ctx.closePath();
    ctx.fillStyle = poly.fill;
    ctx.fill();
    if (poly.stroke) {
      ctx.strokeStyle = poly.stroke;
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }
  }

  function renderPolys(ctx, polys) {
    polys.sort((a, b) => a.depth - b.depth);
    polys.forEach((poly) => drawPolygon(ctx, poly));
  }

  function componentColor(componentKey, selectedKey, activeBoost) {
    const component = COMPONENTS.find((item) => item.key === componentKey);
    const source = component ? component.color : COLORS.gray;
    if (componentKey === selectedKey) {
      return {
        top: rgba(mixRgb(source, COLORS.paper, 0.08), activeBoost || 0.96),
        side: rgba(mixRgb(source, COLORS.dark, 0.22), 0.92),
      };
    }

    return {
      top: rgba(mixRgb(source, COLORS.paper, 0.72), 0.96),
      side: rgba(mixRgb(source, COLORS.dark, 0.58), 0.46),
    };
  }

  function shadeRgb(rgb, factor, lift) {
    const lifted = lift || 0;
    return [
      clamp(rgb[0] * factor + 255 * lifted, 0, 255),
      clamp(rgb[1] * factor + 255 * lifted, 0, 255),
      clamp(rgb[2] * factor + 255 * lifted, 0, 255),
    ];
  }

  function pushExtrudedShapeLit(polys, shape, z0, z1, baseRgb, rot, sceneScale, cx, cy, options) {
    const opts = options || {};
    const heave = opts.heave || 0;
    const pitch = opts.pitch || 0;
    const alpha = opts.alpha === undefined ? 0.96 : opts.alpha;
    const light = vec_norm([0.42, -0.28, 1.0]);
    const topNormal = vec_norm(mat3_mul_vec(rot, [0, 0, 1]));
    const topShade = clamp(0.54 + vec_dot(topNormal, light) * 0.44, 0.22, 1.08);

    const top = shape.map((point) => projectPoint([point[0], point[1], z1 + heave + point[0] * pitch], rot, sceneScale, cx, cy));
    const bottom = shape.map((point) => projectPoint([point[0], point[1], z0 + heave + point[0] * pitch], rot, sceneScale, cx, cy));

    polys.push({
      depth: top.reduce((sum, point) => sum + point.z, 0) / top.length,
      fill: rgba(shadeRgb(baseRgb, topShade, 0.05), alpha),
      stroke: rgba(COLORS.dark, 0.18),
      points: top,
    });

    for (let i = 0; i < shape.length; i += 1) {
      const next = (i + 1) % shape.length;
      const edge = [shape[next][0] - shape[i][0], shape[next][1] - shape[i][1], 0];
      const normal = vec_norm(mat3_mul_vec(rot, [edge[1], -edge[0], 0]));
      const sideShade = clamp(0.26 + Math.abs(vec_dot(normal, light)) * 0.5, 0.16, 0.9);
      const side = [bottom[i], bottom[next], top[next], top[i]];
      polys.push({
        depth: side.reduce((sum, point) => sum + point.z, 0) / side.length,
        fill: rgba(shadeRgb(baseRgb, sideShade, 0.01), alpha * 0.96),
        stroke: rgba(COLORS.dark, 0.12),
        points: side,
      });
    }
  }

  function drawProjectedPolyline(ctx, points3d, rot, sceneScale, cx, cy, color, width, dash, offset) {
    const points = points3d.map((point) => projectPoint(point, rot, sceneScale, cx, cy));
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    if (dash) {
      ctx.setLineDash(dash);
      ctx.lineDashOffset = offset || 0;
    }
    ctx.beginPath();
    points.forEach((point, index) => {
      if (index === 0) {
        ctx.moveTo(point.x, point.y);
      } else {
        ctx.lineTo(point.x, point.y);
      }
    });
    ctx.stroke();
    if (dash) {
      ctx.setLineDash([]);
    }
  }

  function drawProjectedRibbon(ctx, points3d, rot, sceneScale, cx, cy, color, width) {
    const points = points3d.map((point) => projectPoint(point, rot, sceneScale, cx, cy));
    const upper = [];
    const lower = [];
    for (let i = 0; i < points.length; i += 1) {
      const current = points[i];
      const next = points[Math.min(points.length - 1, i + 1)];
      const dx = next.x - current.x;
      const dy = next.y - current.y;
      const len = Math.max(1, Math.sqrt(dx * dx + dy * dy));
      const nx = -dy / len;
      const ny = dx / len;
      upper.push([current.x + nx * width, current.y + ny * width]);
      lower.push([current.x - nx * width, current.y - ny * width]);
    }

    ctx.fillStyle = color;
    ctx.beginPath();
    upper.forEach((point, index) => {
      if (index === 0) {
        ctx.moveTo(point[0], point[1]);
      } else {
        ctx.lineTo(point[0], point[1]);
      }
    });
    for (let i = lower.length - 1; i >= 0; i -= 1) {
      ctx.lineTo(lower[i][0], lower[i][1]);
    }
    ctx.closePath();
    ctx.fill();
  }

  function drawOverviewScene(ctx, width, height, time, scene) {
    const selected = COMPONENTS[state.component].key;
    const rot = scene.rotation || state.overviewRotation;
    const cx = width * 0.5;
    const cy = height * 0.58;
    const sceneScale = Math.min(width, height) * 0.52;

    const background = ctx.createLinearGradient(0, 0, 0, height);
    background.addColorStop(0, rgba(COLORS.paper, 1));
    background.addColorStop(1, rgba(mixRgb(COLORS.paper, COLORS.gray, 0.14), 1));
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, width, height);

    const glow = ctx.createRadialGradient(cx, height * 0.72, 18, cx, height * 0.8, width * 0.28);
    glow.addColorStop(0, rgba(COLORS.blue, 0.08));
    glow.addColorStop(1, rgba(COLORS.blue, 0));
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = rgba(COLORS.dark, 0.1);
    ctx.beginPath();
    ctx.ellipse(cx, height * 0.86, width * 0.28, height * 0.074, 0, 0, Math.PI * 2);
    ctx.fill();

    const frontWingColor = COMPONENTS.find((item) => item.key === "front-wing").color;
    const floorColor = COMPONENTS.find((item) => item.key === "floor").color;
    const sidepodColor = COMPONENTS.find((item) => item.key === "sidepods").color;
    const powerColor = COMPONENTS.find((item) => item.key === "power-unit").color;
    const rearColor = COMPONENTS.find((item) => item.key === "rear-wing").color;
    const haloColor = COMPONENTS.find((item) => item.key === "halo").color;
    const brakeColor = COMPONENTS.find((item) => item.key === "brakes").color;
    const wheelColor = selected === "tyres" ? mixRgb(COLORS.dark, COLORS.gray, 0.2) : mixRgb(COLORS.dark, COLORS.gray, 0.08);

    const shapes = {
      frontWingMain: [[-1.94, -1.04], [-1.42, -1.18], [-0.88, -1.12], [-0.62, -0.66], [-0.62, 0.66], [-0.88, 1.12], [-1.42, 1.18], [-1.94, 1.04]],
      frontWingUpper: [[-1.64, -0.82], [-1.18, -0.94], [-0.84, -0.88], [-0.66, -0.52], [-0.66, 0.52], [-0.84, 0.88], [-1.18, 0.94], [-1.64, 0.82]],
      nose: [[-1.1, -0.28], [-0.54, -0.2], [-0.22, -0.14], [0.02, -0.08], [0.02, 0.08], [-0.22, 0.14], [-0.54, 0.2], [-1.1, 0.28]],
      chassis: [[-0.24, -0.34], [0.74, -0.34], [1.08, -0.24], [1.08, 0.24], [0.74, 0.34], [-0.24, 0.34], [-0.4, 0.18], [-0.4, -0.18]],
      floorDeck: [[-0.44, -0.92], [1.14, -0.84], [1.42, -0.58], [1.42, 0.58], [1.14, 0.84], [-0.44, 0.92], [-0.74, 0.44], [-0.74, -0.44]],
      floorFenceL: [[-0.22, -0.64], [0.82, -0.6], [1.0, -0.48], [0.82, -0.44], [-0.14, -0.46], [-0.34, -0.54]],
      floorFenceR: [[-0.22, 0.64], [0.82, 0.6], [1.0, 0.48], [0.82, 0.44], [-0.14, 0.46], [-0.34, 0.54]],
      sidepodL: [[0.04, -0.82], [0.56, -0.78], [0.96, -0.62], [1.0, -0.34], [0.32, -0.22], [0.02, -0.46]],
      sidepodR: [[0.04, 0.82], [0.56, 0.78], [0.96, 0.62], [1.0, 0.34], [0.32, 0.22], [0.02, 0.46]],
      engineCover: [[0.1, -0.24], [0.92, -0.2], [1.34, -0.08], [1.34, 0.08], [0.92, 0.2], [0.1, 0.24], [-0.04, 0.14], [-0.04, -0.14]],
      gearbox: [[1.22, -0.26], [1.62, -0.22], [1.8, -0.1], [1.8, 0.1], [1.62, 0.22], [1.22, 0.26]],
      diffuser: [[1.74, -0.46], [2.14, -0.38], [2.28, -0.16], [2.28, 0.16], [2.14, 0.38], [1.74, 0.46]],
      beamWingL: [[1.78, -0.64], [2.06, -0.58], [2.16, -0.38], [1.9, -0.34]],
      beamWingR: [[1.78, 0.64], [2.06, 0.58], [2.16, 0.38], [1.9, 0.34]],
      rearWingMain: [[2.08, -0.96], [2.42, -0.84], [2.48, -0.22], [2.38, 0], [2.48, 0.22], [2.42, 0.84], [2.08, 0.96]],
      rearWingFlap: [[2.18, -0.72], [2.46, -0.66], [2.48, -0.16], [2.42, 0], [2.48, 0.16], [2.46, 0.66], [2.18, 0.72]],
      haloHoop: [[0.22, -0.14], [0.36, -0.28], [0.56, -0.26], [0.68, -0.06], [0.66, 0.06], [0.56, 0.26], [0.36, 0.28], [0.22, 0.14]],
      haloSpine: [[0.04, -0.08], [0.3, -0.08], [0.3, 0.08], [0.04, 0.08]],
    };

    const polys = [];
    [
      roundedRectPoints(-0.62, -1.34, 0.64, 0.46, 0.12, 4),
      roundedRectPoints(-0.62, 1.34, 0.64, 0.46, 0.12, 4),
      roundedRectPoints(1.32, -1.42, 0.74, 0.5, 0.12, 4),
      roundedRectPoints(1.32, 1.42, 0.74, 0.5, 0.12, 4),
    ].forEach((shape) => {
      pushExtrudedShapeLit(polys, shape, -0.28, 0.24, wheelColor, rot, sceneScale, cx, cy, { alpha: 0.98 });
    });

    [
      roundedRectPoints(-0.62, -1.34, 0.24, 0.18, 0.06, 3),
      roundedRectPoints(-0.62, 1.34, 0.24, 0.18, 0.06, 3),
      roundedRectPoints(1.32, -1.42, 0.3, 0.22, 0.06, 3),
      roundedRectPoints(1.32, 1.42, 0.3, 0.22, 0.06, 3),
    ].forEach((shape) => {
      pushExtrudedShapeLit(polys, shape, 0.02, 0.12, brakeColor, rot, sceneScale, cx, cy, { alpha: selected === "brakes" ? 0.98 : 0.84 });
    });

    [
      roundedRectPoints(-0.62, -1.34, 0.14, 0.1, 0.03, 2),
      roundedRectPoints(-0.62, 1.34, 0.14, 0.1, 0.03, 2),
      roundedRectPoints(1.32, -1.42, 0.16, 0.12, 0.03, 2),
      roundedRectPoints(1.32, 1.42, 0.16, 0.12, 0.03, 2),
    ].forEach((shape) => {
      pushExtrudedShapeLit(polys, shape, 0.04, 0.08, mixRgb(COLORS.paper, COLORS.gray, 0.18), rot, sceneScale, cx, cy, { alpha: 0.9 });
    });

    pushExtrudedShapeLit(polys, shapes.frontWingMain, -0.04, 0.04, frontWingColor, rot, sceneScale, cx, cy, { alpha: selected === "front-wing" ? 0.99 : 0.92 });
    pushExtrudedShapeLit(polys, shapes.frontWingUpper, 0.02, 0.08, mixRgb(frontWingColor, COLORS.paper, 0.22), rot, sceneScale, cx, cy, { alpha: selected === "front-wing" ? 0.99 : 0.9 });
    pushExtrudedShapeLit(polys, shapes.nose, 0.0, 0.18, mixRgb(frontWingColor, COLORS.paper, 0.48), rot, sceneScale, cx, cy, { alpha: 0.98 });
    pushExtrudedShapeLit(polys, shapes.floorDeck, -0.07, 0.08, floorColor, rot, sceneScale, cx, cy, { alpha: selected === "floor" ? 0.98 : 0.84 });
    pushExtrudedShapeLit(polys, shapes.floorFenceL, -0.02, 0.02, mixRgb(floorColor, COLORS.paper, 0.2), rot, sceneScale, cx, cy, { alpha: 0.9 });
    pushExtrudedShapeLit(polys, shapes.floorFenceR, -0.02, 0.02, mixRgb(floorColor, COLORS.paper, 0.2), rot, sceneScale, cx, cy, { alpha: 0.9 });
    pushExtrudedShapeLit(polys, shapes.chassis, 0.04, 0.24, mixRgb(COLORS.paper, COLORS.gray, 0.08), rot, sceneScale, cx, cy, { alpha: 0.98 });
    pushExtrudedShapeLit(polys, shapes.sidepodL, 0.08, 0.28, sidepodColor, rot, sceneScale, cx, cy, { alpha: selected === "sidepods" ? 0.98 : 0.92 });
    pushExtrudedShapeLit(polys, shapes.sidepodR, 0.08, 0.28, sidepodColor, rot, sceneScale, cx, cy, { alpha: selected === "sidepods" ? 0.98 : 0.92 });
    pushExtrudedShapeLit(polys, shapes.engineCover, 0.12, 0.44, powerColor, rot, sceneScale, cx, cy, { alpha: selected === "power-unit" ? 0.98 : 0.94 });
    pushExtrudedShapeLit(polys, shapes.gearbox, 0.08, 0.22, COMPONENTS.find((item) => item.key === "gearbox").color, rot, sceneScale, cx, cy, { alpha: selected === "gearbox" ? 0.98 : 0.92 });
    pushExtrudedShapeLit(polys, shapes.diffuser, -0.06, 0.08, COMPONENTS.find((item) => item.key === "diffuser").color, rot, sceneScale, cx, cy, { alpha: selected === "diffuser" ? 0.98 : 0.9 });
    pushExtrudedShapeLit(polys, shapes.beamWingL, 0.12, 0.18, mixRgb(rearColor, COLORS.paper, 0.28), rot, sceneScale, cx, cy, { alpha: 0.88 });
    pushExtrudedShapeLit(polys, shapes.beamWingR, 0.12, 0.18, mixRgb(rearColor, COLORS.paper, 0.28), rot, sceneScale, cx, cy, { alpha: 0.88 });
    pushExtrudedShapeLit(polys, shapes.rearWingMain, 0.14, 0.28, rearColor, rot, sceneScale, cx, cy, { alpha: selected === "rear-wing" ? 0.98 : 0.94 });
    pushExtrudedShapeLit(polys, shapes.rearWingFlap, 0.28, 0.34, mixRgb(rearColor, COLORS.paper, 0.18), rot, sceneScale, cx, cy, { alpha: selected === "rear-wing" ? 0.98 : 0.88 });
    pushExtrudedShapeLit(polys, shapes.haloHoop, 0.32, 0.48, haloColor, rot, sceneScale, cx, cy, { alpha: selected === "halo" ? 0.98 : 0.86 });
    pushExtrudedShapeLit(polys, shapes.haloSpine, 0.22, 0.32, haloColor, rot, sceneScale, cx, cy, { alpha: selected === "halo" ? 0.98 : 0.86 });

    renderPolys(ctx, polys);

    const cockpitOpening = [
      [-0.02, -0.12], [0.24, -0.12], [0.34, -0.04], [0.38, 0], [0.34, 0.04], [0.24, 0.12], [-0.02, 0.12], [-0.08, 0.04], [-0.08, -0.04],
    ].map((point) => projectPoint([point[0], point[1], 0.46], rot, sceneScale, cx, cy));
    ctx.beginPath();
    cockpitOpening.forEach((point, index) => {
      if (index === 0) {
        ctx.moveTo(point.x, point.y);
      } else {
        ctx.lineTo(point.x, point.y);
      }
    });
    ctx.closePath();
    ctx.fillStyle = rgba(COLORS.dark, 0.28);
    ctx.fill();

    [
      [[-0.86, -0.44, 0.16], [-0.42, -0.18, 0.24]],
      [[-0.86, 0.44, 0.16], [-0.42, 0.18, 0.24]],
      [[1.02, -0.46, 0.12], [1.54, -0.26, 0.2]],
      [[1.02, 0.46, 0.12], [1.54, 0.26, 0.2]],
    ].forEach((segment) => {
      drawProjectedPolyline(ctx, segment, rot, sceneScale, cx, cy, rgba(COLORS.dark, 0.22), 2.2);
    });

    ctx.save();
    ctx.translate(width - 54, 54);
    draw_camera_axes(ctx, 24, rot);
    ctx.restore();

    ctx.fillStyle = rgba(COLORS.ink, 0.62);
    ctx.font = "600 12px IBM Plex Mono, monospace";
    ctx.textAlign = "left";
    ctx.fillText("Drag to rotate", 24, 28);

    setCaption("f1_overview_caption", `<strong>${COMPONENTS[state.component].label}</strong> - ${COMPONENTS[state.component].caption}`);
  }

  function drawSideCar(ctx, x, y, scaleSize, pitch, ride, wingOpen) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scaleSize, scaleSize);
    ctx.rotate(pitch);

    const rideY = ride;

    ctx.fillStyle = rgba(COLORS.dark, 0.11);
    ctx.beginPath();
    ctx.ellipse(0.12, 0.82 + rideY, 1.28, 0.2, 0, 0, Math.PI * 2);
    ctx.fill();

    const bodyGradient = ctx.createLinearGradient(-1.5, -0.1, 1.8, 0.62);
    bodyGradient.addColorStop(0, rgba(mixRgb(COLORS.paper, COLORS.gray, 0.05), 1));
    bodyGradient.addColorStop(0.45, rgba(COLORS.paper, 0.98));
    bodyGradient.addColorStop(1, rgba(mixRgb(COLORS.paper, COLORS.dark, 0.12), 0.98));
    ctx.fillStyle = bodyGradient;
    ctx.strokeStyle = rgba(COLORS.dark, 0.22);
    ctx.lineWidth = 0.024;
    ctx.beginPath();
    ctx.moveTo(-1.54, 0.38 + rideY);
    ctx.lineTo(-1.06, 0.22 + rideY);
    ctx.lineTo(-0.44, 0.05 + rideY);
    ctx.lineTo(0.18, -0.04 + rideY);
    ctx.lineTo(0.82, -0.01 + rideY);
    ctx.lineTo(1.18, 0.04 + rideY);
    ctx.lineTo(1.72, 0.2 + rideY);
    ctx.lineTo(1.8, 0.32 + rideY);
    ctx.lineTo(1.8, 0.48 + rideY);
    ctx.lineTo(-1.54, 0.48 + rideY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = rgba(COLORS.cyan, 0.16);
    ctx.beginPath();
    ctx.moveTo(-0.22, 0.24 + rideY);
    ctx.lineTo(1.2, 0.24 + rideY);
    ctx.lineTo(1.42, 0.36 + rideY);
    ctx.lineTo(1.34, 0.42 + rideY);
    ctx.lineTo(0.14, 0.42 + rideY);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = rgba(COLORS.red, 0.9);
    ctx.beginPath();
    ctx.moveTo(-1.62, 0.18 + rideY);
    ctx.lineTo(-1.08, 0.18 + rideY);
    ctx.lineTo(-0.94, 0.24 + rideY);
    ctx.lineTo(-1.18, 0.28 + rideY);
    ctx.lineTo(-1.62, 0.28 + rideY);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = rgba(COLORS.cyan, 0.78);
    ctx.beginPath();
    ctx.moveTo(-0.18, 0.18 + rideY);
    ctx.lineTo(1.1, 0.16 + rideY);
    ctx.lineTo(1.28, 0.18 + rideY);
    ctx.lineTo(1.18, 0.26 + rideY);
    ctx.lineTo(-0.12, 0.28 + rideY);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = rgba(COLORS.red, 0.9);
    ctx.beginPath();
    ctx.moveTo(1.42, 0.08 + rideY - (wingOpen ? 0.1 : 0));
    ctx.lineTo(1.86, 0.06 + rideY - (wingOpen ? 0.1 : 0));
    ctx.lineTo(1.88, 0.14 + rideY - (wingOpen ? 0.1 : 0));
    ctx.lineTo(1.46, 0.16 + rideY - (wingOpen ? 0.1 : 0));
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(1.38, 0.14 + rideY, 0.04, 0.2);
    ctx.fillRect(1.54, 0.14 + rideY, 0.04, 0.2);

    ctx.fillStyle = rgba(COLORS.dark, 0.08);
    ctx.beginPath();
    ctx.moveTo(-0.02, 0.04 + rideY);
    ctx.lineTo(0.48, 0.02 + rideY);
    ctx.lineTo(0.54, 0.14 + rideY);
    ctx.lineTo(0.06, 0.14 + rideY);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = rgba(COLORS.ink, 0.18);
    ctx.lineWidth = 0.018;
    ctx.beginPath();
    ctx.moveTo(-0.2, 0.06 + rideY);
    ctx.quadraticCurveTo(0.18, -0.12 + rideY, 0.58, 0.02 + rideY);
    ctx.stroke();

    ctx.strokeStyle = rgba(COLORS.dark, 0.46);
    ctx.lineWidth = 0.028;
    ctx.beginPath();
    ctx.moveTo(0.1, 0.06 + rideY);
    ctx.quadraticCurveTo(0.2, -0.08 + rideY, 0.36, -0.06 + rideY);
    ctx.stroke();

    const tyreGradient = ctx.createLinearGradient(-0.2, 0.2, 0.2, 0.8);
    tyreGradient.addColorStop(0, rgba(mixRgb(COLORS.dark, COLORS.gray, 0.12), 0.95));
    tyreGradient.addColorStop(1, rgba(COLORS.dark, 0.98));
    ctx.fillStyle = tyreGradient;
    ctx.beginPath();
    ctx.ellipse(-0.82, 0.54 + rideY, 0.2, 0.22, 0, 0, Math.PI * 2);
    ctx.ellipse(1.2, 0.56 + rideY, 0.24, 0.26, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = rgba(COLORS.yellow, 0.24);
    ctx.beginPath();
    ctx.ellipse(-0.82, 0.54 + rideY, 0.08, 0.08, 0, 0, Math.PI * 2);
    ctx.ellipse(1.2, 0.56 + rideY, 0.1, 0.1, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = rgba(COLORS.paper, 0.34);
    ctx.lineWidth = 0.018;
    ctx.beginPath();
    ctx.moveTo(-0.98, 0.42 + rideY);
    ctx.lineTo(-0.68, 0.42 + rideY);
    ctx.moveTo(1.0, 0.42 + rideY);
    ctx.lineTo(1.34, 0.42 + rideY);
    ctx.stroke();

    ctx.restore();
  }

  function drawFlowLine(ctx, width, startY, amplitude, time, speed, color) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.setLineDash([12, 14]);
    ctx.lineDashOffset = -time * (70 + speed * 140);
    ctx.beginPath();
    ctx.moveTo(18, startY);
    ctx.bezierCurveTo(width * 0.22, startY - amplitude * 0.35, width * 0.44, startY + amplitude * 0.55, width * 0.65, startY + amplitude * 0.25);
    ctx.bezierCurveTo(width * 0.82, startY - amplitude * 0.2, width * 0.92, startY + amplitude * 0.18, width - 18, startY + amplitude * 0.08);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  function computeSetupScores() {
    const track = getTrack();
    const tyre = getTyre();
    const wing = state.setupWing;
    const ride = state.setupRide;
    const stiffness = state.setupStiffness;
    const bias = state.setupBias;

    const straight = clamp(0.98 - wing * 0.52 - Math.max(0, 0.46 - ride) * 0.18 - stiffness * 0.08, 0.24, 0.98);
    const slow = clamp(0.38 + wing * 0.44 + (0.68 - stiffness) * 0.26 - Math.abs(bias - 0.56) * 0.45, 0.2, 0.96);
    const fast = clamp(0.32 + wing * 0.5 + (0.42 - Math.abs(ride - 0.34)) * 0.5 + stiffness * 0.18, 0.22, 0.98);
    const tyreLife = clamp(0.9 - wing * 0.22 - Math.max(0, 0.42 - ride) * 0.24 - stiffness * 0.22 - tyre.wear * 0.08, 0.18, 0.96);
    const braking = clamp(0.82 - Math.abs(bias - 0.58) * 0.72 - Math.max(0, 0.54 - stiffness) * 0.22, 0.18, 0.96);
    const balance = clamp(0.44 + wing * 0.44 + (0.36 - Math.abs(ride - 0.34)) * 0.32 - Math.max(0, stiffness - 0.78) * 0.22, 0.16, 0.95);

    const weights = {
      monza: { straight: 0.34, slow: 0.14, fast: 0.12, tyreLife: 0.14, braking: 0.26 },
      monaco: { straight: 0.08, slow: 0.34, fast: 0.08, tyreLife: 0.16, braking: 0.34 },
      silverstone: { straight: 0.16, slow: 0.12, fast: 0.34, tyreLife: 0.22, braking: 0.16 },
      spa: { straight: 0.24, slow: 0.12, fast: 0.24, tyreLife: 0.16, braking: 0.24 },
      suzuka: { straight: 0.14, slow: 0.16, fast: 0.3, tyreLife: 0.24, braking: 0.16 },
    }[track.key];

    const score = straight * weights.straight + slow * weights.slow + fast * weights.fast + tyreLife * weights.tyreLife + braking * weights.braking;

    return { straight, slow, fast, tyreLife, braking, balance, score };
  }

  function computePowerState() {
    const track = getTrack();
    const mode = getPowerMode();
    const bias = getPowerBias();
    const sectorBars = track.sectors.map(function (_, index) {
      const split = bias.splits[index];
      return clamp(mode.deploy * split * 2.05, 0.08, 0.98);
    });

    return { mode, bias, sectorBars };
  }

  function computeTyreState() {
    const tyre = getTyre();
    const temp = state.tyreTemp;
    const load = state.tyreLoad;
    const stint = state.tyreStint;
    const thermalDistance = Math.abs(temp - (tyre.window[0] + tyre.window[1]) * 0.5);
    const thermalPenalty = thermalDistance * 1.3;
    const wear = clamp(stint * tyre.wear + Math.max(0, load - 0.58) * 0.48, 0, 1.3);
    const grip = clamp(tyre.baseGrip - thermalPenalty - wear * 0.22, 0.24, 0.98);
    let stateLabel = "in the window";
    if (temp < tyre.window[0]) {
      stateLabel = "too cold";
    } else if (temp > tyre.window[1]) {
      stateLabel = "overheated";
    }
    return { tyre, temp, load, stint, wear, grip, stateLabel };
  }

  function computeWeatherStrategy() {
    const track = getTrack();
    const mode = getWeatherMode();
    const temp = 12 + state.weatherTemp * 36;
    const laps = 4 + state.weatherLaps * 38;
    const rain = state.weatherRain * 100;
    const tyre = getTyre();

    let recommended = "Medium";
    let urgency = "Low";
    let note = "The track is still dry enough that the medium tyre is the calmer race answer unless a short, aggressive stint is needed.";
    let penalty = 0;

    if (mode.key === "dry") {
      if (temp < 22 && laps < 12) {
        recommended = "Soft";
        note = "The track is cool enough and the run is short enough that the softer tyre can be used as a deliberate attack call.";
      } else if (temp > 35 || laps > 24) {
        recommended = "Hard";
        note = "The surface is hot or the run is long enough that keeping the tyre alive matters more than winning the first peak of grip.";
      }
      urgency = rain > 48 ? "Rising" : "Low";
      penalty = Math.max(0, rain - 55) * 0.004 + (tyre.key === "soft" && recommended !== "Soft" ? 0.12 : 0);
    } else if (mode.key === "mixed") {
      recommended = rain > 58 ? "Intermediate" : "Crossover watch";
      urgency = rain > 70 ? "High" : "Rising";
      note = rain > 58
        ? "The track is drifting toward a real intermediate window, so the race becomes a timing problem: stop too late and the dry tyre falls away suddenly."
        : "Conditions are unstable rather than fully wet. The important thing is keeping enough optionality that the next shower or safety car does not trap the strategy.";
      penalty = 0.34 + rain * 0.006;
    } else {
      recommended = rain > 54 ? "Wet" : "Intermediate";
      urgency = "Immediate";
      note = recommended === "Wet"
        ? "Standing water is now enough of the story that survival under braking and visibility matter more than raw lap peak."
        : "This is the awkward crossover where a full wet is no longer mandatory, but a dry tyre still cannot exploit the lap with any confidence.";
      penalty = 0.86 + Math.max(0, rain - 40) * 0.005;
    }

    return {
      track,
      mode,
      temp,
      laps,
      rain,
      recommended,
      urgency,
      penalty: clamp(penalty, 0, 1.6),
      note,
      crossover: clamp(mode.key === "dry" ? rain * 0.7 : mode.key === "mixed" ? 34 + rain * 0.46 : 64 + rain * 0.24, 0, 100),
    };
  }

  function computePitStrategy() {
    const track = getTrack();
    const weather = computeWeatherStrategy();
    const tyreAge = 4 + state.pitAge * 24;
    const traffic = state.pitTraffic * 100;
    const safety = state.pitSafety * 100;
    const rawLoss = clamp(track.pitLossBase + traffic * 0.018 - Math.min(tyreAge, 20) * 0.03 + (weather.mode.key === "wet" ? 1.4 : weather.mode.key === "mixed" ? 0.6 : 0), 14, 29);
    const undercut = clamp(tyreAge * 0.26 + track.undercutBias * 0.58 + weather.penalty * 5.5 - traffic * 0.08 - (getTyre().key === "hard" ? 1.6 : 0), -2, 9);
    const overcut = clamp(track.overcutBias * 0.46 + traffic * 0.05 - tyreAge * 0.1 + (weather.mode.key === "mixed" ? 0.8 : 0), -2, 7);
    const safetySwing = clamp(-(rawLoss * 0.16 + safety * 0.1 + weather.penalty * 2.2), -18, -2);
    let call = "Hold for now";
    let note = "The stop still gives away more time than the fresh tyre is likely to earn back immediately.";

    if (safety > 58) {
      call = "Stretch for safety car";
      note = "The caution risk is high enough that staying out a little longer could turn a painful stop into a discounted one.";
    } else if (undercut > overcut + 1.2 && undercut > 2.4) {
      call = "Box for undercut";
      note = "Fresh rubber is now worth enough that pitting first can pay the stop back quickly if the rejoin stays clear enough.";
    } else if (overcut > undercut + 1 && traffic > 52) {
      call = "Delay for overcut";
      note = "The traffic picture after the stop looks too costly, so the pit wall gains more by extending the stint and letting rivals rejoin into slower air.";
    }

    return { track, weather, tyreAge, traffic, safety, rawLoss, undercut, overcut, safetySwing, call, note };
  }

  function computeRacecraftState() {
    const track = getTrack();
    const gap = 0.4 + state.raceGap * 1.6;
    const deploy = state.raceDeploy * 100;
    const brakeConfidence = state.raceBrake * 100;
    const drsOn = state.raceDrc === 1;
    const dirtyPenalty = clamp((1 - state.raceGap) * (44 + (track.key === "silverstone" || track.key === "suzuka" ? 18 : 6)), 6, 92);
    const straightFactor = track.key === "monza" ? 30 : track.key === "spa" ? 26 : track.key === "monaco" ? 8 : 18;
    const brakingFactor = track.key === "monza" ? 28 : track.key === "spa" ? 24 : track.key === "monaco" ? 16 : 18;
    const closingRate = clamp(deploy * 0.16 + straightFactor * 0.34 + (drsOn ? 10 : 0) - dirtyPenalty * 0.12, 4, 34);
    const brakingWindow = clamp(brakeConfidence * 0.48 + brakingFactor * 0.55 - dirtyPenalty * 0.12, 8, 100);
    const passChance = clamp(closingRate * 2.1 + brakingWindow * 0.42 - dirtyPenalty * 0.3 + (drsOn ? 12 : 0), 0, 100);
    return { track, gap, deploy, brakeConfidence, drsOn, dirtyPenalty, closingRate, brakingWindow, passChance };
  }

  function computeLapState() {
    const track = getTrack();
    const setup = computeSetupScores();
    const power = computePowerState();
    const weather = computeWeatherStrategy();
    const plan = getLapPlan();

    const adjusted = {
      straight: clamp(setup.straight + plan.adjustments.straight * 0.01, 0.12, 0.99),
      slow: clamp(setup.slow + plan.adjustments.slow * 0.01, 0.12, 0.99),
      fast: clamp(setup.fast + plan.adjustments.fast * 0.01, 0.12, 0.99),
      tyre: clamp(setup.tyreLife + plan.adjustments.tyre * 0.01, 0.12, 0.99),
      braking: clamp(setup.braking + plan.adjustments.braking * 0.01, 0.12, 0.99),
      balance: clamp(setup.balance + plan.adjustments.balance * 0.01, 0.12, 0.99),
    };

    const sectorScores = track.sectors.map(function (_, index) {
      const powerBoost = power.sectorBars[index] * 0.16;
      const bias = index === 0 ? adjusted.straight * 0.34 + adjusted.braking * 0.3 : index === 1 ? adjusted.fast * 0.36 + adjusted.balance * 0.24 : adjusted.fast * 0.26 + adjusted.slow * 0.14 + adjusted.tyre * 0.18;
      return clamp(bias + powerBoost - weather.penalty * (0.18 + index * 0.06), 0.14, 0.98);
    });

    const totalDelta = sectorScores.reduce(function (sum, score) {
      return sum + ((0.9 - score) * 1.8);
    }, 0);

    const speedTrace = [];
    const brakeTrace = [];
    const deployTrace = [];
    for (let i = 0; i < 9; i += 1) {
      const sector = Math.floor(i / 3);
      speedTrace.push(clamp(track.traces.speed[i] + (adjusted.straight - 0.6) * 38 + (adjusted.fast - 0.6) * 26 - weather.penalty * 12, 10, 98));
      brakeTrace.push(clamp(track.traces.brake[i] + (adjusted.braking - 0.6) * 34 + weather.penalty * 12, 4, 98));
      deployTrace.push(clamp(track.traces.deploy[i] + (power.sectorBars[sector] - 0.5) * 52, 8, 98));
    }

    return { track, setup, power, weather, plan, sectorScores, totalDelta, speedTrace, brakeTrace, deployTrace };
  }

  function updateCaptions() {
    const component = COMPONENTS[state.component];
    setCaption("f1_overview_caption", `<strong>${component.label}</strong> - ${component.caption}`);

    const airflowSpeed = 180 + state.airflowSpeed * 160;
    const frontShare = clamp(31 + state.airflowWing * 24 + state.airflowSpeed * 10 - state.airflowRide * 8, 24, 62);
    const floorEff = clamp(46 + (1 - Math.abs(state.airflowRide - 0.32) / 0.35) * 34 + state.airflowSpeed * 12, 20, 96);
    const dragCost = clamp(14 + state.airflowWing * 28 + state.airflowSpeed * 9, 8, 66);
    let airflowState = "healthy";
    if (state.airflowRide < 0.18) {
      airflowState = "fragile";
    } else if (state.airflowRide < 0.28) {
      airflowState = "tight";
    }
    setCaption("f1_airflow_caption", `<strong>${Math.round(airflowSpeed)} km/h</strong> - Front load share sits near <strong>${Math.round(frontShare)}%</strong>, floor efficiency near <strong>${Math.round(floorEff)}%</strong>, and drag penalty near <strong>${Math.round(dragCost)}%</strong>. Right now the platform looks <strong>${airflowState}</strong>.`);

    const dirty = clamp((1 - state.frontGap) * 100, 0, 100);
    const bite = clamp(42 + state.frontFlap * 36 + state.frontDemand * 18 - dirty * 0.34, 20, 97);
    const feed = clamp(84 - dirty * 0.44 + state.frontFlap * 10, 18, 97);
    const frontState = dirty > 60 ? "washed out" : dirty > 36 ? "fading" : "usable";
    setCaption("f1_front_caption", `<strong>${componentColorName("front-wing")}</strong> - Front bite is around <strong>${Math.round(bite)}%</strong> and floor feed quality around <strong>${Math.round(feed)}%</strong>. In this wake condition the front axle feels <strong>${frontState}</strong>.`);

    const suction = clamp(42 + (1 - Math.abs(state.floorRide - 0.34) / 0.3) * 54 - Math.max(0, state.floorPitch - 0.55) * 34, 12, 98);
    const risk = state.floorRide < 0.22 || state.floorPitch > 0.7 ? "high" : state.floorRide < 0.3 ? "elevated" : "moderate";
    setCaption("f1_floor_caption", `<strong>Ground effect</strong> - Underfloor suction is near <strong>${Math.round(suction)}%</strong>. The diffuser still recovers cleanly, but platform risk is now <strong>${risk}</strong> as the throat narrows and pitch grows.`);

    const rearSupport = clamp(38 + state.rearWing * 48 + state.rearSpeed * 12 - state.rearDrc * 18, 18, 98);
    const rearDrag = clamp(14 + state.rearWing * 38 + state.rearSpeed * 10 - state.rearDrc * 14, 8, 68);
    const topDelta = Math.round((state.rearDrc ? 9 : 1) + (1 - state.rearWing) * 7 + state.rearSpeed * 5);
    setCaption("f1_rear_caption", `<strong>${state.rearDrc ? "DRS open" : "DRS closed"}</strong> - Rear support is around <strong>${Math.round(rearSupport)}%</strong>, drag load around <strong>${Math.round(rearDrag)}%</strong>, and the straight-line gain around <strong>+${topDelta} km/h</strong>.`);

    const calm = clamp(92 - Math.abs(0.58 - state.chassisStiffness) * 90 - state.chassisBrake * 22 - state.chassisKerb * 18, 18, 96);
    const kerbScore = clamp(88 - state.chassisStiffness * 58 - state.chassisKerb * 22 + 12, 14, 94);
    const floorScore = clamp(42 + state.chassisStiffness * 54 - state.chassisBrake * 16 - state.chassisKerb * 14, 18, 97);
    setCaption("f1_chassis_caption", `<strong>Platform control</strong> - Calmness is near <strong>${Math.round(calm)}%</strong>, kerb compliance near <strong>${Math.round(kerbScore)}%</strong>, and floor consistency near <strong>${Math.round(floorScore)}%</strong>. The platform is balancing tyre kindness against aero discipline.`);

    const power = computePowerState();
    setCaption("f1_power_caption", `<strong>${power.mode.label} / ${power.bias.label}</strong> - The power unit is spending electrical support across the lap in a deliberately uneven way: <strong>${Math.round(power.sectorBars[0] * 100)}%</strong>, <strong>${Math.round(power.sectorBars[1] * 100)}%</strong>, and <strong>${Math.round(power.sectorBars[2] * 100)}%</strong> across the three sectors.`);

    const tyre = computeTyreState();
    setCaption("f1_tyre_caption", `<strong>${tyre.tyre.label}</strong> - Grip is around <strong>${Math.round(tyre.grip * 100)}%</strong>, wear pressure around <strong>${Math.round(tyre.wear * 60)}%</strong>, and the tyre now looks <strong>${tyre.stateLabel}</strong>.`);

    const brakeSpeed = 140 + state.brakeSpeed * 200;
    const rearRotation = clamp((0.64 - state.brakeBias) * 140 + state.brakeRecovery * 22 + 50, 0, 100);
    const brakingAuthority = clamp(72 + (brakeSpeed - 180) * 0.08 - Math.abs(state.brakeBias - 0.58) * 46 - state.brakeRecovery * 9, 28, 96);
    const brakingState = rearRotation < 35 ? "locked-in" : rearRotation > 68 ? "aggressive" : "controlled";
    setCaption("f1_brake_caption", `<strong>${Math.round(brakeSpeed)} km/h entry</strong> - Stopping authority is around <strong>${Math.round(brakingAuthority)}%</strong> and the rear now feels <strong>${brakingState}</strong> on release.`);

    const track = getTrack();
    setCaption("f1_track_caption", `<strong>${track.label}</strong> - ${track.caption}`);

    const race = computeRacecraftState();
    const passLabel = race.passChance > 68 ? "high-odds" : race.passChance > 45 ? "promising" : "hopeful";
    setCaption("f1_race_caption", `<strong>${track.label} racecraft</strong> - Dirty-air penalty is around <strong>${Math.round(race.dirtyPenalty)}%</strong>, closing rate around <strong>${Math.round(race.closingRate)} km/h</strong>, and the move currently looks <strong>${passLabel}</strong>.`);

    const setup = computeSetupScores();
    const setupPreset = TRACKS[state.track].label;
    setCaption("f1_setup_caption", `<strong>${setupPreset} setup</strong> - Straight-line speed sits near <strong>${Math.round(setup.straight * 100)}%</strong>, slow-corner authority near <strong>${Math.round(setup.slow * 100)}%</strong>, high-speed support near <strong>${Math.round(setup.fast * 100)}%</strong>, and tyre life near <strong>${Math.round(setup.tyreLife * 100)}%</strong>.`);

    const weather = computeWeatherStrategy();
    setCaption("f1_weather_caption", `<strong>${weather.mode.label}</strong> - Track temperature is around <strong>${Math.round(weather.temp)} C</strong>, rain pressure around <strong>${Math.round(weather.rain)}%</strong>, and the recommended strategic tyre is <strong>${weather.recommended}</strong>. Urgency now feels <strong>${weather.urgency.toLowerCase()}</strong>.`);

    const pit = computePitStrategy();
    setCaption("f1_pit_caption", `<strong>${pit.call}</strong> - Raw pit loss is about <strong>${pit.rawLoss.toFixed(1)} s</strong>, undercut value about <strong>${pit.undercut >= 0 ? "+" : ""}${pit.undercut.toFixed(1)} s</strong>, and safety-car swing about <strong>${pit.safetySwing.toFixed(1)} s</strong>. ${pit.note}`);

    const lap = computeLapState();
    setCaption("f1_lap_caption", `<strong>${lap.track.label} / ${lap.plan.label}</strong> - The current build projects sector deltas of <strong>${lap.totalDelta.toFixed(2)} s</strong> across the lap once setup, deployment, tyre, and weather are all pushing on the same traces.`);
  }

  function componentColorName(key) {
    const component = COMPONENTS.find((item) => item.key === key);
    return component ? component.label : key;
  }

  function drawSceneBackground(ctx, width, height, tint) {
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, rgba(mixRgb(COLORS.paper, tint || COLORS.paper, 0.1), 1));
    gradient.addColorStop(1, rgba(mixRgb(COLORS.paper, tint || COLORS.gray, 0.2), 1));
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }

  function drawAirflowScene(ctx, width, height, time) {
    drawSceneBackground(ctx, width, height, COLORS.blue);
    const speed = state.airflowSpeed;
    const wing = state.airflowWing;
    const ride = state.airflowRide;

    const groundGradient = ctx.createLinearGradient(0, height * 0.66, 0, height);
    groundGradient.addColorStop(0, rgba(COLORS.ground, 0.16));
    groundGradient.addColorStop(1, rgba(COLORS.ground, 0.82));
    ctx.fillStyle = groundGradient;
    ctx.fillRect(0, height * 0.66, width, height * 0.34);

    ctx.strokeStyle = rgba(COLORS.dark, 0.08);
    for (let x = -40; x < width + 40; x += 56) {
      ctx.beginPath();
      ctx.moveTo(x, height * 0.66);
      ctx.lineTo(x + 30, height);
      ctx.stroke();
    }

    for (let i = 0; i < 6; i += 1) {
      const y = height * (0.2 + i * 0.11);
      const amplitude = (i - 2.5) * (14 + wing * 16);
      drawFlowLine(ctx, width, y, amplitude * (0.24 + speed * 0.32), time, speed, rgba(COLORS.blue, 0.34 + speed * 0.26));
    }

    const ridePx = 10 + (1 - ride) * 18;
    drawSideCar(ctx, width * 0.47, height * 0.5, Math.min(width, height) * 0.2, -0.02, ridePx / 120, false);

    const tunnel = [
      [width * 0.34, height * 0.6],
      [width * 0.44, height * (0.62 - ride * 0.08)],
      [width * 0.6, height * (0.6 - ride * 0.05)],
      [width * 0.7, height * 0.54],
      [width * 0.7, height * 0.6],
      [width * 0.34, height * 0.64],
    ];
    ctx.fillStyle = rgba(COLORS.cyan, 0.22 + (1 - Math.abs(ride - 0.32) / 0.35) * 0.24);
    ctx.beginPath();
    tunnel.forEach((point, index) => {
      if (index === 0) {
        ctx.moveTo(point[0], point[1]);
      } else {
        ctx.lineTo(point[0], point[1]);
      }
    });
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = rgba(COLORS.red, 0.36 + wing * 0.24);
    ctx.lineWidth = 4 + wing * 8;
    ctx.beginPath();
    ctx.moveTo(width * 0.25, height * 0.38);
    ctx.bezierCurveTo(width * 0.34, height * 0.27, width * 0.48, height * 0.22, width * 0.66, height * 0.32);
    ctx.stroke();

    const wakeGradient = ctx.createRadialGradient(width * 0.78, height * 0.48, 10, width * 0.82, height * 0.5, width * 0.26);
    wakeGradient.addColorStop(0, rgba(COLORS.wake, 0.28 + wing * 0.12));
    wakeGradient.addColorStop(1, rgba(COLORS.wake, 0));
    ctx.fillStyle = wakeGradient;
    ctx.beginPath();
    ctx.moveTo(width * 0.62, height * 0.28);
    ctx.bezierCurveTo(width * 0.82, height * 0.2, width * 0.96, height * 0.34, width * 0.96, height * 0.5);
    ctx.bezierCurveTo(width * 0.96, height * 0.66, width * 0.82, height * 0.8, width * 0.62, height * 0.72);
    ctx.closePath();
    ctx.fill();

    const flowRot = mat3_mul(rot_x_mat3(-0.76), mat3_mul(rot_y_mat3(-0.64), rot_z_mat3(0.16)));
    const flowScale = Math.min(width, height) * 0.21;
    const flowCx = width * 0.43;
    const flowCy = height * 0.46;
    [
      [[-2.8, -1.1, 0.32], [-1.6, -0.96, 0.26], [-0.8, -0.72, 0.28], [0.2, -0.44, 0.24], [1.2, -0.28, 0.2], [2.6, -0.36, 0.18]],
      [[-2.9, -0.42, 0.22], [-1.8, -0.28, 0.24], [-0.8, -0.2, 0.18], [0.4, -0.08, 0.16], [1.6, 0.0, 0.12], [2.8, -0.12, 0.1]],
      [[-2.8, 0.4, 0.16], [-1.6, 0.3, 0.18], [-0.8, 0.24, 0.14], [0.2, 0.2, 0.12], [1.4, 0.16, 0.1], [2.6, 0.08, 0.08]],
    ].forEach((ribbon, index) => {
      drawProjectedRibbon(ctx, ribbon, flowRot, flowScale, flowCx, flowCy, rgba(COLORS.blue, 0.08 + index * 0.04), 7 - index * 1.2);
      drawProjectedPolyline(ctx, ribbon, flowRot, flowScale, flowCx, flowCy, rgba(COLORS.blue, 0.42 + speed * 0.24), 2.4, [10, 10], -time * (60 + index * 20));
    });

    const underfloorRibbon = [[-1.0, 0.08, -0.04], [-0.6, 0.0, -0.12], [0.2, -0.04, -0.2], [1.2, -0.02, -0.1], [2.0, 0.06, 0.0]];
    drawProjectedRibbon(ctx, underfloorRibbon, flowRot, flowScale, flowCx, flowCy, rgba(COLORS.cyan, 0.16 + (1 - ride) * 0.12), 8);
    drawProjectedPolyline(ctx, underfloorRibbon, flowRot, flowScale, flowCx, flowCy, rgba(COLORS.cyan, 0.78), 3, [8, 12], -time * 96);
  }

  function drawFrontScene(ctx, width, height, time) {
    drawSceneBackground(ctx, width, height, COLORS.violet);
    const gap = state.frontGap;
    const flap = state.frontFlap;
    const demand = state.frontDemand;
    const dirty = (1 - gap);

    for (let i = 0; i < 4; i += 1) {
      const y = height * (0.26 + i * 0.13);
      drawFlowLine(ctx, width, y, (i - 1.4) * 16 * (0.35 + dirty * 0.5), time, 0.35 + demand * 0.5, rgba(COLORS.blue, 0.26 + (1 - dirty) * 0.2));
    }

    ctx.fillStyle = rgba(COLORS.wake, 0.12 + dirty * 0.4);
    ctx.beginPath();
    ctx.moveTo(width * 0.12, height * 0.2);
    ctx.bezierCurveTo(width * 0.3, height * 0.08, width * 0.44, height * 0.18, width * 0.46, height * 0.48);
    ctx.bezierCurveTo(width * 0.42, height * 0.76, width * 0.28, height * 0.84, width * 0.12, height * 0.72);
    ctx.closePath();
    ctx.fill();

    drawTopCar(ctx, width * (0.2 + dirty * 0.04), height * 0.52, Math.min(width, height) * 0.08, COLORS.gray, 0.96);
    drawTopCar(ctx, width * 0.62, height * 0.56, Math.min(width, height) * 0.1, COLORS.paper, 1);

    const chaseRot = mat3_mul(rot_x_mat3(-0.88), mat3_mul(rot_y_mat3(-0.28), rot_z_mat3(0.14)));
    const chaseScale = Math.min(width, height) * 0.16;
    const chaseCx = width * 0.62;
    const chaseCy = height * 0.56;
    [
      [[-1.9, -0.72, 0.16], [-1.16, -0.52, 0.18], [-0.44, -0.38, 0.12], [0.52, -0.28, 0.06]],
      [[-1.92, 0.72, 0.16], [-1.18, 0.52, 0.18], [-0.46, 0.38, 0.12], [0.5, 0.28, 0.06]],
    ].forEach((ribbon) => {
      drawProjectedRibbon(ctx, ribbon, chaseRot, chaseScale, chaseCx, chaseCy, rgba(COLORS.blue, 0.08 + dirty * 0.08), 6);
      drawProjectedPolyline(ctx, ribbon, chaseRot, chaseScale, chaseCx, chaseCy, rgba(COLORS.blue, 0.44), 2.2, [8, 10], -time * 72);
    });

    ctx.strokeStyle = rgba(COLORS.red, 0.8);
    ctx.lineWidth = 8 + flap * 14;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(width * 0.44, height * 0.57);
    ctx.lineTo(width * 0.52, height * (0.57 - demand * 0.12));
    ctx.stroke();

    ctx.strokeStyle = rgba(COLORS.cyan, 0.5 + flap * 0.18);
    ctx.lineWidth = 3.2;
    ctx.setLineDash([10, 10]);
    ctx.lineDashOffset = -time * 88;
    ctx.beginPath();
    ctx.moveTo(width * 0.54, height * 0.56);
    ctx.bezierCurveTo(width * 0.64, height * 0.48, width * 0.74, height * 0.48, width * 0.84, height * 0.56);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  function drawFloorScene(ctx, width, height, time) {
    drawSceneBackground(ctx, width, height, COLORS.cyan);
    const ride = state.floorRide;
    const pitch = state.floorPitch;
    const bodyY = height * 0.42 + pitch * 12;
    ctx.fillStyle = rgba(COLORS.ground, 0.82);
    ctx.fillRect(0, height * 0.74, width, height * 0.26);

    ctx.strokeStyle = rgba(COLORS.dark, 0.16);
    for (let x = -20; x < width + 20; x += 36) {
      ctx.beginPath();
      ctx.moveTo(x, height * 0.74);
      ctx.lineTo(x + 20, height * 0.92);
      ctx.stroke();
    }

    drawSideCar(ctx, width * 0.46, bodyY, Math.min(width, height) * 0.19, -0.08 + pitch * 0.12, ride * 0.14, false);

    ctx.strokeStyle = rgba(COLORS.cyan, 0.78);
    ctx.lineWidth = 10 + (1 - Math.abs(ride - 0.34) / 0.35) * 14;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(width * 0.28, height * 0.61);
    ctx.bezierCurveTo(width * 0.38, height * (0.74 - ride * 0.18), width * 0.56, height * (0.72 - ride * 0.16), width * 0.7, height * 0.56);
    ctx.stroke();

    ctx.strokeStyle = rgba(COLORS.red, 0.62);
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(width * 0.52, height * 0.58);
    ctx.lineTo(width * 0.66, height * (0.48 - pitch * 0.08));
    ctx.stroke();
  }

  function drawRearScene(ctx, width, height) {
    drawSceneBackground(ctx, width, height, COLORS.orange);
    drawSideCar(ctx, width * 0.42, height * 0.5, Math.min(width, height) * 0.19, 0, 0.02, state.rearDrc === 1);

    const wingX = width * 0.72;
    const wingY = height * 0.36;
    ctx.strokeStyle = rgba(COLORS.red, 0.94);
    ctx.lineWidth = 10;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(wingX - 30, wingY + 24);
    ctx.lineTo(wingX + 42, wingY + 24);
    ctx.stroke();

    ctx.beginPath();
    const flapLift = state.rearDrc === 1 ? 22 : 6;
    ctx.moveTo(wingX - 24, wingY + 6);
    ctx.lineTo(wingX + 34, wingY - flapLift);
    ctx.stroke();

    for (let i = 0; i < 3; i += 1) {
      ctx.strokeStyle = rgba(COLORS.blue, 0.32 + i * 0.08);
      ctx.lineWidth = 4;
      ctx.setLineDash([10, 12]);
      ctx.lineDashOffset = -performance.now() * 0.03 * (2 + i);
      ctx.beginPath();
      ctx.moveTo(width * 0.18, height * (0.32 + i * 0.12));
      ctx.bezierCurveTo(width * 0.46, height * (0.28 + i * 0.16), width * 0.62, height * (0.22 + i * 0.1), width * 0.9, height * (0.24 + i * 0.16 + flapLift * 0.02));
      ctx.stroke();
    }
    ctx.setLineDash([]);

    const wakeRot = mat3_mul(rot_x_mat3(-0.74), mat3_mul(rot_y_mat3(-0.42), rot_z_mat3(0.08)));
    const wakeScale = Math.min(width, height) * 0.16;
    const wakeCx = width * 0.68;
    const wakeCy = height * 0.44;
    const wakeRibbon = [[0.8, -0.4, 0.16], [1.4, -0.3, 0.14], [2.0, -0.2, 0.1], [2.8, -0.16, 0.08]];
    const wakeRibbonLower = [[0.8, 0.4, 0.16], [1.4, 0.3, 0.14], [2.0, 0.2, 0.1], [2.8, 0.16, 0.08]];
    [wakeRibbon, wakeRibbonLower].forEach((ribbon) => {
      drawProjectedRibbon(ctx, ribbon, wakeRot, wakeScale, wakeCx, wakeCy, rgba(COLORS.wake, 0.12 + state.rearWing * 0.08), 8);
      drawProjectedPolyline(ctx, ribbon, wakeRot, wakeScale, wakeCx, wakeCy, rgba(COLORS.blue, 0.44), 2.2, [9, 10], -performance.now() * 0.05);
    });
  }

  function drawChassisScene(ctx, width, height) {
    drawSceneBackground(ctx, width, height, COLORS.green);
    const stiffness = state.chassisStiffness;
    const kerb = state.chassisKerb;
    const brake = state.chassisBrake;
    const pitch = (brake - stiffness * 0.4) * 0.18;
    const heave = kerb * 0.12;
    ctx.fillStyle = rgba(COLORS.ground, 0.82);
    ctx.fillRect(0, height * 0.78, width, height * 0.22);
    ctx.fillStyle = rgba(COLORS.red, 0.22);
    ctx.fillRect(width * 0.64, height * (0.74 - kerb * 24), 46, 28 + kerb * 24);

    drawSideCar(ctx, width * 0.48, height * 0.5 + heave * 18, Math.min(width, height) * 0.19, -pitch, 0.02 + heave * 0.18, false);

    ctx.strokeStyle = rgba(COLORS.red, 0.7);
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(width * 0.36, height * 0.42);
    ctx.lineTo(width * 0.36, height * (0.63 - brake * 0.12));
    ctx.lineTo(width * 0.39, height * 0.68);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(width * 0.64, height * 0.4);
    ctx.lineTo(width * 0.64, height * (0.64 - kerb * 0.18));
    ctx.lineTo(width * 0.67, height * 0.7);
    ctx.stroke();
  }

  function drawPowerScene(ctx, width, height, time) {
    drawSceneBackground(ctx, width, height, COLORS.red);
    const power = computePowerState();
    const centers = [width * 0.16, width * 0.38, width * 0.6, width * 0.82];
    const labels = ["ICE", "Turbo", "Battery", "Rear axle"];
    const nodeColors = [COLORS.red, COLORS.orange, COLORS.green, COLORS.dark];

    ctx.lineWidth = 10;
    centers.forEach(function (x, index) {
      if (index < centers.length - 1) {
        ctx.strokeStyle = rgba(COLORS.dark, 0.12);
        ctx.beginPath();
        ctx.moveTo(x + 36, height * 0.46);
        ctx.lineTo(centers[index + 1] - 36, height * 0.46);
        ctx.stroke();
      }
    });

    for (let i = 0; i < 3; i += 1) {
      const start = centers[i] + 36;
      const end = centers[i + 1] - 36;
      const travel = ((time * (0.18 + power.sectorBars[i] * 0.4)) % 1);
      const pulseX = lerpNumber(start, end, travel);
      ctx.fillStyle = rgba(COLORS.yellow, 0.86);
      ctx.beginPath();
      ctx.ellipse(pulseX, height * 0.46, 12, 8, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    centers.forEach(function (x, index) {
      ctx.fillStyle = rgba(nodeColors[index], 0.86);
      ctx.beginPath();
      ctx.roundRect(x - 42, height * 0.34, 84, 66, 18);
      ctx.fill();
      ctx.fillStyle = rgba(COLORS.paper, 0.96);
      ctx.font = "600 16px IBM Plex Mono, monospace";
      ctx.textAlign = "center";
      ctx.fillText(labels[index], x, height * 0.41);
    });

    power.sectorBars.forEach(function (value, index) {
      const barX = width * (0.16 + index * 0.24);
      ctx.fillStyle = rgba(COLORS.dark, 0.08);
      ctx.beginPath();
      ctx.roundRect(barX - 54, height * 0.72, 108, 10, 10);
      ctx.fill();
      ctx.fillStyle = rgba(COLORS.yellow, 0.9);
      ctx.beginPath();
      ctx.roundRect(barX - 54, height * 0.72, 108 * value, 10, 10);
      ctx.fill();
      ctx.fillStyle = rgba(COLORS.ink, 0.68);
      ctx.font = "600 12px IBM Plex Mono, monospace";
      ctx.fillText(getTrack().sectors[index], barX, height * 0.7);
    });
  }

  function drawTyreScene(ctx, width, height) {
    drawSceneBackground(ctx, width, height, getTyre().color);
    const tyre = computeTyreState();
    const cx = width * 0.38;
    const cy = height * 0.5;
    const outer = Math.min(width, height) * 0.22;
    const inner = outer * 0.58;
    const heatT = clamp((tyre.temp - tyre.tyre.window[0]) / Math.max(0.001, tyre.tyre.window[1] - tyre.tyre.window[0]), 0, 1);

    ctx.fillStyle = rgba(COLORS.dark, 0.12);
    ctx.beginPath();
    ctx.ellipse(cx, height * 0.82, outer * 0.9, outer * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();

    const ring = ctx.createRadialGradient(cx, cy, inner * 0.7, cx, cy, outer);
    ring.addColorStop(0, rgba(mixRgb(getTyre().color, COLORS.paper, 0.25), 0.96));
    ring.addColorStop(1, rgba(mixRgb(COLORS.dark, getTyre().color, 0.25), 0.96));
    ctx.fillStyle = ring;
    ctx.beginPath();
    ctx.arc(cx, cy, outer, 0, Math.PI * 2);
    ctx.arc(cx, cy, inner, 0, Math.PI * 2, true);
    ctx.fill();

    ctx.fillStyle = rgba(mixRgb(COLORS.red, COLORS.blue, 1 - heatT), 0.66);
    ctx.beginPath();
    ctx.arc(cx, cy, inner * 0.88, Math.PI * 0.2, Math.PI * (0.2 + heatT * 1.6));
    ctx.lineWidth = 18;
    ctx.strokeStyle = rgba(mixRgb(COLORS.blue, COLORS.red, heatT), 0.84);
    ctx.stroke();

    const patchWidth = clamp((0.24 + tyre.load * 0.22 - tyre.wear * 0.08) * width, 70, 220);
    ctx.fillStyle = rgba(COLORS.dark, 0.14 + tyre.grip * 0.12);
    ctx.beginPath();
    ctx.roundRect(cx - patchWidth * 0.5, height * 0.76, patchWidth, 16, 8);
    ctx.fill();

    ctx.fillStyle = rgba(COLORS.ink, 0.76);
    ctx.font = "600 18px IBM Plex Mono, monospace";
    ctx.textAlign = "left";
    ctx.fillText(tyre.tyre.label, width * 0.66, height * 0.36);
    ctx.font = "500 14px IBM Plex Mono, monospace";
    ctx.fillText("Grip " + Math.round(tyre.grip * 100) + "%", width * 0.66, height * 0.46);
    ctx.fillText("Wear " + Math.round(tyre.wear * 60) + "%", width * 0.66, height * 0.56);
    ctx.fillText("State " + tyre.stateLabel, width * 0.66, height * 0.66);
  }

  function drawBrakeScene(ctx, width, height) {
    drawSceneBackground(ctx, width, height, COLORS.red);
    const speed = 140 + state.brakeSpeed * 200;
    const bias = state.brakeBias;
    const recovery = state.brakeRecovery;
    const pitch = -0.03 - state.brakeSpeed * 0.08 - recovery * 0.05;
    drawSideCar(ctx, width * 0.42, height * 0.54, Math.min(width, height) * 0.19, pitch, 0.02, false);

    ctx.fillStyle = rgba(COLORS.red, 0.7);
    ctx.arrow(width * 0.74, height * 0.24, width * 0.58, height * 0.24, 18, 28, 24);
    ctx.fill();

    const frontLoad = clamp(56 + state.brakeSpeed * 16 + (bias - 0.55) * 34 + recovery * 12, 46, 84);
    const rearLoad = clamp(100 - frontLoad, 16, 54);
    drawBarPair(ctx, width * 0.74, height * 0.44, frontLoad / 100, rearLoad / 100, "Front", "Rear", COLORS.red, COLORS.blue);

    ctx.fillStyle = rgba(COLORS.ink, 0.76);
    ctx.font = "600 15px IBM Plex Mono, monospace";
    ctx.textAlign = "left";
    ctx.fillText(Math.round(speed) + " km/h", width * 0.66, height * 0.76);
  }

  function drawTrackScene(ctx, width, height) {
    drawSceneBackground(ctx, width, height, COLORS.gray);
    const track = getTrack();
    ctx.save();
    ctx.translate(width * 0.12, height * 0.12);
    const scaleX = width * 0.72 / 520;
    const scaleY = height * 0.68 / 280;
    ctx.scale(scaleX, scaleY);
    const path = new Path2D(track.path);
    ctx.strokeStyle = rgba(COLORS.dark, 0.16);
    ctx.lineWidth = 30 / scaleX;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke(path);
    ctx.strokeStyle = rgba(COLORS.red, 0.84);
    ctx.lineWidth = 16 / scaleX;
    ctx.stroke(path);
    ctx.restore();

    const tags = track.sectors;
    tags.forEach(function (tag, index) {
      const x = width * (0.18 + index * 0.24);
      const y = height * 0.82;
      ctx.fillStyle = rgba([track.traces.speed[index * 3 + 1], 110, 140], 0.16);
      ctx.beginPath();
      ctx.roundRect(x, y, width * 0.18, 40, 14);
      ctx.fill();
      ctx.fillStyle = rgba(COLORS.ink, 0.76);
      ctx.font = "600 12px IBM Plex Mono, monospace";
      ctx.textAlign = "center";
      ctx.fillText(tag, x + width * 0.09, y + 24);
    });
  }

  function drawRaceScene(ctx, width, height) {
    drawSceneBackground(ctx, width, height, COLORS.violet);
    const race = computeRacecraftState();
    const leadX = width * (0.26 - (1 - state.raceGap) * 0.08);
    const chaseX = width * (0.58 + race.closingRate * 0.004);

    ctx.fillStyle = rgba(COLORS.ground, 0.84);
    ctx.fillRect(0, height * 0.62, width, height * 0.18);
    ctx.fillStyle = rgba(COLORS.red, 0.12 + (state.raceDrc ? 0.18 : 0));
    ctx.fillRect(width * 0.54, height * 0.62, width * 0.26, height * 0.18);
    ctx.fillStyle = rgba(COLORS.cyan, 0.22);
    ctx.fillRect(width * 0.48, height * 0.58, 6, height * 0.26);

    ctx.fillStyle = rgba(COLORS.wake, 0.16 + (1 - state.raceGap) * 0.38);
    ctx.beginPath();
    ctx.moveTo(leadX + 40, height * 0.24);
    ctx.bezierCurveTo(leadX + 140, height * 0.08, chaseX - 60, height * 0.18, chaseX - 28, height * 0.42);
    ctx.bezierCurveTo(chaseX - 66, height * 0.62, leadX + 150, height * 0.74, leadX + 46, height * 0.6);
    ctx.closePath();
    ctx.fill();

    drawTopCar(ctx, leadX, height * 0.56, Math.min(width, height) * 0.085, COLORS.gray, 0.96);
    drawTopCar(ctx, chaseX, height * 0.58, Math.min(width, height) * 0.095, COLORS.red, 0.96);

    if (state.raceDrc === 1) {
      ctx.strokeStyle = rgba(COLORS.yellow, 0.86);
      ctx.lineWidth = 6;
      ctx.setLineDash([10, 12]);
      ctx.lineDashOffset = -performance.now() * 0.05;
      ctx.beginPath();
      ctx.moveTo(chaseX + 20, height * 0.54);
      ctx.lineTo(chaseX + 120, height * 0.54);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  function drawMetricBars(ctx, width, height, labels, values, colors) {
    labels.forEach(function (label, index) {
      const x = width * 0.14;
      const y = height * (0.18 + index * 0.15);
      ctx.fillStyle = rgba(COLORS.dark, 0.08);
      ctx.beginPath();
      ctx.roundRect(x + 110, y, width * 0.52, 12, 12);
      ctx.fill();
      ctx.fillStyle = rgba(colors[index], 0.88);
      ctx.beginPath();
      ctx.roundRect(x + 110, y, width * 0.52 * values[index], 12, 12);
      ctx.fill();
      ctx.fillStyle = rgba(COLORS.ink, 0.74);
      ctx.font = "600 13px IBM Plex Mono, monospace";
      ctx.textAlign = "left";
      ctx.fillText(label, x, y + 10);
    });
  }

  function drawSetupScene(ctx, width, height) {
    drawSceneBackground(ctx, width, height, COLORS.orange);
    const setup = computeSetupScores();
    drawMetricBars(
      ctx,
      width,
      height,
      ["Straight", "Slow corners", "Fast corners", "Tyre life", "Braking", "Balance"],
      [setup.straight, setup.slow, setup.fast, setup.tyreLife, setup.braking, setup.balance],
      [COLORS.blue, COLORS.orange, COLORS.red, COLORS.gray, COLORS.yellow, COLORS.cyan],
    );

    ctx.fillStyle = rgba(COLORS.ink, 0.8);
    ctx.font = "600 17px IBM Plex Mono, monospace";
    ctx.textAlign = "left";
    ctx.fillText(getTrack().label + " preset", width * 0.14, height * 0.86);
    ctx.font = "500 13px IBM Plex Mono, monospace";
    ctx.fillText("Wing " + Math.round(state.setupWing * 10 + 1) + " · Ride " + Math.round(24 + state.setupRide * 40) + " mm · Stiffness " + Math.round(20 + state.setupStiffness * 70) + "%", width * 0.14, height * 0.92);
  }

  function drawWeatherScene(ctx, width, height) {
    drawSceneBackground(ctx, width, height, COLORS.blue);
    const weather = computeWeatherStrategy();

    const bandX = width * 0.12;
    const bandY = height * 0.36;
    const bandW = width * 0.74;
    ctx.fillStyle = rgba(COLORS.dark, 0.08);
    ctx.beginPath();
    ctx.roundRect(bandX, bandY, bandW, 16, 16);
    ctx.fill();

    const gradient = ctx.createLinearGradient(bandX, 0, bandX + bandW, 0);
    gradient.addColorStop(0, rgba(COLORS.orange, 0.9));
    gradient.addColorStop(0.5, rgba(COLORS.green, 0.9));
    gradient.addColorStop(1, rgba(COLORS.blue, 0.9));
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.roundRect(bandX, bandY, bandW * clamp(weather.crossover / 100, 0.06, 1), 16, 16);
    ctx.fill();

    ctx.fillStyle = rgba(COLORS.cyan, 0.9);
    ctx.beginPath();
    ctx.ellipse(bandX + bandW * clamp(weather.crossover / 100, 0.06, 0.96), bandY + 8, 10, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = rgba(COLORS.ink, 0.78);
    ctx.font = "600 16px IBM Plex Mono, monospace";
    ctx.textAlign = "left";
    ctx.fillText(weather.mode.label + " mode", width * 0.12, height * 0.18);
    ctx.font = "500 13px IBM Plex Mono, monospace";
    ctx.fillText("Track " + Math.round(weather.temp) + " C · Rain " + Math.round(weather.rain) + "% · Laps to go " + Math.round(weather.laps), width * 0.12, height * 0.78);
    ctx.fillText("Recommended tyre: " + weather.recommended + " · Urgency: " + weather.urgency, width * 0.12, height * 0.86);
  }

  function drawPitScene(ctx, width, height) {
    drawSceneBackground(ctx, width, height, COLORS.violet);
    const pit = computePitStrategy();
    const bandX = width * 0.12;
    const bandW = width * 0.74;
    const bandY = height * 0.34;

    ctx.fillStyle = rgba(COLORS.dark, 0.08);
    ctx.beginPath();
    ctx.roundRect(bandX, bandY, bandW, 16, 16);
    ctx.fill();
    ctx.fillStyle = rgba(COLORS.orange, 0.9);
    ctx.beginPath();
    ctx.roundRect(bandX, bandY, bandW * clamp(pit.rawLoss / 28, 0.08, 0.96), 16, 16);
    ctx.fill();
    ctx.fillStyle = rgba(COLORS.cyan, 0.9);
    ctx.beginPath();
    ctx.ellipse(bandX + bandW * clamp((pit.undercut + 3) / 12, 0.06, 0.94), bandY + 8, 10, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = rgba(COLORS.ink, 0.78);
    ctx.font = "600 16px IBM Plex Mono, monospace";
    ctx.fillText(pit.call, width * 0.12, height * 0.18);
    ctx.font = "500 13px IBM Plex Mono, monospace";
    ctx.fillText("Loss " + pit.rawLoss.toFixed(1) + " s · Undercut " + (pit.undercut >= 0 ? "+" : "") + pit.undercut.toFixed(1) + " s · Overcut " + (pit.overcut >= 0 ? "+" : "") + pit.overcut.toFixed(1) + " s", width * 0.12, height * 0.74);
    ctx.fillText("Safety-car swing " + pit.safetySwing.toFixed(1) + " s", width * 0.12, height * 0.84);
  }

  function buildTracePoints(values, width, height) {
    const left = width * 0.08;
    const top = height * 0.16;
    const traceWidth = width * 0.84;
    const traceHeight = height * 0.56;
    return values.map(function (value, index) {
      const ratio = values.length === 1 ? 0 : index / (values.length - 1);
      return [left + traceWidth * ratio, top + traceHeight * (1 - value / 100)];
    });
  }

  function strokeTrace(ctx, points, color, widthValue) {
    ctx.strokeStyle = color;
    ctx.lineWidth = widthValue;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.beginPath();
    points.forEach(function (point, index) {
      if (index === 0) {
        ctx.moveTo(point[0], point[1]);
      } else {
        ctx.lineTo(point[0], point[1]);
      }
    });
    ctx.stroke();
  }

  function drawLapScene(ctx, width, height) {
    drawSceneBackground(ctx, width, height, COLORS.gray);
    const lap = computeLapState();
    const speedPoints = buildTracePoints(lap.speedTrace, width, height);
    const brakePoints = buildTracePoints(lap.brakeTrace, width, height);
    const deployPoints = buildTracePoints(lap.deployTrace, width, height);

    const bands = [0.08, 0.37, 0.66];
    bands.forEach(function (x, index) {
      ctx.fillStyle = rgba(COLORS.dark, 0.04);
      ctx.fillRect(width * x, height * 0.14, width * 0.26, height * 0.6);
      ctx.fillStyle = rgba(COLORS.ink, 0.64);
      ctx.font = "600 12px IBM Plex Mono, monospace";
      ctx.textAlign = "left";
      ctx.fillText(lap.track.sectors[index], width * x + 10, height * 0.18);
    });

    strokeTrace(ctx, speedPoints, rgba(COLORS.blue, 0.92), 6);
    strokeTrace(ctx, brakePoints, rgba(COLORS.red, 0.92), 6);
    strokeTrace(ctx, deployPoints, rgba(COLORS.yellow, 0.94), 6);

    ctx.fillStyle = rgba(COLORS.ink, 0.78);
    ctx.font = "600 12px IBM Plex Mono, monospace";
    ctx.textAlign = "left";
    ctx.fillText("Speed", width * 0.08, height * 0.88);
    ctx.fillStyle = rgba(COLORS.blue, 0.92);
    ctx.fillRect(width * 0.15, height * 0.868, 18, 4);
    ctx.fillStyle = rgba(COLORS.ink, 0.78);
    ctx.fillText("Brake", width * 0.28, height * 0.88);
    ctx.fillStyle = rgba(COLORS.red, 0.92);
    ctx.fillRect(width * 0.35, height * 0.868, 18, 4);
    ctx.fillStyle = rgba(COLORS.ink, 0.78);
    ctx.fillText("Deploy", width * 0.48, height * 0.88);
    ctx.fillStyle = rgba(COLORS.yellow, 0.94);
    ctx.fillRect(width * 0.58, height * 0.868, 18, 4);
    ctx.fillStyle = rgba(COLORS.ink, 0.78);
    ctx.fillText("Total delta " + lap.totalDelta.toFixed(2) + " s", width * 0.72, height * 0.88);
  }

  function drawTopCar(ctx, x, y, size, color, alpha) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(size, size);

    ctx.fillStyle = rgba(COLORS.dark, 0.08);
    ctx.beginPath();
    ctx.ellipse(0.08, 0.58, 1.22, 0.22, 0, 0, Math.PI * 2);
    ctx.fill();

    const bodyGradient = ctx.createLinearGradient(-1.4, -0.2, 1.4, 0.3);
    bodyGradient.addColorStop(0, rgba(mixRgb(color, COLORS.paper, 0.24), alpha));
    bodyGradient.addColorStop(0.48, rgba(color, alpha));
    bodyGradient.addColorStop(1, rgba(mixRgb(color, COLORS.dark, 0.18), alpha));
    ctx.fillStyle = bodyGradient;
    ctx.beginPath();
    ctx.moveTo(-1.3, -0.12);
    ctx.lineTo(-0.94, -0.24);
    ctx.lineTo(-0.22, -0.22);
    ctx.lineTo(0.54, -0.16);
    ctx.lineTo(0.96, -0.12);
    ctx.lineTo(1.28, -0.06);
    ctx.lineTo(1.28, 0.06);
    ctx.lineTo(0.96, 0.12);
    ctx.lineTo(0.54, 0.16);
    ctx.lineTo(-0.22, 0.22);
    ctx.lineTo(-0.94, 0.24);
    ctx.lineTo(-1.3, 0.12);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = rgba(COLORS.red, alpha * 0.92);
    ctx.fillRect(-1.46, -0.1, 0.34, 0.2);
    ctx.fillRect(1.1, -0.18, 0.22, 0.36);
    ctx.fillStyle = rgba(COLORS.cyan, alpha * 0.74);
    ctx.fillRect(-0.18, -0.08, 1.28, 0.16);
    ctx.fillStyle = rgba(COLORS.dark, 0.12 + alpha * 0.08);
    ctx.fillRect(0.08, -0.06, 0.42, 0.12);

    ctx.fillStyle = rgba(COLORS.dark, 0.18);
    ctx.beginPath();
    ctx.ellipse(-0.56, -0.32, 0.18, 0.12, 0, 0, Math.PI * 2);
    ctx.ellipse(-0.56, 0.32, 0.18, 0.12, 0, 0, Math.PI * 2);
    ctx.ellipse(0.82, -0.36, 0.22, 0.14, 0, 0, Math.PI * 2);
    ctx.ellipse(0.82, 0.36, 0.22, 0.14, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = rgba(COLORS.paper, 0.22);
    ctx.beginPath();
    ctx.moveTo(-0.72, -0.08);
    ctx.lineTo(0.62, -0.1);
    ctx.lineTo(0.9, -0.06);
    ctx.lineTo(0.72, 0.02);
    ctx.lineTo(-0.62, 0.04);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = rgba(COLORS.dark, 0.3);
    ctx.lineWidth = 0.04;
    ctx.beginPath();
    ctx.moveTo(-0.14, -0.12);
    ctx.lineTo(0.24, -0.12);
    ctx.lineTo(0.34, -0.02);
    ctx.lineTo(0.34, 0.02);
    ctx.lineTo(0.24, 0.12);
    ctx.lineTo(-0.14, 0.12);
    ctx.stroke();

    ctx.fillStyle = rgba(COLORS.yellow, 0.22);
    ctx.beginPath();
    ctx.ellipse(-0.56, -0.32, 0.06, 0.04, 0, 0, Math.PI * 2);
    ctx.ellipse(-0.56, 0.32, 0.06, 0.04, 0, 0, Math.PI * 2);
    ctx.ellipse(0.82, -0.36, 0.07, 0.05, 0, 0, Math.PI * 2);
    ctx.ellipse(0.82, 0.36, 0.07, 0.05, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  function drawBarPair(ctx, x, y, left, right, leftLabel, rightLabel, leftColor, rightColor) {
    ctx.fillStyle = rgba(COLORS.dark, 0.08);
    ctx.beginPath();
    ctx.roundRect(x - 26, y, 18, 100, 10);
    ctx.roundRect(x + 12, y, 18, 100, 10);
    ctx.fill();
    ctx.fillStyle = rgba(leftColor, 0.88);
    ctx.beginPath();
    ctx.roundRect(x - 26, y + (1 - left) * 100, 18, left * 100, 10);
    ctx.fill();
    ctx.fillStyle = rgba(rightColor, 0.88);
    ctx.beginPath();
    ctx.roundRect(x + 12, y + (1 - right) * 100, 18, right * 100, 10);
    ctx.fill();
    ctx.fillStyle = rgba(COLORS.ink, 0.72);
    ctx.font = "600 12px IBM Plex Mono, monospace";
    ctx.textAlign = "center";
    ctx.fillText(leftLabel, x - 17, y + 120);
    ctx.fillText(rightLabel, x + 21, y + 120);
  }

  function applyTrackPreset(index) {
    const preset = TRACKS[index].preset;
    state.track = index;
    state.setupWing = preset.wing;
    state.setupRide = preset.ride;
    state.setupStiffness = preset.stiffness;
    state.setupBias = preset.bias;
    state.tyreCompound = preset.tyre;
    state.powerMode = preset.powerMode;
    state.powerBias = preset.powerBias;
    state.lapPlan = preset.lapPlan;

    if (controls.track) controls.track.set_selection(index);
    if (controls.setupPreset) controls.setupPreset.set_selection(index);
    if (controls.tyreCompound) controls.tyreCompound.set_selection(state.tyreCompound);
    if (controls.powerMode) controls.powerMode.set_selection(state.powerMode);
    if (controls.powerBias) controls.powerBias.set_selection(state.powerBias);
    if (controls.lapPlan) controls.lapPlan.set_selection(state.lapPlan);
    if (controls.setupWing) controls.setupWing.set_value(state.setupWing);
    if (controls.setupRide) controls.setupRide.set_value(state.setupRide);
    if (controls.setupStiffness) controls.setupStiffness.set_value(state.setupStiffness);
    if (controls.setupBias) controls.setupBias.set_value(state.setupBias);

    updateCaptions();
    repaintAll();
  }

  function bindControls() {
    controls.overview = new SegmentedControl(document.getElementById("f1_overview_seg0"), function (index) {
      state.component = index;
      updateCaptions();
      repaintAll();
    }, COMPONENTS.map(function (item) { return item.label; }));

    controls.airflowSpeed = new Slider(document.getElementById("f1_airflow_sl0"), function (value) {
      state.airflowSpeed = value;
      updateCaptions();
      repaintAll();
    }, undefined, state.airflowSpeed);
    controls.airflowWing = new Slider(document.getElementById("f1_airflow_sl1"), function (value) {
      state.airflowWing = value;
      updateCaptions();
      repaintAll();
    }, undefined, state.airflowWing);
    controls.airflowRide = new Slider(document.getElementById("f1_airflow_sl2"), function (value) {
      state.airflowRide = value;
      updateCaptions();
      repaintAll();
    }, undefined, state.airflowRide);

    controls.frontGap = new Slider(document.getElementById("f1_front_sl0"), function (value) {
      state.frontGap = value;
      updateCaptions();
      repaintAll();
    }, undefined, state.frontGap);
    controls.frontFlap = new Slider(document.getElementById("f1_front_sl1"), function (value) {
      state.frontFlap = value;
      updateCaptions();
      repaintAll();
    }, undefined, state.frontFlap);
    controls.frontDemand = new Slider(document.getElementById("f1_front_sl2"), function (value) {
      state.frontDemand = value;
      updateCaptions();
      repaintAll();
    }, undefined, state.frontDemand);

    controls.floorRide = new Slider(document.getElementById("f1_floor_sl0"), function (value) {
      state.floorRide = value;
      updateCaptions();
      repaintAll();
    }, undefined, state.floorRide);
    controls.floorPitch = new Slider(document.getElementById("f1_floor_sl1"), function (value) {
      state.floorPitch = value;
      updateCaptions();
      repaintAll();
    }, undefined, state.floorPitch);

    controls.rearMode = new SegmentedControl(document.getElementById("f1_rear_seg0"), function (index) {
      state.rearDrc = index;
      updateCaptions();
      repaintAll();
    }, ["DRS closed", "DRS open"]);
    controls.rearWing = new Slider(document.getElementById("f1_rear_sl0"), function (value) {
      state.rearWing = value;
      updateCaptions();
      repaintAll();
    }, undefined, state.rearWing);
    controls.rearSpeed = new Slider(document.getElementById("f1_rear_sl1"), function (value) {
      state.rearSpeed = value;
      updateCaptions();
      repaintAll();
    }, undefined, state.rearSpeed);

    controls.chassisStiffness = new Slider(document.getElementById("f1_chassis_sl0"), function (value) {
      state.chassisStiffness = value;
      updateCaptions();
      repaintAll();
    }, undefined, state.chassisStiffness);
    controls.chassisKerb = new Slider(document.getElementById("f1_chassis_sl1"), function (value) {
      state.chassisKerb = value;
      updateCaptions();
      repaintAll();
    }, undefined, state.chassisKerb);
    controls.chassisBrake = new Slider(document.getElementById("f1_chassis_sl2"), function (value) {
      state.chassisBrake = value;
      updateCaptions();
      repaintAll();
    }, undefined, state.chassisBrake);

    controls.powerMode = new SegmentedControl(document.getElementById("f1_power_seg0"), function (index) {
      state.powerMode = index;
      updateCaptions();
      repaintAll();
    }, POWER_MODES.map(function (item) { return item.label; }));
    controls.powerBias = new SegmentedControl(document.getElementById("f1_power_seg1"), function (index) {
      state.powerBias = index;
      updateCaptions();
      repaintAll();
    }, POWER_BIASES.map(function (item) { return item.label; }));

    controls.tyreCompound = new SegmentedControl(document.getElementById("f1_tyre_seg0"), function (index) {
      state.tyreCompound = index;
      updateCaptions();
      repaintAll();
    }, TYRES.map(function (item) { return item.label; }));
    controls.tyreTemp = new Slider(document.getElementById("f1_tyre_sl0"), function (value) {
      state.tyreTemp = value;
      updateCaptions();
      repaintAll();
    }, undefined, state.tyreTemp);
    controls.tyreLoad = new Slider(document.getElementById("f1_tyre_sl1"), function (value) {
      state.tyreLoad = value;
      updateCaptions();
      repaintAll();
    }, undefined, state.tyreLoad);
    controls.tyreStint = new Slider(document.getElementById("f1_tyre_sl2"), function (value) {
      state.tyreStint = value;
      updateCaptions();
      repaintAll();
    }, undefined, state.tyreStint);

    controls.brakeSpeed = new Slider(document.getElementById("f1_brake_sl0"), function (value) {
      state.brakeSpeed = value;
      updateCaptions();
      repaintAll();
    }, undefined, state.brakeSpeed);
    controls.brakeBias = new Slider(document.getElementById("f1_brake_sl1"), function (value) {
      state.brakeBias = value;
      updateCaptions();
      repaintAll();
    }, undefined, state.brakeBias);
    controls.brakeRecovery = new Slider(document.getElementById("f1_brake_sl2"), function (value) {
      state.brakeRecovery = value;
      updateCaptions();
      repaintAll();
    }, undefined, state.brakeRecovery);

    controls.track = new SegmentedControl(document.getElementById("f1_track_seg0"), function (index) {
      if (state.track !== index) {
        applyTrackPreset(index);
      }
    }, TRACKS.map(function (item) { return item.label; }));

    controls.raceMode = new SegmentedControl(document.getElementById("f1_race_seg0"), function (index) {
      state.raceDrc = index;
      updateCaptions();
      repaintAll();
    }, ["No DRS", "DRS open"]);
    controls.raceGap = new Slider(document.getElementById("f1_race_sl0"), function (value) {
      state.raceGap = value;
      updateCaptions();
      repaintAll();
    }, undefined, state.raceGap);
    controls.raceDeploy = new Slider(document.getElementById("f1_race_sl1"), function (value) {
      state.raceDeploy = value;
      updateCaptions();
      repaintAll();
    }, undefined, state.raceDeploy);
    controls.raceBrake = new Slider(document.getElementById("f1_race_sl2"), function (value) {
      state.raceBrake = value;
      updateCaptions();
      repaintAll();
    }, undefined, state.raceBrake);

    controls.setupPreset = new SegmentedControl(document.getElementById("f1_setup_seg0"), function (index) {
      if (state.track !== index) {
        applyTrackPreset(index);
      }
    }, TRACKS.map(function (item) { return item.label; }));
    controls.setupWing = new Slider(document.getElementById("f1_setup_sl0"), function (value) {
      state.setupWing = value;
      updateCaptions();
      repaintAll();
    }, undefined, state.setupWing);
    controls.setupRide = new Slider(document.getElementById("f1_setup_sl1"), function (value) {
      state.setupRide = value;
      updateCaptions();
      repaintAll();
    }, undefined, state.setupRide);
    controls.setupStiffness = new Slider(document.getElementById("f1_setup_sl2"), function (value) {
      state.setupStiffness = value;
      updateCaptions();
      repaintAll();
    }, undefined, state.setupStiffness);
    controls.setupBias = new Slider(document.getElementById("f1_setup_sl3"), function (value) {
      state.setupBias = value;
      updateCaptions();
      repaintAll();
    }, undefined, state.setupBias);

    controls.weatherMode = new SegmentedControl(document.getElementById("f1_weather_seg0"), function (index) {
      state.weatherMode = index;
      updateCaptions();
      repaintAll();
    }, WEATHER_MODES.map(function (item) { return item.label; }));
    controls.weatherTemp = new Slider(document.getElementById("f1_weather_sl0"), function (value) {
      state.weatherTemp = value;
      updateCaptions();
      repaintAll();
    }, undefined, state.weatherTemp);
    controls.weatherLaps = new Slider(document.getElementById("f1_weather_sl1"), function (value) {
      state.weatherLaps = value;
      updateCaptions();
      repaintAll();
    }, undefined, state.weatherLaps);
    controls.weatherRain = new Slider(document.getElementById("f1_weather_sl2"), function (value) {
      state.weatherRain = value;
      updateCaptions();
      repaintAll();
    }, undefined, state.weatherRain);

    controls.pitAge = new Slider(document.getElementById("f1_pit_sl0"), function (value) {
      state.pitAge = value;
      updateCaptions();
      repaintAll();
    }, undefined, state.pitAge);
    controls.pitTraffic = new Slider(document.getElementById("f1_pit_sl1"), function (value) {
      state.pitTraffic = value;
      updateCaptions();
      repaintAll();
    }, undefined, state.pitTraffic);
    controls.pitSafety = new Slider(document.getElementById("f1_pit_sl2"), function (value) {
      state.pitSafety = value;
      updateCaptions();
      repaintAll();
    }, undefined, state.pitSafety);

    controls.lapPlan = new SegmentedControl(document.getElementById("f1_lap_seg0"), function (index) {
      state.lapPlan = index;
      updateCaptions();
      repaintAll();
    }, LAP_PLANS.map(function (item) { return item.label; }));
  }

  function initScenes() {
    makeScene("f1_overview", { animated: true, arcball: true, rotation: state.overviewRotation }, drawOverviewScene);
    makeScene("f1_airflow", { animated: true }, drawAirflowScene);
    makeScene("f1_front", { animated: true }, drawFrontScene);
    makeScene("f1_floor", { animated: true }, drawFloorScene);
    makeScene("f1_rear", { animated: true }, drawRearScene);
    makeScene("f1_chassis", { animated: true }, drawChassisScene);
    makeScene("f1_power", { animated: true }, drawPowerScene);
    makeScene("f1_tyre", { animated: true }, drawTyreScene);
    makeScene("f1_brake", { animated: true }, drawBrakeScene);
    makeScene("f1_track", { animated: false }, drawTrackScene);
    makeScene("f1_race", { animated: true }, drawRaceScene);
    makeScene("f1_setup", { animated: false }, drawSetupScene);
    makeScene("f1_weather", { animated: false }, drawWeatherScene);
    makeScene("f1_pit", { animated: false }, drawPitScene);
    makeScene("f1_lap", { animated: false }, drawLapScene);
  }

  function init() {
    bindControls();
    initScenes();
    applyTrackPreset(0);
    updateCaptions();
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      scenes.forEach((scene) => scene.maybeDraw(0));
    } else {
      window.requestAnimationFrame(loop);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
