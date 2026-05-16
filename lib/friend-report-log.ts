import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@haven/friend_reports_v1';

export type ReportCategory =
  | 'excessively-negative'
  | 'slur-or-stereotype'
  | 'trolling'
  | 'abuse'
  | 'other';

export const REPORT_CATEGORY_OPTIONS: { value: ReportCategory; label: string }[] = [
  { value: 'excessively-negative', label: 'Excessively negative' },
  { value: 'slur-or-stereotype', label: 'Slur or stereotype' },
  { value: 'trolling', label: 'Trolling' },
  { value: 'abuse', label: 'Abuse' },
  { value: 'other', label: 'Other' },
];

// Two unique reporters → ban. Counted by unique reporterId, not raw report count,
// so a single user can't unilaterally ban someone they don't like.
export const STRIKE_LIMIT = 2;

export type ReportEntry = {
  reporterId: string;
  reportedId: string;
  category: ReportCategory;
  customReason?: string;
  messageId?: string;
  at: number;
};

export type ReportInput = {
  reporterId: string;
  reportedId: string;
  category: ReportCategory;
  customReason?: string;
  messageId?: string;
};

export async function getReports(): Promise<ReportEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function reportUser(
  input: ReportInput,
): Promise<{ reports: ReportEntry[]; strikeCount: number; banned: boolean }> {
  const rows = await getReports();
  const entry: ReportEntry = {
    reporterId: input.reporterId,
    reportedId: input.reportedId,
    category: input.category,
    customReason: input.customReason?.trim() || undefined,
    messageId: input.messageId,
    at: Date.now(),
  };
  const next = [...rows, entry];
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  const strikeCount = uniqueReporters(next, input.reportedId);
  return { reports: next, strikeCount, banned: strikeCount >= STRIKE_LIMIT };
}

function uniqueReporters(reports: ReportEntry[], reportedId: string): number {
  const reporters = new Set<string>();
  for (const r of reports) {
    if (r.reportedId === reportedId) reporters.add(r.reporterId);
  }
  return reporters.size;
}

export function strikesFor(reportedId: string, reports: ReportEntry[]): number {
  return uniqueReporters(reports, reportedId);
}

export function bannedIdsFrom(reports: ReportEntry[]): Set<string> {
  const tally = new Map<string, Set<string>>();
  for (const r of reports) {
    let set = tally.get(r.reportedId);
    if (!set) {
      set = new Set();
      tally.set(r.reportedId, set);
    }
    set.add(r.reporterId);
  }
  const out = new Set<string>();
  for (const [id, reporters] of tally) {
    if (reporters.size >= STRIKE_LIMIT) out.add(id);
  }
  return out;
}

export async function clearReports(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
