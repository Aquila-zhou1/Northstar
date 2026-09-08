<script setup>
import { formatDate, progressForTasks } from '../domain/planner';

defineProps({
  milestones: { type: Array, required: true },
  tasks: { type: Array, required: true },
  activeMilestone: { type: String, required: true },
  busy: { type: Boolean, default: false }
});

defineEmits(['select', 'edit']);

function milestoneStats(milestoneId, tasks) {
  const assigned = tasks.filter(task => task.milestoneId === milestoneId);
  return {
    completed: assigned.filter(task => task.status === 'done').length,
    total: assigned.length,
    progress: progressForTasks(assigned)
  };
}
</script>

<template>
  <section class="milestone-section" aria-labelledby="milestones-title">
    <div class="section-head">
      <h2 id="milestones-title" class="section-title">Milestones</h2>
      <div class="section-hint">Select a milestone to focus the board</div>
    </div>
    <div class="milestones">
      <article
        v-for="(milestone, index) in milestones"
        :key="milestone.id"
        class="milestone-card"
        :class="{ active: activeMilestone === milestone.id }"
        tabindex="0"
        @click="!busy && $emit('select', milestone.id)"
        @keydown.enter="!busy && $emit('select', milestone.id)"
        @keydown.space.prevent="!busy && $emit('select', milestone.id)"
      >
        <div class="milestone-top">
          <span class="milestone-index">M{{ String(index + 1).padStart(2, '0') }}</span>
          <span class="milestone-actions">
            <span class="milestone-date">{{ formatDate(milestone.date, true) }}</span>
            <button class="milestone-edit" :aria-label="`Edit ${milestone.name}`" :disabled="busy" @click.stop="$emit('edit', milestone.id)">•••</button>
          </span>
        </div>
        <div class="milestone-name">{{ milestone.name }}</div>
        <div class="mini-progress"><span :style="{ width: `${milestoneStats(milestone.id, tasks).progress}%` }"></span></div>
        <div class="milestone-bottom">
          <span>{{ milestoneStats(milestone.id, tasks).completed }}/{{ milestoneStats(milestone.id, tasks).total }} tasks</span>
          <span>{{ milestoneStats(milestone.id, tasks).progress }}%</span>
        </div>
      </article>
    </div>
  </section>
</template>
