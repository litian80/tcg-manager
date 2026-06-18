"""Tests for single-elimination bracket generation."""

import pytest

from app.bracket import generate_single_elim_bracket, _standard_seeding
from app.models import BracketRequest


class TestSeeding:
    """Standard tournament bracket seeding."""

    def test_2_player_seeding(self):
        """2-player seeding: [0, 1] → Seed1 vs Seed2."""
        assert _standard_seeding(2) == [0, 1]

    def test_4_player_seeding(self):
        """4-player seeding: 1v4, 2v3."""
        order = _standard_seeding(4)
        # First match: seed 0 (1st) vs seed 3 (4th)
        assert order[0] == 0
        assert order[1] == 3
        # Second match: seed 1 (2nd) vs seed 2 (3rd)
        assert order[2] == 1
        assert order[3] == 2

    def test_8_player_seeding(self):
        """8-player seeding: 1v8, 4v5, 2v7, 3v6."""
        order = _standard_seeding(8)
        pairs = [(order[i], order[i + 1]) for i in range(0, 8, 2)]
        expected_pairs = [(0, 7), (3, 4), (1, 6), (2, 5)]
        assert pairs == expected_pairs


class TestBracketGeneration:
    """Bracket structure generation."""

    def test_4_player_bracket(self):
        """Top 4 bracket: 2 rounds (SF + F), 3 matches total."""
        seeds = ["P1", "P2", "P3", "P4"]
        req = BracketRequest(seeds=seeds, top_cut_size=4)
        matches = generate_single_elim_bracket(req)

        assert len(matches) == 3  # 2 SF + 1 F

        # Round 1 (SF): 2 matches
        r1 = [m for m in matches if m.bracket_round == 1]
        assert len(r1) == 2

        # Round 2 (F): 1 match
        r2 = [m for m in matches if m.bracket_round == 2]
        assert len(r2) == 1

    def test_8_player_bracket(self):
        """Top 8 bracket: 3 rounds (QF + SF + F), 7 matches total."""
        seeds = [f"P{i+1}" for i in range(8)]
        req = BracketRequest(seeds=seeds, top_cut_size=8)
        matches = generate_single_elim_bracket(req)

        assert len(matches) == 7  # 4 QF + 2 SF + 1 F

    def test_seeding_in_bracket(self):
        """Seed 1 should face seed 4's side, not seed 2 directly."""
        seeds = ["P1", "P2", "P3", "P4"]
        req = BracketRequest(seeds=seeds, top_cut_size=4)
        matches = generate_single_elim_bracket(req)

        r1 = [m for m in matches if m.bracket_round == 1]
        # SF1 should be Seed1 (P1) vs Seed4 (P4)
        sf1_players = {r1[0].player1_id, r1[0].player2_id}
        assert sf1_players == {"P1", "P4"}

        # SF2 should be Seed2 (P2) vs Seed3 (P3)
        sf2_players = {r1[1].player1_id, r1[1].player2_id}
        assert sf2_players == {"P2", "P3"}

    def test_winners_feed_correctly(self):
        """Winners of round 1 should feed into round 2."""
        seeds = ["P1", "P2", "P3", "P4"]
        req = BracketRequest(seeds=seeds, top_cut_size=4)
        matches = generate_single_elim_bracket(req)

        r1 = [m for m in matches if m.bracket_round == 1]
        # Both SF matches should feed winners to round 2
        for m in r1:
            assert m.feeds_winner_to_round == 2
            assert m.feeds_winner_to_position is not None

    def test_final_has_no_feed(self):
        """The final match should not feed anywhere."""
        seeds = ["P1", "P2", "P3", "P4"]
        req = BracketRequest(seeds=seeds, top_cut_size=4)
        matches = generate_single_elim_bracket(req)

        final = [m for m in matches if m.bracket_round == 2]
        assert len(final) == 1
        assert final[0].feeds_winner_to_round is None

    def test_16_player_bracket(self):
        """Top 16 bracket: 4 rounds, 15 matches total."""
        seeds = [f"P{i+1}" for i in range(16)]
        req = BracketRequest(seeds=seeds, top_cut_size=16)
        matches = generate_single_elim_bracket(req)

        assert len(matches) == 15

    def test_invalid_size_not_power_of_2(self):
        """Non-power-of-2 top cut size should raise ValueError."""
        seeds = [f"P{i+1}" for i in range(6)]
        req = BracketRequest(seeds=seeds, top_cut_size=6)
        with pytest.raises(ValueError, match="power of 2"):
            generate_single_elim_bracket(req)

    def test_too_few_seeds(self):
        """Fewer seeds than top_cut_size should raise ValueError."""
        seeds = ["P1", "P2"]
        req = BracketRequest(seeds=seeds, top_cut_size=4)
        with pytest.raises(ValueError, match="Need at least 4 seeds"):
            generate_single_elim_bracket(req)
