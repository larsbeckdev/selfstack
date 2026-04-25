import { z } from "zod";

/**
 * Allowed characters for board, category, group and tile names:
 * latin letters (A-Z, a-z), digits (0-9), spaces and hyphens (-).
 * No umlauts, no other special characters.
 */
export const ENTITY_NAME_REGEX = /^[A-Za-z0-9][A-Za-z0-9 -]*$/;

/**
 * Translation key describing the rule (used for tooltips & error messages).
 * Resolved on the client via the i18n helpers; the regex itself is the
 * single source of truth.
 */
export const ENTITY_NAME_RULE_KEY = "validation.nameRule" as const;

/** Human-readable description (English fallback). */
export const ENTITY_NAME_RULE_TEXT =
  "Only letters (A-Z, a-z), digits, spaces and hyphens (-). No umlauts or other special characters.";

export function isValidEntityName(value: string): boolean {
  return ENTITY_NAME_REGEX.test(value.trim());
}

export const entityNameSchema = z
  .string()
  .trim()
  .min(1)
  .max(100)
  .regex(ENTITY_NAME_REGEX, ENTITY_NAME_RULE_TEXT);
