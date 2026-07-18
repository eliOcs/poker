# Light DOM Migration Plan

## Decision

Use Lit with light DOM by default throughout the frontend.

Lit remains useful for reactive properties, declarative templates, lifecycle
management, and custom elements. Shadow DOM is not required for those features,
and this application does not need the isolation guarantees of independently
distributed or third-party-embeddable components.

The target architecture has no Shadow DOM. Shared application CSS should style
the whole application intentionally, native HTML controls should retain their
native behavior, and tests and production code should traverse one DOM tree.

## Why Change

Shadow DOM currently adds more integration cost than isolation value:

- Shared CSS has to be imported into every component that needs it.
- CSS lives in JavaScript `css` template strings and requires a custom Stylelint
  parser.
- Parent styles cannot intentionally style component internals without custom
  properties or a new component API.
- Native form association does not cross shadow boundaries. For example, the
  native button inside `phg-button` is not a submit button for an ancestor form.
- Unit tests repeatedly traverse `shadowRoot` objects.
- Production animation and form code contains cross-root DOM traversal.
- Custom events require `composed: true` to cross component boundaries.
- Focus inspection and management must account for separate active elements in
  each shadow root.

Light DOM better matches this project's small, cohesive frontend and its
preference for pragmatic, native browser functionality.

## Current Baseline

At the time of this audit:

- The frontend has 23 Lit components.
- 22 components use Shadow DOM.
- `phg-app-sign-in-modal` is the only light DOM Lit component.
- Approximately 3,400 lines of CSS live in Lit `css` template strings.
- There are 35 `css` blocks across 27 JavaScript files.
- Frontend unit tests contain 535 lines that access `shadowRoot`.
- E2E and UI catalog tests contain 2 additional explicit Shadow DOM accesses.
- Production frontend code contains 18 `shadowRoot` accesses across 7 files.
- 38 custom events use `composed: true` to cross shadow boundaries.
- 5 components use slots and need an API change before moving to light DOM.
- The frontend contains 49 `phg-button` instances and 9 `phg-modal`
  instances.

Playwright already pierces open Shadow DOM for most locators, so the largest
testing improvement will be in frontend unit tests. E2E tests still benefit from
a conventional DOM when using `evaluate`, browser developer tools, and selector
APIs that do not pierce Shadow DOM automatically.

## Component Assessment

### Already Using Light DOM

- `phg-app-sign-in-modal`

Keep it in light DOM. Its current styling is supplied indirectly by an ancestor
shadow root; after migration, normal document CSS should own those styles.

### Straightforward Migrations

These components render their own content and do not depend on slots:

- `phg-app`
- `phg-game`
- `phg-home`
- `phg-history`
- `phg-mtt-lobby`
- `phg-player-profile`
- `phg-release-notes`
- `phg-tournaments`
- `phg-action-panel`
- `phg-board`
- `phg-card`
- `phg-chips`
- `phg-currency-slider`
- `phg-edit-label`
- `phg-ranking-panel`
- `phg-seat`
- `phg-tournament-levels-panel`

For each component:

1. Render into the host by returning `this` from `createRenderRoot()` or by
   extending a small shared light DOM Lit base class.
2. Move its CSS into a normal stylesheet.
3. Scope component-specific CSS under the custom-element selector.
4. Replace internal `shadowRoot` queries with `querySelector` or `renderRoot`
   queries.
5. Update tests to query the component directly.

### Slot-Based Components

These cannot be migrated by changing `createRenderRoot()` alone. Lit would
replace their supplied children instead of projecting them through a slot.

#### `phg-button`

Replace it with native `<button>` elements and shared button classes.

Benefits:

- Native form submission
- Native `disabled` behavior
- Native focus and keyboard activation
- Explicit `type="submit"` and `type="button"` semantics
- No wrapper component or button-specific component tests

The single icon-based button can render the icon template directly. Existing
variants, sizes, full-width behavior, and pre-action states can become modifier
classes.

#### `phg-modal`

Rebuild modal behavior around native `<dialog>` where practical.

The native element provides modal focus behavior, Escape handling, a `cancel`
event, `close()`, document inertness, and `::backdrop`. This can replace the
current global keydown listener, manual overlay, and part of the autofocus
handling.

Modal content can be passed as a Lit template property, rendered by a helper, or
rendered directly by the owning component. Avoid reproducing slot projection in
light DOM.

#### `phg-toast`

Render the existing `message` property directly and remove the content slot.
Then migrate it like any other self-contained light DOM component.

#### `phg-app-shell`

Either merge the shell markup into `phg-app` or pass the page body as a Lit
template property. The component is used as application structure rather than
as a reusable content-projection primitive, so a slot is unnecessary.

