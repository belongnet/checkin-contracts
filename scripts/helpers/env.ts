const TRUE_VALUES = ['true', '1', 'yes', 'on'];
const FALSE_VALUES = ['false', '0', 'no', 'off'];
const MAX_ECHOED_CHARS = 20;

/**
 * Reads a boolean flag from the environment.
 *
 * Unset, empty or whitespace-only -> `defaultValue`. Anything else must be one of the accepted
 * spellings (case-insensitive): a typo throws instead of silently enabling or disabling a step.
 */
export function envFlag(name: string, defaultValue: boolean): boolean {
  const value = process.env[name]?.trim() ?? '';
  if (value === '') {
    return defaultValue;
  }

  const normalized = value.toLowerCase();
  if (TRUE_VALUES.includes(normalized)) {
    return true;
  }
  if (FALSE_VALUES.includes(normalized)) {
    return false;
  }

  // Echo only a short prefix: the variable may hold something it should not (e.g. a pasted secret).
  const shown = value.length > MAX_ECHOED_CHARS ? `${value.slice(0, MAX_ECHOED_CHARS)}...` : value;
  throw new Error(
    `Invalid value for ${name}: "${shown}". Accepted values (case-insensitive): ${TRUE_VALUES.join(', ')} or ${FALSE_VALUES.join(', ')}.`,
  );
}

/**
 * Stops a deploy script from deploying a second copy of a contract that the deployment file already
 * records. `FORCE_REDEPLOY=true` is the explicit opt-out.
 */
export function assertNotRecorded(existing: unknown, label: string): void {
  if (typeof existing !== 'string' || existing === '' || envFlag('FORCE_REDEPLOY', false)) {
    return;
  }

  throw new Error(
    `${label} is already recorded in the deployment file (${existing}). Re-running would deploy a second copy and overwrite the record. Set FORCE_REDEPLOY=true only if that is intended.`,
  );
}
