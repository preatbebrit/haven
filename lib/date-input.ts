/** Format raw digits as MM/DD/YYYY (partial while typing). */
export function formatMMDDYYYY(digits: string): string {
  const d = digits.replace(/\D/g, '').slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
}

export function parseUSDate(str: string): Date | null {
  const m = str.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const month = parseInt(m[1], 10) - 1;
  const day = parseInt(m[2], 10);
  const year = parseInt(m[3], 10);
  const date = new Date(year, month, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
}

export function ageInYears(dob: Date, now = new Date()): number {
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) {
    age -= 1;
  }
  return age;
}

export function isAtLeast18(dateStr: string): boolean {
  const d = parseUSDate(dateStr);
  if (!d) return false;
  return ageInYears(d) >= 18;
}

/**
 * Convert a MM/DD/YYYY string to ISO 8601 (YYYY-MM-DD).
 * Returns null if input is empty or unparseable. Caller is responsible for
 * deciding what to do with null (e.g., omit the field, alert the user).
 *
 * Lenient: accepts single-digit month or day ("1/5/2003" → "2003-01-05").
 * Strict: returns null for any other malformed input — does NOT attempt
 * locale-aware fallback parsing.
 */
export function mmddyyyyToIso(input: string): string | null {
  if (!input) return null;
  const parts = input.split('/');
  if (parts.length !== 3) return null;
  const [mmStr, ddStr, yyyyStr] = parts;
  if (
    !/^\d{1,2}$/.test(mmStr) ||
    !/^\d{1,2}$/.test(ddStr) ||
    !/^\d{4}$/.test(yyyyStr)
  ) {
    return null;
  }
  const month = parseInt(mmStr, 10);
  const day = parseInt(ddStr, 10);
  const year = parseInt(yyyyStr, 10);
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
}

/**
 * Convert an ISO 8601 date (YYYY-MM-DD) to MM/DD/YYYY for display.
 * Returns empty string if input is empty or unparseable.
 *
 * This is the inverse of mmddyyyyToIso. Used when hydrating the
 * onboarding context from the server-side draft, which stores dates
 * in ISO format.
 */
export function isoToMmddyyyy(input: string): string {
  if (!input) return '';
  const match = input.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return '';
  const [, yyyy, mm, dd] = match;
  return `${mm}/${dd}/${yyyy}`;
}
