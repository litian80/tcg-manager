"""Swiss pairing engine using NetworkX maximum weight matching (Blossom algorithm).

The engine constructs a weighted graph where:
  - Each active player is a node
  - Edge weights encode Swiss pairing preferences
  - Edges are REMOVED between previous opponents (hard constraint)
  - A dummy "BYE" node is added for odd player counts

Edge Weight Scheme:
  Same score group:     BASE = 1000
  Cross score group:    BASE = 1000 - |point_diff| × 100
  Previous opponents:   Edge REMOVED entirely
  Bye Dummy Node:       weight = rank_order (lower ranked → higher weight)
                        Edge removed if player already had a bye

Determinism:
  Edge list sorted by (min(p1, p2), max(p1, p2)) before matching.
"""

from __future__ import annotations

import networkx as nx

from .models import PairingOutput, PairingRequest, PlayerInput

# Sentinel ID for the bye dummy node
BYE_SENTINEL = "__BYE__"


def _build_opponent_set(request: PairingRequest) -> dict[str, set[str]]:
    """Build a lookup of previous opponents for each player."""
    opponents: dict[str, set[str]] = {}
    for p in request.players:
        opponents.setdefault(p.id, set())
        for opp in p.opponents:
            opponents[p.id].add(opp)
    # Also use explicit pairing history
    for rec in request.previous_pairings:
        opponents.setdefault(rec.p1, set()).add(rec.p2)
        opponents.setdefault(rec.p2, set()).add(rec.p1)
    return opponents


def _compute_edge_weight(p1: PlayerInput, p2: PlayerInput) -> int:
    """Compute the edge weight between two real players.

    Higher weight = more desirable pairing.
    Same score group gets BASE=1000.
    Cross score group gets penalized by point difference.
    """
    point_diff = abs(p1.match_points - p2.match_points)
    if point_diff == 0:
        return 1000
    # Cross-group: penalty grows with point difference
    # Floor at 1 to ensure the edge is still considered
    return max(1, 1000 - point_diff * 100)


def generate_pairings(request: PairingRequest) -> tuple[list[PairingOutput], str | None]:
    """Generate Swiss pairings using Blossom algorithm.

    Args:
        request: PairingRequest with players, previous pairings, and config.

    Returns:
        Tuple of (list of PairingOutput, bye_player_id or None).

    Raises:
        ValueError: If pairing is impossible (e.g., all players have faced each other).
    """
    # Filter to active (non-dropped) players
    active_players = [p for p in request.players if not p.is_dropped]

    if len(active_players) < 2:
        raise ValueError("Need at least 2 active players to generate pairings.")

    opponent_sets = _build_opponent_set(request)
    needs_bye = len(active_players) % 2 == 1

    # Build graph
    G = nx.Graph()

    # Add player nodes
    for p in active_players:
        G.add_node(p.id)

    # Add bye node if needed
    if needs_bye and request.config.allow_byes:
        G.add_node(BYE_SENTINEL)

    # Sort players by match_points descending for rank ordering
    sorted_players = sorted(active_players, key=lambda p: p.match_points, reverse=True)
    player_rank = {p.id: rank for rank, p in enumerate(sorted_players)}
    player_map = {p.id: p for p in active_players}

    # Add edges between all player pairs (excluding previous opponents)
    player_ids = [p.id for p in active_players]
    for i in range(len(player_ids)):
        for j in range(i + 1, len(player_ids)):
            pid1 = player_ids[i]
            pid2 = player_ids[j]

            # Hard constraint: no rematches
            if pid2 in opponent_sets.get(pid1, set()):
                continue

            weight = _compute_edge_weight(player_map[pid1], player_map[pid2])
            # Ensure deterministic ordering of the edge tuple
            edge = tuple(sorted([pid1, pid2]))
            G.add_edge(edge[0], edge[1], weight=weight)

    # Add bye edges
    if needs_bye and request.config.allow_byes:
        for p in active_players:
            if p.has_bye:
                # Player already had a bye — don't add edge
                continue
            # Lower-ranked players get higher weight for bye (more likely to get bye)
            bye_weight = player_rank[p.id] + 1  # rank 0 → weight 1, rank N → weight N+1
            edge = tuple(sorted([p.id, BYE_SENTINEL]))
            G.add_edge(edge[0], edge[1], weight=bye_weight)

    # Run Blossom algorithm
    matching = nx.max_weight_matching(G, maxcardinality=True)

    if not matching:
        raise ValueError("Failed to generate pairings — no valid matching found.")

    # Extract results
    pairings: list[tuple[str, str]] = []
    bye_player: str | None = None

    for u, v in matching:
        # Normalize order
        a, b = (u, v) if u < v else (v, u)

        if BYE_SENTINEL in (a, b):
            bye_player = a if b == BYE_SENTINEL else b
        else:
            pairings.append((a, b))

    # Sort pairings by combined match points descending (highest scoring tables first)
    pairings.sort(
        key=lambda pair: player_map[pair[0]].match_points + player_map[pair[1]].match_points,
        reverse=True,
    )

    # Assign table numbers (1-indexed, highest scoring pair = table 1)
    pairing_outputs = [
        PairingOutput(
            p1=p1,
            p2=p2,
            table_number=table_num,
        )
        for table_num, (p1, p2) in enumerate(pairings, start=1)
    ]

    return pairing_outputs, bye_player
