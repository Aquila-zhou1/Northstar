export function dateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function weekDays(anchor) {
  const monday = new Date(anchor);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - (monday.getDay() + 6) % 7);
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(monday);
    day.setDate(day.getDate() + i);
    return day;
  });
}

export function timeLabel(minutes) {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

export function eventPayload(form) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(form.date) || !/^([01]\d|2[0-3]):(00|30)$/.test(form.start)
    || !/^(([01]\d|2[0-3]):(00|30)|24:00)$/.test(form.end)) throw new Error('Choose a date and valid half-hour times.');
  const start = new Date(`${form.date}T${form.start}:00`);
  const end = form.end === '24:00' ? new Date(`${form.date}T00:00:00`) : new Date(`${form.date}T${form.end}:00`);
  if (form.end === '24:00') end.setDate(end.getDate() + 1);
  if (!form.title.trim() || form.title.trim().length > 500) throw new Error('Enter a title between 1 and 500 characters.');
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start) throw new Error('End time must be later than start time.');
  if (dateKey(start) !== form.date || timeLabel(start.getHours() * 60 + start.getMinutes()) !== form.start
    || (form.end !== '24:00' && timeLabel(end.getHours() * 60 + end.getMinutes()) !== form.end)) {
    throw new Error('This time does not exist in your timezone because of daylight saving. Choose another time.');
  }
  return { title: form.title.trim(), starts_at: start.toISOString(), ends_at: end.toISOString() };
}

// Each connected overlap group gets enough columns to keep every event clickable.
export function calendarPeriod(minutes) {
  return minutes < 720 ? 'first' : minutes < 1080 ? 'second' : 'third';
}

export function layoutEvents(events, day, visibleStart = 0) {
  const start = new Date(day); start.setHours(0, 0, 0, 0);
  const end = new Date(start); end.setDate(end.getDate() + 1);
  const minutes = value => value.getHours() * 60 + value.getMinutes();
  const items = events.filter(e => new Date(e.starts_at) < end && new Date(e.ends_at) > start).map(e => ({
    ...e,
    from: Math.max(visibleStart, new Date(e.starts_at) < start ? 0 : minutes(new Date(e.starts_at))),
    to: new Date(e.ends_at) >= end ? 1440 : minutes(new Date(e.ends_at))
  })).filter(e => e.to > e.from).sort((a, b) => a.from - b.from || b.to - a.to);
  let group = [], lanes = [], groupEnd = -1;
  function finish() { group.forEach(item => { item.columns = lanes.length; }); group = []; lanes = []; }
  for (const item of items) {
    if (item.from >= groupEnd) finish();
    let lane = lanes.findIndex(until => until <= item.from);
    if (lane < 0) lane = lanes.length;
    lanes[lane] = item.to;
    item.lane = lane;
    group.push(item);
    groupEnd = Math.max(groupEnd, item.to);
  }
  finish();
  return items;
}
