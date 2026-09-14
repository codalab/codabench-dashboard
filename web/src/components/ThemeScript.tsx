// Runs before paint: dark navy is the default (see globals.css), so this
// only needs to apply a saved "light" override, avoiding a flash where the
// page starts dark then flips light after hydration.
const THEME_SCRIPT = `
(function () {
  try {
    if (localStorage.getItem("theme") === "light") {
      document.documentElement.setAttribute("data-theme", "light");
    }
  } catch (e) {}
})();
`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />;
}
