/**
 * @param {string|undefined|undefined} name
 * @param {string|undefined|undefined} id
 * @param {string} [fallback]
 * @returns {string}
 */
export function formatPlayerLabel(name, id, fallback = "") {
  if (name) return name;
  if (id) return `#${id}`;
  return fallback;
}
