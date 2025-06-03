
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export const useProjectOperations = () => {
  const queryClient = useQueryClient();

  // Function to upload BRD file
  const uploadBRDFile = async (file: File, projectId: string) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `brd-${projectId}-${Date.now()}.${fileExt}`;
    
    const { data, error } = await supabase.storage
      .from('project-files')
      .upload(fileName, file);
    
    if (error) throw error;
    
    const { data: { publicUrl } } = supabase.storage
      .from('project-files')
      .getPublicUrl(fileName);
    
    return publicUrl;
  };

  // Mutation to create a new project
  const createProjectMutation = useMutation({
    mutationFn: async ({ projectData, brdFile }: { projectData: any; brdFile: File | null }) => {
      const { data, error } = await supabase
        .from('projects')
        .insert([projectData])
        .select()
        .single();
      
      if (error) throw error;
      
      // Upload BRD file if provided
      if (brdFile) {
        try {
          const brdUrl = await uploadBRDFile(brdFile, data.id);
          
          const { error: updateError } = await supabase
            .from('projects')
            .update({ brd_file_url: brdUrl })
            .eq('id', data.id);
          
          if (updateError) throw updateError;
        } catch (uploadError) {
          console.error('BRD upload failed:', uploadError);
          toast.error('Project created but BRD upload failed');
        }
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Project created successfully!');
    },
    onError: (error) => {
      toast.error('Failed to create project: ' + error.message);
    }
  });

  // Mutation to update an existing project
  const updateProjectMutation = useMutation({
    mutationFn: async ({ id, updates, brdFile }: { id: string; updates: any; brdFile: File | null }) => {
      // Handle BRD file upload for edit
      if (brdFile) {
        try {
          const brdUrl = await uploadBRDFile(brdFile, id);
          updates.brd_file_url = brdUrl;
        } catch (uploadError) {
          console.error('BRD upload failed:', uploadError);
          toast.error('BRD upload failed');
          throw uploadError;
        }
      }

      const { data, error } = await supabase
        .from('projects')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Project updated successfully!');
    },
    onError: (error) => {
      toast.error('Failed to update project: ' + error.message);
    }
  });

  // Mutation to delete a project with proper cascade handling
  const deleteProjectMutation = useMutation({
    mutationFn: async (id: string) => {
      console.log('Starting project deletion for ID:', id);
      
      // Step 1: Get all tasks for this project
      const { data: projectTasks, error: tasksError } = await supabase
        .from('tasks')
        .select('id')
        .eq('project_id', id);
      
      if (tasksError) {
        console.error('Error fetching tasks:', tasksError);
        throw tasksError;
      }
      
      console.log('Found tasks:', projectTasks?.length || 0);
      
      if (projectTasks && projectTasks.length > 0) {
        const taskIds = projectTasks.map(task => task.id);
        console.log('Task IDs to process:', taskIds);
        
        // Step 2: Delete all time entries for these tasks first
        const { error: timeEntriesError } = await supabase
          .from('time_entries')
          .delete()
          .in('task_id', taskIds);
        
        if (timeEntriesError) {
          console.error('Error deleting time entries:', timeEntriesError);
          throw timeEntriesError;
        }
        console.log('Deleted time entries for tasks');
        
        // Step 3: Delete all task comments for these tasks
        const { error: commentsError } = await supabase
          .from('task_comments')
          .delete()
          .in('task_id', taskIds);
        
        if (commentsError) {
          console.error('Error deleting task comments:', commentsError);
          throw commentsError;
        }
        console.log('Deleted task comments');
        
        // Step 4: Delete sprint_tasks associations
        const { error: sprintTasksError } = await supabase
          .from('sprint_tasks')
          .delete()
          .in('task_id', taskIds);
        
        if (sprintTasksError) {
          console.error('Error deleting sprint tasks:', sprintTasksError);
          throw sprintTasksError;
        }
        console.log('Deleted sprint task associations');
        
        // Step 5: Delete invoice_tasks associations
        const { error: invoiceTasksError } = await supabase
          .from('invoice_tasks')
          .delete()
          .in('task_id', taskIds);
        
        if (invoiceTasksError) {
          console.error('Error deleting invoice tasks:', invoiceTasksError);
          throw invoiceTasksError;
        }
        console.log('Deleted invoice task associations');
        
        // Step 6: Now delete the tasks themselves
        const { error: deleteTasksError } = await supabase
          .from('tasks')
          .delete()
          .eq('project_id', id);
        
        if (deleteTasksError) {
          console.error('Error deleting tasks:', deleteTasksError);
          throw deleteTasksError;
        }
        console.log('Deleted tasks');
      }
      
      // Step 7: Delete invoices for this project
      const { error: invoicesError } = await supabase
        .from('invoices')
        .delete()
        .eq('project_id', id);
      
      if (invoicesError) {
        console.error('Error deleting invoices:', invoicesError);
        throw invoicesError;
      }
      console.log('Deleted invoices');
      
      // Step 8: Delete payments for this project
      const { error: paymentsError } = await supabase
        .from('payments')
        .delete()
        .eq('project_id', id);
      
      if (paymentsError) {
        console.error('Error deleting payments:', paymentsError);
        throw paymentsError;
      }
      console.log('Deleted payments');
      
      // Step 9: Finally, delete the project itself
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id);
      
      if (error) {
        console.error('Error deleting project:', error);
        throw error;
      }
      console.log('Project deleted successfully');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Project and all related data deleted successfully!');
    },
    onError: (error) => {
      console.error('Project deletion failed:', error);
      toast.error('Failed to delete project: ' + error.message);
    }
  });

  return {
    createProjectMutation,
    updateProjectMutation,
    deleteProjectMutation,
    uploadBRDFile
  };
};
