
import { supabase } from '@/integrations/supabase/client';

interface ActivityLogData {
  action_type: string;
  entity_type: string;
  entity_id?: string;
  entity_name: string;
  description: string;
  comment?: string;
}

export const logActivity = async (data: ActivityLogData) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.error('No authenticated user found for activity logging');
      return;
    }

    const { error } = await supabase
      .from('activity_feed')
      .insert([{
        user_id: user.id,
        action_type: data.action_type,
        entity_type: data.entity_type,
        entity_id: data.entity_id,
        entity_name: data.entity_name,
        description: data.description,
        comment: data.comment
      }]);

    if (error) {
      console.error('Error logging activity:', error);
    }
  } catch (error) {
    console.error('Error in activity logging:', error);
  }
};

// Helper functions for common activities
export const logTaskUpdate = async (taskName: string, taskId: string, action: string, comment?: string) => {
  await logActivity({
    action_type: action,
    entity_type: 'task',
    entity_id: taskId,
    entity_name: taskName,
    description: `${action} task: ${taskName}`,
    comment
  });
};

export const logTaskCreated = async (taskName: string, taskId: string, projectName: string) => {
  await logActivity({
    action_type: 'created',
    entity_type: 'task',
    entity_id: taskId,
    entity_name: taskName,
    description: `Created new task: ${taskName} in project ${projectName}`
  });
};

export const logTaskStatusChanged = async (taskName: string, taskId: string, newStatus: string, oldStatus: string) => {
  await logActivity({
    action_type: `status_changed_to_${newStatus.toLowerCase().replace(' ', '_')}`,
    entity_type: 'task',
    entity_id: taskId,
    entity_name: taskName,
    description: `Changed task status from ${oldStatus} to ${newStatus}: ${taskName}`
  });
};

export const logTimeEntry = async (taskName: string, taskId: string, duration: string, comment?: string) => {
  await logActivity({
    action_type: 'logged_time',
    entity_type: 'task',
    entity_id: taskId,
    entity_name: taskName,
    description: `Logged ${duration} on task: ${taskName}`,
    comment
  });
};

export const logTimerStarted = async (taskName: string, taskId: string) => {
  await logActivity({
    action_type: 'timer_started',
    entity_type: 'task',
    entity_id: taskId,
    entity_name: taskName,
    description: `Started timer for task: ${taskName}`
  });
};

export const logTimerStopped = async (taskName: string, taskId: string, duration: string) => {
  await logActivity({
    action_type: 'timer_stopped',
    entity_type: 'task',
    entity_id: taskId,
    entity_name: taskName,
    description: `Stopped timer for task: ${taskName} (${duration})`
  });
};

export const logUserLogin = async (userEmail: string) => {
  await logActivity({
    action_type: 'logged_in',
    entity_type: 'user',
    entity_name: userEmail,
    description: `User ${userEmail} logged in`
  });
};

export const logProjectActivity = async (projectName: string, projectId: string, action: string, comment?: string) => {
  await logActivity({
    action_type: action,
    entity_type: 'project',
    entity_id: projectId,
    entity_name: projectName,
    description: `${action} project: ${projectName}`,
    comment
  });
};

export const logProjectCreated = async (projectName: string, projectId: string, clientName: string) => {
  await logActivity({
    action_type: 'created',
    entity_type: 'project',
    entity_id: projectId,
    entity_name: projectName,
    description: `Created new project: ${projectName} for client ${clientName}`
  });
};

export const logClientActivity = async (clientName: string, clientId: string, action: string, comment?: string) => {
  await logActivity({
    action_type: action,
    entity_type: 'client',
    entity_id: clientId,
    entity_name: clientName,
    description: `${action} client: ${clientName}`,
    comment
  });
};
