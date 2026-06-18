"""Pydantic models for the pairing service API."""

from __future__ import annotations

from pydantic import BaseModel, Field


class PlayerInput(BaseModel):
    """A player with their tournament state, sent to the pairing service."""

    id: str = Field(description="pokemon_player_id / POP ID")
    match_points: int = Field(default=0, ge=0, description="Accumulated match points")
    is_dropped: bool = Field(default=False, description="Whether the player has dropped")
    has_bye: bool = Field(default=False, description="Whether the player already received a bye")
    opponents: list[str] = Field(
        default_factory=list,
        description="List of opponent IDs already faced (for rematch exclusion)",
    )


class PairingRecord(BaseModel):
    """A historical pairing record, used for rematch prevention."""

    p1: str = Field(description="Player 1 POP ID")
    p2: str = Field(description="Player 2 POP ID")
    round: int = Field(description="Round number where this pairing occurred")


class PairingConfig(BaseModel):
    """Configuration for pairing generation."""

    allow_byes: bool = Field(default=True, description="Allow bye assignment for odd player count")


class PairingRequest(BaseModel):
    """Request body for POST /pair."""

    players: list[PlayerInput] = Field(min_length=2, description="Active players to pair")
    previous_pairings: list[PairingRecord] = Field(
        default_factory=list,
        description="All previous pairings in this tournament",
    )
    config: PairingConfig = Field(default_factory=PairingConfig)


class PairingOutput(BaseModel):
    """A single pairing result."""

    p1: str = Field(description="Player 1 POP ID")
    p2: str = Field(description="Player 2 POP ID")
    table_number: int = Field(description="Assigned table number")


class PairingResponse(BaseModel):
    """Response from POST /pair."""

    pairings: list[PairingOutput] = Field(description="Generated pairings")
    bye_player: str | None = Field(default=None, description="POP ID of bye recipient, if any")


# --- Tiebreaker models ---


class PlayerRecord(BaseModel):
    """A player's full record for tiebreaker calculation."""

    id: str
    match_points: int = 0
    rounds_played: int = 0
    opponents: list[str] = Field(default_factory=list, description="Opponent IDs faced (excluding bye)")
    has_bye: bool = False


class StandingEntry(BaseModel):
    """Computed standing for a single player."""

    player_id: str
    rank: int = 0
    match_points: int = 0
    mwp: float = 0.0
    omwp: float = 0.0
    oomwp: float = 0.0


class StandingsRequest(BaseModel):
    """Request body for POST /standings."""

    players: list[PlayerRecord]


class StandingsResponse(BaseModel):
    """Response from POST /standings."""

    standings: list[StandingEntry]


# --- Bracket models ---


class BracketMatchOutput(BaseModel):
    """A single match slot in a bracket."""

    bracket_round: int = Field(description="Round in bracket: 1=QF, 2=SF, 3=F etc.")
    bracket_position: int = Field(description="Position within the round (0-indexed)")
    player1_id: str | None = None
    player2_id: str | None = None
    feeds_winner_to_round: int | None = None
    feeds_winner_to_position: int | None = None


class BracketRequest(BaseModel):
    """Request body for POST /bracket."""

    seeds: list[str] = Field(
        description="Ordered list of player IDs by seed (index 0 = seed 1)",
        min_length=2,
    )
    top_cut_size: int = Field(description="Number of players in top cut (4, 8, 16, 32)")


class BracketResponse(BaseModel):
    """Response from POST /bracket."""

    matches: list[BracketMatchOutput]
