(function () {
  "use strict";

  var NAME = "Text to encode in the QR code";

  function label() {
    var inputs = document.querySelectorAll("input[type='text']");
    for (var i = 0; i < inputs.length; i++) {
      var input = inputs[i];
      if ((input.getAttribute("aria-label") || "").trim()) continue;
      if ((input.getAttribute("aria-labelledby") || "").trim()) continue;
      if (input.closest("label")) continue;
      input.setAttribute("aria-label", NAME);
    }
  }

  function start() {
    label();
    if (typeof MutationObserver !== "function") return;
    new MutationObserver(function () {
      label();
    }).observe(document.documentElement, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();

