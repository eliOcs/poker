#!/usr/bin/env node
// Speaks the noregrets `serve` protocol for tests: a ready line, then one
// answer per request. Every bot checks or calls, so hands reach showdown.
// Requests are checked for the shape the real engine requires.
import { createInterface } from "node:readline";

const CARD = /^[2-9TJQKA][shdc]$/;
const ACTIONS = new Set(["fold", "call", "raise"]);

/** @type {Array<[(request: any) => boolean, string]>} */
const RULES = [
  [(r) => Number.isInteger(r.id), "id must be an integer"],
  [(r) => r.stacks?.length === 6, "expected 6 stacks"],
  [(r) => r.stacks.every((s) => Number.isInteger(s) && s > 0), "bad stacks"],
  [(r) => r.button >= 0 && r.button < 6, "bad button"],
  [(r) => r.seat >= 0 && r.seat < 6, "bad seat"],
  [(r) => r.hole.length === 2 && r.board.length <= 5, "bad card count"],
  [(r) => [...r.hole, ...r.board].every((c) => CARD.test(c)), "bad card"],
  [
    (r) =>
      new Set([...r.hole, ...r.board]).size === r.hole.length + r.board.length,
    "card appears twice",
  ],
  [(r) => r.actions.every((a) => ACTIONS.has(a.type)), "bad action"],
];

console.log(JSON.stringify({ ready: true, players: 6, infosets: 0 }));
createInterface({ input: process.stdin }).on("line", (line) => {
  const request = JSON.parse(line);
  const error = RULES.find(([valid]) => !valid(request))?.[1];
  console.log(
    JSON.stringify(
      error
        ? { id: request.id, error }
        : {
            id: request.id,
            strategy: [{ type: "call", p: 1 }],
            source: "blueprint",
          },
    ),
  );
});
