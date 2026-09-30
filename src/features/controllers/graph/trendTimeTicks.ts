import type { Range } from './configTrendChart';

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const MONTH = 30 * DAY;
const YEAR = 365 * DAY;

type TickKind =
  'millisecond' | 'second' | 'minute' | 'hour' | 'day' | 'month' | 'year';
type TickSpec = { kind: TickKind; spacing: number; skips?: number[] };
type ZoomLevel = { limit: number; example: string; specs: TickSpec[] };

const zoomLevels: ZoomLevel[] = [
  {
    limit: Infinity,
    example: 'YYYY',
    specs: [
      { kind: 'year', spacing: YEAR, skips: [1, 5, 10, 25] },
      { kind: 'month', spacing: MONTH },
    ],
  },
  {
    limit: 5 * DAY,
    example: 'MMM',
    specs: [
      { kind: 'month', spacing: MONTH },
      { kind: 'day', spacing: DAY, skips: [1, 5] },
    ],
  },
  {
    limit: 6 * HOUR,
    example: 'MMM 00',
    specs: [
      { kind: 'day', spacing: DAY },
      { kind: 'hour', spacing: HOUR, skips: [1, 6] },
    ],
  },
  {
    limit: 15 * MINUTE,
    example: 'MMM 00',
    specs: [
      { kind: 'day', spacing: DAY },
      { kind: 'minute', spacing: MINUTE, skips: [1, 5, 15] },
    ],
  },
  {
    limit: 30 * SECOND,
    example: '99:99:99',
    specs: [{ kind: 'second', spacing: SECOND, skips: [1, 5, 15, 30] }],
  },
  {
    limit: SECOND,
    example: '99:99:99',
    specs: [
      { kind: 'minute', spacing: MINUTE },
      { kind: 'millisecond', spacing: 1, skips: [1, 5, 10, 25] },
    ],
  },
];

function skipFactor(spec: TickSpec, minSpacing: number) {
  if (!spec.skips || minSpacing < spec.spacing) return 1;
  for (let power = 1; ; power *= 10) {
    for (const factor of spec.skips) {
      if (spec.spacing * factor * power > minSpacing) return factor * power;
    }
  }
}

function nextTick(value: number, kind: TickKind, skip: number) {
  if (kind === 'month' || kind === 'year') {
    const date = new Date(value);
    if (kind === 'month')
      return new Date(date.getFullYear(), date.getMonth() + skip, 1).getTime();
    const year = (Math.floor(date.getFullYear() / skip) + 1) * skip;
    return new Date(year, 0, 1).getTime();
  }
  if (kind === 'day') {
    const date = new Date(value);
    const dayNumber = Math.floor(
      Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / DAY
    );
    const nextDay = new Date((Math.floor(dayNumber / skip) + 1) * skip * DAY);
    return new Date(
      nextDay.getUTCFullYear(),
      nextDay.getUTCMonth(),
      nextDay.getUTCDate()
    ).getTime();
  }
  if (kind === 'hour') {
    const date = new Date(value);
    const offset = date.getTimezoneOffset() * MINUTE;
    return (
      (Math.floor((value - offset) / (HOUR * skip)) + 1) * HOUR * skip + offset
    );
  }
  const spacing = kind === 'minute' ? MINUTE : kind === 'second' ? SECOND : 1;
  return (Math.floor(value / (spacing * skip)) + 1) * spacing * skip;
}

const pad = (value: number, length = 2) => String(value).padStart(length, '0');
const monthFormat = new Intl.DateTimeFormat('en-US', { month: 'short' });
const weekdayFormat = new Intl.DateTimeFormat('en-US', { weekday: 'short' });

function tickLabel(value: number, kind: TickKind) {
  const date = new Date(value);
  switch (kind) {
    case 'year':
      return String(date.getFullYear());
    case 'month':
      return monthFormat.format(date);
    case 'day':
      return `${weekdayFormat.format(date)} ${pad(date.getDate())}`;
    case 'hour':
    case 'minute':
      return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
    case 'second':
      return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
    case 'millisecond':
      return `${pad(date.getSeconds())}.${pad(date.getMilliseconds(), 3)}`;
  }
}

export function trendTimeTicks(
  range: Range,
  plotWidth: number,
  textWidth: (text: string) => number = (text) => text.length * 7
) {
  const [min, max] = [...range].sort((a, b) => a - b);
  if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) return [];
  const density = (max - min) / Math.max(plotWidth, 1);
  let level = zoomLevels[0];
  for (const candidate of zoomLevels) {
    if (candidate.limit / (textWidth(candidate.example) + 10) < density) break;
    level = candidate;
  }
  const minSpacing = density * (textWidth(level.example) + 10);
  const ticks = new Map<number, string>();
  for (const spec of level.specs) {
    const skip = skipFactor(spec, minSpacing);
    let tick = nextTick(min, spec.kind, skip);
    while (tick <= max && Number.isFinite(tick)) {
      if (tick >= min && !ticks.has(tick))
        ticks.set(tick, tickLabel(tick, spec.kind));
      const next = nextTick(tick, spec.kind, skip);
      if (next <= tick) break;
      tick = next;
    }
    if (skip > 1) break;
  }
  return [...ticks].sort(([a], [b]) => a - b);
}
