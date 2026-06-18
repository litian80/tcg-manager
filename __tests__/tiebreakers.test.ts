import { describe, it, expect } from "vitest";
import { MWP_FLOOR } from "../lib/core-ops/constants";
import {
  computeMwp,
  computeOmwp,
  computeOomwp,
  computeStandings,
} from "../lib/core-ops/tiebreakers";
import type { PlayerRecord } from "../lib/core-ops/tiebreakers";

describe("MWP", () => {
  it("returns 1.0 for perfect record", () => {
    const p: PlayerRecord = { id: "P1", matchPoints: 9, roundsPlayed: 3, opponents: [] };
    expect(computeMwp(p)).toBe(1.0);
  });

  it("floors 0 wins at 25%", () => {
    const p: PlayerRecord = { id: "P1", matchPoints: 0, roundsPlayed: 3, opponents: [] };
    expect(computeMwp(p)).toBe(MWP_FLOOR);
  });

  it("calculates 1 win in 3 rounds", () => {
    const p: PlayerRecord = { id: "P1", matchPoints: 3, roundsPlayed: 3, opponents: [] };
    expect(computeMwp(p)).toBeCloseTo(0.3333, 3);
  });

  it("floors low win rate at 25%", () => {
    const p: PlayerRecord = { id: "P1", matchPoints: 3, roundsPlayed: 5, opponents: [] };
    expect(computeMwp(p)).toBe(MWP_FLOOR);
  });

  it("returns floor for zero rounds", () => {
    const p: PlayerRecord = { id: "P1", matchPoints: 0, roundsPlayed: 0, opponents: [] };
    expect(computeMwp(p)).toBe(MWP_FLOOR);
  });

  it("handles tie points", () => {
    const p: PlayerRecord = { id: "P1", matchPoints: 4, roundsPlayed: 2, opponents: [] };
    expect(computeMwp(p)).toBeCloseTo(0.6667, 3);
  });
});

describe("OMWP", () => {
  it("returns single opponent's MWP", () => {
    const players = new Map<string, PlayerRecord>([
      ["P1", { id: "P1", matchPoints: 6, roundsPlayed: 3, opponents: ["P2"] }],
      ["P2", { id: "P2", matchPoints: 9, roundsPlayed: 3, opponents: ["P1"] }],
    ]);
    expect(computeOmwp(players.get("P1")!, players)).toBeCloseTo(1.0, 3);
  });

  it("averages multiple opponents", () => {
    const players = new Map<string, PlayerRecord>([
      ["P1", { id: "P1", matchPoints: 6, roundsPlayed: 3, opponents: ["P2", "P3"] }],
      ["P2", { id: "P2", matchPoints: 9, roundsPlayed: 3, opponents: ["P1"] }],
      ["P3", { id: "P3", matchPoints: 3, roundsPlayed: 3, opponents: ["P1"] }],
    ]);
    expect(computeOmwp(players.get("P1")!, players)).toBeCloseTo(0.6667, 3);
  });

  it("floors each opponent's MWP individually", () => {
    const players = new Map<string, PlayerRecord>([
      ["P1", { id: "P1", matchPoints: 9, roundsPlayed: 3, opponents: ["P2"] }],
      ["P2", { id: "P2", matchPoints: 0, roundsPlayed: 3, opponents: ["P1"] }],
    ]);
    expect(computeOmwp(players.get("P1")!, players)).toBeCloseTo(0.25, 3);
  });

  it("excludes unknown opponents (byes)", () => {
    const players = new Map<string, PlayerRecord>([
      ["P1", { id: "P1", matchPoints: 6, roundsPlayed: 2, opponents: ["P2", "BYE_GHOST"] }],
      ["P2", { id: "P2", matchPoints: 3, roundsPlayed: 2, opponents: ["P1"] }],
    ]);
    expect(computeOmwp(players.get("P1")!, players)).toBeCloseTo(0.5, 3);
  });

  it("returns floor for no opponents", () => {
    const players = new Map<string, PlayerRecord>([
      ["P1", { id: "P1", matchPoints: 3, roundsPlayed: 1, opponents: [] }],
    ]);
    expect(computeOmwp(players.get("P1")!, players)).toBe(MWP_FLOOR);
  });
});

describe("OOMWP", () => {
  it("computes basic OOMWP", () => {
    const players = new Map<string, PlayerRecord>([
      ["P1", { id: "P1", matchPoints: 6, roundsPlayed: 2, opponents: ["P2"] }],
      ["P2", { id: "P2", matchPoints: 6, roundsPlayed: 2, opponents: ["P1", "P3"] }],
      ["P3", { id: "P3", matchPoints: 3, roundsPlayed: 2, opponents: ["P2"] }],
    ]);
    expect(computeOomwp(players.get("P1")!, players)).toBeCloseTo(0.75, 3);
  });
});

describe("Standings", () => {
  it("sorts by match points descending", () => {
    const players: PlayerRecord[] = [
      { id: "P1", matchPoints: 9, roundsPlayed: 3, opponents: ["P2"] },
      { id: "P2", matchPoints: 6, roundsPlayed: 3, opponents: ["P1"] },
      { id: "P3", matchPoints: 3, roundsPlayed: 3, opponents: [] },
    ];
    const standings = computeStandings(players);
    expect(standings[0].playerId).toBe("P1");
    expect(standings[1].playerId).toBe("P2");
    expect(standings[2].playerId).toBe("P3");
  });

  it("assigns 1-indexed ranks", () => {
    const players: PlayerRecord[] = [
      { id: "P1", matchPoints: 9, roundsPlayed: 3, opponents: [] },
      { id: "P2", matchPoints: 6, roundsPlayed: 3, opponents: [] },
      { id: "P3", matchPoints: 3, roundsPlayed: 3, opponents: [] },
    ];
    const standings = computeStandings(players);
    expect(standings[0].rank).toBe(1);
    expect(standings[1].rank).toBe(2);
    expect(standings[2].rank).toBe(3);
  });

  it("handles tied ranks", () => {
    const players: PlayerRecord[] = [
      { id: "P1", matchPoints: 6, roundsPlayed: 3, opponents: [] },
      { id: "P2", matchPoints: 6, roundsPlayed: 3, opponents: [] },
      { id: "P3", matchPoints: 3, roundsPlayed: 3, opponents: [] },
    ];
    const standings = computeStandings(players);
    expect(standings[0].rank).toBe(standings[1].rank);
    expect(standings[2].rank).toBe(3);
  });

  it("resolves ties by OMWP", () => {
    const players: PlayerRecord[] = [
      { id: "P1", matchPoints: 3, roundsPlayed: 1, opponents: ["P3"] },
      { id: "P2", matchPoints: 3, roundsPlayed: 1, opponents: ["P4"] },
      { id: "P3", matchPoints: 0, roundsPlayed: 1, opponents: ["P1"] },
      { id: "P4", matchPoints: 6, roundsPlayed: 2, opponents: ["P2"] },
    ];
    const standings = computeStandings(players);
    const p2 = standings.find((s) => s.playerId === "P2")!;
    const p1 = standings.find((s) => s.playerId === "P1")!;
    expect(p2.rank).toBeLessThan(p1.rank);
  });

  it("computes correct MWP values", () => {
    const players: PlayerRecord[] = [
      { id: "P1", matchPoints: 6, roundsPlayed: 3, opponents: [] },
    ];
    const standings = computeStandings(players);
    expect(standings[0].mwp).toBeCloseTo(0.6667, 3);
  });
});
