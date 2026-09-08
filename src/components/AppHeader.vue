<script setup>
defineProps({
  userEmail: { type: String, default: '' },
  busy: { type: Boolean, default: false }
});
defineEmits(['reset', 'add-milestone', 'add-task', 'sign-out']);
</script>

<template>
  <header class="topbar">
    <div class="brand">
      <div class="brand-mark">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path d="m15.3 8.7-2.1 4.5-4.5 2.1 2.1-4.5 4.5-2.1Z" />
        </svg>
      </div>
      <div class="brand-name">Northstar</div>
      <span class="private-pill">Private</span>
    </div>
    <div class="top-actions">
      <span v-if="busy" class="saving-indicator" role="status"><span></span>Saving</span>
      <span v-if="userEmail" class="account-email" :title="userEmail">{{ userEmail }}</span>
      <button class="icon-btn" title="Reset demo data" aria-label="Reset demo data" :disabled="busy" @click="$emit('reset')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" />
        </svg>
      </button>
      <button class="ghost-btn" :disabled="busy" @click="$emit('add-milestone')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M5 21V4" /><path d="M5 5h10l-1.5 3L15 11H5" />
        </svg>
        <span>Milestone</span>
      </button>
      <button class="primary-btn" :disabled="busy" @click="$emit('add-task')">
        <span class="plus">+</span><span class="button-label">Add task</span>
      </button>
      <button class="ghost-btn sign-out-btn" title="Log out" aria-label="Log out" @click="$emit('sign-out')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M10 17l5-5-5-5" /><path d="M15 12H3" /><path d="M14 3h5a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-5" />
        </svg>
        <span>Log out</span>
      </button>
    </div>
  </header>
</template>
