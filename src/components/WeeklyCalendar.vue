<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import BaseModal from './BaseModal.vue';
import { calendarPeriod, dateKey, eventPayload, layoutEvents, timeLabel, weekDays } from '../domain/calendar';
import { calendarRepository } from '../services/calendarRepository';

const emit = defineEmits(['session-expired', 'busy']);
const props = defineProps({ disabled: { type: Boolean, default: false } });
const anchor = ref(new Date());
const days = computed(() => weekDays(anchor.value));
const events = ref([]);
const loading = ref(false);
const saving = ref(false);
const locked = computed(() => saving.value || props.disabled);
watch(saving, value => emit('busy', value));
const error = ref('');
const loadFailed = ref(false);
const success = ref('');
const editor = ref(null);
const deleteConfirm = ref(false);
const now = ref(new Date());
const form = reactive({ title: '', date: '', start: '', end: '' });
const startMinute = 360;
const slots = Array.from({ length: 36 }, (_, i) => startMinute + i * 30);
const startOptions = Array.from({ length: 48 }, (_, i) => timeLabel(i * 30));
const endOptions = Array.from({ length: 48 }, (_, i) => timeLabel((i + 1) * 30));
const todayKey = computed(() => dateKey(now.value));
const heading = computed(() => {
  const first = days.value[0], last = days.value[6];
  return first.getMonth() === last.getMonth()
    ? first.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
    : `${first.toLocaleDateString(undefined, { month: 'short', ...(first.getFullYear() !== last.getFullYear() ? { year: 'numeric' } : {}) })} – ${last.toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}`;
});
const dateRange = computed(() => `${days.value[0].toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${days.value[6].toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`);
const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
let loadVersion = 0;
let ticker;

function report(cause) {
  if (cause?.status === 401 || /jwt|refresh.token/i.test(`${cause?.code} ${cause?.message}`)) {
    emit('session-expired');
    return;
  }
  if (['42P01', 'PGRST205'].includes(cause?.code)) {
    error.value = 'Calendar setup is pending. Apply the calendar database migration, then try again.';
  } else error.value = 'Could not complete this request. Check your connection and try again. Your inputs have been kept.';
}

async function load() {
  const version = ++loadVersion;
  loading.value = true;
  error.value = '';
  loadFailed.value = false;
  events.value = [];
  const start = new Date(days.value[0]);
  const end = new Date(start); end.setDate(end.getDate() + 7);
  try {
    const data = await calendarRepository.load(start, end);
    if (version === loadVersion) events.value = data;
  } catch (cause) {
    if (version === loadVersion) { loadFailed.value = true; report(cause); }
  } finally {
    if (version === loadVersion) loading.value = false;
  }
}

function changeWeek(offset) {
  if (locked.value) return;
  const next = new Date(anchor.value); next.setDate(next.getDate() + offset * 7);
  anchor.value = next;
  success.value = '';
  load();
}
function today() { if (locked.value) return; anchor.value = new Date(); success.value = ''; load(); }
function open(day, minutes = 540) {
  if (locked.value || loading.value || loadFailed.value) return;
  editor.value = {};
  error.value = '';
  deleteConfirm.value = false;
  Object.assign(form, { title: '', date: dateKey(day), start: timeLabel(minutes), end: timeLabel(Math.min(minutes + 30, 1440)) });
}
function edit(event) {
  if (locked.value) return;
  const start = new Date(event.starts_at), end = new Date(event.ends_at);
  editor.value = event;
  error.value = '';
  deleteConfirm.value = false;
  Object.assign(form, { title: event.title, date: dateKey(start), start: timeLabel(start.getHours() * 60 + start.getMinutes()), end: dateKey(end) !== dateKey(start) ? '24:00' : timeLabel(end.getHours() * 60 + end.getMinutes()) });
}
async function save() {
  if (locked.value) return;
  let payload;
  try { payload = eventPayload(form); } catch (cause) { error.value = cause.message; return; }
  saving.value = true; error.value = ''; success.value = '';
  try {
    const saved = await calendarRepository.save(payload, editor.value.id);
    events.value = [...events.value.filter(item => item.id !== saved.id), saved];
    editor.value = null;
    success.value = 'Schedule saved';
  } catch (cause) { report(cause); }
  finally { saving.value = false; }
}
async function remove() {
  if (locked.value) return;
  saving.value = true; error.value = ''; success.value = '';
  try {
    await calendarRepository.remove(editor.value.id);
    events.value = events.value.filter(item => item.id !== editor.value.id);
    editor.value = null;
    success.value = 'Schedule deleted';
  } catch (cause) { report(cause); }
  finally { saving.value = false; }
}
function eventStyle(event) {
  return {
    top: `calc(${(event.from - startMinute) / 30} * var(--calendar-slot-height) + 2px)`,
    height: `max(16px, calc(${(event.to - event.from) / 30} * var(--calendar-slot-height) - 4px))`,
    left: `calc(${event.lane / event.columns * 100}% + 4px)`,
    width: `calc(${100 / event.columns}% - 8px)`
  };
}

