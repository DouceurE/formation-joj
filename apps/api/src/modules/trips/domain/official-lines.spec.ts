import { officialLineSchema } from '@joj/shared';
import { describe, expect, it } from 'vitest';
import { OFFICIAL_LINES, officialLinesTo } from './official-lines';

describe('official lines', () => {
  it('004-AS1: lists the two official lines to Diamniadio', () => {
    const lines = officialLinesTo('diamniadio');

    expect(lines.map((line) => line.operator)).toEqual(['navette-joj', 'dakar-dem-dikk']);
    for (const line of lines) {
      expect(line.site).toBe('diamniadio');
      expect(line.name).not.toBe('');
      expect(line.departurePoint).not.toBe('');
    }
    expect(officialLinesTo('saly').map((line) => line.operator)).toEqual(['navette-joj']);
  });

  it('004-AS3: has no official line to Dakar', () => {
    expect(officialLinesTo('dakar')).toEqual([]);
  });

  it('004-AS4: gives each line its own valid uuid, so it cannot be mistaken for a trip', () => {
    expect(OFFICIAL_LINES.length).toBeGreaterThan(0);
    for (const line of OFFICIAL_LINES) expect(officialLineSchema.parse(line)).toEqual(line);
    expect(new Set(OFFICIAL_LINES.map((line) => line.id)).size).toBe(OFFICIAL_LINES.length);
  });
});
