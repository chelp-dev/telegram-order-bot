import { describe, expect, it } from 'vitest';
import { ConfigError, DEFAULT_PORT, DEFAULTS, loadConfig } from '../src/config.js';

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

  it('uses long polling unless WEBHOOK_SECRET is set', () => {
    expect(loadConfig({ BOT_TOKEN: 't' }).webhook).toBeUndefined();
    expect(loadConfig({ BOT_TOKEN: 't', WEBHOOK_SECRET: ' ', PORT: '9000' }).webhook).toBeUndefined();
  });

  it('reads the webhook secret and port, with 8080 as the default port', () => {
    expect(loadConfig({ BOT_TOKEN: 't', WEBHOOK_SECRET: 'a_B-9' }).webhook).toEqual({
      secret: 'a_B-9',
      port: DEFAULT_PORT,
    });
    expect(loadConfig({ BOT_TOKEN: 't', WEBHOOK_SECRET: 's', PORT: '3000' }).webhook?.port).toBe(3000);
  });

  it('fails fast on a secret Telegram would refuse or a bad port', () => {
    expect(() => loadConfig({ BOT_TOKEN: 't', WEBHOOK_SECRET: 'has space' })).toThrow(/WEBHOOK_SECRET/);
    expect(() => loadConfig({ BOT_TOKEN: 't', WEBHOOK_SECRET: 'x'.repeat(257) })).toThrow(/WEBHOOK_SECRET/);
    expect(() => loadConfig({ BOT_TOKEN: 't', WEBHOOK_SECRET: 's', PORT: '0' })).toThrow(/PORT/);
    expect(() => loadConfig({ BOT_TOKEN: 't', WEBHOOK_SECRET: 's', PORT: '80.5' })).toThrow(/PORT/);
  });
});
