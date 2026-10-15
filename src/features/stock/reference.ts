// Génération des références article : PREFIXE-MOT-001
// ex. catégorie "VIDEOSURVEILLANCE" + "Caméra IP dôme 4MP" → "VID-CAMERA-001"

const STOP_WORDS = new Set(["DE", "DU", "DES", "LA", "LE", "LES", "ET", "EN", "POUR", "AVEC"]);

const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim();

export const normalizeReference = (value: string) => normalize(value).replace(/\s+/g, "-");

export function referencePrefix(categorie: string, designation: string) {
  const cat = normalize(categorie).replace(/\s+/g, "").slice(0, 3) || "ART";
  const mot = normalize(designation)
    .split(" ")
    .find((word) => word.length > 1 && !STOP_WORDS.has(word))
    ?.slice(0, 6);
  return mot ? `${cat}-${mot}` : cat;
}

/** Prochaine référence libre pour ce préfixe, en tenant compte des références existantes. */
export function nextReference(prefix: string, existing: Iterable<string>) {
  const taken = new Set([...existing].map((ref) => ref.toUpperCase()));
  const pattern = new RegExp(`^${prefix.replace(/[-]/g, "\\-")}-(\\d+)$`);
  let max = 0;
  taken.forEach((ref) => {
    const match = ref.match(pattern);
    if (match) max = Math.max(max, Number(match[1]));
  });
  let n = max + 1;
  let candidate = `${prefix}-${String(n).padStart(3, "0")}`;
  while (taken.has(candidate)) candidate = `${prefix}-${String(++n).padStart(3, "0")}`;
  return candidate;
}
