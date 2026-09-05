# Avatars

Players can build a pixel-art avatar on the dedicated `/avatar` page. The
application stores the selected parts and adjustments as configuration data and
renders the avatar in the browser. It does not store a flattened avatar image.

## User Flow

1. Open Settings with `?modal=settings` and select **Change** under Avatar.
2. The app navigates to `/avatar`, preserving the Settings entry in browser
   history.
3. Choose styles, colors, positions, sizes, spacing, and rotation. **Randomize**
   produces another valid configuration.
4. **Done** on the avatar page applies the configuration to the in-memory
   Settings draft and navigates back to Settings. **Cancel** returns without
   changing that draft.
5. **Save** in Settings persists the whole settings draft with
   `PUT /api/users/me`. Closing or cancelling Settings discards it.

The Settings preview uses the local draft directly. Removing an avatar also
remains a draft until Settings is saved.

Settings and the editor share one draft session, including Back/Forward
navigation between them. Leaving this flow discards the draft; returning starts
from the saved profile. Reloading starts a new session from the saved profile,
including the name and other settings.

## Configuration Schema

The canonical schema, allowed part types, adjustment values, and color palettes
live in `src/shared/avatar.js`, which is used by both frontend and backend. The
current `schemaVersion` is `1`.

```javascript
{
  schemaVersion: 1,
  background: { color },
  torso: { type, position, size },
  clothes: { type, position, size, color },
  face: { type, position, horizontalPosition, size, rotation, color },
  eyes: { type, position, spacing, rotation, size, color },
  eyebrows: { type, position, spacing, size, color },
  nose: { type, position, horizontalPosition, size },
  mouth: { type, position, horizontalPosition, size },
  ears: { type, position, spacing, size },
  hair: { type, position, size, color },
  facialHair: { type, position, horizontalPosition, size, color }
}
```

`canonicalizeAvatar()` validates configurations at HTTP input and database-read boundaries, rejects
unknown keys and values, normalizes colors, and returns fields in stable order.
Legacy configurations without `schemaVersion` are upgraded to the current
version during canonicalization.

Internal rendering and revision hashing use the shared `AvatarConfiguration`
JSDoc type and trust these canonical configurations.

## Persistence and Public API

The canonical configuration is stored in the `avatar` property of the user's
`settings` JSON in SQLite. Updating settings follows these rules:

- `settings.avatar` with an object validates and replaces the avatar.
- `settings.avatar: null` removes the avatar.
- Omitting `settings.avatar` leaves it unchanged.

Public game, tournament, and player-profile payloads contain only an optional
`avatarRevision`, not the full configuration. The revision is a base64url SHA-256
hash of the canonical JSON, so it changes whenever the rendered avatar changes.

The renderer obtains configuration separately:

```http
GET /api/players/:playerId/avatar
```

A successful response is:

```javascript
{
  revision: string,
  avatar: AvatarConfiguration
}
```

The response uses the revision as its `ETag` and supports `If-None-Match` with a
`304 Not Modified` response. A player without an avatar receives `404 Not
Found`.

Saving profile settings synchronizes the new revision to live cash and Sit & Go
seats and to MTT entrants and their active table seats. Normal game and
tournament broadcasts therefore remain small while clients can detect a changed
avatar immediately.

## Frontend Rendering

`<phg-avatar>` has two input modes:

- A local `.avatar` object for Settings and editor previews.
- `.playerId` plus `.revision` for tables and public profiles.

Remote configurations are cached in memory by `playerId:revision`. After the
configuration is loaded, only the sprite layers referenced by its selected part
types are fetched. The editor loads all sprites because every option and preview
must be available while editing. Drawing starts after loading completes. A failed
load shows an error with Retry and Cancel actions; retrying or reopening the
editor requests missing sprites again.

Rendering uses a 128×128 canvas and keeps pixelated scaling in larger UI slots.
If no revision or local configuration is provided, the component renders the
sign-in icon on a dark background as the empty-avatar state.

The main implementation files are:

- `src/frontend/avatar-maker.js` — editor UI.
- `src/frontend/avatar.js` — reusable local/remote avatar component.
- `src/frontend/avatar-loader.js` — public configuration loading and caching.
- `src/frontend/avatar-sprite-loader.js` — selective sprite loading.
- `src/frontend/avatar-drawing.js` and `avatar-sprites.js` — canvas composition.
- `src/frontend/avatar-sprite-data.js` — mapping from schema types to source
  layers and exported sprites.

## Sprite Authoring and Export

The editable source is `poker-avatars.xcf` at the repository root. Exporting
requires GIMP and ImageMagick's `magick` command:

```bash
npm run avatar:sprites
```

An alternative XCF path can be passed after `--`:

```bash
npm run avatar:sprites -- /path/to/avatar-source.xcf
```

The exporter reads the mappings in `avatar-sprite-data.js`, invokes
`scripts/export-avatar-sprites-gimp.py`, splits paired parts into left/right
layers where necessary, writes PNGs under `src/frontend/assets/avatar/`, and
verifies that every exported canvas is 128×128.

When adding or renaming a style, update the shared schema and sprite mapping
together, export the sprites, and run the avatar unit, end-to-end, and UI catalog
tests.

## Git and Test Assets

The source XCF and runtime sprite PNGs are regular Git files. UI catalog PNG
snapshots are stored in Git LFS according to `.gitattributes`.

Relevant coverage includes:

- Backend schema, revision, settings, public route, and synchronization tests.
- Frontend editor, stepper, preview, renderer, settings, and routing tests.
- The smoke-test happy path: change face color, choose different eyes, move the
  nose, return to Settings, and persist the avatar.
- Desktop and mobile UI catalog snapshots for every editor tab, Settings, game
  seats, and player profiles.
