<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import AppHeader from '../components/AppHeader.vue';
import MilestoneEditorModal from '../components/MilestoneEditorModal.vue';
import MilestoneList from '../components/MilestoneList.vue';
import ProjectOverview from '../components/ProjectOverview.vue';
import ResetModal from '../components/ResetModal.vue';
import TaskBoard from '../components/TaskBoard.vue';
import TaskEditorModal from '../components/TaskEditorModal.vue';
import { usePlanner } from '../composables/usePlanner';
import { useAuth } from '../composables/useAuth';

const planner = usePlanner();
const auth = useAuth();
const router = useRouter();
const taskEditorId = ref(undefined);
const milestoneEditorId = ref(undefined);
const resetOpen = ref(false);
const signingOut = ref(false);

const editedTask = computed(() => planner.state.tasks.find(task => task.id === taskEditorId.value) || null);
const editedMilestone = computed(() => planner.state.milestones.find(milestone => milestone.id === milestoneEditorId.value) || null);
const assignedCount = computed(() => editedMilestone.value ? planner.state.tasks.filter(task => task.milestoneId === editedMilestone.value.id).length : 0);
const preferredMilestone = computed(() => planner.activeMilestone.value !== 'all' ? planner.activeMilestone.value : planner.state.milestones[0]?.id || '');

function openTask(taskId = null) { if (!planner.saving.value) taskEditorId.value = taskId; }
function openMilestone(milestoneId = null) { if (!planner.saving.value) milestoneEditorId.value = milestoneId; }

async function submitTask(payload) {
  if (await planner.saveTask(payload, taskEditorId.value)) taskEditorId.value = undefined;
}

async function removeTask() {
  if (await planner.deleteTask(taskEditorId.value)) taskEditorId.value = undefined;
}

async function submitMilestone(payload) {
  if (await planner.saveMilestone(payload, milestoneEditorId.value)) milestoneEditorId.value = undefined;
}

async function removeMilestone() {
  if (await planner.deleteMilestone(milestoneEditorId.value)) milestoneEditorId.value = undefined;
}

async function confirmReset() {
  if (await planner.resetWorkspace()) resetOpen.value = false;
}

async function signOut() {
  if (signingOut.value) return;
  signingOut.value = true;
  planner.dismissMutationError();
  try {
    await auth.signOut();
    await router.replace({ name: 'login' });
  } catch {
    planner.mutationError.value = 'Could not log out. Check your connection and try again.';
  } finally {
    signingOut.value = false;
  }
}

onMounted(planner.initialize);

watch(() => planner.authExpired.value, async expired => {
  if (!expired) return;
  try {
    await auth.signOut('local');
  } finally {
    await router.replace({ name: 'login', query: { reason: 'session-expired' } });
  }
});

watch(() => auth.isAuthenticated.value, authenticated => {
  if (!authenticated) router.replace({ name: 'login' });
});
</script>

<template>
  <div class="shell">
    <AppHeader
      :user-email="auth.user.value?.email || ''"
      :busy="planner.saving.value || signingOut"
      @reset="resetOpen = true"
      @add-milestone="openMilestone()"
      @add-task="openTask()"
      @sign-out="signOut"
    />
    <main v-if="planner.loading.value" class="workspace-state" aria-live="polite" aria-busy="true">
      <div class="state-spinner" aria-hidden="true"></div>
      <h1 class="state-title">Loading your workspace…</h1>
      <p>Connecting to your private Northstar plan.</p>
    </main>
    <main v-else-if="planner.loadError.value" class="workspace-state" role="alert">
      <div class="state-icon">!</div>
      <h1 class="state-title">We couldn’t load your workspace.</h1>
      <p>{{ planner.loadError.value }}</p>
      <button class="primary-btn" @click="planner.initialize">Try again</button>
    </main>
    <main v-else-if="planner.ready.value">
      <div v-if="planner.mutationError.value" class="error-banner" role="alert">
        <span>{{ planner.mutationError.value }}</span>
        <button type="button" aria-label="Dismiss error" @click="planner.dismissMutationError">×</button>
      </div>
      <ProjectOverview
        :project-name="planner.state.projectName"
        :project-description="planner.state.projectDescription"
        :overall="planner.overall.value"
        :completed="planner.completedCount.value"
        :total="planner.state.tasks.length"
        :due-soon="planner.dueSoonCount.value"
      />
      <section v-if="planner.isEmpty.value" class="empty-workspace">
        <p class="auth-eyebrow">Nothing here yet</p>
        <h2>Your workspace is empty.</h2>
        <p>Restore the example plan, then shape it around your real project.</p>
        <button class="primary-btn" :disabled="planner.saving.value" @click="planner.resetWorkspace">
          {{ planner.saving.value ? 'Restoring…' : 'Restore example workspace' }}
        </button>
      </section>
      <template v-else>
      <MilestoneList
        :milestones="planner.state.milestones"
        :tasks="planner.state.tasks"
        :active-milestone="planner.activeMilestone.value"
        :busy="planner.saving.value"
        @select="planner.selectMilestone"
        @edit="openMilestone"
      />
      <TaskBoard
        :milestones="planner.state.milestones"
        :tasks="planner.filteredTasks.value"
        :query="planner.query.value"
        :active-milestone="planner.activeMilestone.value"
        :busy="planner.saving.value"
        @update:query="planner.query.value = $event"
        @update:active-milestone="planner.activeMilestone.value = $event"
        @edit-task="openTask"
        @move-task="planner.moveTask"
      />
      </template>
    </main>
    <TaskEditorModal
      v-if="taskEditorId !== undefined"
      :key="taskEditorId || 'new'"
      :task="editedTask"
      :milestones="planner.state.milestones"
      :preferred-milestone="preferredMilestone"
      :pending="planner.saving.value"
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
      :pending="planner.saving.value"
      @close="milestoneEditorId = undefined"
      @save="submitMilestone"
      @delete="removeMilestone"
    />
    <ResetModal v-if="resetOpen" :pending="planner.saving.value" @close="resetOpen = false" @confirm="confirmReset" />
    <div class="toast" :class="{ show: planner.toastMessage.value }" role="status">{{ planner.toastMessage.value }}</div>
  </div>
</template>
