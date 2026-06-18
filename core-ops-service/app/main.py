"""Core Ops Pairing Service — FastAPI application.

A stateless computation service for Swiss pairing, tiebreaker calculation,
and bracket generation. No database access, no authentication.
"""

from __future__ import annotations

from fastapi import FastAPI, HTTPException

from .bracket import generate_single_elim_bracket
from .models import (
    BracketRequest,
    BracketResponse,
    PairingRequest,
    PairingResponse,
    StandingsRequest,
    StandingsResponse,
)
from .pairing import generate_pairings
from .tiebreakers import compute_standings

app = FastAPI(
    title="Core Ops Pairing Service",
    description="Stateless computation service for Pokémon TCG tournament operations.",
    version="1.0.0",
)


@app.get("/health")
async def health_check():
    """Health check endpoint for Cloud Run."""
    return {"status": "ok"}


@app.post("/pair", response_model=PairingResponse)
async def pair_players(request: PairingRequest):
    """Generate Swiss pairings using Blossom algorithm.

    Receives player data with match points and previous opponents,
    returns optimal pairings with table assignments.
    """
    try:
        pairings, bye_player = generate_pairings(request)
        return PairingResponse(pairings=pairings, bye_player=bye_player)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/standings", response_model=StandingsResponse)
async def compute_standings_endpoint(request: StandingsRequest):
    """Compute standings with tiebreakers (MWP/OMWP/OOMWP).

    Receives player records, returns sorted standings with rank.
    """
    standings = compute_standings(request.players)
    return StandingsResponse(standings=standings)


@app.post("/bracket", response_model=BracketResponse)
async def generate_bracket(request: BracketRequest):
    """Generate a single-elimination bracket from seeded players.

    Receives ordered seed list, returns bracket match tree.
    """
    try:
        matches = generate_single_elim_bracket(request)
        return BracketResponse(matches=matches)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
