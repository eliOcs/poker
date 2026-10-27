import { describe, it, afterEach } from "node:test";
import assert from "node:assert";
import { setTimeout as delay } from "node:timers/promises";
import { createBotEngine } from "../../src/backend/bot-engine.js";

const FAKE_ENGINE = new URL("../fake-bot-engine.js", import.meta.url).pathname;

const REQUEST = {
  button: 0,
  stacks: [10000, 10000, 10000, 10000, 10000, 10000],
  seat: 3,
  hole: ["Ah", "Kd"],
  board: [],
  actions: [],
};

/**
 * An engine whose behavior is a CommonJS script run by Node.
 * @param {string} script - Runs after the ready line, with `send` and `onRequest` defined
 */
function scriptedEngine(script) {
  return createBotEngine({
    command: process.execPath,
    args: [
      "-e",
      `const send = (m) => console.log(JSON.stringify(m));
       const onRequest = (f) => require("readline")
         .createInterface({ input: process.stdin })
         .on("line", (line) => f(JSON.parse(line)));
       ${script}`,
    ],
  });
}

/** @param {() => boolean} condition */
async function waitFor(condition) {
  for (let i = 0; i < 500 && !condition(); i += 1) await delay(10);
  assert.ok(condition(), "condition was never met");
}

describe("bot engine", () => {
  /** @type {import('../../src/backend/bot-engine.js').BotEngine|undefined} */
  let engine;

  afterEach(() => {
    engine?.close();
  });

  it("answers decisions once the engine reports ready", async () => {
    engine = createBotEngine({ command: FAKE_ENGINE, args: ["serve"] });
    assert.strictEqual(engine.isReady(), false);
    await assert.rejects(engine.decide(REQUEST), /not ready/);

    await waitFor(() => engine.isReady());

    assert.deepStrictEqual(await engine.decide(REQUEST), {
      strategy: [{ type: "call", p: 1 }],
      source: "blueprint",
    });
  });

  it("matches answers to requests by id", async () => {
    engine = scriptedEngine(`
      send({ ready: true });
      const waiting = [];
      onRequest((req) => {
        waiting.push(req);
        if (waiting.length < 2) return;
        for (const { id, seat } of waiting.reverse()) {
          send({ id, strategy: [{ type: "raise", to: 200 + seat, p: 1 }], source: "unseen" });
        }
      });`);
    await waitFor(() => engine.isReady());

    const decisions = await Promise.all([
      engine.decide({ ...REQUEST, seat: 3 }),
      engine.decide({ ...REQUEST, seat: 4 }),
    ]);

    assert.deepStrictEqual(
      decisions.map((d) => d.strategy[0]),
      [
        { type: "raise", to: 203, p: 1 },
        { type: "raise", to: 204, p: 1 },
      ],
    );
  });

  it("rejects with the engine's error", async () => {
    engine = createBotEngine({ command: FAKE_ENGINE, args: ["serve"] });
    await waitFor(() => engine.isReady());

    await assert.rejects(
      engine.decide({ ...REQUEST, stacks: [10000] }),
      /expected 6 stacks/,
    );
  });

  it("rejects answers outside the protocol", async () => {
    engine = scriptedEngine(`
      send({ ready: true });
      onRequest(({ id }) => send({ id, strategy: [{ type: "limp", p: 1 }], source: "blueprint" }));`);
    await waitFor(() => engine.isReady());

    await assert.rejects(engine.decide(REQUEST), /unknown strategy choice/);
  });

  it("rejects a strategy that gives no choice a probability", async () => {
    engine = scriptedEngine(`
      send({ ready: true });
      onRequest(({ id }) => send({ id, strategy: [{ type: "call", p: 0 }], source: "blueprint" }));`);
    await waitFor(() => engine.isReady());

    await assert.rejects(engine.decide(REQUEST), /give some choice/);
  });

  it("fails pending requests when the engine exits, then restarts it", async () => {
    engine = scriptedEngine(`
      send({ ready: true });
      onRequest(() => process.exit(3));`);
    await waitFor(() => engine.isReady());

    await assert.rejects(engine.decide(REQUEST), /bot engine exited/);
    assert.strictEqual(engine.isReady(), false);
    await waitFor(() => engine.isReady());
  });

  it("stays unavailable when the engine cannot start", async () => {
    engine = createBotEngine({ command: "/nonexistent/noregrets", args: [] });
    await delay(50);

    assert.strictEqual(engine.isReady(), false);
    await assert.rejects(engine.decide(REQUEST), /not ready/);
  });
});
