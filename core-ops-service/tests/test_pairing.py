"""Tests for the Swiss pairing engine."""

import pytest

from app.models import PairingConfig, PairingRecord, PairingRequest, PlayerInput
from app.pairing import generate_pairings


def _make_players(count: int, points: list[int] | None = None) -> list[PlayerInput]:
    """Helper to create N players with optional match points."""
    pts = points or [0] * count
    return [
        PlayerInput(id=f"P{i+1:03d}", match_points=pts[i])
        for i in range(count)
    ]


class TestBasicPairing:
    """Basic pairing functionality."""

    def test_two_players(self):
        """Two players should be paired together."""
        players = _make_players(2)
        req = PairingRequest(players=players)
        pairings, bye = generate_pairings(req)

        assert len(pairings) == 1
        assert bye is None
        assert {pairings[0].p1, pairings[0].p2} == {"P001", "P002"}

    def test_four_players(self):
        """Four players should produce two pairings, no bye."""
        players = _make_players(4)
        req = PairingRequest(players=players)
        pairings, bye = generate_pairings(req)

        assert len(pairings) == 2
        assert bye is None

        # All 4 players should appear exactly once
        all_ids = set()
        for p in pairings:
            all_ids.add(p.p1)
            all_ids.add(p.p2)
        assert all_ids == {"P001", "P002", "P003", "P004"}

    def test_six_players(self):
        """Six players should produce three pairings, no bye."""
        players = _make_players(6)
        req = PairingRequest(players=players)
        pairings, bye = generate_pairings(req)

        assert len(pairings) == 3
        assert bye is None

    def test_large_even(self):
        """20 players should produce 10 pairings, no bye."""
        players = _make_players(20)
        req = PairingRequest(players=players)
        pairings, bye = generate_pairings(req)

        assert len(pairings) == 10
        assert bye is None


class TestByeHandling:
    """Bye assignment for odd player counts."""

    def test_three_players_one_bye(self):
        """Three players: 1 pairing + 1 bye."""
        players = _make_players(3)
        req = PairingRequest(players=players)
        pairings, bye = generate_pairings(req)

        assert len(pairings) == 1
        assert bye is not None
        assert bye in {"P001", "P002", "P003"}

    def test_five_players_one_bye(self):
        """Five players: 2 pairings + 1 bye."""
        players = _make_players(5)
        req = PairingRequest(players=players)
        pairings, bye = generate_pairings(req)

        assert len(pairings) == 2
        assert bye is not None

    def test_bye_goes_to_lowest_ranked(self):
        """Bye should go to the lowest-ranked player (fewest match points)."""
        # P001=9pts, P002=6pts, P003=3pts → P003 should get bye
        players = _make_players(3, points=[9, 6, 3])
        req = PairingRequest(players=players)
        pairings, bye = generate_pairings(req)

        assert bye == "P003"

    def test_no_double_bye(self):
        """A player who already had a bye should not get another."""
        players = [
            PlayerInput(id="P001", match_points=9, has_bye=False),
            PlayerInput(id="P002", match_points=6, has_bye=False),
            PlayerInput(id="P003", match_points=3, has_bye=True),  # already had bye
        ]
        req = PairingRequest(players=players)
        pairings, bye = generate_pairings(req)

        assert bye is not None
        assert bye != "P003"  # P003 can't get bye again

    def test_byes_disabled(self):
        """If byes are disabled, odd players should still be handled."""
        players = _make_players(3)
        req = PairingRequest(
            players=players,
            config=PairingConfig(allow_byes=False),
        )
        pairings, bye = generate_pairings(req)
        # Without byes, one player will be unpaired
        # The matching should still work with 1 pairing
        assert len(pairings) == 1
        assert bye is None


