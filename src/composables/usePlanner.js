import { computed, reactive, ref } from 'vue';
import { clone, defaultState, progressForTasks, statusConfig } from '../domain/planner';
import { plannerRepository } from '../services/plannerRepository';

const state = reactive(clone(defaultState));
const activeMilestone = ref('all');
const query = ref('');
const ready = ref(false);
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

async function initialize() {
  ready.value = false;
  replaceWorkspace(await plannerRepository.loadWorkspace());
  ready.value = true;
}

const overall = computed(() => progressForTasks(state.tasks));
const completedCount = computed(() => state.tasks.filter(task => task.status === 'done').length);
const dueSoonCount = computed(() => state.tasks.filter(task => task.status !== 'done' && task.due && new Date(`${task.due}T00:00:00`) <= new Date(Date.now() + 7 * 86400000)).length);
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
  if (existing) {
    Object.assign(existing, await plannerRepository.updateTask(state.projectId, taskId, payload));
    showToast('Task updated');
    return;
  }

  const sortOrder = state.tasks.filter(task => task.milestoneId === payload.milestoneId).length;
  state.tasks.push(await plannerRepository.createTask(state.projectId, payload, sortOrder));
  showToast('Task added');
}

async function deleteTask(taskId) {
  await plannerRepository.deleteTask(state.projectId, taskId);
  state.tasks = state.tasks.filter(task => task.id !== taskId);
  showToast('Task deleted');
}

async function moveTask(taskId, status) {
  const task = state.tasks.find(item => item.id === taskId);
  if (!task || task.status === status) return;
  Object.assign(task, await plannerRepository.moveTask(state.projectId, taskId, status));
  showToast(`Moved to ${statusConfig.find(item => item.id === status).label}`);
}

async function saveMilestone(payload, milestoneId) {
  const existing = state.milestones.find(milestone => milestone.id === milestoneId);
  if (existing) {
    Object.assign(existing, await plannerRepository.updateMilestone(state.projectId, milestoneId, payload));
    showToast('Milestone updated');
    return;
  }

  state.milestones.push(await plannerRepository.createMilestone(
    state.projectId,
    payload,
    state.milestones.length
  ));
  showToast('Milestone added');
}

async function deleteMilestone(milestoneId) {
  await plannerRepository.deleteMilestone(state.projectId, milestoneId);
  state.milestones = state.milestones.filter(milestone => milestone.id !== milestoneId);
  if (activeMilestone.value === milestoneId) activeMilestone.value = 'all';
  showToast('Milestone deleted');
}

async function resetWorkspace() {
  replaceWorkspace(await plannerRepository.resetWorkspace(state.projectId));
  activeMilestone.value = 'all';
  query.value = '';
  showToast('Workspace reset');
}

export function usePlanner() {
  return {
    state, ready, query, activeMilestone, overall, completedCount, dueSoonCount,
    filteredTasks, initialize, selectMilestone, saveTask, deleteTask, moveTask,
    saveMilestone, deleteMilestone, resetWorkspace, toastMessage
  };
}
