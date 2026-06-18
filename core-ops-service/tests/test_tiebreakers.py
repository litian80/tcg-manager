"""Tests for tiebreaker calculations."""

import pytest

from app.constants import MWP_FLOOR
from app.models import PlayerRecord
from app.tiebreakers import compute_mwp, compute_omwp, compute_oomwp, compute_standings


class TestMWP:
    """Match Win Percentage calculation."""

    def test_perfect_record(self):
        """3 wins in 3 rounds = 1.0 (100%)."""
        p = PlayerRecord(id="P1", match_points=9, rounds_played=3)
        assert compute_mwp(p) == 1.0

    def test_zero_wins(self):
        """0 wins in 3 rounds should be floored at 25%."""
        p = PlayerRecord(id="P1", match_points=0, rounds_played=3)
        assert compute_mwp(p) == MWP_FLOOR

    def test_one_win_three_rounds(self):
        """1 win in 3 rounds = 3/9 = 0.3333."""
        p = PlayerRecord(id="P1", match_points=3, rounds_played=3)
        mwp = compute_mwp(p)
        assert abs(mwp - 0.3333) < 0.001

    def test_floor_applied(self):
        """1 win in 5 rounds = 3/15 = 0.2 → floored to 0.25."""
        p = PlayerRecord(id="P1", match_points=3, rounds_played=5)
        assert compute_mwp(p) == MWP_FLOOR

    def test_zero_rounds(self):
        """Zero rounds played returns floor."""
        p = PlayerRecord(id="P1", match_points=0, rounds_played=0)
        assert compute_mwp(p) == MWP_FLOOR

    def test_tie_points(self):
        """1 win + 1 tie = 4 points in 2 rounds = 4/6 ≈ 0.6667."""
        p = PlayerRecord(id="P1", match_points=4, rounds_played=2)
        mwp = compute_mwp(p)
        assert abs(mwp - 0.6667) < 0.001


class TestOMWP:
    """Opponent's Match Win Percentage."""

    def test_single_opponent(self):
        """OMWP with one opponent = that opponent's MWP."""
        players = {
            "P1": PlayerRecord(id="P1", match_points=6, rounds_played=3, opponents=["P2"]),
            "P2": PlayerRecord(id="P2", match_points=9, rounds_played=3, opponents=["P1"]),
        }
        omwp = compute_omwp(players["P1"], players)
        # P2's MWP = 9/9 = 1.0
        assert abs(omwp - 1.0) < 0.001

    def test_multiple_opponents(self):
        """OMWP with two opponents = average of their MWPs."""
        players = {
            "P1": PlayerRecord(id="P1", match_points=6, rounds_played=3, opponents=["P2", "P3"]),
            "P2": PlayerRecord(id="P2", match_points=9, rounds_played=3, opponents=["P1"]),
            "P3": PlayerRecord(id="P3", match_points=3, rounds_played=3, opponents=["P1"]),
        }
        omwp = compute_omwp(players["P1"], players)
        # P2's MWP = 1.0, P3's MWP = 0.3333, avg ≈ 0.6667
        assert abs(omwp - 0.6667) < 0.001

    def test_opponent_floor_applied(self):
        """Each opponent's MWP is individually floored at 25%."""
        players = {
            "P1": PlayerRecord(id="P1", match_points=9, rounds_played=3, opponents=["P2"]),
            "P2": PlayerRecord(id="P2", match_points=0, rounds_played=3, opponents=["P1"]),
        }
        omwp = compute_omwp(players["P1"], players)
        # P2's raw MWP = 0/9 = 0.0 → floored to 0.25
        assert abs(omwp - 0.25) < 0.001

    def test_bye_excluded(self):
        """Byes should not be counted in OMWP calculation.

        The opponents list should only contain real opponents (not byes).
        This is handled by the caller — they exclude bye opponents from the list.
        Here we test that unknown opponents in the list are gracefully ignored.
        """
        players = {
            "P1": PlayerRecord(id="P1", match_points=6, rounds_played=2, opponents=["P2", "BYE_GHOST"]),
            "P2": PlayerRecord(id="P2", match_points=3, rounds_played=2, opponents=["P1"]),
        }
        omwp = compute_omwp(players["P1"], players)
        # BYE_GHOST is not in players dict → excluded
        # Only P2 counted: MWP = 3/6 = 0.5
        assert abs(omwp - 0.5) < 0.001

    def test_no_opponents(self):
        """No real opponents → OMWP defaults to floor."""
        players = {
            "P1": PlayerRecord(id="P1", match_points=3, rounds_played=1, opponents=[]),
        }
        omwp = compute_omwp(players["P1"], players)
        assert omwp == MWP_FLOOR


