<script setup>
import { nextTick, onBeforeUnmount, ref, watch } from 'vue';
import BaseModal from './BaseModal.vue';
import { useAuth } from '../composables/useAuth';
import { MOTTO_MAX_LENGTH, normalizeMotto } from '../domain/userSettings';
import { userSettingsRepository } from '../services/userSettingsRepository';

defineProps({ disabled: { type: Boolean, default: false } });
const emit = defineEmits(['busy', 'session-expired']);
const auth = useAuth();
const motto = ref('');
const draft = ref('');
const loading = ref(false);
const saving = ref(false);
const failed = ref(false);
const open = ref(false);
const error = ref('');
const savedNotice = ref('');
const input = ref(null);
let version = 0;

function report(cause) {
  if (cause?.status === 401 || /jwt|refresh.token/i.test(`${cause?.code} ${cause?.message}`)) {
    emit('session-expired');
  }
  error.value = 'Could not update your motto. Check your connection and try again.';
}

async function load(userId = auth.user.value?.id) {
  const request = ++version;
  motto.value = '';
  failed.value = false;
  open.value = false;
  loading.value = false;
  error.value = '';
  if (!userId) return;
  loading.value = true;
  try {
    const result = await userSettingsRepository.loadMotto(userId);
    if (request === version && auth.user.value?.id === userId) motto.value = result;
  } catch (cause) {
    if (request === version) { failed.value = true; report(cause); }
  } finally {
    if (request === version) loading.value = false;
  }
}

async function edit() {
  draft.value = motto.value;
  error.value = '';
  savedNotice.value = '';
  open.value = true;
  await nextTick();
  input.value?.focus();
}

async function save() {
  if (saving.value) return;
  let value;
  try { value = normalizeMotto(draft.value); } catch (cause) { error.value = cause.message; return; }
  const userId = auth.user.value?.id;
  const request = version;
  saving.value = true;
  emit('busy', true);
  error.value = '';
  try {
    const result = await userSettingsRepository.saveMotto(userId, value);
    if (request !== version || userId !== auth.user.value?.id) return;
    motto.value = result;
    open.value = false;
    savedNotice.value = 'Motto saved';
  } catch (cause) {
    if (request === version) report(cause);
  } finally {
    saving.value = false;
    emit('busy', false);
  }
}

watch(() => auth.user.value?.id, userId => { load(userId); }, { immediate: true });
onBeforeUnmount(() => { version++; emit('busy', false); });
</script>

<template>
  <div class="user-motto">
    <span v-if="loading" class="motto-placeholder" role="status">Loading motto…</span>
    <button v-else-if="failed" class="motto-button motto-retry" :disabled="disabled" @click="load()">Retry motto</button>
    <button v-else class="motto-button" :class="{ 'motto-placeholder': !motto }" :disabled="disabled" :title="motto || 'Add your personal motto'" :aria-label="motto ? `Edit motto: ${motto}` : 'Add your personal motto'" @click="edit">
      <span>{{ motto || 'Add your motto' }}</span><span class="motto-pencil" aria-hidden="true">✎</span>
    </button>
    <span class="sr-only" role="status">{{ savedNotice }}</span>
    <BaseModal v-if="open" :dismissible="!saving" @close="open = false">
      <div class="modal-head"><div><h2>Your motto</h2><p class="modal-sub">A few words to keep you moving.</p></div><button class="close-btn" :disabled="saving" aria-label="Close motto editor" @click="open = false">×</button></div>
      <form @submit.prevent="save">
        <div class="field"><label for="personal-motto">Personal motto</label><input id="personal-motto" ref="input" v-model="draft" :maxlength="MOTTO_MAX_LENGTH" :disabled="saving" placeholder="Make time for what matters." autocomplete="off" /><span class="motto-counter">{{ draft.length }} / {{ MOTTO_MAX_LENGTH }}</span></div>
        <p v-if="error" class="form-error" role="alert">{{ error }}</p>
        <div class="modal-actions"><span></span><div class="modal-right"><button type="button" class="ghost-btn" :disabled="saving" @click="open = false">Cancel</button><button type="submit" class="primary-btn" :disabled="saving">{{ saving ? 'Saving…' : 'Save motto' }}</button></div></div>
      </form>
    </BaseModal>
  </div>
</template>
