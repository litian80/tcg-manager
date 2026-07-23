import { describe, it, expect } from "vitest";
import { generatePairings } from "../lib/core-ops/pairing";
import type { PlayerInput, PairingRecord } from "../lib/core-ops/pairing";

function makePlayers(count: number, points?: number[]): PlayerInput[] {
  const pts = points || new Array(count).fill(0);
  return Array.from({ length: count }, (_, i) => ({
    id: `P${String(i + 1).padStart(3, "0")}`,
    matchPoints: pts[i],
    isDropped: false,
    hasBye: false,
    opponents: [],
  }));
}

describe("Basic Pairing", () => {
  it("pairs two players", () => {
    const players = makePlayers(2);
    const { pairings, byePlayer } = generatePairings(players);
    expect(pairings).toHaveLength(1);
    expect(byePlayer).toBeNull();
    expect(new Set([pairings[0].p1, pairings[0].p2])).toEqual(
      new Set(["P001", "P002"])
    );
  });

  it("pairs four players into two matches", () => {
    const players = makePlayers(4);
    const { pairings, byePlayer } = generatePairings(players);
    expect(pairings).toHaveLength(2);
    expect(byePlayer).toBeNull();

    const allIds = new Set(pairings.flatMap((p) => [p.p1, p.p2]));
    expect(allIds).toEqual(new Set(["P001", "P002", "P003", "P004"]));
  });

  it("pairs six players into three matches", () => {
    const { pairings, byePlayer } = generatePairings(makePlayers(6));
    expect(pairings).toHaveLength(3);
    expect(byePlayer).toBeNull();
  });

  it("pairs 20 players into 10 matches", () => {
    const { pairings, byePlayer } = generatePairings(makePlayers(20));
    expect(pairings).toHaveLength(10);
    expect(byePlayer).toBeNull();
  });
});

describe("Bye Handling", () => {
  it("assigns bye for 3 players", () => {
    const { pairings, byePlayer } = generatePairings(makePlayers(3));
    expect(pairings).toHaveLength(1);
    expect(byePlayer).not.toBeNull();
    expect(["P001", "P002", "P003"]).toContain(byePlayer);
  });

  it("assigns bye for 5 players", () => {
    const { pairings, byePlayer } = generatePairings(makePlayers(5));
    expect(pairings).toHaveLength(2);
    expect(byePlayer).not.toBeNull();
  });

  it("gives bye to lowest-ranked player", () => {
    const players = makePlayers(3, [9, 6, 3]);
    const { byePlayer } = generatePairings(players);
    expect(byePlayer).toBe("P003");
  });

  it("prevents double bye", () => {
    const players: PlayerInput[] = [
      { id: "P001", matchPoints: 9, isDropped: false, hasBye: false, opponents: [] },
      { id: "P002", matchPoints: 6, isDropped: false, hasBye: false, opponents: [] },
      { id: "P003", matchPoints: 3, isDropped: false, hasBye: true, opponents: [] },
    ];
    const { byePlayer } = generatePairings(players);
    expect(byePlayer).not.toBe("P003");
  });

  it("handles byes disabled", () => {
    const { pairings, byePlayer } = generatePairings(makePlayers(3), [], {
      allowByes: false,
    });
    expect(pairings).toHaveLength(1);
    expect(byePlayer).toBeNull();
  });

  it("gives bye to lowest-ranked when bottom group has multiple players", () => {
    // 3 players: P1=6pts, P2=0pts, P3=0pts
    // Bug: old formula gave bye to P1 (highest) because pairing P2-P3 (weight 1000)
    // was more attractive than P1-P2 or P1-P3 (weight 640)
    const players = makePlayers(3, [6, 0, 0]);
    const { byePlayer } = generatePairings(players);
    expect(byePlayer).not.toBe("P001"); // Must NOT be the top player
    expect(["P002", "P003"]).toContain(byePlayer);
  });

  it("gives bye to lowest-ranked with large point gap", () => {
    // 5 players: P1=9pts, P2-P5=0pts
    // Bug: old formula gave bye to P1 because removing them let all 0-pointers pair perfectly
    const players = makePlayers(5, [9, 0, 0, 0, 0]);
    const { byePlayer } = generatePairings(players);
    expect(byePlayer).not.toBe("P001");
    expect(["P004", "P005"]).toContain(byePlayer); // Should be one of the lowest ranked
  });

  it("gives bye to lowest-ranked in realistic mid-tournament", () => {
    // 7 players with realistic spread: 3 at 9pts, 2 at 3pts, 2 at 0pts
    const players = makePlayers(7, [9, 9, 9, 3, 3, 0, 0]);
    const { byePlayer } = generatePairings(players);
    expect(["P006", "P007"]).toContain(byePlayer); // Must be from the 0-point group
  });
});

