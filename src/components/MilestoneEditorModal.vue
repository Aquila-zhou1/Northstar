<script setup>
import { reactive } from 'vue';
import BaseModal from './BaseModal.vue';

const props = defineProps({
  milestone: { type: Object, default: null },
  assignedCount: { type: Number, default: 0 },
  milestoneCount: { type: Number, required: true }
});
const emit = defineEmits(['close', 'save', 'delete']);
const form = reactive({ name: props.milestone?.name || '', date: props.milestone?.date || '' });
</script>

<template>
  <BaseModal @close="$emit('close')">
    <div class="modal-head">
      <div><h2>{{ milestone ? 'Edit milestone' : 'Add a milestone' }}</h2><p class="modal-sub">Give the work a clear checkpoint.</p></div>
      <button class="close-btn" aria-label="Close" @click="$emit('close')">×</button>
    </div>
    <form @submit.prevent="$emit('save', { ...form })">
      <div class="form-grid">
        <div class="field full"><label for="milestoneName">Milestone name</label><input id="milestoneName" v-model="form.name" placeholder="e.g. Beta ready" required autofocus /></div>
        <div class="field full"><label for="milestoneDate">Target date</label><input id="milestoneDate" v-model="form.date" type="date" required /></div>
      </div>
      <div class="modal-actions">
        <button v-if="milestone && !assignedCount && milestoneCount > 1" type="button" class="danger-btn" @click="$emit('delete')">Delete milestone</button>
        <span v-else-if="milestone" class="locked-note">{{ assignedCount ? `Move ${assignedCount} assigned task${assignedCount === 1 ? '' : 's'} before deleting.` : 'Keep at least one milestone.' }}</span>
        <span v-else></span>
        <div class="modal-right"><button type="button" class="ghost-btn" @click="$emit('close')">Cancel</button><button class="primary-btn" type="submit">{{ milestone ? 'Save changes' : 'Add milestone' }}</button></div>
      </div>
    </form>
  </BaseModal>
</template>
