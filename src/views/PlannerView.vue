<script setup>
import { computed, onMounted, ref } from 'vue';
import AppHeader from '../components/AppHeader.vue';
import MilestoneEditorModal from '../components/MilestoneEditorModal.vue';
import MilestoneList from '../components/MilestoneList.vue';
import ProjectOverview from '../components/ProjectOverview.vue';
import ResetModal from '../components/ResetModal.vue';
import TaskBoard from '../components/TaskBoard.vue';
import TaskEditorModal from '../components/TaskEditorModal.vue';
import { usePlanner } from '../composables/usePlanner';

const planner = usePlanner();
const taskEditorId = ref(undefined);
const milestoneEditorId = ref(undefined);
const resetOpen = ref(false);

const editedTask = computed(() => planner.state.tasks.find(task => task.id === taskEditorId.value) || null);
const editedMilestone = computed(() => planner.state.milestones.find(milestone => milestone.id === milestoneEditorId.value) || null);
const assignedCount = computed(() => editedMilestone.value ? planner.state.tasks.filter(task => task.milestoneId === editedMilestone.value.id).length : 0);
const preferredMilestone = computed(() => planner.activeMilestone.value !== 'all' ? planner.activeMilestone.value : planner.state.milestones[0]?.id || '');

function openTask(taskId = null) { taskEditorId.value = taskId; }
function openMilestone(milestoneId = null) { milestoneEditorId.value = milestoneId; }

async function submitTask(payload) {
  await planner.saveTask(payload, taskEditorId.value);
  taskEditorId.value = undefined;
}

async function removeTask() {
  await planner.deleteTask(taskEditorId.value);
  taskEditorId.value = undefined;
}

async function submitMilestone(payload) {
  await planner.saveMilestone(payload, milestoneEditorId.value);
  milestoneEditorId.value = undefined;
}

async function removeMilestone() {
  await planner.deleteMilestone(milestoneEditorId.value);
  milestoneEditorId.value = undefined;
}

async function confirmReset() {
  await planner.resetWorkspace();
  resetOpen.value = false;
}

onMounted(planner.initialize);
</script>

<template>
  <div class="shell">
    <AppHeader @reset="resetOpen = true" @add-milestone="openMilestone()" @add-task="openTask()" />
    <main v-if="planner.ready.value">
      <ProjectOverview
        :project-name="planner.state.projectName"
        :project-description="planner.state.projectDescription"
        :overall="planner.overall.value"
        :completed="planner.completedCount.value"
        :total="planner.state.tasks.length"
        :due-soon="planner.dueSoonCount.value"
      />
      <MilestoneList
        :milestones="planner.state.milestones"
        :tasks="planner.state.tasks"
        :active-milestone="planner.activeMilestone.value"
        @select="planner.selectMilestone"
        @edit="openMilestone"
      />
      <TaskBoard
        :milestones="planner.state.milestones"
        :tasks="planner.filteredTasks.value"
        :query="planner.query.value"
        :active-milestone="planner.activeMilestone.value"
        @update:query="planner.query.value = $event"
        @update:active-milestone="planner.activeMilestone.value = $event"
        @edit-task="openTask"
        @move-task="planner.moveTask"
      />
    </main>
    <TaskEditorModal
      v-if="taskEditorId !== undefined"
      :key="taskEditorId || 'new'"
      :task="editedTask"
      :milestones="planner.state.milestones"
      :preferred-milestone="preferredMilestone"
      @close="taskEditorId = undefined"
      @save="submitTask"
      @delete="removeTask"
    />
    <MilestoneEditorModal
      v-if="milestoneEditorId !== undefined"
      :key="milestoneEditorId || 'new'"
      :milestone="editedMilestone"
      :assigned-count="assignedCount"
      :milestone-count="planner.state.milestones.length"
      @close="milestoneEditorId = undefined"
      @save="submitMilestone"
      @delete="removeMilestone"
    />
    <ResetModal v-if="resetOpen" @close="resetOpen = false" @confirm="confirmReset" />
    <div class="toast" :class="{ show: planner.toastMessage.value }" role="status">{{ planner.toastMessage.value }}</div>
  </div>
</template>
