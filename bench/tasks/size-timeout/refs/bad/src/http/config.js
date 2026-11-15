export const DEFAULT_TIMEOUT_MS = 5000;
export const MIN_TIMEOUT_MS = 1;
export const MAX_TIMEOUT_MS = 10 * 60 * 1000;

/** Thrown when a timeout cannot be used. */
export class TimeoutConfigError extends Error {
  constructor(value) {
    super(`Invalid timeout: ${value}`);
    this.name = 'TimeoutConfigError';
    this.value = value;
  }
}

function fromEnvironment(env = process.env) {
  const raw = env.HTTP_TIMEOUT_MS;
  if (raw === undefined || raw === '') return undefined;
  const value = Number(raw);
  if (!Number.isFinite(value)) throw new TimeoutConfigError(raw);
  return value;
}

function validate(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new TimeoutConfigError(value);
  if (value < MIN_TIMEOUT_MS || value > MAX_TIMEOUT_MS) throw new TimeoutConfigError(value);
  return Math.round(value);
}

/** The timeout to use: the caller's, else the environment's, else the default. */
export function resolveTimeout(requested, env = process.env) {
  if (requested !== undefined) return validate(requested);
  const configured = fromEnvironment(env);
  if (configured !== undefined) return validate(configured);
  return DEFAULT_TIMEOUT_MS;
}
