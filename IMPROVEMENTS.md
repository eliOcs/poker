# Suggested Improvements

## 1. WebSocket Message Size Limit

**File:** `src/backend/index.js` (WebSocket server setup)
**Priority:** High | **Effort:** 1 line

The `ws` library accepts messages of any size by default. A malicious client could send a huge JSON payload to exhaust memory.

```javascript
new WebSocket.Server({ server, maxPayload: 4096 }); // 4KB is plenty for game actions
```

---

## 2. Silent Async Failures in Hand History

**File:** `src/backend/websocket-handler.js`
**Priority:** High | **Effort:** 2 lines

`HandHistory.finalizeHand()` is async and fire-and-forget. If it fails (disk full, I/O error), the failure is silently swallowed — hand history lost with no indication.

```javascript
HandHistory.finalizeHand(game).catch((err) =>
  logger.error("Failed to finalize hand history", { err, gameId: game.id }),
);
```

---

## 3. Cookie Security Flags for Production

**File:** `src/backend/http-routes.js`
**Priority:** Medium | **Effort:** Small

Cookies should include `Secure` and `SameSite=Strict` flags in production. Missing `Secure` allows cookies over HTTP; missing `SameSite` opens CSRF vectors.

Set both flags when `NODE_ENV=production`.

---

## 4. Structured Error Types for Game Actions

**File:** `src/backend/websocket-handler.js`
**Priority:** Medium | **Effort:** Medium

All poker action errors are plain `Error` instances. It's impossible to distinguish expected user validation errors ("not your turn") from unexpected server bugs without parsing message strings.

Create a `GameActionError` class for expected validation failures. Only log unexpected errors as warnings/errors in the WS handler — expected errors are noise.

---

## 5. Game Eviction TTL for Finished Games

**File:** `src/backend/game-eviction.js`
**Priority:** Low | **Effort:** Medium

Completed games (e.g., finished tournaments) linger in the in-memory map until all players disconnect. If players abandon a finished game, the entry stays indefinitely.

Add a TTL-based eviction for games that have ended (e.g., 1 hour after completion), independent of player disconnection.

---

## 6. Unit Tests for HTTP Routes and WebSocket Handler

**Files:** `src/backend/http-routes.js`, `src/backend/websocket-handler.js`
**Priority:** Low | **Effort:** Large

These files have no unit tests — only covered by E2E tests. Regressions in request parsing, auth checks, or error mapping are only caught at the integration level.

Add unit tests for at least the error paths: invalid cookie, rate-limited request, malformed WebSocket message.