#### `phg-navigation-drawer`

Pass main and footer item templates directly, or make the drawer a render helper
owned by the shell/game component.

This removes:

- Named `main` and `footer` slots
- `slotchange` handlers
- `_syncSlottedItems()`
- JavaScript that adds drawer classes after rendering
- JavaScript that assigns SVG sizes inline

Drawer item classes and icon dimensions should be expressed directly in the
templates and CSS.

## CSS Architecture

### Normal Stylesheets

Move all CSS out of JavaScript and into normal `.css` files loaded by the page.
Use a small number of domain-oriented files rather than requiring one file per
component. A reasonable starting structure is:

```text
src/frontend/
├── base.css
├── controls.css
├── modals.css
├── shell.css
├── game.css
├── history.css
└── tournaments.css
```

This structure can change if a file becomes too large. Large standalone views
such as history and the MTT lobby justify dedicated stylesheets; small visual
components do not necessarily do so.

Load the styles through one application entry stylesheet or explicit `<link>`
elements. Ensure the same entry point is loaded by:

- `src/frontend/index.html`
- The frontend test runner HTML
- `test/ui-catalog/test.html`
- The UI catalog server

The production static-file server already exposes top-level frontend CSS files.
If CSS is moved into subdirectories, update static-file discovery to collect CSS
recursively as well.

### Stylelint and Formatting

After all Lit CSS templates are removed:

- Change `lint:css` to check `src/frontend/**/*.css`.
- Change `lint:css:fix` to fix `src/frontend/**/*.css`.
- Remove `postcss-lit` from development dependencies.
- Remove `customSyntax: "postcss-lit"` from `.stylelintrc.json`.
- Review the Stylelint rules currently disabled and enable standard rules where
  they fit the project style.
- Keep `eslint-plugin-lit`; it validates Lit JavaScript and templates and is not
  the CSS parser being removed.
- Let Prettier format CSS as CSS instead of embedded JavaScript templates.

### Global Foundations

Keep these concerns global in `base.css`:

- Design tokens
- Font face and typography
- Page/body reset
- Selection colors
- Global box sizing
- Shared focus conventions

Add a single box-sizing rule instead of repeating it in component styles:

```css
*,
*::before,
*::after {
  box-sizing: border-box;
}
```

The current `baseStyles` Lit value duplicates typography and selection styles
already present in `base.css`. Remove `baseStyles` and its component imports once
the global stylesheet reaches all rendered content.

### Separate Data and Presentation

`styles.js` currently mixes CSS with currency formatting functions. Split it
into:

- Normal CSS files for visual rules
- A JavaScript module such as `currency.js` for `hasCents`, `formatCurrency`,
  and `formatDollars`

Likewise, split CSS out of mixed modules such as:

- `app-auth-status.js`
- `game-create-form.js`

Keep their templates, constants, and behavior in JavaScript.

### Scoping Without Shadow DOM

Do not move existing component CSS globally without reviewing its selectors.
Generic selectors currently rely on Shadow DOM for isolation, including:

- `.main`
- `.content`
- `.panel`
- `.header`
- `.section`
- `.status`
- `.card`
- `.label`
- `.icon`
- `button`
- `input`

Use the custom element as the natural scope for component-specific CSS:

```css
phg-card {
  display: inline-block;
}

phg-card > .card {
  /* Card internals */
}

phg-game > #wrapper phg-board {
  /* Board positioning specific to the live game table */
}
```

Use direct-child selectors or component-specific class names when a broad
descendant selector could accidentally reach into a nested component. Parent
styles will be able to cross component boundaries after migration, so every
cross-component rule should be intentional.

Shared application concepts should remain intentionally global:

- Buttons and button variants
- Inputs and form states
- Modal forms
- Tables
- Panels
- Empty/error feedback
- Status badges

CSS custom properties can remain where they are a useful configuration or
theming mechanism. Remove properties that only exist to tunnel a one-off style
through a shadow boundary when a normal selector or modifier class is clearer.

## Native HTML Improvements

### Buttons and Forms

Use actual native buttons inside every form:

```html
<button class="button button--action" type="submit">Send sign-up link</button>

<button class="button button--muted" type="button">Cancel</button>
```

When the native buttons are in place:

- Remove the hidden submit buttons added as a compatibility workaround.
- Remove click handlers that duplicate form submission.
- Give inputs stable `name` attributes.
- Read submitted values from `FormData` or `form.elements` instead of querying
  inputs by ID.
- Keep boundary validation and trimming for whitespace-only values.
- Use native `required` and `type="email"` validation wherever sufficient.
- Use `invalid` events only when custom invalid-state styling is required.

### Settings Forms

