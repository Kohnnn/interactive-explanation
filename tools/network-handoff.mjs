export function resourceUrl(value) {
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol)) return `${url.protocol}[redacted]`;
    url.username = "";
    url.password = "";
    url.hash = "";
    url.searchParams.sort();
    return url.href;
  } catch { return "[invalid URL]"; }
}

export function diagnosticUrl(value) {
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol)) return `${url.protocol}[redacted]`;
    return `${url.origin}${url.pathname}`;
  } catch { return "[invalid URL]"; }
}

function nativeEditorPredicate() {
  const scope = window.angular?.element(document.body).scope();
  return Boolean(document.readyState === "complete" && document.querySelector(".matrixInput textarea") && scope?.validTransitionMatrix === true && Array.isArray(scope.states) && scope.states.length > 0 && document.querySelector("svg"));
}

function validatedNativeFinal(events, request, final) {
  const latest = events.filter(event => event.frameId === request.frameId && event.type === "nativeeditorvalidated").at(-1);
  const completed = events.find(event => event.type === "requestfinished" && event.requestId === request.requestId && event.seq > request.seq);
  const ready = events.filter(event => event.type === "nativeeditorready" && event.requestId === request.requestId).at(-1);
  const navigation = events.find(event => event.type === "framenavigated" && event.frameId === request.frameId && event.url === final && event.seq > request.seq);
  return Boolean(completed && navigation && latest?.requestId === request.requestId && latest.url === final && latest.connected === true && latest.nativeReady === true && latest.seq > completed.seq &&
    events.some(event => event.type === "response" && event.requestId === request.requestId && event.status === 200) &&
    events.some(event => event.type === "framenavigated" && event.frameId === request.frameId && event.url === final && event.seq > request.seq) &&
    !events.some(event => event.frameId === request.frameId && event.seq > request.seq && (event.type === "framedetached" || (event.type === "framenavigated" && (event.url !== final || event.seq > (ready?.seq ?? navigation.seq))) || (event.type === "request" && event.navigation && event.requestId !== request.requestId))));
}

export function nativeValidationFailures(events, baseUrl) {
  const final = `${baseUrl}markov-chains/playground/playground.html`;
  const targets = events.filter(event => event.type === "request" && event.navigation && event.childFrame && event.url === final);
  const frames = new Set(targets.map(event => event.frameId));
  return [...frames].filter(frameId => events.some(event => ["pageerror", "console-error"].includes(event.type)) || !validatedNativeFinal(events, targets.filter(event => event.frameId === frameId).at(-1), final)).map(frameId => `nativeeditor-not-ready: ${frameId}`);
}

export function classifyNetwork(events, baseUrl) {
  const directory = `${baseUrl}markov-chains/playground/`;
  const final = `${directory}playground.html`;
  return events.filter((event) => event.type === "requestfailed").map((failure) => {
    const subsequent = events.filter((event) => event.type === "request" && event.seq > failure.seq && event.frameId === failure.frameId && event.navigation);
    const next = subsequent.find((event) => event.url !== directory);
    const intermediates = subsequent.filter((event) => event.seq < next?.seq);
    const directoryOnly = intermediates.every((event) => event.url === directory && events.some((end) => end.type === "requestfinished" && end.requestId === event.requestId));
    const completed = next && events.find((event) => event.type === "requestfinished" && event.requestId === next.requestId && event.seq > next.seq);
    const response = next && events.find((event) => event.type === "response" && event.requestId === next.requestId && event.status === 200);
    const navigation = completed && events.find((event) => event.type === "framenavigated" && event.frameId === failure.frameId && event.url === final && event.seq > next.seq);
    const ready = completed && events.find((event) => event.type === "nativeeditorready" && event.requestId === next.requestId && event.frameId === failure.frameId && event.url === final && event.seq > completed.seq);
    const finalDocument = ready && !events.some((event) => event.frameId === failure.frameId && event.seq > next.seq && ((event.type === "request" && event.navigation && event.requestId !== next.requestId) || (event.type === "framenavigated" && event.url !== final)) && event.seq < ready.seq);
    const nativeError = events.some((event) => ["pageerror", "console-error"].includes(event.type));
    const finalRequest = subsequent.filter(event => event.url === final).at(-1);
    const checkpoint = next && events.find(event => event.type === "nativeeditorvalidated" && event.requestId === next.requestId);
    const validated = next && (validatedNativeFinal(events, next, final) || (checkpoint && finalRequest !== next && validatedNativeFinal(events.filter(event => event.seq <= checkpoint.seq), next, final) && validatedNativeFinal(events, finalRequest, final)));
    const known = Boolean(failure.requestId && failure.frameId) && directoryOnly && failure.url === directory && failure.error === "net::ERR_ABORTED" && failure.resourceType === "document" && failure.navigation && failure.childFrame && next?.url === final && next.resourceType === "document" && response && navigation && ready && finalDocument && validated && !nativeError;
    const embed = events.find((event) => event.type === "musicmapembedvalidated" && event.frameId === failure.frameId && event.seq > failure.seq);
    const validatedYouTubeQoe = failure.url === "https://www.youtube-nocookie.com/api/stats/qoe" &&
      failure.error === "net::ERR_ABORTED" && failure.resourceType === "fetch" && !failure.navigation && failure.childFrame &&
      embed?.url === "https://www.youtube-nocookie.com/embed/videoseries" && embed.childFrame === true && embed.connected === true && embed.ready === true &&
      !events.some((event) => event.frameId === failure.frameId && event.seq > embed.seq &&
        (event.type === "framedetached" || event.type === "framenavigated" || (event.type === "request" && event.navigation)));
    return {
      requestId: failure.requestId,
      frameId: failure.frameId,
      classification: known ? "validated-markov-child-handoff" : validatedYouTubeQoe ? "validated-youtube-qoe-cancellation" : "unknown-failure",
      url: failure.url,
      error: failure.error || "unknown-error",
      resourceType: failure.resourceType || "unknown-resource",
      navigation: Boolean(failure.navigation),
      childFrame: Boolean(failure.childFrame),
    };
  });
}

