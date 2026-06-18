"""Single-elimination bracket generator.

Generates a balanced bracket tree for top-cut play.
Supports standard sizes: 4, 8, 16, 32 players.

Seeding follows standard tournament bracket seeding where:
  - Seed 1 is placed to potentially meet Seed 2 in the final
  - Seed 1 and Seed 4 are on the same side, Seed 2 and Seed 3 on the other
  - This pattern recursively applies for larger brackets
"""

from __future__ import annotations

import math

from .models import BracketMatchOutput, BracketRequest


def _standard_seeding(num_players: int) -> list[int]:
    """Generate standard tournament bracket seeding order.

    For a bracket of size N, returns a list of seed indices (0-based)
    arranged so that higher seeds meet lower seeds first.

    Example for 8 players: [0, 7, 3, 4, 1, 6, 2, 5]
    This means: Seed1 vs Seed8, Seed4 vs Seed5, Seed2 vs Seed7, Seed3 vs Seed6
    """
    if num_players == 1:
        return [0]
    if num_players == 2:
        return [0, 1]

    # Recursive: split the bracket into two halves
    half = num_players // 2
    upper = _standard_seeding(half)
    lower = _standard_seeding(half)

    result = []
    for i in range(half):
        result.append(upper[i])
        result.append(num_players - 1 - lower[i])

    return result


def generate_single_elim_bracket(request: BracketRequest) -> list[BracketMatchOutput]:
    """Generate a single-elimination bracket.

    Args:
        request: BracketRequest with seeds list and top_cut_size.

    Returns:
        List of BracketMatchOutput representing all matches in the bracket.

    Raises:
        ValueError: If top_cut_size is not a power of 2, or seeds don't match size.
    """
    size = request.top_cut_size

    # Validate power of 2
    if size < 2 or (size & (size - 1)) != 0:
        raise ValueError(f"top_cut_size must be a power of 2, got {size}")

    if len(request.seeds) < size:
        raise ValueError(
            f"Need at least {size} seeds for top cut of {size}, got {len(request.seeds)}"
        )

    num_rounds = int(math.log2(size))
    seeds = request.seeds[:size]  # Take only top N

    # Generate seeding order
    seeding_order = _standard_seeding(size)

    matches: list[BracketMatchOutput] = []

    # Round 1: pair seeds according to bracket seeding
    round1_matches = size // 2
    for pos in range(round1_matches):
        seed_a_idx = seeding_order[pos * 2]
        seed_b_idx = seeding_order[pos * 2 + 1]

        player1 = seeds[seed_a_idx] if seed_a_idx < len(seeds) else None
        player2 = seeds[seed_b_idx] if seed_b_idx < len(seeds) else None

        # Determine where the winner feeds into
        next_round = 2 if num_rounds > 1 else None
        next_position = pos // 2 if next_round else None

        matches.append(
            BracketMatchOutput(
                bracket_round=1,
                bracket_position=pos,
                player1_id=player1,
                player2_id=player2,
                feeds_winner_to_round=next_round,
                feeds_winner_to_position=next_position,
            )
        )

    # Subsequent rounds: empty slots that get filled as matches complete
    for round_num in range(2, num_rounds + 1):
        matches_in_round = size // (2**round_num)
        for pos in range(matches_in_round):
            next_round = round_num + 1 if round_num < num_rounds else None
            next_position = pos // 2 if next_round else None

            matches.append(
                BracketMatchOutput(
                    bracket_round=round_num,
                    bracket_position=pos,
                    player1_id=None,  # TBD — winner of previous round
                    player2_id=None,
                    feeds_winner_to_round=next_round,
                    feeds_winner_to_position=next_position,
                )
            )

    return matches
