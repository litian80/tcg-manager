import { describe, it, expect } from 'vitest'
import { parseDeckList, normalizeCardName, normalizeSetCode } from '@/utils/deck-validator'

describe('normalizeCardName', () => {
  it('normalizes curly apostrophes to straight ones', () => {
    expect(normalizeCardName('Professor\u2019s Research')).toBe("Professor's Research")
  })

  it('collapses multiple spaces', () => {
    expect(normalizeCardName('Entei  V')).toBe('Entei V')
  })

  it('trims whitespace', () => {
    expect(normalizeCardName('  Arven  ')).toBe('Arven')
  })

  it('normalizes em dashes to hyphens', () => {
    expect(normalizeCardName('Entei\u2014V')).toBe('Entei-V')
  })
})

describe('parseDeckList', () => {
  it('parses a standard Pokemon TCG Live format deck', () => {
    const deckText = `Pokémon: 2
2 Entei V BRS 22

Trainer: 4
4 Arven

Energy: 1
1 Basic {R} Energy SVE 2`

    const result = parseDeckList(deckText)

    expect(result.Pokemon).toHaveLength(1)
    expect(result.Pokemon[0].name).toBe('Entei V')
    expect(result.Pokemon[0].qty).toBe(2)
    expect(result.Pokemon[0].set).toBe('BRS')
    expect(result.Pokemon[0].number).toBe('22')

    expect(result.Trainer).toHaveLength(1)
    expect(result.Trainer[0].name).toBe('Arven')
    expect(result.Trainer[0].qty).toBe(4)

    expect(result.Energy).toHaveLength(1)
    expect(result.Energy[0].name).toBe('Fire Energy')
    expect(result.Energy[0].qty).toBe(1)

    expect(result.TotalCards).toBe(7)
    expect(result.Errors).toHaveLength(0)
  })

  it('handles Pokemon encoding variations', () => {
    const deck = `Pokemon: 1
1 Pikachu ex SFA 63`
    const result = parseDeckList(deck)
    expect(result.Pokemon).toHaveLength(1)
    expect(result.Pokemon[0].name).toBe('Pikachu ex')
  })

  it('skips "Total Cards: 60" lines from TCG Live', () => {
    const deck = `Pokémon: 1
1 Pikachu ex SFA 63
Total Cards: 60`
    const result = parseDeckList(deck)
    expect(result.Errors).toHaveLength(0)
    expect(result.TotalCards).toBe(1)
  })

  it('parses basic energy with type codes', () => {
    const deck = `Energy: 12
8 Basic {R} Energy SVE 2
4 Basic {G} Energy SVE 1`
    const result = parseDeckList(deck)
    expect(result.Energy).toHaveLength(2)
    expect(result.Energy[0].name).toBe('Fire Energy')
    expect(result.Energy[0].isBasicEnergy).toBe(true)
    expect(result.Energy[1].name).toBe('Grass Energy')
    expect(result.TotalCards).toBe(12)
  })

  it('parses name-only trainer cards', () => {
    const deck = `Trainer: 8
4 Arven
4 Boss's Orders`
    const result = parseDeckList(deck)
    expect(result.Trainer).toHaveLength(2)
    expect(result.Trainer[0].name).toBe('Arven')
    expect(result.Trainer[1].name).toBe("Boss's Orders")
  })

  it('reports errors for completely unparseable lines', () => {
    const deck = `Pokémon: 1
1 Pikachu ex SFA 63
!!! this is garbage`
    const result = parseDeckList(deck)
    expect(result.Errors).toHaveLength(1)
    expect(result.Errors[0].line).toBe('!!! this is garbage')
  })

  it('correctly sums total card count', () => {
    const deck = `Pokémon: 8
4 Charizard ex MEW 6
4 Charmander MEW 4

Trainer: 40
4 Arven
4 Iono
4 Rare Candy
4 Ultra Ball
4 Nest Ball
4 Battle VIP Pass
4 Lost Vacuum
4 Boss's Orders
4 Super Rod
4 Level Ball

Energy: 12
12 Basic {R} Energy SVE 2`

    const result = parseDeckList(deck)
    expect(result.TotalCards).toBe(60)
    expect(result.Errors).toHaveLength(0)
  })

  it('parses parenthesized format cards', () => {
    const deck = `Pokémon: 3
3 Munkidori (TWM-95)`
    const result = parseDeckList(deck)
    expect(result.Pokemon).toHaveLength(1)
    expect(result.Pokemon[0].name).toBe('Munkidori')
    expect(result.Pokemon[0].set).toBe('TWM')
    expect(result.Pokemon[0].number).toBe('95')
  })

  it('expands {X} type codes in special energy names', () => {
    const deck = `Energy: 6
2 Telepathic {P} Energy
2 Growing {G} Energy
2 Rocky {F} Energy`
    const result = parseDeckList(deck)
    expect(result.Energy).toHaveLength(3)
    expect(result.Energy[0].name).toBe('Telepathic Psychic Energy')
    expect(result.Energy[1].name).toBe('Growing Grass Energy')
    expect(result.Energy[2].name).toBe('Rocky Fighting Energy')
  })

  it('auto-detects energy in name-only format', () => {
    const deck = `Energy: 7
7 Darkness Energy`
    const result = parseDeckList(deck)
    expect(result.Energy).toHaveLength(1)
    expect(result.Energy[0].category).toBe('energy')
  })

  it('preserves card names starting with X (e.g. Xerosic)', () => {
    const deck = `Trainer: 1
1 Xerosic's Machinations SFA 64`
    const result = parseDeckList(deck)
    expect(result.Trainer).toHaveLength(1)
    expect(result.Trainer[0].name).toBe("Xerosic's Machinations")
    expect(result.Trainer[0].set).toBe('SFA')
    expect(result.Trainer[0].number).toBe('64')
  })

  it('returns empty result for empty input', () => {
    const result = parseDeckList('')
    expect(result.Pokemon).toHaveLength(0)
    expect(result.Trainer).toHaveLength(0)
    expect(result.Energy).toHaveLength(0)
    expect(result.TotalCards).toBe(0)
  })

  it('normalizes PR-SV set code to SVP in standard format', () => {
    const deck = `Pokémon: 1
1 Pikachu PR-SV 39`
    const result = parseDeckList(deck)
    expect(result.Pokemon).toHaveLength(1)
    expect(result.Pokemon[0].set).toBe('SVP')
    expect(result.Pokemon[0].number).toBe('39')
  })

  it('normalizes PR-SW set code to SP', () => {
    const deck = `Pokémon: 1
1 Zacian V PR-SW 76`
    const result = parseDeckList(deck)
    expect(result.Pokemon).toHaveLength(1)
    expect(result.Pokemon[0].set).toBe('SP')
  })

  it('normalizes PR-SV in parenthesized format', () => {
    const deck = `Pokémon: 1
1 Mew ex (PR-SV-53)`
    const result = parseDeckList(deck)
    expect(result.Pokemon).toHaveLength(1)
    expect(result.Pokemon[0].set).toBe('SVP')
    expect(result.Pokemon[0].number).toBe('53')
  })
})

describe('normalizeSetCode', () => {
  it('maps PR-SV to SVP', () => {
    expect(normalizeSetCode('PR-SV')).toBe('SVP')
  })

  it('maps PR-SW to SP', () => {
    expect(normalizeSetCode('PR-SW')).toBe('SP')
  })

  it('maps PR-SM to SMP', () => {
    expect(normalizeSetCode('PR-SM')).toBe('SMP')
  })

  it('maps PR-XY to XYP', () => {
    expect(normalizeSetCode('PR-XY')).toBe('XYP')
  })

  it('maps PR-BLW to BWP', () => {
    expect(normalizeSetCode('PR-BLW')).toBe('BWP')
  })

  it('maps PR-ME to MEP', () => {
    expect(normalizeSetCode('PR-ME')).toBe('MEP')
  })

  it('is case-insensitive', () => {
    expect(normalizeSetCode('pr-sv')).toBe('SVP')
  })

  it('passes through unknown codes unchanged', () => {
    expect(normalizeSetCode('BRS')).toBe('BRS')
    expect(normalizeSetCode('SFA')).toBe('SFA')
  })
})