class TestRematchPrevention:
    """Previous opponents should never be paired again."""

    def test_no_rematch_via_opponents_field(self):
        """Players who list each other as opponents should not be paired."""
        players = [
            PlayerInput(id="P001", match_points=6, opponents=["P002"]),
            PlayerInput(id="P002", match_points=6, opponents=["P001"]),
            PlayerInput(id="P003", match_points=3),
            PlayerInput(id="P004", match_points=3),
        ]
        req = PairingRequest(players=players)
        pairings, bye = generate_pairings(req)

        for p in pairings:
            pair = {p.p1, p.p2}
            assert pair != {"P001", "P002"}, "P001 and P002 should not be re-paired"

    def test_no_rematch_via_pairing_history(self):
        """Previous pairings from history should prevent rematches."""
        players = _make_players(4, points=[6, 6, 3, 3])
        history = [PairingRecord(p1="P001", p2="P002", round=1)]
        req = PairingRequest(players=players, previous_pairings=history)
        pairings, bye = generate_pairings(req)

        for p in pairings:
            pair = {p.p1, p.p2}
            assert pair != {"P001", "P002"}, "P001 and P002 should not be re-paired"


class TestScoreGroupPairing:
    """Players in the same score group should be preferentially paired."""

    def test_same_points_paired(self):
        """Players with the same match points should be paired together."""
        # Two at 6pts, two at 3pts → should pair within score groups
        players = _make_players(4, points=[6, 6, 3, 3])
        req = PairingRequest(players=players)
        pairings, bye = generate_pairings(req)

        # The 6-point players should be paired together
        pairs = [{p.p1, p.p2} for p in pairings]
        assert {"P001", "P002"} in pairs
        assert {"P003", "P004"} in pairs

    def test_no_cross_group_when_intra_group_available(self):
        """Regression: 2-0-0 player must NOT be paired with 0-0-2 player
        when same-group pairings are available.

        Reproduces the DG Champions Round 3 Table 3 bug where the old
        linear weight scheme (1000 - diff*100) allowed the Blossom global
        optimizer to pair a 6pt player with a 2pt player.
        """
        # Simulate the actual tournament state entering Round 3:
        # 5 players at 6pts (2-0-0), 4 at 4pts (1-0-1), 6 at 3pts (1-1-0),
        # 2 at 2pts (0-0-2), 4 at 1pts (0-1-1), 4 at 0pts (0-2-0), 3 at 0pts
        # Simplified: just the key groups that trigger the bug
        players = [
            # 6-point group (5 players — odd, so 1 must float)
            PlayerInput(id="A1", match_points=6, opponents=["X1"]),
            PlayerInput(id="A2", match_points=6, opponents=["X2"]),
            PlayerInput(id="A3", match_points=6, opponents=["X3"]),
            PlayerInput(id="A4", match_points=6, opponents=["X4"]),
            PlayerInput(id="A5", match_points=6, opponents=["X5"]),
            # 4-point group (4 players)
            PlayerInput(id="B1", match_points=4, opponents=["Y1"]),
            PlayerInput(id="B2", match_points=4, opponents=["Y2"]),
            PlayerInput(id="B3", match_points=4, opponents=["Y3"]),
            PlayerInput(id="B4", match_points=4, opponents=["Y4"]),
            # 3-point group (8 players)
            PlayerInput(id="C1", match_points=3, opponents=["Z1"]),
            PlayerInput(id="C2", match_points=3, opponents=["Z2"]),
            PlayerInput(id="C3", match_points=3, opponents=["Z3"]),
            PlayerInput(id="C4", match_points=3, opponents=["Z4"]),
            PlayerInput(id="C5", match_points=3, opponents=["Z5"]),
            PlayerInput(id="C6", match_points=3, opponents=["Z6"]),
            PlayerInput(id="C7", match_points=3, opponents=["Z7"]),
            PlayerInput(id="C8", match_points=3, opponents=["Z8"]),
            # 2-point group (2 players)
            PlayerInput(id="D1", match_points=2, opponents=["W1"]),
            PlayerInput(id="D2", match_points=2, opponents=["W2"]),
            # 0-point group (8 players)
            PlayerInput(id="E1", match_points=0, opponents=["V1"]),
            PlayerInput(id="E2", match_points=0, opponents=["V2"]),
            PlayerInput(id="E3", match_points=0, opponents=["V3"]),
            PlayerInput(id="E4", match_points=0, opponents=["V4"]),
            PlayerInput(id="E5", match_points=0, opponents=["V5"]),
            PlayerInput(id="E6", match_points=0, opponents=["V6"]),
            PlayerInput(id="E7", match_points=0, opponents=["V7"]),
            PlayerInput(id="E8", match_points=0, opponents=["V8"]),
        ]
        req = PairingRequest(players=players)
        pairings, bye = generate_pairings(req)

        pairs = [{p.p1, p.p2} for p in pairings]

        # With 5 players in the 6pt group, exactly 2 pairs should be
        # within the group. The 5th player floats down.
        six_pt_ids = {"A1", "A2", "A3", "A4", "A5"}
        intra_six_pairs = [p for p in pairs if p.issubset(six_pt_ids)]
        assert len(intra_six_pairs) == 2, (
            f"Expected 2 intra-6pt-group pairs, got {len(intra_six_pairs)}: {intra_six_pairs}"
        )

        # No 6pt player should be paired with a 2pt or 0pt player
        low_pt_ids = {"D1", "D2", "E1", "E2", "E3", "E4", "E5", "E6", "E7", "E8"}
        for pair in pairs:
            cross = pair & six_pt_ids
            low = pair & low_pt_ids
            assert not (cross and low), (
                f"6pt player paired with low-point player: {pair}"
            )


