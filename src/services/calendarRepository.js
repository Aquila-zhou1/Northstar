import { supabase } from './supabaseClient';

function result({ data, error }) {
  if (error) throw error;
  return data;
}
export const calendarRepository = {
  async load(start, end) {
    return result(await supabase.from('calendar_events').select('id, title, starts_at, ends_at')
      .lt('starts_at', end.toISOString()).gt('ends_at', start.toISOString()).order('starts_at'));
  },
  async save(payload, id) {
    const table = supabase.from('calendar_events');
    const request = id ? table.update(payload).eq('id', id) : table.insert(payload);
    return result(await request.select('id, title, starts_at, ends_at').single());
  },
  async remove(id) {
    return result(await supabase.from('calendar_events').delete().eq('id', id).select('id').single());
  }
};
