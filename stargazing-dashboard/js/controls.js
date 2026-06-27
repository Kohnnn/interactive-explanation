/*
 * StargazingControls frozen API.
 * Public shape on window.StargazingControls:
 * createLookControls(canvas, state) -> { dispose() }.
 * Pointer drag writes look.azDeg/look.altDeg only. Altitude clamps to
 * [-90, 90] for full-sky safety; horizon-only renderers may clamp later.
 */
(function () {
  "use strict";

  const DRAG_DEGREES_PER_PIXEL = 0.15;
  const KEY_STEP_DEGREES = 3;
  const MIN_ALT_DEGREES = -90;
  const MAX_ALT_DEGREES = 90;

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function wrapDegrees(value) {
    return ((value % 360) + 360) % 360;
  }

  function noopControls() {
    return {
      dispose() {},
    };
  }

  function canCreateControls(canvas, state) {
    return Boolean(
      canvas
        && typeof canvas.addEventListener === "function"
        && typeof canvas.removeEventListener === "function"
        && state
        && typeof state.getState === "function"
        && typeof state.setState === "function",
    );
  }

  function getCurrentLook(state) {
    const currentState = state.getState();
    const look = currentState && currentState.look ? currentState.look : {};
    const azDeg = Number.isFinite(look.azDeg) ? look.azDeg : 0;
    const altDeg = Number.isFinite(look.altDeg) ? look.altDeg : 30;

    return { azDeg, altDeg };
  }

  function writeLook(state, azDeg, altDeg) {
    state.setState({
      look: {
        azDeg: wrapDegrees(azDeg),
        altDeg: clamp(altDeg, MIN_ALT_DEGREES, MAX_ALT_DEGREES),
      },
    });
  }

  function createListenerBag() {
    const listeners = [];

    return {
      add(target, type, handler, options) {
        target.addEventListener(type, handler, options);
        listeners.push({ target, type, handler, options });
      },
      removeAll() {
        for (const listener of listeners) {
          listener.target.removeEventListener(
            listener.type,
            listener.handler,
            listener.options,
          );
        }
        listeners.length = 0;
      },
    };
  }

  function createLookControls(canvas, state) {
    if (!canCreateControls(canvas, state)) {
      return noopControls();
    }

    const listenerBag = createListenerBag();
    let disposed = false;
    let activePointerId = null;
    let lastClientX = 0;
    let lastClientY = 0;

    function handlePointerDown(event) {
      if (disposed || activePointerId !== null) {
        return;
      }

      activePointerId = event.pointerId;
      lastClientX = event.clientX;
      lastClientY = event.clientY;

      if (typeof canvas.setPointerCapture === "function") {
        canvas.setPointerCapture(activePointerId);
      }

      event.preventDefault();
    }

    function handlePointerMove(event) {
      if (disposed || event.pointerId !== activePointerId) {
        return;
      }

      const dx = event.clientX - lastClientX;
      const dy = event.clientY - lastClientY;
      lastClientX = event.clientX;
      lastClientY = event.clientY;

      const look = getCurrentLook(state);
      writeLook(
        state,
        look.azDeg + dx * DRAG_DEGREES_PER_PIXEL,
        look.altDeg - dy * DRAG_DEGREES_PER_PIXEL,
      );

      event.preventDefault();
    }

    function endDrag(event) {
      if (event.pointerId !== activePointerId) {
        return;
      }

      if (typeof canvas.releasePointerCapture === "function") {
        canvas.releasePointerCapture(activePointerId);
      }

      activePointerId = null;
    }

    function handleKeyDown(event) {
      if (disposed) {
        return;
      }

      const look = getCurrentLook(state);
      let nextAzDeg = look.azDeg;
      let nextAltDeg = look.altDeg;

      switch (event.key) {
        case "ArrowLeft":
          nextAzDeg -= KEY_STEP_DEGREES;
          break;
        case "ArrowRight":
          nextAzDeg += KEY_STEP_DEGREES;
          break;
        case "ArrowUp":
          nextAltDeg += KEY_STEP_DEGREES;
          break;
        case "ArrowDown":
          nextAltDeg -= KEY_STEP_DEGREES;
          break;
        default:
          return;
      }

      writeLook(state, nextAzDeg, nextAltDeg);
      event.preventDefault();
    }

    listenerBag.add(canvas, "pointerdown", handlePointerDown, { passive: false });
    listenerBag.add(canvas, "pointermove", handlePointerMove, { passive: false });
    listenerBag.add(canvas, "pointerup", endDrag, { passive: true });
    listenerBag.add(canvas, "pointercancel", endDrag, { passive: true });
    listenerBag.add(canvas, "lostpointercapture", endDrag, { passive: true });
    listenerBag.add(canvas, "keydown", handleKeyDown, { passive: false });

    return {
      dispose() {
        if (disposed) {
          return;
        }

        disposed = true;
        listenerBag.removeAll();
        activePointerId = null;
      },
    };
  }

  const API = {
    createLookControls,
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = API;
  }

  if (typeof window !== "undefined") {
    window.StargazingControls = API;
  }
}());
