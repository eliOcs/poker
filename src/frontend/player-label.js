/**
 * @param {string|undefined|null} name
 * @param {string|undefined|null} id
 * @param {string} [fallback]
 * @returns {string}
 */
export function formatPlayerLabel(name, id, fallback = "") {
  if (name) return name;
  if (id) return `#${id}`;
  return fallback;
}
