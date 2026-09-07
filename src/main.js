import './style.css';

const STORAGE_KEY = 'northstar-planner-v1';

const icons = {
  compass: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="m15.3 8.7-2.1 4.5-4.5 2.1 2.1-4.5 4.5-2.1Z"/></svg>`,
  search: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.8-3.8"/></svg>`,
  reset: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>`,
  flag: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 21V4"/><path d="M5 5h10l-1.5 3L15 11H5"/></svg>`
};

const statusConfig = [
  { id: 'planned', label: 'Planned', color: '#a9a59a' },
  { id: 'progress', label: 'In progress', color: '#dd8455' },
  { id: 'review', label: 'Review', color: '#6b8fbc' },
  { id: 'done', label: 'Done', color: '#4f8462' }
];

const defaultState = {
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

const clone = (value) => JSON.parse(JSON.stringify(value));
let state = loadState();
let activeMilestone = 'all';
let query = '';
let draggedTaskId = null;
let toastTimer;

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? { ...clone(defaultState), ...JSON.parse(saved) } : clone(defaultState);
  } catch {
    return clone(defaultState);
  }
}

function saveState(message = 'Progress saved') {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  showToast(message);
}

function formatDate(date, short = false) {
  if (!date) return 'No date';
  const parsed = new Date(`${date}T12:00:00`);
  return new Intl.DateTimeFormat('en-US', short ? { month: 'short', day: 'numeric' } : { month: 'short', day: 'numeric', year: 'numeric' }).format(parsed);
}

