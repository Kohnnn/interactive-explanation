self.onmessage = (event) => {
  const data = event.data || {};
  const samples = Array.isArray(data.samples) || ArrayBuffer.isView(data.samples)
    ? Array.from(data.samples)
    : [];
  const canvasWidth = Math.max(1, Number(data.canvasWidth) || 1);
  const requestedPoints = Array.isArray(data.samplesToDraw)
    ? data.samplesToDraw.length
    : Math.max(1, Number(data.samplesToDraw) || canvasWidth);
  const pointCount = Math.max(1, Math.min(canvasWidth, requestedPoints));

  let peak = 1;
  if (data.normalize) {
    for (const sample of samples) {
      const magnitude = Math.abs(Number(sample) || 0);
      if (magnitude > peak) {
        peak = magnitude;
      }
    }
  }

  const waveform = [];
  for (let index = 0; index < pointCount; index += 1) {
    const sampleIndex = Math.min(
      samples.length - 1,
      Math.floor((index / Math.max(1, pointCount - 1)) * Math.max(0, samples.length - 1)),
    );
    const sample = samples[sampleIndex] || 0;
    const normalized = peak > 0 ? sample / peak : sample;
    waveform.push(normalized);
  }

  if (waveform.length === 0) {
    waveform.push(0);
  }

  self.postMessage({ waveform });
};
