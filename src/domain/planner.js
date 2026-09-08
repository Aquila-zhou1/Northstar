export const statusConfig = [
  { id: 'planned', label: 'Planned', color: '#a9a59a' },
  { id: 'progress', label: 'In progress', color: '#dd8455' },
  { id: 'review', label: 'Review', color: '#6b8fbc' },
  { id: 'done', label: 'Done', color: '#4f8462' }
];

export const defaultState = {
  projectName: 'Website launch',
  projectDescription: 'A focused workspace for the work that matters now—clear ownership, visible momentum, and fewer loose ends.',
  milestones: [
    { id: 'm1', name: 'Strategy & scope', date: '2026-09-04' },
    { id: 'm2', name: 'Design & build', date: '2026-09-18' },
    { id: 'm3', name: 'Launch ready', date: '2026-09-28' }
  ],
  tasks: [
    { id: 't1', title: 'Confirm goals and success metrics', milestoneId: 'm1', status: 'done', priority: 'High', due: '2026-08-28', notes: '' },
    { id: 't2', title: 'Map the primary user journey', milestoneId: 'm1', status: 'review', priority: 'Medium', due: '2026-09-01', notes: '' },
    { id: 't3', title: 'Create the visual direction', milestoneId: 'm2', status: 'progress', priority: 'High', due: '2026-09-07', notes: '' },
    { id: 't4', title: 'Build responsive page sections', milestoneId: 'm2', status: 'progress', priority: 'High', due: '2026-09-13', notes: '' },
    { id: 't5', title: 'Draft final page copy', milestoneId: 'm2', status: 'planned', priority: 'Medium', due: '2026-09-10', notes: '' },
    { id: 't6', title: 'Run accessibility and mobile QA', milestoneId: 'm3', status: 'planned', priority: 'Medium', due: '2026-09-23', notes: '' },
    { id: 't7', title: 'Prepare launch checklist', milestoneId: 'm3', status: 'planned', priority: 'Low', due: '2026-09-25', notes: '' }
  ]
};

export const clone = value => JSON.parse(JSON.stringify(value));

export function formatDate(date, short = false) {
  if (!date) return 'No date';
  const value = date instanceof Date ? date : new Date(`${date}T12:00:00`);
  return new Intl.DateTimeFormat('en-US', short
    ? { month: 'short', day: 'numeric' }
    : { month: 'short', day: 'numeric', year: 'numeric' }
  ).format(value);
}

export function progressForTasks(tasks) {
  if (!tasks.length) return 0;
  return Math.round((tasks.filter(task => task.status === 'done').length / tasks.length) * 100);
}

export function priorityColor(priority) {
  return { High: '#d56850', Medium: '#d09a4e', Low: '#76917c' }[priority] || '#999';
}

export function isOverdue(task) {
  if (!task.due || task.status === 'done') return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(`${task.due}T00:00:00`) < today;
}

export function uid(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}
