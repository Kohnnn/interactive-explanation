// Pre-paint theme init, aligned with the Keith's Atheneum (Quartz) theme model:
//   - attribute: saved-theme on <html>
//   - storage key: localStorage["theme"]
//   - default: prefers-color-scheme
// Keeping these identical lets a visitor's light/dark choice carry across both
// surfaces without a flash of the wrong theme.
(function () {
  try {
    var userPref = window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
    var stored = null;
    try {
      stored = window.localStorage.getItem("theme");
    } catch (storageError) {
      stored = null;
    }
    var theme = stored === "dark" || stored === "light" ? stored : userPref;
    document.documentElement.setAttribute("saved-theme", theme);
  } catch (error) {
    // Theme application is non-critical chrome behavior.
  }
})();
