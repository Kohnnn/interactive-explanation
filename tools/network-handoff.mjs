export function resourceUrl(value) {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? `${url.origin}${url.pathname}` : `${url.protocol}[redacted]`;
  } catch { return "[invalid URL]"; }
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
    const known = Boolean(failure.requestId && failure.frameId) && directoryOnly && failure.url === directory && failure.error === "net::ERR_ABORTED" && failure.resourceType === "document" && failure.navigation && failure.childFrame && next?.url === final && next.resourceType === "document" && response && navigation && ready && finalDocument && !nativeError;
    return { requestId: failure.requestId, frameId: failure.frameId, classification: known ? "validated-markov-child-handoff" : "unknown-failure" };
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
  page.on("requestfinished", (request) => {
    const data = details(request);
    emit("requestfinished", data);
    if (!data.navigation || data.url !== `${baseUrl}markov-chains/playground/playground.html`) return;
    const frame = request.frame();
    const task = (async () => {
      try {
        await frame.waitForFunction(() => {
          const scope = window.angular?.element(document.body).scope();
          return document.readyState === "complete" && document.querySelector(".matrixInput textarea") && scope?.validTransitionMatrix === true && Array.isArray(scope.states) && scope.states.length > 0 && document.querySelector("svg");
        }, null, { timeout: 15000 });
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
  return { events, ready: () => Promise.all([...pending]), classify: () => classifyNetwork(events, baseUrl) };
}
