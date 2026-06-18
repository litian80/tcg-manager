"""Tiebreaker calculations per Pokémon TCG Tournament Rules.

Hierarchy:
  1. Match Points (descending)
  2. Opponent's Win Percentage (OMWP)
  3. Opponent's Opponent's Win Percentage (OOMWP)
  4. Head-to-Head (only if exactly 2 players tied)

Key rules:
  - Win% = match_points / (rounds_played × 3), floored at 25%
  - Bye opponents are excluded from OMWP/OOMWP calculation
  - Each opponent's Win% is individually floored at 25%
"""

from __future__ import annotations

from .constants import MWP_FLOOR
from .models import PlayerRecord, StandingEntry


def compute_mwp(player: PlayerRecord) -> float:
    """Compute Match Win Percentage for a player.

    MWP = match_points / (rounds_played × 3)
    Floored at 25% (0.25).
    """
    if player.rounds_played <= 0:
        return MWP_FLOOR
    raw = player.match_points / (player.rounds_played * 3)
    return max(MWP_FLOOR, raw)


def compute_omwp(player: PlayerRecord, all_players: dict[str, PlayerRecord]) -> float:
    """Compute Opponent's Match Win Percentage.

    Average of MWP of all real opponents (byes excluded).
    Each opponent's MWP is individually floored at 25%.
    """
    real_opponents = [
        opp_id for opp_id in player.opponents if opp_id in all_players
    ]
    if not real_opponents:
        return MWP_FLOOR

    total = sum(compute_mwp(all_players[opp_id]) for opp_id in real_opponents)
    return total / len(real_opponents)


def compute_oomwp(player: PlayerRecord, all_players: dict[str, PlayerRecord]) -> float:
    """Compute Opponent's Opponent's Match Win Percentage.

    Average of OMWP of all real opponents.
    """
    real_opponents = [
        opp_id for opp_id in player.opponents if opp_id in all_players
    ]
    if not real_opponents:
        return MWP_FLOOR

    total = sum(
        compute_omwp(all_players[opp_id], all_players) for opp_id in real_opponents
    )
    return total / len(real_opponents)


def compute_standings(players: list[PlayerRecord]) -> list[StandingEntry]:
    """Compute full standings with tiebreakers for all players.

    Returns a list of StandingEntry sorted by:
      1. match_points DESC
      2. OMWP DESC
      3. OOMWP DESC
    """
    player_map: dict[str, PlayerRecord] = {p.id: p for p in players}

    entries: list[StandingEntry] = []
    for p in players:
        mwp = compute_mwp(p)
        omwp = compute_omwp(p, player_map)
        oomwp = compute_oomwp(p, player_map)
        entries.append(
            StandingEntry(
                player_id=p.id,
                match_points=p.match_points,
                mwp=round(mwp, 4),
                omwp=round(omwp, 4),
                oomwp=round(oomwp, 4),
            )
        )

    # Sort: match_points DESC, omwp DESC, oomwp DESC
    entries.sort(key=lambda e: (e.match_points, e.omwp, e.oomwp), reverse=True)

    # Assign ranks (1-indexed, ties get same rank)
    for i, entry in enumerate(entries):
        if i == 0:
            entry.rank = 1
        else:
            prev = entries[i - 1]
            if (
                entry.match_points == prev.match_points
                and entry.omwp == prev.omwp
                and entry.oomwp == prev.oomwp
            ):
                entry.rank = prev.rank  # tied
            else:
                entry.rank = i + 1

    return entries