describe("Rematch Prevention", () => {
  it("prevents rematch via opponents field", () => {
    const players: PlayerInput[] = [
      { id: "P001", matchPoints: 6, isDropped: false, hasBye: false, opponents: ["P002"] },
      { id: "P002", matchPoints: 6, isDropped: false, hasBye: false, opponents: ["P001"] },
      { id: "P003", matchPoints: 3, isDropped: false, hasBye: false, opponents: [] },
      { id: "P004", matchPoints: 3, isDropped: false, hasBye: false, opponents: [] },
    ];
    const { pairings } = generatePairings(players);
    for (const p of pairings) {
      expect(new Set([p.p1, p.p2])).not.toEqual(new Set(["P001", "P002"]));
    }
  });

  it("prevents rematch via pairing history", () => {
    const players = makePlayers(4, [6, 6, 3, 3]);
    const history: PairingRecord[] = [{ p1: "P001", p2: "P002", round: 1 }];
    const { pairings } = generatePairings(players, history);
    for (const p of pairings) {
      expect(new Set([p.p1, p.p2])).not.toEqual(new Set(["P001", "P002"]));
    }
  });
});

describe("Score Group Pairing", () => {
  it("pairs same-point players together", () => {
    const players = makePlayers(4, [6, 6, 3, 3]);
    const { pairings } = generatePairings(players);
    const pairs = pairings.map((p) => new Set([p.p1, p.p2]));
    expect(pairs).toContainEqual(new Set(["P001", "P002"]));
    expect(pairs).toContainEqual(new Set(["P003", "P004"]));
  });
});

describe("Dropped Players", () => {
  it("excludes dropped players", () => {
    const players: PlayerInput[] = [
      { id: "P001", matchPoints: 6, isDropped: false, hasBye: false, opponents: [] },
      { id: "P002", matchPoints: 6, isDropped: true, hasBye: false, opponents: [] },
      { id: "P003", matchPoints: 3, isDropped: false, hasBye: false, opponents: [] },
      { id: "P004", matchPoints: 3, isDropped: false, hasBye: false, opponents: [] },
    ];
    const { pairings, byePlayer } = generatePairings(players);
    const allIds = new Set(pairings.flatMap((p) => [p.p1, p.p2]));
    if (byePlayer) allIds.add(byePlayer);
    expect(allIds).not.toContain("P002");
  });
});

describe("Table Assignment", () => {
  it("assigns sequential table numbers", () => {
    const { pairings } = generatePairings(makePlayers(6));
    const tables = pairings.map((p) => p.tableNumber).sort((a, b) => a - b);
    expect(tables).toEqual([1, 2, 3]);
  });

  it("assigns table 1 to highest-scoring pair", () => {
    const players = makePlayers(4, [9, 3, 6, 0]);
    const { pairings } = generatePairings(players);
    const table1 = pairings.find((p) => p.tableNumber === 1)!;
    const table1Points =
      players.find((p) => p.id === table1.p1)!.matchPoints +
      players.find((p) => p.id === table1.p2)!.matchPoints;

    for (const p of pairings) {
      if (p.tableNumber !== 1) {
        const otherPoints =
          players.find((pl) => pl.id === p.p1)!.matchPoints +
          players.find((pl) => pl.id === p.p2)!.matchPoints;
        expect(table1Points).toBeGreaterThanOrEqual(otherPoints);
      }
    }
  });
});

