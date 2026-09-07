<script setup>
import { ref } from 'vue';
import { formatDate, isOverdue, priorityColor, statusConfig } from '../domain/planner';

defineProps({
  milestones: { type: Array, required: true },
  tasks: { type: Array, required: true },
  query: { type: String, required: true },
  activeMilestone: { type: String, required: true }
});

const emit = defineEmits(['update:query', 'update:activeMilestone', 'edit-task', 'move-task']);
const draggedTaskId = ref(null);
const dragOverStatus = ref(null);

function milestoneName(id, milestones) {
  return milestones.find(milestone => milestone.id === id)?.name || 'Unassigned';
}

function dropTask(status) {
  if (draggedTaskId.value) emit('move-task', draggedTaskId.value, status);
  draggedTaskId.value = null;
  dragOverStatus.value = null;
}
</script>

<template>
  <section class="board-section" aria-labelledby="board-title">
    <div class="section-head">
      <div>
        <h2 id="board-title" class="section-title">Task board</h2>
        <div class="section-hint" style="margin-top:5px">Drag cards between stages or open a card to edit</div>
      </div>
      <div class="board-tools">
        <label class="search-wrap" aria-label="Search tasks">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
            <circle cx="11" cy="11" r="7" /><path d="m20 20-3.8-3.8" />
          </svg>
          <input class="search-input" :value="query" placeholder="Search tasks…" @input="$emit('update:query', $event.target.value)" />
        </label>
        <select class="filter-select" aria-label="Filter by milestone" :value="activeMilestone" @change="$emit('update:activeMilestone', $event.target.value)">
          <option value="all">All milestones</option>
          <option v-for="milestone in milestones" :key="milestone.id" :value="milestone.id">{{ milestone.name }}</option>
        </select>
      </div>
    </div>
    <div class="board">
      <div
        v-for="column in statusConfig"
        :key="column.id"
        class="column"
        :class="{ 'drag-over': dragOverStatus === column.id }"
        :style="{ '--status-color': column.color }"
        @dragover.prevent="dragOverStatus = column.id"
        @dragleave.self="dragOverStatus = null"
        @drop.prevent="dropTask(column.id)"
      >
        <div class="column-head">
          <div class="column-title"><span class="status-dot"></span>{{ column.label }}</div>
          <span class="column-count">{{ tasks.filter(task => task.status === column.id).length }}</span>
        </div>
        <div class="task-list">
          <article
            v-for="task in tasks.filter(item => item.status === column.id)"
            :key="task.id"
            class="task-card"
            draggable="true"
            tabindex="0"
            :aria-label="task.title"
            @dragstart="draggedTaskId = task.id"
            @dragend="draggedTaskId = null; dragOverStatus = null"
            @dblclick="$emit('edit-task', task.id)"
            @keydown.enter="$emit('edit-task', task.id)"
          >
            <div class="task-top">
              <span class="task-milestone">{{ milestoneName(task.milestoneId, milestones) }}</span>
              <button class="task-menu" aria-label="Edit task" @click.stop="$emit('edit-task', task.id)">•••</button>
            </div>
            <div class="task-name">{{ task.title }}</div>
            <div class="task-foot">
              <span class="priority" :style="{ '--priority': priorityColor(task.priority) }">{{ task.priority }}</span>
              <span class="due" :class="{ overdue: isOverdue(task) }">{{ isOverdue(task) ? 'Overdue · ' : '' }}{{ formatDate(task.due, true) }}</span>
            </div>
          </article>
          <div v-if="!tasks.some(task => task.status === column.id)" class="empty-column">Drop a task here</div>
        </div>
      </div>
    </div>
  </section>
</template>