export function captureNetwork(page, baseUrl, events = []) {
  const requests = new Map();
  const frames = new Map();
  const pending = new Set();
  const frameId = (frame) => {
    if (!frames.has(frame)) frames.set(frame, `f${frames.size + 1}`);
    return frames.get(frame);
  };
  const emit = (type, data) => events.push({ type, seq: events.length + 1, at: Date.now(), ...data });
  const details = (request) => {
    if (!requests.has(request)) {
      let frame;
      try { frame = request.frame(); } catch {}
      requests.set(request, { requestId: `r${requests.size + 1}`, frameId: frame ? frameId(frame) : null, childFrame: Boolean(frame?.parentFrame()), url: resourceUrl(request.url()), resourceType: request.resourceType(), navigation: request.isNavigationRequest(), method: request.method() });
    }
    return requests.get(request);
  };
  page.on("request", (request) => emit("request", details(request)));
  page.on("response", (response) => emit("response", { ...details(response.request()), status: response.status() }));
  page.on("requestfailed", (request) => emit("requestfailed", { ...details(request), error: request.failure()?.errorText }));
  page.on("framenavigated", (frame) => emit("framenavigated", { frameId: frameId(frame), childFrame: Boolean(frame.parentFrame()), url: resourceUrl(frame.url()) }));
  page.on("framedetached", (frame) => emit("framedetached", { frameId: frameId(frame), url: resourceUrl(frame.url()) }));
  page.on("requestfinished", (request) => {
    const data = details(request);
    emit("requestfinished", data);
    if (!data.navigation || data.url !== `${baseUrl}markov-chains/playground/playground.html`) return;
    const frame = request.frame();
    const task = (async () => {
      try {
        await frame.waitForFunction(nativeEditorPredicate, null, { timeout: 15000 });
        const latest = [...requests.values()].filter((entry) => entry.frameId === data.frameId && entry.navigation).at(-1);
        if (resourceUrl(frame.url()) === data.url && latest?.requestId === data.requestId) emit("nativeeditorready", data);
      } catch { emit("nativeeditor-not-ready", data); }
    })();
    pending.add(task);
    task.finally(() => pending.delete(task));
  });
  page.on("pageerror", () => emit("pageerror", { message: "Native page error" }));
  page.on("console", (message) => {
    if (["error", "warning"].includes(message.type())) emit(`console-${message.type()}`, { message: `Native console ${message.type()}` });
  });
  const validateMusicmapEmbed = (frame) => {
    const id = frames.get(frame);
    if (!id) return;
    emit("musicmapembedvalidated", {
      frameId: id,
      childFrame: Boolean(frame.parentFrame()),
      url: resourceUrl(frame.url()),
      connected: !frame.isDetached(),
      ready: true,
    });
  };
  const ready = async () => {
    await Promise.all([...pending]);
    for (const [frame, id] of frames) {
      const target = [...requests.values()].filter(entry => entry.frameId === id && entry.childFrame && entry.navigation && entry.url === `${baseUrl}markov-chains/playground/playground.html`).at(-1);
      if (!target) continue;
      let nativeReady = false;
      try { nativeReady = await frame.evaluate(nativeEditorPredicate); } catch {}
      emit("nativeeditorvalidated", { ...target, url: resourceUrl(frame.url()), connected: !frame.isDetached(), nativeReady });
    }
  };
  return { events, ready, validateMusicmapEmbed, classify: () => classifyNetwork(events, baseUrl), nativeFailures: () => nativeValidationFailures(events, baseUrl) };
}
