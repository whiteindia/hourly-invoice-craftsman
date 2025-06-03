
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

export const logTaskCreated = async (taskName: string, taskId: string, projectName: string, clientName?: string) => {
  await logActivity({
    action_type: 'created',
    entity_type: 'task',
    entity_id: taskId,
    entity_name: taskName,
    description: `Created new task: ${taskName} in project ${projectName}${clientName ? ` for ${clientName}` : ''}`,
    comment: `Project: ${projectName}`
  });
};

export const logTaskStatusChanged = async (taskName: string, taskId: string, newStatus: string, oldStatus: string, projectName?: string) => {
  await logActivity({
    action_type: `status_changed_to_${newStatus.toLowerCase().replace(' ', '_')}`,
    entity_type: 'task',
    entity_id: taskId,
    entity_name: taskName,
    description: `Changed task status from ${oldStatus} to ${newStatus}: ${taskName}`,
    comment: projectName ? `Project: ${projectName}` : undefined
  });
};

export const logTimeEntry = async (taskName: string, taskId: string, duration: string, comment?: string, projectName?: string) => {
  await logActivity({
    action_type: 'logged_time',
    entity_type: 'task',
    entity_id: taskId,
    entity_name: taskName,
    description: `Logged ${duration} on task: ${taskName}`,
    comment: comment || (projectName ? `Project: ${projectName}` : undefined)
  });
};

export const logTimerStarted = async (taskName: string, taskId: string, projectName?: string) => {
  await logActivity({
    action_type: 'timer_started',
    entity_type: 'task',
    entity_id: taskId,
    entity_name: taskName,
    description: `Started timer for task: ${taskName}`,
    comment: projectName ? `Project: ${projectName}` : undefined
  });
};

export const logTimerStopped = async (taskName: string, taskId: string, duration: string, projectName?: string) => {
  await logActivity({
    action_type: 'timer_stopped',
    entity_type: 'task',
    entity_id: taskId,
    entity_name: taskName,
    description: `Stopped timer for task: ${taskName} (${duration})`,
    comment: projectName ? `Project: ${projectName}` : undefined
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

export const logProjectActivity = async (projectName: string, projectId: string, action: string, comment?: string, clientName?: string) => {
  await logActivity({
    action_type: action,
    entity_type: 'project',
    entity_id: projectId,
    entity_name: projectName,
    description: `${action} project: ${projectName}${clientName ? ` for ${clientName}` : ''}`,
    comment
  });
};

export const logProjectCreated = async (projectName: string, projectId: string, clientName: string) => {
  await logActivity({
    action_type: 'created',
    entity_type: 'project',
    entity_id: projectId,
    entity_name: projectName,
    description: `Created new project: ${projectName} for client ${clientName}`,
    comment: `Client: ${clientName}`
  });
};

export const logProjectUpdated = async (projectName: string, projectId: string, updateType: string, clientName?: string) => {
  await logActivity({
    action_type: 'updated',
    entity_type: 'project',
    entity_id: projectId,
    entity_name: projectName,
    description: `Updated project: ${projectName} - ${updateType}`,
    comment: clientName ? `Client: ${clientName}` : undefined
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

export const logClientCreated = async (clientName: string, clientId: string, company?: string) => {
  await logActivity({
    action_type: 'created',
    entity_type: 'client',
    entity_id: clientId,
    entity_name: clientName,
    description: `Created new client: ${clientName}${company ? ` (${company})` : ''}`,
    comment: company ? `Company: ${company}` : undefined
  });
};

export const logClientUpdated = async (clientName: string, clientId: string, updateType: string) => {
  await logActivity({
    action_type: 'updated',
    entity_type: 'client',
    entity_id: clientId,
    entity_name: clientName,
    description: `Updated client: ${clientName} - ${updateType}`
  });
};

// Payment specific logging
export const logPaymentCreated = async (amount: number, clientName: string, invoiceId: string, paymentId: string) => {
  await logActivity({
    action_type: 'created',
    entity_type: 'payment',
    entity_id: paymentId,
    entity_name: `Payment for ${clientName}`,
    description: `Recorded payment of ₹${amount} for invoice ${invoiceId}`,
    comment: `Client: ${clientName}, Invoice: ${invoiceId}`
  });
};

// Invoice specific logging
export const logInvoiceCreated = async (invoiceId: string, clientName: string, projectName: string, amount: number, hours: number) => {
  await logActivity({
    action_type: 'created',
    entity_type: 'invoice',
    entity_id: invoiceId,
    entity_name: invoiceId,
    description: `Created invoice ${invoiceId} for ${clientName} - ₹${amount}`,
    comment: `Project: ${projectName}, ${hours} hours`
  });
};

export const logInvoiceStatusChanged = async (invoiceId: string, newStatus: string, oldStatus: string, clientName?: string) => {
  await logActivity({
    action_type: 'updated',
    entity_type: 'invoice',
    entity_id: invoiceId,
    entity_name: invoiceId,
    description: `Updated invoice ${invoiceId} status from ${oldStatus} to ${newStatus}`,
    comment: clientName ? `Client: ${clientName}` : undefined
  });
};
