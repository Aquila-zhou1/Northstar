import { computed, reactive, ref } from 'vue';
import { clone, defaultState, progressForTasks, statusConfig, uid } from '../domain/planner';
import { localPlannerRepository } from '../services/plannerRepository';

const state = reactive(clone(defaultState));
const activeMilestone = ref('all');
const query = ref('');
const ready = ref(false);
const toastMessage = ref('');
let toastTimer;

async function initialize() {
  Object.assign(state, await localPlannerRepository.load());
  ready.value = true;
}

async function persist(message = 'Progress saved') {
  await localPlannerRepository.save(state);
  toastMessage.value = message;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toastMessage.value = ''; }, 1800);
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
  if (existing) Object.assign(existing, payload);
  else state.tasks.push({ id: uid('task'), ...payload });
  await persist(existing ? 'Task updated' : 'Task added');
}

async function deleteTask(taskId) {
  state.tasks = state.tasks.filter(task => task.id !== taskId);
  await persist('Task deleted');
}

async function moveTask(taskId, status) {
  const task = state.tasks.find(item => item.id === taskId);
  if (!task || task.status === status) return;
  task.status = status;
  await persist(`Moved to ${statusConfig.find(item => item.id === status).label}`);
}

async function saveMilestone(payload, milestoneId) {
  const existing = state.milestones.find(milestone => milestone.id === milestoneId);
  if (existing) Object.assign(existing, payload);
  else state.milestones.push({ id: uid('milestone'), ...payload });
  await persist(existing ? 'Milestone updated' : 'Milestone added');
}

async function deleteMilestone(milestoneId) {
  state.milestones = state.milestones.filter(milestone => milestone.id !== milestoneId);
  if (activeMilestone.value === milestoneId) activeMilestone.value = 'all';
  await persist('Milestone deleted');
}

async function resetWorkspace() {
  Object.assign(state, clone(defaultState));
  activeMilestone.value = 'all';
  query.value = '';
  await persist('Workspace reset');
}

export function usePlanner() {
  return {
    state, ready, query, activeMilestone, overall, completedCount, dueSoonCount,
    filteredTasks, initialize, selectMilestone, saveTask, deleteTask, moveTask,
    saveMilestone, deleteMilestone, resetWorkspace, toastMessage
  };
}
