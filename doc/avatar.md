# Avatars

Players build a pixel-art avatar on the `/avatar` page. What gets stored is the
**configuration**: the chosen parts plus color, position, size and rotation
adjustments. Browsers draw it on a canvas from sprite layers. No flattened
image is ever stored. Configurations are tiny, and they can be edited again
later or re-rendered when sprites improve.

## Schema

`src/shared/avatar.js` defines the versioned schema, and both sides import it.
`canonicalizeAvatar()` is the boundary check. It runs on HTTP input and on
database reads, rejects unknown keys and values, normalizes colors, orders
fields, and upgrades older schema versions. Everything past that point trusts
the configuration. Adding a style means changing the schema and the sprite
mapping (`src/frontend/avatar-sprite-data.js`) together.

## Storage and delivery

The canonical configuration is stored in the user's `settings` JSON. Game,
tournament and profile payloads carry only `avatarRevision`, a hash of the
canonical JSON. Clients fetch the configuration from
`GET /api/players/:id/avatar` and cache it by player and revision; the
response uses the revision as its ETag. This keeps the frequent game
broadcasts small while letting every client notice a changed avatar at once.
When a user saves their settings, the new revision is pushed into their live
seats and tournament entries.

## Editing flow

Settings and the avatar page share one in-memory **draft**. Settings opens the
editor through normal navigation, so Back and Forward move between the two.
**Done** returns to Settings with the changes applied to the draft. The avatar
is persisted only when Settings is saved, together with everything else in the
form. Leaving the flow or reloading discards the draft. Avatar edits therefore
behave like every other setting, with no separate save action.

## Rendering

`<phg-avatar>` takes either a local configuration (editor and Settings
previews) or a player ID plus revision (tables and profiles). It loads only the
sprite layers the configuration uses. The editor preloads every sprite, since
every option is displayed. The canvas is 128×128 and scales with pixelated
rendering.

## Sprites

`poker-avatars.xcf` at the repository root is the source artwork. Running
`npm run avatar:sprites` requires GIMP and ImageMagick. It exports the layers
named in the sprite mapping to `src/frontend/assets/avatar/`, splits paired
parts into left and right layers, and checks every canvas size. The source file
and the exported PNGs are ordinary Git files. Only UI catalog baselines use
LFS.