class TestOOMWP:
    """Opponent's Opponent's Match Win Percentage."""

    def test_basic_oomwp(self):
        """OOMWP = average of opponents' OMWPs."""
        players = {
            "P1": PlayerRecord(id="P1", match_points=6, rounds_played=2, opponents=["P2"]),
            "P2": PlayerRecord(id="P2", match_points=6, rounds_played=2, opponents=["P1", "P3"]),
            "P3": PlayerRecord(id="P3", match_points=3, rounds_played=2, opponents=["P2"]),
        }
        oomwp = compute_oomwp(players["P1"], players)
        # P2's OMWP = avg(P1.MWP, P3.MWP) = avg(1.0, 0.5) = 0.75
        # P1's OOMWP = P2's OMWP = 0.75
        assert abs(oomwp - 0.75) < 0.001


class TestStandings:
    """Full standings computation."""

    def test_sort_by_match_points(self):
        """Higher match points should rank higher."""
        players = [
            PlayerRecord(id="P1", match_points=9, rounds_played=3, opponents=["P2"]),
            PlayerRecord(id="P2", match_points=6, rounds_played=3, opponents=["P1"]),
            PlayerRecord(id="P3", match_points=3, rounds_played=3, opponents=[]),
        ]
        standings = compute_standings(players)
        assert standings[0].player_id == "P1"
        assert standings[1].player_id == "P2"
        assert standings[2].player_id == "P3"

    def test_ranks_assigned(self):
        """Ranks should be 1-indexed."""
        players = [
            PlayerRecord(id="P1", match_points=9, rounds_played=3),
            PlayerRecord(id="P2", match_points=6, rounds_played=3),
            PlayerRecord(id="P3", match_points=3, rounds_played=3),
        ]
        standings = compute_standings(players)
        assert standings[0].rank == 1
        assert standings[1].rank == 2
        assert standings[2].rank == 3

    def test_tied_ranks(self):
        """Players with identical stats should share the same rank."""
        players = [
            PlayerRecord(id="P1", match_points=6, rounds_played=3),
            PlayerRecord(id="P2", match_points=6, rounds_played=3),
            PlayerRecord(id="P3", match_points=3, rounds_played=3),
        ]
        standings = compute_standings(players)
        # P1 and P2 have same points and no opponents → same tiebreakers → tied rank
        assert standings[0].rank == standings[1].rank
        assert standings[2].rank == 3

    def test_tiebreaker_resolution(self):
        """Players with same match points should be sorted by OMWP."""
        # P1 beat P3 (weak), P2 beat P4 (strong)
        # Both have 3 points, but P2 has higher OMWP
        players = [
            PlayerRecord(id="P1", match_points=3, rounds_played=1, opponents=["P3"]),
            PlayerRecord(id="P2", match_points=3, rounds_played=1, opponents=["P4"]),
            PlayerRecord(id="P3", match_points=0, rounds_played=1, opponents=["P1"]),
            PlayerRecord(id="P4", match_points=6, rounds_played=2, opponents=["P2"]),
        ]
        standings = compute_standings(players)
        # P4 has 6pts → rank 1
        # P1 and P2 both have 3pts
        # P2's opponent P4 has MWP = 6/6 = 1.0
        # P1's opponent P3 has MWP = max(0.25, 0/3) = 0.25
        # So P2's OMWP (1.0) > P1's OMWP (0.25) → P2 ranks higher
        p2_entry = next(s for s in standings if s.player_id == "P2")
        p1_entry = next(s for s in standings if s.player_id == "P1")
        assert p2_entry.rank < p1_entry.rank

    def test_mwp_values_correct(self):
        """MWP values in standings should match manual calculation."""
        players = [
            PlayerRecord(id="P1", match_points=6, rounds_played=3),  # 6/9 = 0.6667
        ]
        standings = compute_standings(players)
        assert abs(standings[0].mwp - 0.6667) < 0.001
