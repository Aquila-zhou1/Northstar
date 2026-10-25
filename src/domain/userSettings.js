export const MOTTO_MAX_LENGTH = 160;

export function normalizeMotto(value) {
  if (typeof value !== 'string') throw new Error('Enter a motto as text.');
  const motto = value.trim().replace(/\s+/g, ' ');
  if (motto.length > MOTTO_MAX_LENGTH) throw new Error(`Keep your motto within ${MOTTO_MAX_LENGTH} characters.`);
  return motto;
}

export function readMotto(user) {
  const value = user?.user_metadata?.northstar_motto;
  return typeof value === 'string' ? value.slice(0, MOTTO_MAX_LENGTH) : '';
}
