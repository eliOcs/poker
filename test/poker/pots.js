import { describe, it, beforeEach } from "node:test";
import assert from "node:assert";
import * as Seat from "../../src/poker/seat.js";
import * as Pots from "../../src/poker/pots.js";

describe("pots", () => {
  describe("calculatePots", () => {
    it("should create single pot when no all-ins", () => {
      const seats = [
        {
          ...Seat.occupied({ id: "p1" }, 0),
          totalInvested: 100,
          folded: false,
        },
        Seat.empty(),
        {
          ...Seat.occupied({ id: "p2" }, 0),
          totalInvested: 100,
          folded: false,
        },
        Seat.empty(),
        {
          ...Seat.occupied({ id: "p3" }, 0),
          totalInvested: 100,
          folded: false,
        },
        Seat.empty(),
      ];

      const pots = Pots.calculatePots(seats);

      assert.equal(pots.length, 1);
      assert.equal(pots[0].amount, 300);
      assert.deepEqual(pots[0].eligibleSeats, [0, 2, 4]);
    });

    it("should create side pot when player goes all-in for less", () => {
      const seats = [
        {
          ...Seat.occupied({ id: "p1" }, 0),
          totalInvested: 500,
          folded: false,
          allIn: true,
        },
        Seat.empty(),
        {
          ...Seat.occupied({ id: "p2" }, 500),
          totalInvested: 1000,
          folded: false,
        },
        Seat.empty(),
        {
          ...Seat.occupied({ id: "p3" }, 500),
          totalInvested: 1000,
          folded: false,
        },
        Seat.empty(),
      ];

      const pots = Pots.calculatePots(seats);

      assert.equal(pots.length, 2);
      // First pot: 500 x 3 = 1500
      assert.equal(pots[0].amount, 1500);
      assert.deepEqual(pots[0].eligibleSeats, [0, 2, 4]);
      // Second pot: 500 x 2 = 1000 (only players who contributed more)
      assert.equal(pots[1].amount, 1000);
      assert.deepEqual(pots[1].eligibleSeats, [2, 4]);
    });

    it("should create multiple side pots with multiple all-ins", () => {
      const seats = [
        {
          ...Seat.occupied({ id: "p1" }, 0),
          totalInvested: 200,
          folded: false,
          allIn: true,
        },
        Seat.empty(),
        {
          ...Seat.occupied({ id: "p2" }, 0),
          totalInvested: 500,
          folded: false,
          allIn: true,
        },
        Seat.empty(),
        {
          ...Seat.occupied({ id: "p3" }, 500),
          totalInvested: 1000,
          folded: false,
        },
        Seat.empty(),
      ];

      const pots = Pots.calculatePots(seats);

      assert.equal(pots.length, 3);
      // First pot: 200 x 3 = 600
      assert.equal(pots[0].amount, 600);
      assert.deepEqual(pots[0].eligibleSeats, [0, 2, 4]);
      // Second pot: 300 x 2 = 600 (500 - 200 for players 2 and 4)
      assert.equal(pots[1].amount, 600);
      assert.deepEqual(pots[1].eligibleSeats, [2, 4]);
      // Third pot: 500 x 1 = 500 (only player 4)
      assert.equal(pots[2].amount, 500);
      assert.deepEqual(pots[2].eligibleSeats, [4]);
    });

    it("should exclude folded players from eligibility", () => {
      const seats = [
        { ...Seat.occupied({ id: "p1" }, 0), totalInvested: 100, folded: true },
        Seat.empty(),
        {
          ...Seat.occupied({ id: "p2" }, 0),
          totalInvested: 100,
          folded: false,
        },
        Seat.empty(),
        {
          ...Seat.occupied({ id: "p3" }, 0),
          totalInvested: 100,
          folded: false,
        },
        Seat.empty(),
      ];

      const pots = Pots.calculatePots(seats);

      assert.equal(pots.length, 1);
      assert.equal(pots[0].amount, 300);
      // Folded player not eligible
      assert.deepEqual(pots[0].eligibleSeats, [2, 4]);
    });

    it("should handle empty pot", () => {
      const seats = [Seat.empty(), Seat.empty(), Seat.empty()];

      const pots = Pots.calculatePots(seats);

      assert.equal(pots.length, 0);
    });
  });

  describe("getTotalPot", () => {
    it("should sum all pots", () => {
      const pots = [
        { amount: 100, eligibleSeats: [0, 1] },
        { amount: 200, eligibleSeats: [1] },
      ];

      assert.equal(Pots.getTotalPot(pots), 300);
    });
  });

  describe("awardPot", () => {
    it("should award pot to single winner", () => {
      const seats = [
        { ...Seat.occupied({ id: "p1" }, 100) },
        Seat.empty(),
        { ...Seat.occupied({ id: "p2" }, 100) },
      ];
      const pot = { amount: 300, eligibleSeats: [0, 2] };

      const awards = Pots.awardPot(pot, [0], seats);

      assert.equal(awards.length, 1);
      assert.equal(awards[0].seat, 0);
      assert.equal(awards[0].amount, 300);
      assert.equal(seats[0].stack, 400);
    });

    it("should split pot evenly for ties", () => {
      const seats = [
        { ...Seat.occupied({ id: "p1" }, 100) },
        Seat.empty(),
        { ...Seat.occupied({ id: "p2" }, 100) },
      ];
      const pot = { amount: 300, eligibleSeats: [0, 2] };

      const awards = Pots.awardPot(pot, [0, 2], seats);

      assert.equal(awards.length, 2);
      assert.equal(awards[0].amount, 150);
      assert.equal(awards[1].amount, 150);
    });

    it("should give odd chips to first winner", () => {
      const seats = [
        { ...Seat.occupied({ id: "p1" }, 100) },
        Seat.empty(),
        { ...Seat.occupied({ id: "p2" }, 100) },
      ];
      const pot = { amount: 301, eligibleSeats: [0, 2] };

      const awards = Pots.awardPot(pot, [0, 2], seats);

      assert.equal(awards[0].amount, 151);
      assert.equal(awards[1].amount, 150);
    });

    it("should only award to eligible winners", () => {
      const seats = [
        { ...Seat.occupied({ id: "p1" }, 100) },
        Seat.empty(),
        { ...Seat.occupied({ id: "p2" }, 100) },
      ];
      const pot = { amount: 300, eligibleSeats: [2] }; // Only seat 2 eligible

      const awards = Pots.awardPot(pot, [0, 2], seats); // Both "win" but only 2 eligible

      assert.equal(awards.length, 1);
      assert.equal(awards[0].seat, 2);
      assert.equal(awards[0].amount, 300);
    });
  });
});