onMounted(() => {
  ticker = setInterval(() => { now.value = new Date(); }, 60000);
  load();
});
onBeforeUnmount(() => { clearInterval(ticker); loadVersion++; emit('busy', false); });
</script>

<template>
  <section class="calendar-view" aria-label="Weekly calendar">
    <Teleport defer to="#calendar-navigation">
      <div class="calendar-period" :title="dateRange"><h1>{{ heading }}</h1></div>
      <div class="calendar-actions">
        <button class="icon-btn" aria-label="Previous week" :disabled="locked" @click="changeWeek(-1)">‹</button>
        <button class="ghost-btn calendar-today" :disabled="locked" @click="today">Today</button>
        <button class="icon-btn" aria-label="Next week" :disabled="locked" @click="changeWeek(1)">›</button>
      </div>
    </Teleport>
    <div v-if="error && !editor" class="calendar-feedback error-banner" role="alert"><span>{{ error }}</span><button class="ghost-btn" :disabled="loading" @click="load">Try again</button></div>
    <p v-else-if="loading" class="calendar-feedback calendar-loading" role="status">Loading your week…</p>
    <p v-else-if="success" class="calendar-feedback calendar-success" role="status">{{ success }}<button class="close-btn" aria-label="Dismiss notification" @click="success = ''">×</button></p>
    <div class="calendar-scroll" :aria-busy="loading">
      <div class="week-grid">
        <div class="week-heading"><div class="timezone-label" :title="timezone">LOCAL</div><div v-for="day in days" :key="dateKey(day)" class="day-heading" :class="{ 'is-today': dateKey(day) === todayKey }"><span>{{ day.toLocaleDateString(undefined, { weekday: 'short' }) }}</span><strong>{{ day.getDate() }}</strong></div></div>
        <div class="week-body">
          <div class="time-axis"><div v-for="minute in slots.filter(value => value % 60 === 0)" :key="minute" class="time-label">{{ timeLabel(minute) }}</div></div>
          <div v-for="day in days" :key="dateKey(day)" class="calendar-day">
            <button v-for="minute in slots" :key="minute" class="time-slot" :disabled="loading || locked || loadFailed" :aria-label="`Add schedule ${dateKey(day)} ${timeLabel(minute)}`" @click="open(day, minute)"><span>+</span></button>
            <button v-for="event in layoutEvents(events, day, startMinute)" :key="event.id" class="calendar-event" :data-period="calendarPeriod(event.from)" :style="eventStyle(event)" :disabled="locked" :title="`${event.title} · ${new Date(event.starts_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}–${new Date(event.ends_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}`" @click.stop="edit(event)"><strong>{{ event.title }}</strong></button>
            <div v-if="dateKey(day) === todayKey && now.getHours() >= 6" class="current-time-line" :style="{ top: `calc(${(now.getHours() * 60 + now.getMinutes() - startMinute) / 30} * var(--calendar-slot-height))` }" aria-hidden="true"></div>
          </div>
        </div>
      </div>
    </div>
    <BaseModal v-if="editor" :dismissible="!saving" @close="editor = null">
      <div class="modal-head"><div><h2>{{ editor.id ? 'Edit schedule' : 'Plan your time' }}</h2><p class="modal-sub">Times use your device’s timezone.</p></div><button class="close-btn" aria-label="Close" :disabled="saving" @click="editor = null">×</button></div>
      <p v-if="error" class="form-error" role="alert">{{ error }}</p>
      <form @submit.prevent="save">
        <fieldset class="modal-fieldset" :disabled="saving"><div class="form-grid">
          <div class="field full"><label for="schedule-title">What will you do?</label><input id="schedule-title" v-model="form.title" required maxlength="500" autofocus placeholder="e.g. Read a chapter" /></div>
          <div class="field full"><label for="schedule-date">Date</label><input id="schedule-date" v-model="form.date" required type="date" /></div>
          <div class="field"><label for="schedule-start">Start time</label><select id="schedule-start" v-model="form.start"><option v-for="time in startOptions" :key="time">{{ time }}</option></select></div>
          <div class="field"><label for="schedule-end">End time</label><select id="schedule-end" v-model="form.end"><option v-for="time in endOptions" :key="time">{{ time }}</option></select></div>
        </div></fieldset>
        <div v-if="deleteConfirm" class="delete-confirmation"><p>Delete this schedule? This cannot be undone.</p><button type="button" class="danger-btn" :disabled="saving" @click="remove">Confirm delete</button></div>
        <div class="modal-actions"><button v-if="editor.id" class="danger-btn" type="button" :disabled="saving" @click="deleteConfirm = true">Delete</button><span v-else></span><div class="modal-right"><button type="button" class="ghost-btn" :disabled="saving" @click="editor = null">Cancel</button><button type="submit" class="primary-btn" :disabled="saving">{{ saving ? 'Saving…' : 'Save schedule' }}</button></div></div>
      </form>
    </BaseModal>
  </section>
</template>
