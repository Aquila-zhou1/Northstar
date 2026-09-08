<script setup>
import BaseModal from './BaseModal.vue';
defineEmits(['close', 'confirm']);
defineProps({ pending: { type: Boolean, default: false } });
</script>

<template>
  <BaseModal :dismissible="!pending" @close="$emit('close')">
    <div class="modal-head">
      <div><h2>Reset this workspace?</h2><p class="modal-sub">This replaces your cloud milestones and tasks with the original example plan.</p></div>
      <button class="close-btn" aria-label="Close" :disabled="pending" @click="$emit('close')">×</button>
    </div>
    <div class="modal-actions"><span></span><div class="modal-right"><button class="ghost-btn" :disabled="pending" @click="$emit('close')">Keep my work</button><button class="primary-btn" :disabled="pending" @click="$emit('confirm')">{{ pending ? 'Resetting…' : 'Reset workspace' }}</button></div></div>
  </BaseModal>
</template>
