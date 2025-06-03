
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Calendar, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import SprintDialog from '@/components/SprintDialog';
import SprintCard from '@/components/SprintCard';
import { toast } from '@/hooks/use-toast';

interface Sprint {
  id: string;
  title: string;
  deadline: string;
  status: 'Not Started' | 'In Progress' | 'Completed';
  created_at: string;
  updated_at: string;
}

interface Task {
  id: string;
  name: string;
  status: 'Not Started' | 'In Progress' | 'Completed';
  project_id: string;
  assignee_id: string | null;
  deadline: string | null;
  hours: number;
  projects?: {
    name: string;
    clients: {
      name: string;
    };
  };
  employees?: {
    name: string;
  };
}

interface SprintWithTasks extends Sprint {
  tasks: Task[];
}

const Sprints = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  // Fetch sprints with their tasks
  const { data: sprints = [], isLoading } = useQuery({
    queryKey: ['sprints'],
    queryFn: async () => {
      // Fetch sprints ordered by deadline (nearest first)
      const { data: sprintsData, error: sprintsError } = await supabase
        .from('sprints')
        .select('*')
        .order('deadline', { ascending: true });

      if (sprintsError) throw sprintsError;

      // Fetch tasks for each sprint
      const sprintsWithTasks: SprintWithTasks[] = [];
      
      for (const sprint of sprintsData) {
        const { data: sprintTasks, error: tasksError } = await supabase
          .from('sprint_tasks')
          .select(`
            task_id,
            tasks (
              id,
              name,
              status,
              project_id,
              assignee_id,
              deadline,
              hours,
              projects (
                name,
                clients (
                  name
                )
              )
            )
          `)
          .eq('sprint_id', sprint.id);

        if (tasksError) throw tasksError;

        // Process tasks and add employee data separately
        const tasks: Task[] = [];
        
        for (const st of sprintTasks) {
          if (st.tasks) {
            const task = st.tasks as any;
            let employeeData = null;
            
            // Fetch employee data if assignee_id exists
            if (task.assignee_id) {
              const { data: employee } = await supabase
                .from('employees')
                .select('name')
                .eq('id', task.assignee_id)
                .single();
              
              if (employee) {
                employeeData = { name: employee.name };
              }
            }
            
            tasks.push({
              id: task.id,
              name: task.name,
              status: task.status as 'Not Started' | 'In Progress' | 'Completed',
              project_id: task.project_id,
              assignee_id: task.assignee_id,
              deadline: task.deadline,
              hours: task.hours,
              projects: task.projects,
              employees: employeeData
            });
          }
        }
        
        sprintsWithTasks.push({
          ...sprint,
          status: sprint.status as 'Not Started' | 'In Progress' | 'Completed',
          tasks
        });
      }

      return sprintsWithTasks;
    }
  });

  // Update task status mutation
  const updateTaskStatus = useMutation({
    mutationFn: async ({ taskId, status }: { taskId: string; status: 'Not Started' | 'In Progress' | 'Completed' }) => {
      const { error } = await supabase
        .from('tasks')
        .update({ status })
        .eq('id', taskId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sprints'] });
      toast({
        title: "Success",
        description: "Task status updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update task status",
        variant: "destructive",
      });
    }
  });

  // Update sprint status based on tasks
  const updateSprintStatus = useMutation({
    mutationFn: async ({ sprintId, status }: { sprintId: string; status: string }) => {
      const { error } = await supabase
        .from('sprints')
        .update({ status })
        .eq('id', sprintId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sprints'] });
    }
  });

  const handleTaskStatusChange = (taskId: string, newStatus: 'Not Started' | 'In Progress' | 'Completed', sprintId: string) => {
    updateTaskStatus.mutate({ taskId, status: newStatus });
    
    // Update sprint status based on task statuses
    const sprint = sprints.find(s => s.id === sprintId);
    if (sprint) {
      const updatedTasks = sprint.tasks.map(t => 
        t.id === taskId ? { ...t, status: newStatus } : t
      );
      
      let sprintStatus: 'Not Started' | 'In Progress' | 'Completed' = 'Not Started';
      if (updatedTasks.every(t => t.status === 'Completed')) {
        sprintStatus = 'Completed';
      } else if (updatedTasks.some(t => t.status === 'In Progress' || t.status === 'Completed')) {
        sprintStatus = 'In Progress';
      }
      
      if (sprintStatus !== sprint.status) {
        updateSprintStatus.mutate({ sprintId, status: sprintStatus });
      }
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'In Progress':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed':
        return 'bg-green-100 text-green-800';
      case 'In Progress':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex justify-center items-center h-64">
          <div className="text-lg">Loading sprints...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Sprints</h1>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Sprint
        </Button>
      </div>

      <div className="space-y-6">
        {sprints.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Calendar className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No sprints found</h3>
              <p className="text-gray-500 text-center mb-4">
                Get started by creating your first sprint to organize your tasks.
              </p>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Sprint
              </Button>
            </CardContent>
          </Card>
        ) : (
          sprints.map((sprint) => (
            <SprintCard
              key={sprint.id}
              sprint={sprint}
              onTaskStatusChange={handleTaskStatusChange}
              getStatusIcon={getStatusIcon}
              getStatusColor={getStatusColor}
            />
          ))
        )}
      </div>

      <SprintDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['sprints'] });
          setDialogOpen(false);
        }}
      />
    </div>
  );
};

export default Sprints;
