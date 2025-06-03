
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { logActivity } from '@/utils/activityLogger';
import type { DeleteProjectResult } from './types';

export const useDeleteProject = () => {
  const queryClient = useQueryClient();

  return useMutation<DeleteProjectResult, Error, string>({
    mutationFn: async (id: string): Promise<DeleteProjectResult> => {
      console.log('Starting project deletion for ID:', id);
      
      // Get project details for logging before deletion
      const { data: projectData, error: projectFetchError } = await supabase
        .from('projects')
        .select('name, clients(name)')
        .eq('id', id)
        .single();
      
      if (projectFetchError) {
        console.error('Error fetching project data:', projectFetchError);
        throw projectFetchError;
      }
      
      // Step 1: Delete time entries associated with tasks of this project
      console.log('Step 1: Deleting time entries...');
      const { data: taskIds } = await supabase
        .from('tasks')
        .select('id')
        .eq('project_id', id);

      if (taskIds && taskIds.length > 0) {
        const { error: timeEntriesError } = await supabase
          .from('time_entries')
          .delete()
          .in('task_id', taskIds.map(task => task.id));
        
        if (timeEntriesError) {
          console.error('Error deleting time entries:', timeEntriesError);
          throw timeEntriesError;
        }
      }

      // Step 2: Delete tasks
      console.log('Step 2: Deleting tasks...');
      const { error: tasksError } = await supabase
        .from('tasks')
        .delete()
        .eq('project_id', id);
      
      if (tasksError) {
        console.error('Error deleting tasks:', tasksError);
        throw tasksError;
      }

      // Step 3: Delete sprints
      console.log('Step 3: Deleting sprints...');
      const { error: sprintsError } = await supabase
        .from('sprints')
        .delete()
        .eq('project_id', id);
      
      if (sprintsError) {
        console.error('Error deleting sprints:', sprintsError);
        throw sprintsError;
      }

      // Step 4: Delete invoices
      console.log('Step 4: Deleting invoices...');
      const { error: invoicesError } = await supabase
        .from('invoices')
        .delete()
        .eq('project_id', id);
      
      if (invoicesError) {
        console.error('Error deleting invoices:', invoicesError);
        throw invoicesError;
      }

      // Step 5: Finally delete the project
      console.log('Step 5: Deleting project...');
      const { error: projectError } = await supabase
        .from('projects')
        .delete()
        .eq('id', id);
      
      if (projectError) {
        console.error('Error deleting project:', projectError);
        throw projectError;
      }

      console.log('Project deletion completed successfully');
      
      return {
        deletedProjectId: id,
        projectName: projectData.name,
        clientName: projectData.clients?.name || 'Unknown Client'
      };
    },
    onSuccess: async (result) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Project and all related data deleted successfully!');
      
      // Log activity
      await logActivity({
        action_type: 'deleted',
        entity_type: 'project',
        entity_id: result.deletedProjectId,
        entity_name: result.projectName,
        description: `Deleted project: ${result.projectName} and all related data`,
        comment: `Client: ${result.clientName}`
      });
    },
    onError: (error) => {
      console.error('Project deletion failed:', error);
      toast.error('Failed to delete project: ' + error.message);
    }
  });
};
