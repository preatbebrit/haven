/**
 * Profile display string mappings. Centralized here so different consumers
 * (profile pills, settings answers) can share or diverge from a single
 * source of truth.
 */

export type OutStatus = 'yes' | 'no' | 'sort-of';

/**
 * Identity-tag form: how the user's out_status reads as a pill on their
 * profile. Used by current-user-context.tsx to build displayProfile.tags.
 */
export const OUT_STATUS_TAG_LABELS: Record<OutStatus, string> = {
  yes: 'Out',
  no: 'Not out',
  'sort-of': 'Sort-of out',
};

/**
 * Settings-answer form: how the user's out_status reads as their answer
 * to "Are you out?" in the settings screen.
 */
export const OUT_STATUS_ANSWER_LABELS: Record<OutStatus, string> = {
  yes: 'Yes',
  no: 'No',
  'sort-of': 'Sort of',
};
