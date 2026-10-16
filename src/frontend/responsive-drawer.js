/**
 * @param {import("lit").ReactiveControllerHost & {
 *   _drawerOpen: boolean,
 *   _mql?: MediaQueryList,
 * }} host
 * @param {string} query
 * @returns {() => void} Toggles the drawer independently of the media query.
 */
export function configureResponsiveDrawer(host, query) {
  const onMediaChange = (event) => {
    host._drawerOpen = event.matches;
  };
  host.addController({
    hostConnected() {
      host._mql = window.matchMedia(query);
      host._mql.addEventListener("change", onMediaChange);
      host._drawerOpen = host._mql.matches;
    },
    hostDisconnected() {
      host._mql?.removeEventListener("change", onMediaChange);
    },
  });
  return () => {
    host._drawerOpen = !host._drawerOpen;
  };
}