function uid(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function progressForTasks(tasks) {
  if (!tasks.length) return 0;
  return Math.round((tasks.filter(t => t.status === 'done').length / tasks.length) * 100);
}

function milestoneById(id) {
  return state.milestones.find(m => m.id === id);
}

function priorityColor(priority) {
  return { High: '#d56850', Medium: '#d09a4e', Low: '#76917c' }[priority] || '#999';
}

function isOverdue(task) {
  if (!task.due || task.status === 'done') return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(`${task.due}T00:00:00`) < today;
}

function filteredTasks() {
  return state.tasks.filter(task => {
    const milestoneMatch = activeMilestone === 'all' || task.milestoneId === activeMilestone;
    const searchMatch = !query || `${task.title} ${milestoneById(task.milestoneId)?.name || ''}`.toLowerCase().includes(query.toLowerCase());
    return milestoneMatch && searchMatch;
  });
}

function render() {
  const overall = progressForTasks(state.tasks);
  const done = state.tasks.filter(t => t.status === 'done').length;
  const dueSoon = state.tasks.filter(t => t.status !== 'done' && t.due && new Date(`${t.due}T00:00:00`) <= new Date(Date.now() + 7 * 86400000)).length;

  document.querySelector('#app').innerHTML = `
    <div class="shell">
      <header class="topbar">
        <div class="brand">
          <div class="brand-mark">${icons.compass}</div>
          <div class="brand-name">Northstar</div>
          <span class="private-pill">Private</span>
        </div>
        <div class="top-actions">
          <button class="icon-btn" id="resetButton" title="Reset demo data" aria-label="Reset demo data">${icons.reset}</button>
          <button class="ghost-btn" id="addMilestoneButton">${icons.flag}<span>Milestone</span></button>
          <button class="primary-btn" id="addTaskButton"><span class="plus">+</span><span class="button-label">Add task</span></button>
        </div>
      </header>

      <main>
        <section class="overview" aria-labelledby="project-title">
          <div>
            <p class="eyebrow">Active project · ${formatDate(new Date().toISOString().slice(0,10))}</p>
            <h1 id="project-title">${escapeHtml(state.projectName)}</h1>
            <p class="overview-copy">${escapeHtml(state.projectDescription)}</p>
          </div>
          <aside class="progress-panel" aria-label="Project progress">
            <div class="progress-top">
              <div>
                <div class="progress-label">Overall progress</div>
                <div class="progress-number">${overall}%</div>
              </div>
              <div class="trend">${overall >= 70 ? 'Nearly there' : overall >= 35 ? 'On the move' : 'Getting started'}</div>
            </div>
            <div class="meter"><span style="width:${overall}%"></span></div>
            <div class="progress-meta"><span><b>${done}</b> completed</span><span><b>${state.tasks.length - done}</b> remaining</span><span><b>${dueSoon}</b> due soon</span></div>
          </aside>
        </section>

        <section class="milestone-section" aria-labelledby="milestones-title">
          <div class="section-head">
            <h2 class="section-title" id="milestones-title">Milestones</h2>
            <div class="section-hint">Select a milestone to focus the board</div>
          </div>
          <div class="milestones">
            ${state.milestones.map((milestone, index) => milestoneCard(milestone, index)).join('')}
          </div>
        </section>

        <section class="board-section" aria-labelledby="board-title">
          <div class="section-head">
            <div>
              <h2 class="section-title" id="board-title">Task board</h2>
              <div class="section-hint" style="margin-top:5px">Drag cards between stages or open a card to edit</div>
            </div>
            <div class="board-tools">
              <label class="search-wrap" aria-label="Search tasks">${icons.search}<input class="search-input" id="searchInput" value="${escapeAttr(query)}" placeholder="Search tasks…" /></label>
              <select class="filter-select" id="milestoneFilter" aria-label="Filter by milestone">
                <option value="all" ${activeMilestone === 'all' ? 'selected' : ''}>All milestones</option>
                ${state.milestones.map(m => `<option value="${m.id}" ${activeMilestone === m.id ? 'selected' : ''}>${escapeHtml(m.name)}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="board">
            ${statusConfig.map(columnTemplate).join('')}
          </div>
        </section>
      </main>
      <div class="toast" id="toast" role="status"></div>
    </div>`;

  bindEvents();
}

function milestoneCard(milestone, index) {
  const tasks = state.tasks.filter(t => t.milestoneId === milestone.id);
  const progress = progressForTasks(tasks);
  return `<article class="milestone-card ${activeMilestone === milestone.id ? 'active' : ''}" data-milestone-id="${milestone.id}" tabindex="0">
    <div class="milestone-top"><span class="milestone-index">M${String(index + 1).padStart(2, '0')}</span><span class="milestone-actions"><span class="milestone-date">${formatDate(milestone.date, true)}</span><button class="milestone-edit" data-edit-milestone="${milestone.id}" aria-label="Edit ${escapeAttr(milestone.name)}">•••</button></span></div>
    <div class="milestone-name">${escapeHtml(milestone.name)}</div>
    <div class="mini-progress"><span style="width:${progress}%"></span></div>
    <div class="milestone-bottom"><span>${tasks.filter(t => t.status === 'done').length}/${tasks.length} tasks</span><span>${progress}%</span></div>
  </article>`;
}

function columnTemplate(column) {
  const tasks = filteredTasks().filter(t => t.status === column.id);
  return `<div class="column" data-status="${column.id}" style="--status-color:${column.color}">
    <div class="column-head"><div class="column-title"><span class="status-dot"></span>${column.label}</div><span class="column-count">${tasks.length}</span></div>
    <div class="task-list">
      ${tasks.length ? tasks.map(taskCard).join('') : '<div class="empty-column">Drop a task here</div>'}
    </div>
  </div>`;
}

function taskCard(task) {
  const milestone = milestoneById(task.milestoneId);
  return `<article class="task-card" draggable="true" data-task-id="${task.id}" tabindex="0" aria-label="${escapeAttr(task.title)}">
    <div class="task-top"><span class="task-milestone">${escapeHtml(milestone?.name || 'Unassigned')}</span><button class="task-menu" data-edit-task="${task.id}" aria-label="Edit task">•••</button></div>
    <div class="task-name">${escapeHtml(task.title)}</div>
    <div class="task-foot"><span class="priority" style="--priority:${priorityColor(task.priority)}">${task.priority}</span><span class="due ${isOverdue(task) ? 'overdue' : ''}">${isOverdue(task) ? 'Overdue · ' : ''}${formatDate(task.due, true)}</span></div>
  </article>`;
}

function bindEvents() {
  document.querySelector('#addTaskButton').addEventListener('click', () => openTaskModal());
  document.querySelector('#addMilestoneButton').addEventListener('click', openMilestoneModal);
  document.querySelector('#resetButton').addEventListener('click', openResetModal);
  document.querySelector('#searchInput').addEventListener('input', (event) => {
    query = event.target.value;
    const cursor = event.target.selectionStart;
    render();
    const input = document.querySelector('#searchInput');
    input.focus(); input.setSelectionRange(cursor, cursor);
  });
  document.querySelector('#milestoneFilter').addEventListener('change', event => { activeMilestone = event.target.value; render(); });

  document.querySelectorAll('.milestone-card').forEach(card => {
    const select = () => { activeMilestone = activeMilestone === card.dataset.milestoneId ? 'all' : card.dataset.milestoneId; render(); };
    card.addEventListener('click', select);
    card.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') select(); });
  });
  document.querySelectorAll('[data-edit-milestone]').forEach(button => button.addEventListener('click', event => {
    event.stopPropagation();
    openMilestoneModal(button.dataset.editMilestone);
  }));
  document.querySelectorAll('[data-edit-task]').forEach(button => button.addEventListener('click', event => {
    event.stopPropagation();
    openTaskModal(button.dataset.editTask);
  }));
  document.querySelectorAll('.task-card').forEach(card => {
    card.addEventListener('dblclick', () => openTaskModal(card.dataset.taskId));
    card.addEventListener('keydown', event => { if (event.key === 'Enter') openTaskModal(card.dataset.taskId); });
    card.addEventListener('dragstart', () => { draggedTaskId = card.dataset.taskId; card.classList.add('dragging'); });
    card.addEventListener('dragend', () => { draggedTaskId = null; card.classList.remove('dragging'); document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over')); });
  });
  document.querySelectorAll('.column').forEach(column => {
    column.addEventListener('dragover', event => { event.preventDefault(); column.classList.add('drag-over'); });
    column.addEventListener('dragleave', event => { if (!column.contains(event.relatedTarget)) column.classList.remove('drag-over'); });
    column.addEventListener('drop', event => {
      event.preventDefault();
      const task = state.tasks.find(t => t.id === draggedTaskId);
      if (task && task.status !== column.dataset.status) {
        task.status = column.dataset.status;
        saveState(`Moved to ${statusConfig.find(s => s.id === task.status).label}`);
        render();
      }
    });
  });
}

function openTaskModal(taskId = null) {
  const existing = state.tasks.find(t => t.id === taskId);
  const preferredMilestone = activeMilestone !== 'all' ? activeMilestone : state.milestones[0]?.id;
  openModal(`
    <div class="modal-head"><div><h2>${existing ? 'Edit task' : 'Add a task'}</h2><p class="modal-sub">Keep the next step clear and easy to move.</p></div><button class="close-btn" data-close aria-label="Close">×</button></div>
    <form id="taskForm">
      <div class="form-grid">
        <div class="field full"><label for="taskTitle">Task name</label><input id="taskTitle" name="title" value="${escapeAttr(existing?.title || '')}" placeholder="What needs to happen?" required autofocus /></div>
        <div class="field"><label for="taskMilestone">Milestone</label><select id="taskMilestone" name="milestoneId" required>${state.milestones.map(m => `<option value="${m.id}" ${(existing?.milestoneId || preferredMilestone) === m.id ? 'selected' : ''}>${escapeHtml(m.name)}</option>`).join('')}</select></div>
        <div class="field"><label for="taskStatus">Status</label><select id="taskStatus" name="status">${statusConfig.map(s => `<option value="${s.id}" ${(existing?.status || 'planned') === s.id ? 'selected' : ''}>${s.label}</option>`).join('')}</select></div>
        <div class="field"><label for="taskPriority">Priority</label><select id="taskPriority" name="priority">${['High','Medium','Low'].map(p => `<option ${((existing?.priority || 'Medium') === p) ? 'selected' : ''}>${p}</option>`).join('')}</select></div>
        <div class="field"><label for="taskDue">Due date</label><input id="taskDue" name="due" type="date" value="${existing?.due || ''}" /></div>
        <div class="field full"><label for="taskNotes">Notes</label><textarea id="taskNotes" name="notes" placeholder="Add context, links, or a definition of done…">${escapeHtml(existing?.notes || '')}</textarea></div>
      </div>
      <div class="modal-actions">${existing ? '<button type="button" class="danger-btn" id="deleteTask">Delete task</button>' : '<span></span>'}<div class="modal-right"><button type="button" class="ghost-btn" data-close>Cancel</button><button class="primary-btn" type="submit">${existing ? 'Save changes' : 'Add task'}</button></div></div>
    </form>`);

  document.querySelector('#taskForm').addEventListener('submit', event => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form.entries());
    if (existing) Object.assign(existing, payload);
    else state.tasks.push({ id: uid('task'), ...payload });
    saveState(existing ? 'Task updated' : 'Task added');
    closeModal(); render();
  });
  document.querySelector('#deleteTask')?.addEventListener('click', () => {
    state.tasks = state.tasks.filter(t => t.id !== existing.id);
    saveState('Task deleted'); closeModal(); render();
  });
}

function openMilestoneModal(milestoneId = null) {
  const existing = state.milestones.find(m => m.id === milestoneId);
  const assignedCount = existing ? state.tasks.filter(t => t.milestoneId === existing.id).length : 0;
  openModal(`
    <div class="modal-head"><div><h2>${existing ? 'Edit milestone' : 'Add a milestone'}</h2><p class="modal-sub">Give the work a clear checkpoint.</p></div><button class="close-btn" data-close aria-label="Close">×</button></div>
    <form id="milestoneForm">
      <div class="form-grid">
        <div class="field full"><label for="milestoneName">Milestone name</label><input id="milestoneName" name="name" value="${escapeAttr(existing?.name || '')}" placeholder="e.g. Beta ready" required autofocus /></div>
        <div class="field full"><label for="milestoneDate">Target date</label><input id="milestoneDate" name="date" type="date" value="${existing?.date || ''}" required /></div>
      </div>
      <div class="modal-actions">${existing && !assignedCount && state.milestones.length > 1 ? '<button type="button" class="danger-btn" id="deleteMilestone">Delete milestone</button>' : existing ? `<span class="locked-note">${assignedCount ? `Move ${assignedCount} assigned task${assignedCount === 1 ? '' : 's'} before deleting.` : 'Keep at least one milestone.'}</span>` : '<span></span>'}<div class="modal-right"><button type="button" class="ghost-btn" data-close>Cancel</button><button class="primary-btn" type="submit">${existing ? 'Save changes' : 'Add milestone'}</button></div></div>
    </form>`);
  document.querySelector('#milestoneForm').addEventListener('submit', event => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form.entries());
    if (existing) Object.assign(existing, payload);
    else state.milestones.push({ id: uid('milestone'), ...payload });
    saveState(existing ? 'Milestone updated' : 'Milestone added'); closeModal(); render();
  });
  document.querySelector('#deleteMilestone')?.addEventListener('click', () => {
    state.milestones = state.milestones.filter(m => m.id !== existing.id);
    if (activeMilestone === existing.id) activeMilestone = 'all';
    saveState('Milestone deleted'); closeModal(); render();
  });
}

function openResetModal() {
  openModal(`
    <div class="modal-head"><div><h2>Reset this workspace?</h2><p class="modal-sub">This restores the original demo milestones and tasks on this browser.</p></div><button class="close-btn" data-close aria-label="Close">×</button></div>
    <div class="modal-actions"><span></span><div class="modal-right"><button class="ghost-btn" data-close>Keep my work</button><button class="primary-btn" id="confirmReset">Reset workspace</button></div></div>`);
  document.querySelector('#confirmReset').addEventListener('click', () => {
    state = clone(defaultState); activeMilestone = 'all'; query = '';
    saveState('Workspace reset'); closeModal(); render();
  });
}

function openModal(content) {
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.innerHTML = `<div class="modal" role="dialog" aria-modal="true">${content}</div>`;
  backdrop.addEventListener('mousedown', event => { if (event.target === backdrop) closeModal(); });
  document.body.appendChild(backdrop);
  document.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', closeModal));
  document.addEventListener('keydown', escapeModal);
  setTimeout(() => backdrop.querySelector('[autofocus]')?.focus(), 30);
}

function closeModal() {
  document.querySelector('.modal-backdrop')?.remove();
  document.removeEventListener('keydown', escapeModal);
}

function escapeModal(event) { if (event.key === 'Escape') closeModal(); }

function showToast(message) {
  const toast = document.querySelector('#toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 1800);
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
}

function escapeAttr(value = '') { return escapeHtml(value); }

render();
