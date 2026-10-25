import { supabase } from './supabaseClient';
import { normalizeMotto, readMotto } from '../domain/userSettings';

function checkedMotto({ data, error }, expectedUserId) {
  if (error) throw error;
  if (!data.user || data.user.id !== expectedUserId) throw new Error('Your account has changed. Please try again.');
  return readMotto(data.user);
}

// One metadata field per Auth user: saving replaces the existing motto.
// User metadata is display-only and must never be used for authorization.
export const userSettingsRepository = {
  async loadMotto(userId) {
    return checkedMotto(await supabase.auth.getUser(), userId);
  },
  async saveMotto(userId, value) {
    const motto = normalizeMotto(value);
    return checkedMotto(await supabase.auth.updateUser({ data: { northstar_motto: motto } }), userId);
  }
};
