<script setup>
import { onBeforeUnmount, onMounted } from 'vue';

const emit = defineEmits(['close']);

function onKeydown(event) {
  if (event.key === 'Escape') emit('close');
}

onMounted(() => document.addEventListener('keydown', onKeydown));
onBeforeUnmount(() => document.removeEventListener('keydown', onKeydown));
</script>

<template>
  <Teleport to="body">
    <div class="modal-backdrop" @mousedown.self="$emit('close')">
      <div class="modal" role="dialog" aria-modal="true">
        <slot />
      </div>
    </div>
  </Teleport>
</template>
