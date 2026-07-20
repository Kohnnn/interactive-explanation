let theme;

try {
  theme = localStorage.getItem("ie-theme");
} catch {}

if (theme === "dark" || theme === "light") {
  document.documentElement.dataset.theme = theme;
}
