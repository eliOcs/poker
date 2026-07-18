import { afterEach, beforeEach, describe, it } from "node:test";
import assert from "node:assert";
import {
  cleanupOrphanGuestUsers,
  GUEST_RETENTION_MS,
} from "../../src/backend/guest-user-cleanup.js";
import * as Store from "../../src/backend/store.js";

describe("guest user cleanup", () => {
  beforeEach(() => {
    Store._reset();
    Store.initialize(":memory:");
  });

  afterEach(() => {
    Store.close();
  });

  it("removes deleted guests from the in-memory user cache", () => {
    const user = {
      id: "orphan",
      name: "Guest",
      settings: { volume: 0.75, vibration: true },
    };
    const users = { [user.id]: user };
    Store.saveUser(user);

    const deletedCount = cleanupOrphanGuestUsers(
      users,
      Date.now() + GUEST_RETENTION_MS + 24 * 60 * 60 * 1000,
    );

    assert.equal(deletedCount, 1);
    assert.strictEqual(Store.loadUser(user.id), undefined);
    assert.deepStrictEqual(users, {});
  });
});
