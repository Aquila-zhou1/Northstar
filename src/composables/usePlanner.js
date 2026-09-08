import { computed, reactive, ref } from 'vue';
import { clone, defaultState, progressForTasks, statusConfig } from '../domain/planner';
import { plannerRepository } from '../services/plannerRepository';

const state = reactive(clone(defaultState));
const activeMilestone = ref('all');
const query = ref('');
const ready = ref(false);
const loading = ref(false);
const saving = ref(false);
const loadError = ref('');
const mutationError = ref('');
const authExpired = ref(false);
const toastMessage = ref('');
let toastTimer;

function replaceWorkspace(workspace) {
  state.projectId = workspace.projectId;
  state.projectName = workspace.projectName;
  state.projectDescription = workspace.projectDescription;
  state.milestones = workspace.milestones;
  state.tasks = workspace.tasks;
}

function showToast(message) {
  toastMessage.value = message;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toastMessage.value = ''; }, 1800);
}

function isSessionError(error) {
  const code = String(error?.code || '').toLowerCase();
  const message = String(error?.message || '').toLowerCase();
  return error?.status === 401
    || ['jwt_expired', 'refresh_token_not_found', 'refresh_token_already_used'].includes(code)
    || message.includes('jwt expired')
    || message.includes('invalid jwt')
    || message.includes('refresh token');
}

function userFacingError(error, action) {
  if (isSessionError(error)) return 'Your session has expired. Please log in again.';
  if (error?.status === 0 || String(error?.message || '').toLowerCase().includes('fetch')) {
    return `Could not ${action}. Check your connection and try again.`;
  }
  return `Could not ${action}. Your previous data is unchanged.`;
}

async function initialize() {
  loading.value = true;
  ready.value = false;
  loadError.value = '';
  authExpired.value = false;
  try {
    replaceWorkspace(await plannerRepository.loadWorkspace());
    ready.value = true;
    return true;
  } catch (error) {
    authExpired.value = isSessionError(error);
    loadError.value = userFacingError(error, 'load your workspace');
    return false;
  } finally {
    loading.value = false;
  }
}

async function runMutation(action, successMessage, actionLabel) {
  if (saving.value) return { ok: false };
  saving.value = true;
  mutationError.value = '';
  authExpired.value = false;
  try {
    const data = await action();
    showToast(successMessage);
    return { ok: true, data };
  } catch (error) {
    authExpired.value = isSessionError(error);
    mutationError.value = userFacingError(error, actionLabel);
    return { ok: false };
  } finally {
    saving.value = false;
  }
}

const overall = computed(() => progressForTasks(state.tasks));
const completedCount = computed(() => state.tasks.filter(task => task.status === 'done').length);
const dueSoonCount = computed(() => state.tasks.filter(task => task.status !== 'done' && task.due && new Date(`${task.due}T00:00:00`) <= new Date(Date.now() + 7 * 86400000)).length);
const isEmpty = computed(() => ready.value && !state.milestones.length && !state.tasks.length);
const filteredTasks = computed(() => state.tasks.filter(task => {
  const milestoneMatch = activeMilestone.value === 'all' || task.milestoneId === activeMilestone.value;
  const milestone = state.milestones.find(item => item.id === task.milestoneId);
  const searchMatch = !query.value || `${task.title} ${milestone?.name || ''}`.toLowerCase().includes(query.value.toLowerCase());
  return milestoneMatch && searchMatch;
}));

function selectMilestone(id) {
  activeMilestone.value = activeMilestone.value === id ? 'all' : id;
}

async function saveTask(payload, taskId) {
  const existing = state.tasks.find(task => task.id === taskId);
  const result = await runMutation(async () => {
    if (existing) {
      const updated = await plannerRepository.updateTask(state.projectId, taskId, payload);
      Object.assign(existing, updated);
      return;
    }
    const sortOrder = state.tasks.filter(task => task.milestoneId === payload.milestoneId).length;
    state.tasks.push(await plannerRepository.createTask(state.projectId, payload, sortOrder));
  }, existing ? 'Task updated' : 'Task added', existing ? 'update this task' : 'add this task');
  return result.ok;
}

async function deleteTask(taskId) {
  const result = await runMutation(async () => {
    await plannerRepository.deleteTask(state.projectId, taskId);
    state.tasks = state.tasks.filter(task => task.id !== taskId);
  }, 'Task deleted', 'delete this task');
  return result.ok;
}

async function moveTask(taskId, status) {
  const task = state.tasks.find(item => item.id === taskId);
  if (!task || task.status === status) return true;
  const result = await runMutation(async () => {
    Object.assign(task, await plannerRepository.moveTask(state.projectId, taskId, status));
  }, `Moved to ${statusConfig.find(item => item.id === status).label}`, 'move this task');
  return result.ok;
}

async function saveMilestone(payload, milestoneId) {
  const existing = state.milestones.find(milestone => milestone.id === milestoneId);
  const result = await runMutation(async () => {
    if (existing) {
      Object.assign(existing, await plannerRepository.updateMilestone(state.projectId, milestoneId, payload));
      return;
    }
    state.milestones.push(await plannerRepository.createMilestone(
      state.projectId,
      payload,
      state.milestones.length
    ));
  }, existing ? 'Milestone updated' : 'Milestone added', existing ? 'update this milestone' : 'add this milestone');
  return result.ok;
}

async function deleteMilestone(milestoneId) {
  const result = await runMutation(async () => {
    await plannerRepository.deleteMilestone(state.projectId, milestoneId);
    state.milestones = state.milestones.filter(milestone => milestone.id !== milestoneId);
    if (activeMilestone.value === milestoneId) activeMilestone.value = 'all';
  }, 'Milestone deleted', 'delete this milestone');
  return result.ok;
}

async function resetWorkspace() {
  const result = await runMutation(async () => {
    replaceWorkspace(await plannerRepository.resetWorkspace(state.projectId));
    activeMilestone.value = 'all';
    query.value = '';
  }, 'Workspace reset', 'reset your workspace');
  return result.ok;
}

function dismissMutationError() {
  mutationError.value = '';
}

export function usePlanner() {
  return {
    state, ready, loading, saving, loadError, mutationError, authExpired,
    query, activeMilestone, overall, completedCount, dueSoonCount, isEmpty,
    filteredTasks, initialize, selectMilestone, saveTask, deleteTask, moveTask,
    saveMilestone, deleteMilestone, resetWorkspace, dismissMutationError, toastMessage
  };
}
