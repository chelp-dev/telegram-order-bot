// Reads settings from environment variables. Empty values count as unset, so a blank
// line in .env falls back to the default instead of becoming 0 or "".
import { assertTimeZone } from './core/schedule.js';

export interface BotConfig {
  /** How often the demo advances an order by itself. 0 disables auto-advance. */
  autoAdvanceMs: number;
  /** The cafe's IANA time zone, used for booking dates and slots. */
  timeZone: string;
  siteUrl: string;
  repoUrl: string;
}

export const DEFAULTS = {
  autoAdvanceSeconds: 12,
  timeZone: 'Europe/Kyiv',
  siteUrl: 'https://chelp.dev',
  repoUrl: 'https://github.com/chelp-dev/telegram-order-bot',
} as const;

export class ConfigError extends Error {}

type Env = Record<string, string | undefined>;

function read(env: Env, name: string): string | undefined {
  const value = env[name]?.trim();
  return value === '' ? undefined : value;
}

export function loadConfig(env: Env): { token: string; config: BotConfig } {
  const token = read(env, 'BOT_TOKEN');
  if (!token) {
    throw new ConfigError('BOT_TOKEN is not set. Create a bot with @BotFather and put its token into .env.');
  }

  const rawSeconds = read(env, 'AUTO_ADVANCE_SECONDS');
  const seconds = rawSeconds === undefined ? DEFAULTS.autoAdvanceSeconds : Number(rawSeconds);
  if (!Number.isFinite(seconds) || seconds < 0) {
    throw new ConfigError(`AUTO_ADVANCE_SECONDS must be a number of seconds, 0 or more (got "${rawSeconds ?? ''}").`);
  }

  const timeZone = read(env, 'CAFE_TIMEZONE') ?? DEFAULTS.timeZone;
  try {
    assertTimeZone(timeZone);
  } catch {
    throw new ConfigError(`CAFE_TIMEZONE "${timeZone}" is not a known time zone (e.g. Europe/Kyiv).`);
  }

  return {
    token,
    config: {
      autoAdvanceMs: Math.round(seconds * 1000),
      timeZone,
      siteUrl: DEFAULTS.siteUrl,
      repoUrl: read(env, 'REPO_URL') ?? DEFAULTS.repoUrl,
    },
  };
}
