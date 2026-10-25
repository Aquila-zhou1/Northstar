<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue';
defineEmits(['close']);
const closeButton = ref(null);
const previousFocus = document.activeElement;
function escape(event) { if (event.key === 'Escape') closeButton.value?.click(); }
function trap(event) {
  if (event.key !== 'Tab') return;
  const controls = [...event.currentTarget.querySelectorAll('button, a')];
  if (event.shiftKey && document.activeElement === controls[0]) { event.preventDefault(); controls.at(-1).focus(); }
  else if (!event.shiftKey && document.activeElement === controls.at(-1)) { event.preventDefault(); controls[0].focus(); }
}
onMounted(() => { closeButton.value?.focus(); document.addEventListener('keydown', escape); });
onBeforeUnmount(() => { document.removeEventListener('keydown', escape); previousFocus?.focus(); });
</script>
<template>
  <Teleport to="body">
    <div class="drawer-backdrop" @click.self="$emit('close')">
      <aside class="navigation-drawer" role="dialog" aria-modal="true" aria-label="Navigation" @keydown="trap">
        <div class="drawer-heading"><strong>Northstar</strong><button ref="closeButton" class="icon-btn" aria-label="Close navigation" @click="$emit('close')">×</button></div>
        <p class="auth-eyebrow">Your workspace</p>
        <nav aria-label="Workspace views">
          <RouterLink :to="{ name: 'planner' }" @click="$emit('close')">▦ Project planner<span>Milestones & tasks</span></RouterLink>
          <RouterLink :to="{ name: 'calendar' }" @click="$emit('close')">▤ Weekly calendar<span>Make time for your work</span></RouterLink>
        </nav>
      </aside>
    </div>
  </Teleport>
</template>
