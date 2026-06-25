import { describe, it, expect } from "vitest";
import {
  generateSingleElimBracket,
  standardSeeding,
} from "../lib/core-ops/bracket";

describe("Seeding", () => {
  it("seeds 2 players", () => {
    expect(standardSeeding(2)).toEqual([0, 1]);
  });

  it("seeds 4 players: 1v4, 2v3", () => {
    const order = standardSeeding(4);
    expect(order[0]).toBe(0); // seed 1
    expect(order[1]).toBe(3); // seed 4
    expect(order[2]).toBe(1); // seed 2
    expect(order[3]).toBe(2); // seed 3
  });

  it("seeds 8 players: 1v8, 4v5, 2v7, 3v6", () => {
    const order = standardSeeding(8);
    const pairs: [number, number][] = [];
    for (let i = 0; i < 8; i += 2) {
      pairs.push([order[i], order[i + 1]]);
    }
    expect(pairs).toEqual([
      [0, 7],
      [3, 4],
      [1, 6],
      [2, 5],
    ]);
  });
});

describe("Bracket Generation", () => {
  it("generates top 4 bracket (3 matches)", () => {
    const seeds = ["P1", "P2", "P3", "P4"];
    const matches = generateSingleElimBracket(seeds, 4);
    expect(matches).toHaveLength(3);

    const r1 = matches.filter((m) => m.bracketRound === 1);
    expect(r1).toHaveLength(2);

    const r2 = matches.filter((m) => m.bracketRound === 2);
    expect(r2).toHaveLength(1);
  });

  it("generates top 8 bracket (7 matches)", () => {
    const seeds = Array.from({ length: 8 }, (_, i) => `P${i + 1}`);
    const matches = generateSingleElimBracket(seeds, 8);
    expect(matches).toHaveLength(7);
  });

  it("seeds correctly in bracket", () => {
    const seeds = ["P1", "P2", "P3", "P4"];
    const matches = generateSingleElimBracket(seeds, 4);

    const r1 = matches.filter((m) => m.bracketRound === 1);
    // SF1: Seed1 (P1) vs Seed4 (P4)
    expect(new Set([r1[0].player1Id, r1[0].player2Id])).toEqual(
      new Set(["P1", "P4"])
    );
    // SF2: Seed2 (P2) vs Seed3 (P3)
    expect(new Set([r1[1].player1Id, r1[1].player2Id])).toEqual(
      new Set(["P2", "P3"])
    );
  });

  it("feeds winners correctly", () => {
    const seeds = ["P1", "P2", "P3", "P4"];
    const matches = generateSingleElimBracket(seeds, 4);
    const r1 = matches.filter((m) => m.bracketRound === 1);
    for (const m of r1) {
      expect(m.feedsWinnerToRound).toBe(2);
      expect(m.feedsWinnerToPosition).not.toBeNull();
    }
  });

  it("final has no feed", () => {
    const seeds = ["P1", "P2", "P3", "P4"];
    const matches = generateSingleElimBracket(seeds, 4);
    const final = matches.filter((m) => m.bracketRound === 2);
    expect(final).toHaveLength(1);
    expect(final[0].feedsWinnerToRound).toBeNull();
  });

  it("generates top 16 bracket (15 matches)", () => {
    const seeds = Array.from({ length: 16 }, (_, i) => `P${i + 1}`);
    const matches = generateSingleElimBracket(seeds, 16);
    expect(matches).toHaveLength(15);
  });

  it("supports non-power-of-2 by adding byes", () => {
    const seeds = Array.from({ length: 6 }, (_, i) => `P${i + 1}`);
    const matches = generateSingleElimBracket(seeds, 6);
    expect(matches).toHaveLength(7);
  });

  it("throws for too few seeds", () => {
    expect(() => generateSingleElimBracket(["P1", "P2"], 4)).toThrow(
      "Need at least 4 seeds"
    );
  });

  it("generates top 2 bracket (1 match, finals only)", () => {
    const seeds = ["P1", "P2"];
    const matches = generateSingleElimBracket(seeds, 2);
    expect(matches).toHaveLength(1);

    const final = matches[0];
    expect(final.bracketRound).toBe(1);
    expect(final.player1Id).toBe("P1");
    expect(final.player2Id).toBe("P2");
    expect(final.feedsWinnerToRound).toBeNull();
    expect(final.feedsWinnerToPosition).toBeNull();
  });

  it("generates bracket for 5 players (top 8 bracket with 3 byes)", () => {
    const seeds = ["P1", "P2", "P3", "P4", "P5"];
    const matches = generateSingleElimBracket(seeds, 5);
    // 5 players rounds up to 8-bracket → 7 matches
    expect(matches).toHaveLength(7);

    const r1 = matches.filter(m => m.bracketRound === 1);
    expect(r1).toHaveLength(4);

    // 3 byes: 3 round-1 matches should have one null player
    const byeMatches = r1.filter(m => m.player1Id === null || m.player2Id === null);
    expect(byeMatches).toHaveLength(3);

    // 1 round-1 match should have two real players
    const realMatches = r1.filter(m => m.player1Id !== null && m.player2Id !== null);
    expect(realMatches).toHaveLength(1);
  });
});
