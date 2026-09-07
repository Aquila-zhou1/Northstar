<script setup>
import BaseModal from './BaseModal.vue';
defineEmits(['close', 'confirm']);
</script>

<template>
  <BaseModal @close="$emit('close')">
    <div class="modal-head">
      <div><h2>Reset this workspace?</h2><p class="modal-sub">This restores the original demo milestones and tasks on this browser.</p></div>
      <button class="close-btn" aria-label="Close" @click="$emit('close')">×</button>
    </div>
    <div class="modal-actions"><span></span><div class="modal-right"><button class="ghost-btn" @click="$emit('close')">Keep my work</button><button class="primary-btn" @click="$emit('confirm')">Reset workspace</button></div></div>
  </BaseModal>
</template>
