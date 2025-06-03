import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CalendarIcon, Clock, Plus, User, Edit, Trash2, MessageCircle, Play, Square } from 'lucide-react';
import { format } from 'date-fns';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { logTaskCreated, logTaskStatusChanged, logTaskUpdate } from '@/utils/activityLogger';

interface Task {
  id: string;
  created_at: string;
  name: string;
  description?: string | null;
  project_id: string | null;
  assigner_id: string | null;
  assignee_id: string | null;
  status: 'Not Started' | 'In Progress' | 'Completed';
  priority?: string | null;
  due_date?: string | null;
  estimated_hours?: number | null;
  actual_hours?: number | null;
  comments?: string | null;
  deadline?: string | null;
  hours?: number;
  projects?: {
    name: string;
    clients: {
      name: string;
    };
  };
  assignee?: {
    name: string;
  };
  assigner?: {
    name: string;
  };
  employees?: {
    name: string;
  };
}

interface Project {
  id: string;
  name: string;
}

interface Employee {
  id: string;
  name: string;
}

interface TaskKanbanProps {
  tasks?: Task[];
  onTaskStatusChange?: (taskId: string, newStatus: string) => void;
  selectedProject?: string | null;
  selectedEmployee?: string | null;
  statusFilter?: string | null;
}

