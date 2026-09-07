<script setup>
import { reactive } from 'vue';
import BaseModal from './BaseModal.vue';

const props = defineProps({
  task: { type: Object, default: null },
  milestones: { type: Array, required: true },
  preferredMilestone: { type: String, default: '' }
});
const emit = defineEmits(['close', 'save', 'delete']);

const form = reactive({
  title: props.task?.title || '',
  milestoneId: props.task?.milestoneId || props.preferredMilestone || props.milestones[0]?.id || '',
  status: props.task?.status || 'planned',
  priority: props.task?.priority || 'Medium',
  due: props.task?.due || '',
  notes: props.task?.notes || ''
});

function submit() {
  emit('save', { ...form });
}
</script>

<template>
  <BaseModal @close="$emit('close')">
    <div class="modal-head">
      <div><h2>{{ task ? 'Edit task' : 'Add a task' }}</h2><p class="modal-sub">Keep the next step clear and easy to move.</p></div>
      <button class="close-btn" aria-label="Close" @click="$emit('close')">×</button>
    </div>
    <form @submit.prevent="submit">
      <div class="form-grid">
        <div class="field full"><label for="taskTitle">Task name</label><input id="taskTitle" v-model="form.title" placeholder="What needs to happen?" required autofocus /></div>
        <div class="field"><label for="taskMilestone">Milestone</label><select id="taskMilestone" v-model="form.milestoneId" required><option v-for="milestone in milestones" :key="milestone.id" :value="milestone.id">{{ milestone.name }}</option></select></div>
        <div class="field"><label for="taskStatus">Status</label><select id="taskStatus" v-model="form.status"><option value="planned">Planned</option><option value="progress">In progress</option><option value="review">Review</option><option value="done">Done</option></select></div>
        <div class="field"><label for="taskPriority">Priority</label><select id="taskPriority" v-model="form.priority"><option>High</option><option>Medium</option><option>Low</option></select></div>
        <div class="field"><label for="taskDue">Due date</label><input id="taskDue" v-model="form.due" type="date" /></div>
        <div class="field full"><label for="taskNotes">Notes</label><textarea id="taskNotes" v-model="form.notes" placeholder="Add context, links, or a definition of done…"></textarea></div>
      </div>
      <div class="modal-actions">
        <button v-if="task" type="button" class="danger-btn" @click="$emit('delete')">Delete task</button><span v-else></span>
        <div class="modal-right"><button type="button" class="ghost-btn" @click="$emit('close')">Cancel</button><button class="primary-btn" type="submit">{{ task ? 'Save changes' : 'Add task' }}</button></div>
      </div>
    </form>
  </BaseModal>
</template>
