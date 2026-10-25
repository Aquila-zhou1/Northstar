<script setup>
import { reactive, ref } from 'vue';
import BaseModal from './BaseModal.vue';

const props = defineProps({
  milestone: { type: Object, default: null },
  assignedCount: { type: Number, default: 0 },
  errorMessage: { type: String, default: '' },
  pending: { type: Boolean, default: false }
});
const emit = defineEmits(['close', 'save', 'delete']);
const form = reactive({ name: props.milestone?.name || '', date: props.milestone?.date || '' });
const confirmingDelete = ref(false);
</script>

<template>
  <BaseModal :dismissible="!pending" @close="$emit('close')">
    <div class="modal-head">
      <div><h2>{{ milestone ? 'Edit milestone' : 'Add a milestone' }}</h2><p class="modal-sub">Give the work a clear checkpoint.</p></div>
      <button class="close-btn" aria-label="Close" :disabled="pending" @click="$emit('close')">×</button>
    </div>
    <p v-if="errorMessage" class="form-error" role="alert">{{ errorMessage }}</p>
    <div v-if="confirmingDelete" class="delete-confirmation" role="alert">
      <p>Delete “{{ milestone.name }}” and all {{ assignedCount }} associated tasks? This cannot be undone.</p>
      <button class="ghost-btn" :disabled="pending" @click="confirmingDelete = false">Keep milestone</button>
      <button class="danger-btn" :disabled="pending" @click="$emit('delete')">{{ pending ? 'Deleting…' : 'Delete milestone and tasks' }}</button>
    </div>
    <form @submit.prevent="$emit('save', { ...form })">
      <fieldset class="modal-fieldset" :disabled="pending"><div class="form-grid">
        <div class="field full"><label for="milestoneName">Milestone name</label><input id="milestoneName" v-model="form.name" placeholder="e.g. Beta ready" required autofocus /></div>
        <div class="field full"><label for="milestoneDate">Target date</label><input id="milestoneDate" v-model="form.date" type="date" required /></div>
      </div></fieldset>
      <div class="modal-actions">
        <button v-if="milestone" type="button" class="danger-btn" :disabled="pending" @click="confirmingDelete = true">Delete milestone</button>
        <span v-else></span>
        <div class="modal-right"><button type="button" class="ghost-btn" :disabled="pending" @click="$emit('close')">Cancel</button><button class="primary-btn" type="submit" :disabled="pending">{{ pending ? 'Saving…' : milestone ? 'Save changes' : 'Add milestone' }}</button></div>
      </div>
    </form>
  </BaseModal>
</template>
