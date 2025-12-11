/**
 * T024: GREEN - Module types from data-model.md.
 */

export interface Module {
  id: string;
  name: string;
  description: string;
  icon: string;
  route: string;
  enabled: boolean;
  order: number;
  badge?: string;
}

export const MODULE_ID_PATTERN = /^[a-z][a-z0-9-]*$/;
export const MAX_DESCRIPTION_LENGTH = 200;
