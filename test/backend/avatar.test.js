import { describe, it } from "node:test";
import assert from "node:assert";
import {
  AVATAR_SCHEMA_VERSION,
  AVATAR_TYPES,
  DEFAULT_AVATAR,
  canonicalizeAvatar,
} from "../../src/shared/avatar.js";
import {
  getAvatarRevision,
  getUserAvatarRevision,
} from "../../src/backend/avatar.js";
import { AVATAR_SPRITE_PARTS } from "../../src/frontend/avatar-sprite-data.js";

describe("avatar configuration", () => {
  it("canonicalizes legacy configurations and normalizes colors", () => {
    const input = structuredClone(DEFAULT_AVATAR);
    delete input.schemaVersion;
    input.face.color = "#C98255";

    const avatar = canonicalizeAvatar(input);

    assert.equal(avatar.schemaVersion, AVATAR_SCHEMA_VERSION);
    assert.equal(avatar.face.color, "#c98255");
    assert.deepEqual(Object.keys(avatar), Object.keys(DEFAULT_AVATAR));
  });

  it("rejects unknown properties and out-of-range adjustments", () => {
    const unknown = { ...structuredClone(DEFAULT_AVATAR), extra: true };
    assert.throws(() => canonicalizeAvatar(unknown), /avatar.extra is unknown/);

    const outOfRange = structuredClone(DEFAULT_AVATAR);
    outOfRange.eyes.spacing = 3;
    assert.throws(
      () => canonicalizeAvatar(outOfRange),
      /avatar.eyes.spacing is invalid/,
    );
  });

  it("hashes canonical content and changes revision with appearance", () => {
    const legacy = structuredClone(DEFAULT_AVATAR);
    delete legacy.schemaVersion;
    legacy.face.color = "#C98255";
    const changed = structuredClone(DEFAULT_AVATAR);
    changed.face.size = 1;

    assert.equal(getAvatarRevision(legacy), getAvatarRevision(DEFAULT_AVATAR));
    assert.notEqual(
      getAvatarRevision(changed),
      getAvatarRevision(DEFAULT_AVATAR),
    );
    assert.equal(getUserAvatarRevision({ settings: {} }), undefined);
  });

  it("keeps shared allowed types aligned with drawable sprites", () => {
    for (const [partId, types] of Object.entries(AVATAR_TYPES)) {
      assert.deepEqual(Object.keys(AVATAR_SPRITE_PARTS[partId].styles), types);
    }
  });
});
