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