Convert both settings panels from generic containers to forms:

- Profile settings in `app-profile-settings.js`
- Game settings in `game-modals.js`

This removes their manual Enter key handlers. Save becomes a submit button and
Cancel becomes a regular button. Volume and vibration controls should be
evaluated as native radio groups with `<fieldset>` and `<legend>` semantics.

### Edit Label

`phg-edit-label` already renders a form with a submit button. Remove its manual
Enter branch and let form submission handle Enter. Retain the explicit Escape
behavior for cancelling edits.

### Chat

The chat textarea intentionally distinguishes Enter from Shift+Enter, so its
keydown behavior can remain. The Send control should still be a native button,
and the textarea should be read through a local reference or form control rather
than crossing a shadow root.

### Clickable Tournament Information

Replace the tournament info bar's `div[role="button"]`, `tabindex`, and manual
Enter/Space handling with a native `<button>` styled as an information bar.

### Modal Semantics

Prefer native `<dialog>` behavior over recreating modal semantics. Ensure every
remaining button inside a form has an explicit type so close, volume, vibration,
and navigation controls never submit accidentally.

## DOM and Event Simplifications

### Production Queries

Replace internal queries such as:

```js
this.shadowRoot?.querySelector("#container");
```

with queries scoped to the component host:

```js
this.querySelector("#container");
```

The largest simplification is `bet-collection.js`, which currently crosses the
game, board, and seat shadow roots to measure pot and bet positions. With one DOM
tree, it can query all required elements from the game host.

Other affected production areas include:

- Card animation elements
- Game modal inputs
- Profile settings input
- Chat input
- Navigation drawer items
- Game container and seats

### Custom Events

After the last shadow boundary is removed, custom events only need to bubble:

```js
new CustomEvent("request-sign-in", {
  detail,
  bubbles: true,
});
```

Remove `composed: true` from the 38 frontend custom-event dispatches. Do this
late in the migration so events continue crossing any remaining shadow roots
during intermediate phases.

### Focus

Use `document.activeElement` for focus assertions and debugging. Remove logic
that has to inspect both the document active element and a shadow root's active
element.

## Test Simplifications

Update component tests from:

```js
element.shadowRoot.querySelector(".panel");
```

to:

```js
element.querySelector(".panel");
```

Nested component traversal can become a single selector:

```js
element.querySelector("phg-seat phg-card .card.front");
```

Testing guidelines after migration:

- Continue scoping unit-test queries to the fixture element instead of querying
  the whole document.
- Prefer labels, roles, and accessible names for behavior tests.
- Use classes and data attributes for visual state that has no accessible
  representation.
- Test native behavior rather than the removed wrapper implementation.
- Remove `phg-button` slot/rendering tests when the component is deleted.
- Replace modal implementation tests with behavior tests for opening, closing,
  Escape/cancel, focus, and submitted form data.
- Keep Playwright role-based locators; they will continue to work and become
  easier to debug.
- Update UI catalog snapshots after each visually coherent migration phase, not
  after every mechanical file change.

## Migration Strategy

Migrate ancestor components before descendants. A document stylesheet cannot
reach light DOM that is still enclosed inside an ancestor's shadow root.

Do not attempt one global `createRenderRoot()` change. Components would become
unstyled, slot-based components would lose their children, and broad selectors
would collide.

### Phase 1: CSS Foundation

- [x] Add the normal application CSS entry point.
- [x] Load it in production, frontend tests, and the UI catalog.
- [x] Add the global box-sizing reset.
- [x] Establish shared button, form, table, panel, feedback, and focus styles.
- [x] Decide the small set of domain CSS files.
- [x] Split currency formatting functions out of `styles.js`.
- [x] Make static-file handling support the chosen CSS file structure.
- [x] Keep existing shadow styles temporarily so unmigrated components remain
      styled.

### Phase 2: Application and Page Roots

- [x] Convert `phg-app` to light DOM.
- [x] Move app modal and authentication-status CSS into normal stylesheets.
- [x] Convert `phg-home`.
- [x] Convert `phg-tournaments`.
- [x] Convert `phg-mtt-lobby`.
- [x] Convert `phg-player-profile`.
- [x] Convert `phg-release-notes`.
- [x] Convert `phg-history` while leaving its nested poker components shadowed
      temporarily.
- [x] Update unit tests for each component as it moves.
- [x] Check the UI catalog at desktop and mobile widths.

### Phase 3: Poker Table Tree

