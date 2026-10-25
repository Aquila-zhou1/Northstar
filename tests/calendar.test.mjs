import test from 'node:test';
import assert from 'node:assert/strict';
import { calendarPeriod, dateKey, eventPayload, layoutEvents, weekDays } from '../src/domain/calendar.js';

test('Sunday and year boundaries resolve to a Monday–Sunday local week', () => {
  const days = weekDays(new Date(2027, 0, 3, 15));
  assert.equal(dateKey(days[0]), '2026-12-28');
  assert.equal(dateKey(days[6]), '2027-01-03');
  assert.ok(days.every(day => day.getHours() === 0));
});

test('form saves local wall-clock times as UTC instants', () => {
  const payload = eventPayload({ title: ' Focus ', date: '2026-10-24', start: '09:30', end: '11:00' });
  assert.equal(payload.title, 'Focus');
  assert.equal(new Date(payload.starts_at).getHours(), 9);
  assert.equal(new Date(payload.starts_at).getMinutes(), 30);
  assert.equal(new Date(payload.ends_at) - new Date(payload.starts_at), 90 * 60000);
});

test('last slot ends at midnight of the next day', () => {
  const payload = eventPayload({ title: 'Read', date: '2026-10-24', start: '23:30', end: '24:00' });
  assert.equal(dateKey(new Date(payload.ends_at)), '2026-10-25');
  assert.equal(new Date(payload.ends_at).getHours(), 0);
});

test('empty title and zero or negative duration are rejected', () => {
  const base = { title: 'Task', date: '2026-10-24', start: '10:00', end: '11:00' };
  for (const patch of [{ title: '  ' }, { end: '10:00' }, { end: '09:30' }]) {
    assert.throws(() => eventPayload({ ...base, ...patch }));
  }
});

test('overlapping events get separate lanes; adjacent events reuse full width', () => {
  const day = new Date(2026, 9, 24);
  const event = (id, start, end) => ({ id, ...eventPayload({ title: id, date: dateKey(day), start, end }) });
  const items = layoutEvents([
    event('a', '09:00', '10:00'), event('b', '09:30', '10:30'),
    event('c', '10:30', '11:00'), event('d', '23:30', '24:00')
  ], day);
  assert.equal(items[0].columns, 2);
  assert.notEqual(items[0].lane, items[1].lane);
  assert.equal(items[2].columns, 1);
  assert.equal(items[3].to, 1440);
  assert.equal(layoutEvents(items, new Date(2026, 9, 25)).length, 0);
});

test('week boundaries retain seven local dates across daylight saving changes', () => {
  const days = weekDays(new Date(2026, 10, 1, 12));
  assert.equal(dateKey(days[0]), '2026-10-26');
  assert.equal(dateKey(days[6]), '2026-11-01');
  assert.ok(days.every(day => day.getHours() === 0));
});

test('daylight saving skips nonexistent local times without silently shifting schedules', () => {
  if (Intl.DateTimeFormat().resolvedOptions().timeZone !== 'America/Los_Angeles') return;
  assert.throws(() => eventPayload({ title: 'Spring', date: '2026-03-08', start: '02:00', end: '03:30' }), /does not exist/);
  const autumn = eventPayload({ title: 'Fall day', date: '2026-11-01', start: '00:00', end: '24:00' });
  assert.equal((new Date(autumn.ends_at) - new Date(autumn.starts_at)) / 3600000, 25);
});

test('06:00 viewport clips old events without shifting their original timestamps', () => {
  const day = new Date(2026, 9, 24);
  const early = { id: 'early', ...eventPayload({ title: 'Early', date: dateKey(day), start: '04:00', end: '05:00' }) };
  const crossing = { id: 'crossing', ...eventPayload({ title: 'Crossing', date: dateKey(day), start: '05:30', end: '06:30' }) };
  const items = layoutEvents([early, crossing], day, 360);
  assert.equal(items.length, 1);
  assert.equal(items[0].from, 360);
  assert.equal(items[0].to, 390);
  assert.equal(new Date(items[0].starts_at).getHours(), 5);
  assert.equal(layoutEvents([early, crossing], day).length, 2);
});

test('event colors change exactly at 12:00 and 18:00', () => {
  assert.equal(calendarPeriod(360), 'first');
  assert.equal(calendarPeriod(719), 'first');
  assert.equal(calendarPeriod(720), 'second');
  assert.equal(calendarPeriod(1079), 'second');
  assert.equal(calendarPeriod(1080), 'third');
});
