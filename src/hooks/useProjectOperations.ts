
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { logProjectCreated, logProjectUpdated, logActivity } from '@/utils/activityLogger';

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
        .select('*, clients(name)')
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
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Project created successfully!');
      
      // Log activity
      await logProjectCreated(
        data.name,
        data.id,
        data.clients?.name || 'Unknown Client'
      );
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
        .select('*, clients(name)')
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Project updated successfully!');
      
      // Log activity
      await logProjectUpdated(
        data.name,
        data.id,
        'project details',
        data.clients?.name || 'Unknown Client'
      );
    },
    onError: (error) => {
      toast.error('Failed to update project: ' + error.message);
    }
  });

  // Mutation to delete a project with proper cascade handling
  const deleteProjectMutation = useMutation({
    mutationFn: async (id: string) => {
      console.log('Starting project deletion for ID:', id);
      
      // Get project details for logging before deletion
      const { data: projectData } = await supabase
        .from('projects')
        .select('name, clients(name)')
        .eq('id', id)
        .single();
      
      // Step 1: Delete time entries associated with tasks of this project
      console.log('Step 1: Deleting time entries...');
      const { error: timeEntriesError } = await supabase
        .from('time_entries')
        .delete()
        .in('task_id', 
          await supabase
            .from('tasks')
            .select('id')
            .eq('project_id', id)
            .then(({ data }) => data?.map(task => task.id) || [])
        );
      
      if (timeEntriesError) {
        console.error('Error deleting time entries:', timeEntriesError);
        throw timeEntriesError;
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
      return { id, projectData };
    },
    onSuccess: async (result) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Project and all related data deleted successfully!');
      
      // Log activity
      if (result && result.projectData) {
        await logActivity({
          action_type: 'deleted',
          entity_type: 'project',
          entity_id: result.id,
          entity_name: result.projectData.name,
          description: `Deleted project: ${result.projectData.name} and all related data`,
          comment: `Client: ${result.projectData.clients?.name || 'Unknown Client'}`
        });
      }
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
