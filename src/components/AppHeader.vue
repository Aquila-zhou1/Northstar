<script setup>
defineEmits(['reset', 'add-milestone', 'add-task']);
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
      <button class="icon-btn" title="Reset demo data" aria-label="Reset demo data" @click="$emit('reset')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" />
        </svg>
      </button>
      <button class="ghost-btn" @click="$emit('add-milestone')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M5 21V4" /><path d="M5 5h10l-1.5 3L15 11H5" />
        </svg>
        <span>Milestone</span>
      </button>
      <button class="primary-btn" @click="$emit('add-task')">
        <span class="plus">+</span><span class="button-label">Add task</span>
      </button>
    </div>
  </header>
</template>