class TestDroppedPlayers:
    """Dropped players should be excluded from pairings."""

    def test_dropped_excluded(self):
        """Dropped players should not appear in any pairing."""
        players = [
            PlayerInput(id="P001", match_points=6, is_dropped=False),
            PlayerInput(id="P002", match_points=6, is_dropped=True),  # dropped
            PlayerInput(id="P003", match_points=3, is_dropped=False),
            PlayerInput(id="P004", match_points=3, is_dropped=False),
        ]
        req = PairingRequest(players=players)
        pairings, bye = generate_pairings(req)

        all_ids = set()
        for p in pairings:
            all_ids.add(p.p1)
            all_ids.add(p.p2)
        if bye:
            all_ids.add(bye)

        assert "P002" not in all_ids


class TestTableAssignment:
    """Table numbers should be assigned by match points descending."""

    def test_table_numbers_sequential(self):
        """Table numbers should start at 1 and be sequential."""
        players = _make_players(6)
        req = PairingRequest(players=players)
        pairings, _ = generate_pairings(req)

        tables = [p.table_number for p in pairings]
        assert sorted(tables) == [1, 2, 3]

    def test_highest_points_get_table_1(self):
        """The highest-scoring pairing should get table 1."""
        players = _make_players(4, points=[9, 3, 6, 0])
        req = PairingRequest(players=players)
        pairings, _ = generate_pairings(req)

        # Table 1 should have the highest combined score
        table1 = next(p for p in pairings if p.table_number == 1)
        table1_points = (
            next(pl for pl in players if pl.id == table1.p1).match_points
            + next(pl for pl in players if pl.id == table1.p2).match_points
        )

        for p in pairings:
            if p.table_number != 1:
                other_points = (
                    next(pl for pl in players if pl.id == p.p1).match_points
                    + next(pl for pl in players if pl.id == p.p2).match_points
                )
                assert table1_points >= other_points


class TestDeterminism:
    """Pairing results should be deterministic."""

    def test_same_input_same_output(self):
        """Running the same input twice should produce identical output."""
        players = _make_players(8, points=[9, 6, 6, 6, 3, 3, 3, 0])
        req = PairingRequest(players=players)

        result1 = generate_pairings(req)
        result2 = generate_pairings(req)

        assert result1[0] == result2[0]  # pairings
        assert result1[1] == result2[1]  # bye player


class TestEdgeCases:
    """Edge cases and error handling."""

    def test_minimum_players(self):
        """Two players is the minimum."""
        players = _make_players(2)
        req = PairingRequest(players=players)
        pairings, bye = generate_pairings(req)
        assert len(pairings) == 1

    def test_too_few_active_raises(self):
        """All players dropped should raise ValueError."""
        players = [
            PlayerInput(id="P001", is_dropped=True),
            PlayerInput(id="P002", is_dropped=True),
        ]
        req = PairingRequest(players=players)
        with pytest.raises(ValueError, match="at least 2 active"):
            generate_pairings(req)
