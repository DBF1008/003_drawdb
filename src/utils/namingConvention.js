/**
 * Split a string into words, handling camelCase boundaries,
 * consecutive uppercase (e.g. "HTMLParser"), underscores, and digits.
 */
function splitWords(str) {
  if (!str) return [];
  return str.match(/[A-Z]+(?=[A-Z][a-z])|[A-Z]?[a-z]+|[A-Z]+|[0-9]+/g) || [];
}

export function toSnakeCase(str) {
  return splitWords(str)
    .map((w) => w.toLowerCase())
    .join("_");
}

export function toCamelCase(str) {
  const words = splitWords(str);
  if (words.length === 0) return str;
  return words
    .map((w, i) =>
      i === 0
        ? w.toLowerCase()
        : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase(),
    )
    .join("");
}

export function convertName(str, convention) {
  switch (convention) {
    case "snake_case":
      return toSnakeCase(str);
    case "camelCase":
      return toCamelCase(str);
    default:
      return str;
  }
}
