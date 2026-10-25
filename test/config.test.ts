import { describe, expect, it } from 'vitest';
import { ConfigError, DEFAULTS, loadConfig } from '../src/config.js';

describe('loadConfig', () => {
  it('requires BOT_TOKEN', () => {
    expect(() => loadConfig({})).toThrow(ConfigError);
    expect(() => loadConfig({ BOT_TOKEN: '  ' })).toThrow(ConfigError);
  });

  it('uses defaults for missing or empty values', () => {
    const { config } = loadConfig({ BOT_TOKEN: 't', AUTO_ADVANCE_SECONDS: '', REPO_URL: '', CAFE_TIMEZONE: '' });
    expect(config).toEqual({
      autoAdvanceMs: DEFAULTS.autoAdvanceSeconds * 1000,
      timeZone: DEFAULTS.timeZone,
      siteUrl: DEFAULTS.siteUrl,
      repoUrl: DEFAULTS.repoUrl,
    });
  });

  it('reads the values that are set; 0 turns auto-advance off', () => {
    const { token, config } = loadConfig({
      BOT_TOKEN: '123:abc',
      AUTO_ADVANCE_SECONDS: '0',
      CAFE_TIMEZONE: 'Europe/Madrid',
      REPO_URL: 'https://example.com/fork',
    });
    expect(token).toBe('123:abc');
    expect(config.autoAdvanceMs).toBe(0);
    expect(config.timeZone).toBe('Europe/Madrid');
    expect(config.repoUrl).toBe('https://example.com/fork');
  });

  it('fails fast on a bad number or an unknown time zone', () => {
    expect(() => loadConfig({ BOT_TOKEN: 't', AUTO_ADVANCE_SECONDS: 'soon' })).toThrow(/AUTO_ADVANCE_SECONDS/);
    expect(() => loadConfig({ BOT_TOKEN: 't', AUTO_ADVANCE_SECONDS: '-1' })).toThrow(/AUTO_ADVANCE_SECONDS/);
    expect(() => loadConfig({ BOT_TOKEN: 't', CAFE_TIMEZONE: 'Mars/Olympus' })).toThrow(/CAFE_TIMEZONE/);
  });
});
