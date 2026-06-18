"""Core Ops Pairing Service — Outcome constants and shared types."""


class Outcome:
    """TOM-compatible match outcome codes.

    These integer values are stored in public.matches.outcome and must remain
    backward-compatible with existing TOM data imports.
    """

    NOT_REPORTED = 0
    PLAYER1_WIN = 1
    PLAYER2_WIN = 2
    TIE = 3  # includes Intentional Draws
    BYE = 5

    @classmethod
    def is_decided(cls, outcome: int | None) -> bool:
        """Return True if the outcome represents a completed match."""
        return outcome in (cls.PLAYER1_WIN, cls.PLAYER2_WIN, cls.TIE, cls.BYE)

    @classmethod
    def label(cls, outcome: int | None) -> str:
        """Human-readable label for an outcome code."""
        labels = {
            cls.NOT_REPORTED: "Not Reported",
            cls.PLAYER1_WIN: "Player 1 Win",
            cls.PLAYER2_WIN: "Player 2 Win",
            cls.TIE: "Tie",
            cls.BYE: "Bye",
        }
        return labels.get(outcome, f"Unknown ({outcome})")  # type: ignore[arg-type]


# Match point values per Pokémon TCG Tournament Rules
MATCH_WIN_POINTS = 3
MATCH_TIE_POINTS = 1
MATCH_LOSS_POINTS = 0
MATCH_BYE_POINTS = 3  # Bye is treated as a win

# Tiebreaker constants
MWP_FLOOR = 0.25  # Minimum 25% for win percentage calculations
