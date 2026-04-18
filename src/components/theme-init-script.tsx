import { themePresets } from "@/lib/theme-presets";

/**
 * Inline script that runs before React hydration to restore
 * saved theme preset colors and avoid a flash of wrong colors.
 */
export function ThemeInitScript() {
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
    var preset = localStorage.getItem('selfstack-theme-preset') || 'default';
    var custom = localStorage.getItem('selfstack-custom-colors');
    var isDark = document.documentElement.classList.contains('dark');
    var mode = isDark ? 'dark' : 'light';
    var colors = {};
    if (preset !== 'default' && presets[preset]) {
      var p = presets[preset][mode];
      for (var k in p) colors[k] = p[k];
    }
    if (custom) {
      try {
        var c = JSON.parse(custom);
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
