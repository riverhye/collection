// Date helpers on local YYYY-MM-DD strings. No React Native imports here.

export function toYmd(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function fromYmd(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export type DateRange = { from: string; to: string };

export const DATE_PRESETS = ["thisMonth", "last3Months", "thisYear", "lastYear"] as const;
export type DatePreset = (typeof DATE_PRESETS)[number];

export const DATE_PRESET_LABELS: Record<DatePreset, string> = {
  thisMonth: "이번 달",
  last3Months: "최근 3개월",
  thisYear: "올해",
  lastYear: "작년",
};

export function presetRange(preset: DatePreset, today = new Date()): DateRange {
  const y = today.getFullYear();
  const m = today.getMonth();
  switch (preset) {
    case "thisMonth":
      return { from: toYmd(new Date(y, m, 1)), to: toYmd(new Date(y, m + 1, 0)) };
    case "last3Months":
      return { from: toYmd(new Date(y, m - 2, 1)), to: toYmd(today) };
    case "thisYear":
      return { from: `${y}-01-01`, to: `${y}-12-31` };
    case "lastYear":
      return { from: `${y - 1}-01-01`, to: `${y - 1}-12-31` };
  }
}

/** Calendar cells for a month: leading nulls for days before the 1st (weeks start on Sunday). */
export function monthCells(year: number, month: number): (string | null)[] {
  const first = new Date(year, month, 1).getDay();
  const days = new Date(year, month + 1, 0).getDate();
  const cells: (string | null)[] = Array.from({ length: first }, () => null);
  for (let d = 1; d <= days; d++) cells.push(toYmd(new Date(year, month, d)));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}
