# UI Catalog

One representative case per distinct element and visual state. Before adding a case, identify what existing cases do not cover.

- Name cases after visual states. Different hands, positions, amounts or explanations do not need separate screenshots unless they expose a distinct layout issue, such as overflow.
- Set up states directly. Keep interactions in component/E2E tests and poker rules, calculations and explanation content in backend tests.
- Use `waitForAvatars` when capturing avatars.

## Baselines

Use Docker for shared baseline updates and comparisons so fonts match. Run from the repository root:

```bash
npm run start:ui-catalog   # Browse at http://localhost:8445
npm run test:ui-catalog:update:docker -- --grep game-clock-called
npm run test:ui-catalog:docker
```

Inspect updated images before running the comparison. Remove obsolete snapshots explicitly; filtered updates preserve unrelated files. `npm run validate` and the pre-commit hook also run the Docker comparison.

Fixtures live in `test-cases.js`, `test-cases-*.js` and `test-cases/`. Baselines are in `ui-catalog.test.js-snapshots/` (Git LFS); failure artifacts are in `test-results/ui-catalog/` at the repository root.

## Rendering constraints

- Landscape snapshots run only in the mobile project. Geometry checks with explicit viewports run once in the desktop project. See [Playwright configuration](../../playwright.ui-catalog.config.js).
- MTT captures scroll internal content to reveal controls and standings; retain the mobile header and overflowed results captures.
- Keep [Docker's](../../Dockerfile.ui-catalog) Playwright version aligned with the installed dependency and its Ubuntu release/fonts aligned with CI. Docker uses Linux/amd64 even on Apple Silicon; CI runs Playwright natively.