- [x] Convert `phg-game` before its descendants.
- [x] Move live-game layout and modal CSS into normal stylesheets.
- [x] Convert `phg-board`.
- [x] Convert `phg-seat`.
- [x] Convert `phg-card`.
- [x] Convert `phg-chips`.
- [x] Convert `phg-action-panel`.
- [x] Convert `phg-currency-slider`.
- [x] Convert `phg-ranking-panel`.
- [x] Convert `phg-tournament-levels-panel`.
- [x] Convert `phg-edit-label`.
- [x] Flatten bet-collection and card-animation DOM queries.
- [x] Verify 2-seat, 6-seat, and 9-seat layouts visually.
- [x] Verify game and history card/seat styles do not leak into one another.

### Phase 4: Native Controls and Forms

- [x] Replace all `phg-button` instances with native buttons.
- [x] Move button variants and sizes into normal CSS classes.
- [x] Preserve disabled, full-width, large, compact, icon, and pre-action
      behavior.
- [x] Use native submit buttons in sign-in and sign-up forms.
- [x] Remove hidden submit-button workarounds.
- [x] Convert settings panels to forms.
- [x] Add input names and use `FormData` or `form.elements`.
- [x] Remove manual settings Enter handlers.
- [x] Remove the edit-label Enter handler.
- [x] Replace the clickable tournament info `div` with a button.
- [x] Delete `button.js` and its implementation-specific tests.

### Phase 5: Slot-Based Layout Primitives

- [x] Remove the toast slot and convert the toast to light DOM.
- [x] Replace modal slot projection with template ownership or a template
      property.
- [x] Adopt native `<dialog>` behavior where practical.
- [x] Simplify or merge `phg-app-shell`.
- [x] Replace navigation drawer named slots with explicit item templates.
- [x] Remove drawer `slotchange` synchronization and inline SVG styling.
- [x] Convert the remaining primitives to light DOM or render helpers.

### Phase 6: Cleanup

- [x] Remove every remaining `static get styles()` definition.
- [x] Remove all Lit `css` imports and CSS template modules.
- [x] Remove all production `shadowRoot` accesses.
- [x] Remove all test `shadowRoot` accesses.
- [x] Remove `composed: true` from custom events.
- [x] Remove `baseStyles` and other JavaScript CSS exports.
- [x] Point Stylelint at normal CSS files.
- [x] Remove `postcss-lit` and update the lockfile.
- [x] Re-enable appropriate standard Stylelint rules.
- [x] Regenerate dependency graphs.
- [x] Update UI catalog snapshots.
- [x] Run the complete validation suite.

## Risks and Mitigations

### CSS Leakage

Risk: previously isolated selectors affect nested or unrelated components.

Mitigation:

- Scope component internals under their custom-element selector.
- Prefer direct-child selectors for internal structure.
- Use shared global classes only for intentionally shared concepts.
- Review computed styles and UI catalog screenshots after each phase.

### Duplicate IDs

IDs are currently isolated per shadow root. In light DOM they become
document-global.

Mitigation:

- Audit repeated components for fixed IDs.
- Prefer classes, local queries, `name`, and element references where document
  identity is unnecessary.
- Keep IDs only for genuine document relationships such as label/control and
  ARIA references, ensuring uniqueness when multiple instances can coexist.

### Slot Content Loss

Risk: changing a slot-based component to light DOM causes Lit to replace the
consumer-provided children.

Mitigation: refactor the component API first. Pass templates or render the
structure in the owning component before changing its render root.

### Migration Ordering

Risk: global CSS cannot reach a migrated child that remains inside an ancestor
shadow root.

Mitigation: migrate top-level ancestors before descendants and keep old shadow
styles until each subtree is ready.

### Visual Regressions

Risk: selector specificity and inherited styles change when boundaries are
removed.

Mitigation:

- Make changes in visually coherent batches.
- Run component tests and UI catalog tests for every batch.
- Review mobile and desktop states.
- Update snapshots only after verifying intentional differences.

### Event Target Changes

Shadow DOM currently retargets some events to component hosts. Light DOM exposes
the actual originating element.

Mitigation: verify handlers that inspect `event.target`. Prefer handlers bound
to the intended control and use `event.currentTarget` where the bound element is
required.

## Completion Criteria

The migration is complete when:

- No frontend Lit component creates a shadow root.
- No production or test code accesses `shadowRoot`.
- No frontend JavaScript contains Lit `css` tagged templates.
- All application CSS is in normal `.css` files.
- Stylelint runs directly on CSS without `postcss-lit`.
- Forms use native submit buttons without hidden compatibility buttons.
- Settings and sign-in/sign-up flows submit correctly with mouse and keyboard.
- Modal focus, Escape, close, and backdrop behavior is verified.
- Custom events no longer require `composed: true`.
- Unit, E2E, accessibility-relevant behavior, and UI catalog tests pass.
- Desktop and mobile game layouts remain visually correct for all table sizes.
