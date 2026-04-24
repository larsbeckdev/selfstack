import fs from "node:fs";

function extractKeys(file) {
  const content = fs.readFileSync(file, "utf8");
  const keys = [];
  const re = /^\s*"([^"]+)":/gm;
  let m;
  while ((m = re.exec(content))) keys.push(m[1]);
  return keys;
}

function extractEntries(file) {
  const content = fs.readFileSync(file, "utf8");
  const entries = {};
  // Match "key": "value" (values may span multiple lines joined by +)
  const re = /"([^"]+)":\s*((?:"(?:[^"\\]|\\.)*"|\s|\+)+),?/g;
  let m;
  while ((m = re.exec(content))) {
    const key = m[1];
    // Extract just first string literal of the value
    const vm = m[2].match(/"((?:[^"\\]|\\.)*)"/);
    if (vm) entries[key] = vm[1];
  }
  return entries;
}

const de = extractEntries("src/lib/i18n/de.ts");
const en = extractEntries("src/lib/i18n/en.ts");

const deKeys = Object.keys(de);
const enKeys = Object.keys(en);

const missingInEn = deKeys.filter((k) => !(k in en));
const missingInDe = enKeys.filter((k) => !(k in de));

console.log("DE count:", deKeys.length);
console.log("EN count:", enKeys.length);
console.log("\nKeys in DE but missing in EN:");
missingInEn.forEach((k) => console.log("  " + k));
console.log("\nKeys in EN but missing in DE:");
missingInDe.forEach((k) => console.log("  " + k));

// Detect English strings still in DE (heuristic: contains space + common English words)
console.log("\nPotentially untranslated in DE (looks English):");
const englishWords =
  /\b(the|and|or|please|click|with|from|settings|user|edit|delete|save|cancel|add|remove|new|here|enter|select|login|logout|password|email|created|updated)\b/i;
for (const [k, v] of Object.entries(de)) {
  if (englishWords.test(v) && !/[äöüßÄÖÜ]/.test(v)) {
    // Skip if value is same as EN and very short or single word
    if (v.length < 4) continue;
    if (v === en[k]) {
      console.log(`  ${k}: "${v}" (same as EN)`);
    }
  }
}

// Detect German words in EN
console.log("\nPotentially untranslated in EN (looks German):");
for (const [k, v] of Object.entries(en)) {
  if (
    /[äöüßÄÖÜ]/.test(v) ||
    /\b(der|die|das|und|oder|bitte|wird|werden|nicht|kein|mit|für|auf|aus|zu|zum|zur|ein|eine|einen|Benutzer|Passwort|Einstellungen|löschen|speichern|bearbeiten|hinzufügen)\b/.test(
      v,
    )
  ) {
    console.log(`  ${k}: "${v}"`);
  }
}
