import { themePresets } from "@/lib/theme-presets";

/**
 * Inline script that runs before React hydration to restore the user's
 * saved theme preset (from the DB via the server layout) and avoid a flash
 * of wrong colors. Values are injected as props, not read from localStorage.
 */
export function ThemeInitScript({
  preset = "default",
  customColors = null,
}: {
  preset?: string;
  customColors?: string | null;
}) {
  // Serialize presets as minimal JSON for inline script
  const presetsJson = JSON.stringify(
    Object.fromEntries(
      Object.entries(themePresets).map(([key, p]) => [key, p.colors]),
    ),
  );

  const script = `
(function() {
  try {
    var presets = ${presetsJson};
    var preset = ${JSON.stringify(preset)};
    var customRaw = ${JSON.stringify(customColors)};
    var isDark = document.documentElement.classList.contains('dark');
    var mode = isDark ? 'dark' : 'light';
    var colors = {};
    if (preset && preset !== 'default' && presets[preset]) {
      var p = presets[preset][mode];
      for (var k in p) colors[k] = p[k];
    }
    if (customRaw) {
      try {
        var c = JSON.parse(customRaw);
        for (var k2 in c) colors[k2] = c[k2];
      } catch(e) {}
    }
    var r = document.documentElement;
    for (var k3 in colors) r.style.setProperty('--' + k3, colors[k3]);
  } catch(e) {}
})();
`;
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