describe("Determinism", () => {
  it("produces identical output for same input", () => {
    const players = makePlayers(8, [9, 6, 6, 6, 3, 3, 3, 0]);
    const r1 = generatePairings(players);
    const r2 = generatePairings(players);
    expect(r1.pairings).toEqual(r2.pairings);
    expect(r1.byePlayer).toBe(r2.byePlayer);
  });
});

describe("Edge Cases", () => {
  it("handles minimum 2 players", () => {
    const { pairings } = generatePairings(makePlayers(2));
    expect(pairings).toHaveLength(1);
  });

  it("throws for all dropped", () => {
    const players: PlayerInput[] = [
      { id: "P001", matchPoints: 0, isDropped: true, hasBye: false, opponents: [] },
      { id: "P002", matchPoints: 0, isDropped: true, hasBye: false, opponents: [] },
    ];
    expect(() => generatePairings(players)).toThrow("at least 2 active");
  });
});

describe("Incomplete Pairing Detection", () => {
  it("throws when partial matching leaves players unpaired", () => {
    // 6 players: A, B, C have all played D, E, F. D, E, F have all played each other.
    // So D, E, F have NO valid opponents left. A-B-C can form at most 1 pair (3 is odd).
    // Blossom will pair some but leave others out — must throw, not silently drop.
    const players: PlayerInput[] = [
      { id: "A", matchPoints: 6, isDropped: false, hasBye: false, opponents: ["D", "E", "F"] },
      { id: "B", matchPoints: 6, isDropped: false, hasBye: false, opponents: ["D", "E", "F"] },
      { id: "C", matchPoints: 6, isDropped: false, hasBye: false, opponents: ["D", "E", "F"] },
      { id: "D", matchPoints: 3, isDropped: false, hasBye: false, opponents: ["A", "B", "C", "E", "F"] },
      { id: "E", matchPoints: 3, isDropped: false, hasBye: false, opponents: ["A", "B", "C", "D", "F"] },
      { id: "F", matchPoints: 3, isDropped: false, hasBye: false, opponents: ["A", "B", "C", "D", "E"] },
    ];
    expect(() => generatePairings(players, [], { allowByes: false })).toThrow(
      "Failed to generate a complete pairing"
    );
  });

  it("throws for a fully isolated player and includes their ID in error", () => {
    // P003 has already played every other active player — completely isolated.
    const players: PlayerInput[] = [
      { id: "P001", matchPoints: 6, isDropped: false, hasBye: false, opponents: ["P003"] },
      { id: "P002", matchPoints: 6, isDropped: false, hasBye: false, opponents: ["P003"] },
      { id: "P003", matchPoints: 0, isDropped: false, hasBye: false, opponents: ["P001", "P002", "P004"] },
      { id: "P004", matchPoints: 3, isDropped: false, hasBye: false, opponents: ["P003"] },
    ];
    expect(() => generatePairings(players, [], { allowByes: false })).toThrow("P003");
  });

  it("error message lists all uncovered player IDs", () => {
    // D, E, F are all isolated (played everyone else). Error should list all three.
    const players: PlayerInput[] = [
      { id: "A", matchPoints: 6, isDropped: false, hasBye: false, opponents: ["D", "E", "F"] },
      { id: "B", matchPoints: 6, isDropped: false, hasBye: false, opponents: ["D", "E", "F"] },
      { id: "C", matchPoints: 6, isDropped: false, hasBye: false, opponents: ["D", "E", "F"] },
      { id: "D", matchPoints: 3, isDropped: false, hasBye: false, opponents: ["A", "B", "C", "E", "F"] },
      { id: "E", matchPoints: 3, isDropped: false, hasBye: false, opponents: ["A", "B", "C", "D", "F"] },
      { id: "F", matchPoints: 3, isDropped: false, hasBye: false, opponents: ["A", "B", "C", "D", "E"] },
    ];
    try {
      generatePairings(players, [], { allowByes: false });
      expect.fail("Should have thrown");
    } catch (e: unknown) {
      const msg = (e as Error).message;
      expect(msg).toContain("D");
      expect(msg).toContain("E");
      expect(msg).toContain("F");
    }
  });
});
