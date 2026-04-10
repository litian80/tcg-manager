import { describe, it, expect } from 'vitest'
import { parseDeckList, normalizeCardName } from '@/utils/deck-validator'

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
})
