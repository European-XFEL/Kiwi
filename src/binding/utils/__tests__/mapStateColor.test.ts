import { mapGuiStateColor } from '@/binding/utils/mapStateColor';

describe('mapGuiStateColor', () => {
  it('maps exacts', () => {
    const cases: Array<[string, string]> = [
      ['STATIC', 'staticColor'],
      ['NORMAL', 'knownNormalColor'],
      ['ERROR', 'errorColor'],
      ['INIT', 'initColor'],
      ['KNOWN', 'knownNormalColor'],
    ];
    for (const [input, expected] of cases) {
      expect(mapGuiStateColor(input)).toBe(expected);
      expect(mapGuiStateColor(input.toLowerCase())).toBe(expected); // case-insensitive
    }
  });

  it('maps CHANGING family', () => {
    const cases = [
      'CHANGING',
      'INCREASING',
      'DECREASING',
      'STARTING',
      'HEATING',
      'SWITCHING_OFF',
    ];
    for (const s of cases) {
      expect(mapGuiStateColor(s)).toBe('changingColor');
    }
  });

  it('maps RUNNING family', () => {
    const cases = ['RUNNING', 'ACQUIRING', 'PROCESSING'];
    for (const s of cases) {
      expect(mapGuiStateColor(s)).toBe('runningColor');
    }
  });

  it('maps ACTIVE family', () => {
    const cases = [
      'ACTIVE',
      'ON',
      'OPENED',
      'STARTED',
      'LOCKED',
      'MONITORING',
      'INTERLOCK_OK',
    ];
    for (const s of cases) {
      expect(mapGuiStateColor(s)).toBe('activeColor');
    }
  });

  it('maps PASSIVE family', () => {
    const cases = [
      'PASSIVE',
      'OFF',
      'CLOSED',
      'STOPPED',
      'UNLOCKED',
      'DISENGAGED',
      'IGNORING',
    ];
    for (const s of cases) {
      expect(mapGuiStateColor(s)).toBe('passiveColor');
    }
  });

  it('maps DISABLED family', () => {
    const cases = ['DISABLED', 'PAUSED', 'INTERLOCK_BROKEN'];
    for (const s of cases) {
      expect(mapGuiStateColor(s)).toBe('disabledColor');
    }
  });

  it('trims and uppercases before mapping', () => {
    expect(mapGuiStateColor('  init  ')).toBe('initColor');
    expect(mapGuiStateColor('\n\t running  ')).toBe('runningColor');
    expect(mapGuiStateColor('   ErRoR')).toBe('errorColor');
  });

  it('falls back to unknownColor for unmapped', () => {
    expect(mapGuiStateColor('totally-unknown')).toBe('unknownColor');
    expect(mapGuiStateColor('')).toBe('unknownColor');
    expect(mapGuiStateColor('   ' as unknown as string)).toBe('unknownColor');
  });

  it('prefers CHANGING category when applicable', () => {
    expect(mapGuiStateColor('STARTING')).toBe('changingColor');
  });

  // mixed case & punctuation variants
  it('is robust to mixed case and underscores', () => {
    expect(mapGuiStateColor('sTaTiC')).toBe('staticColor');
    expect(mapGuiStateColor('interlock_ok')).toBe('activeColor');
    expect(mapGuiStateColor('INTERLOCK_OK')).toBe('activeColor');
  });
});
