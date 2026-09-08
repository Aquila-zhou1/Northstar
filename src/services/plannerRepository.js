import { supabase } from './supabaseClient';

function throwIfError(error) {
  if (error) throw error;
}

function mapMilestone(row) {
  return {
    id: row.id,
    name: row.name,
    date: row.target_date
  };
}

function mapTask(row) {
  return {
    id: row.id,
    title: row.title,
    milestoneId: row.milestone_id,
    status: row.status,
    priority: row.priority,
    due: row.due_date || '',
    notes: row.notes || ''
  };
}

function taskRow(projectId, payload) {
  return {
    project_id: projectId,
    milestone_id: payload.milestoneId,
    title: payload.title,
    status: payload.status,
    priority: payload.priority,
    due_date: payload.due || null,
    notes: payload.notes || ''
  };
}

async function loadProject(projectId) {
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id, name, description')
    .eq('id', projectId)
    .single();
  throwIfError(projectError);

  const [milestonesResult, tasksResult] = await Promise.all([
    supabase
      .from('milestones')
      .select('id, name, target_date, sort_order, created_at')
      .eq('project_id', projectId)
      .order('sort_order')
      .order('created_at'),
    supabase
      .from('tasks')
      .select('id, title, milestone_id, status, priority, due_date, notes, sort_order, created_at')
      .eq('project_id', projectId)
      .order('sort_order')
      .order('created_at')
  ]);
  throwIfError(milestonesResult.error);
  throwIfError(tasksResult.error);

  return {
    projectId: project.id,
    projectName: project.name,
    projectDescription: project.description,
    milestones: milestonesResult.data.map(mapMilestone),
    tasks: tasksResult.data.map(mapTask)
  };
}

export const plannerRepository = {
  async loadWorkspace() {
    const { data: existing, error: lookupError } = await supabase
      .from('projects')
      .select('id')
      .eq('is_default', true)
      .order('created_at')
      .limit(1)
      .maybeSingle();
    throwIfError(lookupError);

    let projectId = existing?.id;
    if (!projectId) {
      const { data, error } = await supabase.rpc('initialize_user_workspace');
      throwIfError(error);
      projectId = data;
    }

    return loadProject(projectId);
  },

  async createTask(projectId, payload, sortOrder) {
    const { data, error } = await supabase
      .from('tasks')
      .insert({ ...taskRow(projectId, payload), sort_order: sortOrder })
      .select('id, title, milestone_id, status, priority, due_date, notes')
      .single();
    throwIfError(error);
    return mapTask(data);
  },

  async updateTask(projectId, taskId, payload) {
    const { data, error } = await supabase
      .from('tasks')
      .update(taskRow(projectId, payload))
      .eq('id', taskId)
      .eq('project_id', projectId)
      .select('id, title, milestone_id, status, priority, due_date, notes')
      .single();
    throwIfError(error);
    return mapTask(data);
  },

  async moveTask(projectId, taskId, status) {
    const { data, error } = await supabase
      .from('tasks')
      .update({ status })
      .eq('id', taskId)
      .eq('project_id', projectId)
      .select('id, title, milestone_id, status, priority, due_date, notes')
      .single();
    throwIfError(error);
    return mapTask(data);
  },

  async deleteTask(projectId, taskId) {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId)
      .eq('project_id', projectId);
    throwIfError(error);
  },

  async createMilestone(projectId, payload, sortOrder) {
    const { data, error } = await supabase
      .from('milestones')
      .insert({
        project_id: projectId,
        name: payload.name,
        target_date: payload.date,
        sort_order: sortOrder
      })
      .select('id, name, target_date')
      .single();
    throwIfError(error);
    return mapMilestone(data);
  },

  async updateMilestone(projectId, milestoneId, payload) {
    const { data, error } = await supabase
      .from('milestones')
      .update({ name: payload.name, target_date: payload.date })
      .eq('id', milestoneId)
      .eq('project_id', projectId)
      .select('id, name, target_date')
      .single();
    throwIfError(error);
    return mapMilestone(data);
  },

  async deleteMilestone(projectId, milestoneId) {
    const { error } = await supabase
      .from('milestones')
      .delete()
      .eq('id', milestoneId)
      .eq('project_id', projectId);
    throwIfError(error);
  },

  async resetWorkspace(projectId) {
    const { error } = await supabase.rpc('reset_user_workspace', {
      target_project_id: projectId
    });
    throwIfError(error);
    return loadProject(projectId);
  }
};