const TaskKanban = ({ tasks: externalTasks, onTaskStatusChange: externalOnTaskStatusChange, selectedProject, selectedEmployee, statusFilter }: TaskKanbanProps) => {
  const { user, userRole } = useAuth();
  const queryClient = useQueryClient();
  
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    project_id: '',
    assigner_id: user?.id || '',
    assignee_id: '',
    status: 'Not Started',
    priority: 'Medium',
    due_date: '',
    estimated_hours: '',
    actual_hours: '',
    comments: ''
  });

  const taskStatuses: ('Not Started' | 'In Progress' | 'Completed')[] = ['Not Started', 'In Progress', 'Completed'];
  const taskPriorities = ['High', 'Medium', 'Low'];

  const { data: fetchedTasks, isLoading: isTasksLoading } = useQuery({
    queryKey: ['tasks', selectedProject, selectedEmployee, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('tasks')
        .select(`
          *,
          projects (name, clients(name)),
          assignee:employees!tasks_assignee_id_fkey (name),
          assigner:employees!tasks_assigner_id_fkey (name)
        `)
        .order('created_at', { ascending: false });

      if (selectedProject) {
        query = query.eq('project_id', selectedProject);
      }

      if (selectedEmployee) {
        query = query.eq('assignee_id', selectedEmployee);
      }

      if (statusFilter && statusFilter !== 'All') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      // Transform the data to match our Task interface
      return (data || []).map(task => ({
        id: task.id,
        created_at: task.created_at,
        name: task.name,
        description: task.description || null,
        project_id: task.project_id,
        assigner_id: task.assigner_id,
        assignee_id: task.assignee_id,
        status: task.status as 'Not Started' | 'In Progress' | 'Completed',
        priority: 'Medium', // Default priority since it's not in the database
        due_date: task.deadline || null,
        estimated_hours: task.estimated_duration || null,
        actual_hours: task.hours || null,
        comments: null, // Not available in database
        deadline: task.deadline || null,
        hours: task.hours || 0,
        projects: task.projects,
        assignee: task.assignee,
        assigner: task.assigner,
        employees: task.assignee
      })) as Task[];
    },
    enabled: !externalTasks // Only fetch if no external tasks provided
  });

  // Use external tasks if provided, otherwise use fetched tasks
  const tasks = externalTasks || fetchedTasks || [];

  const { data: projects, isLoading: isProjectsLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Project[];
    }
  });

  const { data: employees, isLoading: isEmployeesLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employees')
        .select('id, name')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Employee[];
    }
  });

  const createTaskMutation = useMutation({
    mutationFn: async (taskData: any) => {
      const { data, error } = await supabase
        .from('tasks')
        .insert([taskData])
        .select(`
          *,
          projects (name, clients(name)),
          assignee:employees!tasks_assignee_id_fkey (name),
          assigner:employees!tasks_assigner_id_fkey (name)
        `)
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setIsTaskDialogOpen(false);
      resetForm();
      toast.success('Task created successfully!');
      
      // Log activity
      await logTaskCreated(
        data.name,
        data.id,
        data.projects?.name || 'Unknown Project',
        data.projects?.clients?.name
      );
    },
    onError: (error) => {
      toast.error('Failed to create task: ' + error.message);
    }
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const { data, error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', id)
        .select(`
          *,
          projects (name, clients(name)),
          assignee:employees!tasks_assignee_id_fkey (name),
          assigner:employees!tasks_assigner_id_fkey (name)
        `)
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Task updated successfully!');
      
      // Log activity for general updates
      await logTaskUpdate(
        data.name,
        data.id,
        'updated',
        `Task details updated for project: ${data.projects?.name}`
      );
    },
    onError: (error) => {
      toast.error('Failed to update task: ' + error.message);
    }
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return id;
    },
    onSuccess: async (deletedId) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Task deleted successfully!');
      
      // Log activity
      const deletedTask = tasks?.find(t => t.id === deletedId);
      if (deletedTask) {
        await logTaskUpdate(
          deletedTask.name,
          deletedTask.id,
          'deleted',
          `Task deleted from project: ${deletedTask.projects?.name}`
        );
      }
    },
    onError: (error) => {
      toast.error('Failed to delete task: ' + error.message);
    }
  });

  const updateTaskStatus = async (taskId: string, newStatus: string) => {
    const task = tasks?.find(t => t.id === taskId);
    if (!task) return;

    // Ensure the status is valid
    if (!taskStatuses.includes(newStatus as any)) return;

    const oldStatus = task.status;
    
    // Use external handler if provided, otherwise use internal mutation
    if (externalOnTaskStatusChange) {
      externalOnTaskStatusChange(taskId, newStatus);
    } else {
      updateTaskMutation.mutate({ 
        id: taskId, 
        updates: { status: newStatus } 
      });
    }

    // Log status change activity
    await logTaskStatusChanged(
      task.name,
      task.id,
      newStatus,
      oldStatus,
      task.projects?.name
    );
  };

  useEffect(() => {
    if (editingTask) {
      setFormData({
        name: editingTask.name,
        description: editingTask.description || '',
        project_id: editingTask.project_id || '',
        assigner_id: editingTask.assigner_id || user?.id || '',
        assignee_id: editingTask.assignee_id || '',
        status: editingTask.status,
        priority: editingTask.priority || 'Medium',
        due_date: editingTask.due_date || '',
        estimated_hours: editingTask.estimated_hours?.toString() || '',
        actual_hours: editingTask.actual_hours?.toString() || '',
        comments: editingTask.comments || ''
      });
    }
  }, [editingTask, user]);

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      project_id: '',
      assigner_id: user?.id || '',
      assignee_id: '',
      status: 'Not Started',
      priority: 'Medium',
      due_date: '',
      estimated_hours: '',
      actual_hours: '',
      comments: ''
    });
    setEditingTask(null);
    setIsTaskDialogOpen(false);
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.project_id || !formData.assignee_id) {
      toast.error('Please fill in all required fields.');
      return;
    }

    const taskData = {
      name: formData.name,
      description: formData.description,
      project_id: formData.project_id,
      assigner_id: formData.assigner_id,
      assignee_id: formData.assignee_id,
      status: formData.status,
      priority: formData.priority,
      due_date: formData.due_date,
      estimated_hours: formData.estimated_hours ? parseFloat(formData.estimated_hours) : 0,
      actual_hours: formData.actual_hours ? parseFloat(formData.actual_hours) : 0,
      comments: formData.comments
    };

    if (editingTask) {
      updateTaskMutation.mutate({ id: editingTask.id, updates: taskData });
    } else {
      createTaskMutation.mutate(taskData);
    }
  };

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setIsTaskDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this task?')) {
      deleteTaskMutation.mutate(id);
    }
  };

  const handleDragOver = (event: any) => {
    event.preventDefault();
  };

  const handleDrop = (event: any, newStatus: string) => {
    event.preventDefault();
    const taskId = event.dataTransfer.getData('taskId');
    updateTaskStatus(taskId, newStatus);
  };

  if ((!externalTasks && (isTasksLoading || isProjectsLoading || isEmployeesLoading))) {
    return <div>Loading tasks...</div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {taskStatuses.map((status) => (
        <div
          key={status}
          className="flex flex-col"
          onDragOver={handleDragOver}
          onDrop={(event) => handleDrop(event, status)}
        >
          <Card>
            <CardHeader>
              <CardTitle className="capitalize">{status.replace(/_/g, ' ')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {tasks
                ?.filter((task) => task.status === status)
                .map((task) => (
                  <div
                    key={task.id}
                    className="border rounded-md p-3 bg-gray-50 hover:bg-gray-100 transition-colors cursor-grab"
                    draggable
                    onDragStart={(event) => event.dataTransfer.setData('taskId', task.id)}
                  >
                    <div className="flex justify-between items-start">
                      <h3 className="text-sm font-semibold">{task.name}</h3>
                      <div className="flex space-x-2">
                        {userRole === 'admin' && (
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(task)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                        {userRole === 'admin' && (
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(task.id)}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        )}
                      </div>
                    </div>
                    <p className="text-xs mt-1">{task.description || 'No description'}</p>
                    <div className="flex items-center space-x-2 mt-2">
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={`https://avatar.vercel.sh/${task.assignee?.name || task.employees?.name}.png`} />
                        <AvatarFallback>{(task.assignee?.name || task.employees?.name)?.substring(0, 2)}</AvatarFallback>
                      </Avatar>
                      <span className="text-gray-500 text-xs">{task.assignee?.name || task.employees?.name}</span>
                    </div>
                    <div className="flex items-center space-x-3 mt-3">
                      <Badge variant="secondary">{task.priority || 'Medium'}</Badge>
                      {(task.due_date || task.deadline) && (
                        <div className="flex items-center space-x-1 text-gray-500">
                          <CalendarIcon className="h-3 w-3" />
                          <span className="text-xs">{format(new Date(task.due_date || task.deadline!), 'MMM dd, yyyy')}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              {userRole === 'admin' && !externalTasks && (
                <Button variant="outline" className="w-full justify-center" onClick={() => setIsTaskDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Task
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      ))}

      {!externalTasks && (
        <Dialog open={isTaskDialogOpen} onOpenChange={setIsTaskDialogOpen}>
          <DialogTrigger asChild>
            <div></div>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingTask ? 'Edit Task' : 'Create Task'}</DialogTitle>
              <DialogDescription>
                {editingTask ? 'Update task details' : 'Enter details for the new task'}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Name
                </Label>
                <Input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="description" className="text-right">
                  Description
                </Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="project_id" className="text-right">
                  Project
                </Label>
                <Select onValueChange={(value) => setFormData({ ...formData, project_id: value })}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select project" defaultValue={formData.project_id} />
                  </SelectTrigger>
                  <SelectContent>
                    {projects?.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="assigner_id" className="text-right">
                  Assigner
                </Label>
                <Select onValueChange={(value) => setFormData({ ...formData, assigner_id: value })}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select assigner" defaultValue={formData.assigner_id} />
                  </SelectTrigger>
                  <SelectContent>
                    {employees?.map((employee) => (
                      <SelectItem key={employee.id} value={employee.id}>
                        {employee.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="assignee_id" className="text-right">
                  Assignee
                </Label>
                <Select onValueChange={(value) => setFormData({ ...formData, assignee_id: value })}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select assignee" defaultValue={formData.assignee_id} />
                  </SelectTrigger>
                  <SelectContent>
                    {employees?.map((employee) => (
                      <SelectItem key={employee.id} value={employee.id}>
                        {employee.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="status" className="text-right">
                  Status
                </Label>
                <Select onValueChange={(value) => setFormData({ ...formData, status: value })}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select status" defaultValue={formData.status} />
                  </SelectTrigger>
                  <SelectContent>
                    {taskStatuses.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="priority" className="text-right">
                  Priority
                </Label>
                <Select onValueChange={(value) => setFormData({ ...formData, priority: value })}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select priority" defaultValue={formData.priority} />
                  </SelectTrigger>
                  <SelectContent>
                    {taskPriorities.map((priority) => (
                      <SelectItem key={priority} value={priority}>
                        {priority}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="due_date" className="text-right">
                  Due Date
                </Label>
                <Input
                  type="date"
                  id="due_date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="estimated_hours" className="text-right">
                  Estimated Hours
                </Label>
                <Input
                  type="number"
                  id="estimated_hours"
                  value={formData.estimated_hours}
                  onChange={(e) => setFormData({ ...formData, estimated_hours: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="actual_hours" className="text-right">
                  Actual Hours
                </Label>
                <Input
                  type="number"
                  id="actual_hours"
                  value={formData.actual_hours}
                  onChange={(e) => setFormData({ ...formData, actual_hours: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="comments" className="text-right">
                  Comments
                </Label>
                <Textarea
                  id="comments"
                  value={formData.comments}
                  onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
                  className="col-span-3"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button variant="ghost" onClick={resetForm}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={createTaskMutation.isPending || updateTaskMutation.isPending}>
                {editingTask ? 'Update' : 'Create'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default TaskKanban;
