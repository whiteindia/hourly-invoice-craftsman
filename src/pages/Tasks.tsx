import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, CheckCircle, Clock, Filter, FileText, History, Edit, Play, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import Navigation from '@/components/Navigation';
import TaskHistory from '@/components/TaskHistory';
import TimeTrackerWithComment from '@/components/TimeTrackerWithComment';
import { useAuth } from '@/contexts/AuthContext';
import { logTaskUpdate } from '@/utils/activityLogger';

interface Task {
  id: string;
  name: string;
  project_id: string;
  status: 'Not Started' | 'In Progress' | 'Completed';
  hours: number;
  date: string;
  deadline?: string | null;
  estimated_duration?: number | null;
  invoiced: boolean;
  assignee_id: string | null;
  assigner_id: string | null;
  projects: { name: string; clients: { name: string } };
  assignee?: { name: string } | null;
  assigner?: { name: string } | null;
}

interface Project {
  id: string;
  name: string;
  clients: { name: string };
}

interface Employee {
  id: string;
  name: string;
  email: string;
}

const Tasks = () => {
  const { user, userRole } = useAuth();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState({
    client: '',
    project: '',
    status: '',
    billing: '',
    assignee: '',
    assigner: ''
  });
  const [newTask, setNewTask] = useState({
    name: '',
    project_id: '',
    assignee_id: '',
    date: new Date().toISOString().split('T')[0],
    deadline: '',
    estimated_duration: ''
  });

  // Convert userRole to string for comparison
  const roleString = userRole as string;

  // Role-based permissions
  const canCreateTasks = ['admin', 'manager', 'teamlead'].includes(roleString);
  const canEditTasks = ['admin', 'manager', 'teamlead'].includes(roleString);
  const canSeeBilling = ['admin', 'accountant'].includes(roleString);
  const canSeeAllProjects = ['admin'].includes(roleString);
  const canSeeAssignedProjects = ['admin', 'manager'].includes(roleString);

  // Get current user's employee ID for default assigner
  const { data: currentEmployee } = useQuery({
    queryKey: ['current-employee', user?.email],
    queryFn: async () => {
      if (!user?.email) return null;
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('email', user.email)
        .single();
      
      if (error) return null;
      return data as Employee;
    },
    enabled: !!user?.email
  });

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks', filters],
    queryFn: async () => {
      let query = supabase
        .from('tasks')
        .select(`
          *,
          projects!inner(
            name,
            clients!inner(name)
          ),
          assignee:employees!tasks_assignee_id_fkey(name),
          assigner:employees!tasks_assigner_id_fkey(name)
        `);

      // Apply role-based filtering
      if (roleString === 'employee' || roleString === 'associate') {
        // Employees/associates can only see tasks assigned to them
        query = query.eq('assignee_id', currentEmployee?.id);
      }

      if (filters.project && filters.project !== 'all') {
        query = query.eq('project_id', filters.project);
      }
      if (filters.status && filters.status !== 'all') {
        query = query.eq('status', filters.status as 'Not Started' | 'In Progress' | 'Completed');
      }
      if (filters.billing && filters.billing !== 'all' && canSeeBilling) {
        query = query.eq('invoiced', filters.billing === 'billed');
      }
      if (filters.assignee && filters.assignee !== 'all') {
        query = query.eq('assignee_id', filters.assignee);
      }
      if (filters.assigner && filters.assigner !== 'all') {
        query = query.eq('assigner_id', filters.assigner);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      // Sort tasks with overdue and duration-exceeded tasks at the top
      const sortedTasks = (data as Task[]).sort((a, b) => {
        const aIsOverdue = isOverdue(a);
        const bIsOverdue = isOverdue(b);
        const aIsDurationExceeded = isDurationExceeded(a);
        const bIsDurationExceeded = isDurationExceeded(b);
        
        // Priority sorting: overdue or duration exceeded tasks go first
        const aPriority = aIsOverdue || aIsDurationExceeded;
        const bPriority = bIsOverdue || bIsDurationExceeded;
        
        if (aPriority && !bPriority) return -1;
        if (!aPriority && bPriority) return 1;
        
        // If both or neither are priority, sort by date (newest first)
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });
      
      return sortedTasks;
    },
    enabled: !!currentEmployee
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects-for-tasks'],
    queryFn: async () => {
      let query = supabase
        .from('projects')
        .select(`
          id,
          name,
          clients(name)
        `)
        .eq('status', 'Active')
        .order('name');

      // Role-based project filtering
      if (roleString === 'manager') {
        // Managers see projects assigned to them (you might need to add project assignment logic)
        // For now, showing all active projects
      } else if (roleString === 'employee' || roleString === 'associate') {
        // Employees see projects they have tasks in
        const { data: userTasks } = await supabase
          .from('tasks')
          .select('project_id')
          .eq('assignee_id', currentEmployee?.id);
        
        if (userTasks && userTasks.length > 0) {
          const projectIds = userTasks.map(t => t.project_id);
          query = query.in('id', projectIds);
        } else {
          return [];
        }
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as Project[];
    },
    enabled: !!currentEmployee
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees-for-tasks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employees')
        .select('id, name, email')
        .order('name');
      
      if (error) throw error;
      return data as Employee[];
    }
  });

  // Helper functions for deadline and duration status
  const isOverdue = (task: Task) => {
    if (!task.deadline || task.status === 'Completed') return false;
    return new Date() > new Date(task.deadline);
  };

  const isDurationExceeded = (task: Task) => {
    if (!task.estimated_duration || task.status === 'Completed') return false;
    return task.hours > task.estimated_duration;
  };

  const getDateLag = (deadline: string) => {
    const today = new Date();
    const deadlineDate = new Date(deadline);
    const diffTime = today.getTime() - deadlineDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  const getDurationExcess = (actualHours: number, estimatedHours: number) => {
    return actualHours > estimatedHours ? (actualHours - estimatedHours).toFixed(1) : 0;
  };

  // Calculate total hours from time_entries
  const updateTaskHoursMutation = useMutation({
    mutationFn: async ({ taskId }: { taskId: string }) => {
      const { data: entries, error: entriesError } = await supabase
        .from('time_entries')
        .select('duration_minutes')
        .eq('task_id', taskId)
        .not('duration_minutes', 'is', null);
      
      if (entriesError) throw entriesError;
      
      const totalMinutes = entries.reduce((sum, entry) => sum + (entry.duration_minutes || 0), 0);
      const totalHours = Math.round((totalMinutes / 60) * 100) / 100;
      
      const { data, error } = await supabase
        .from('tasks')
        .update({ hours: totalHours })
        .eq('id', taskId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    }
  });

  const addTaskMutation = useMutation({
    mutationFn: async (taskData: typeof newTask) => {
      const { data, error } = await supabase
        .from('tasks')
        .insert([{
          name: taskData.name,
          project_id: taskData.project_id,
          assignee_id: taskData.assignee_id || null,
          date: taskData.date,
          deadline: taskData.deadline || null,
          estimated_duration: taskData.estimated_duration ? parseFloat(taskData.estimated_duration) : null,
          assigner_id: currentEmployee?.id || null
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      // Log activity
      await logTaskUpdate(data.name, data.id, 'created');
      setNewTask({
        name: '',
        project_id: '',
        assignee_id: '',
        date: new Date().toISOString().split('T')[0],
        deadline: '',
        estimated_duration: ''
      });
      setIsDialogOpen(false);
      toast.success('Task created successfully!');
    },
    onError: (error) => {
      toast.error('Failed to create task: ' + error.message);
    }
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, updates }: { taskId: string; updates: Partial<Task> }) => {
      const { data, error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', taskId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      // Log activity
      await logTaskUpdate(data.name, data.id, 'updated');
      setIsEditDialogOpen(false);
      setEditingTask(null);
      toast.success('Task updated successfully!');
    },
    onError: (error) => {
      toast.error('Failed to update task: ' + error.message);
    }
  });

  const updateTaskStatusMutation = useMutation({
    mutationFn: async ({ taskId, status }: { taskId: string; status: 'Not Started' | 'In Progress' | 'Completed' }) => {
      const { data, error } = await supabase
        .from('tasks')
        .update({ status })
        .eq('id', taskId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      // Log activity
      await logTaskUpdate(data.name, data.id, `status_changed_to_${data.status.toLowerCase().replace(' ', '_')}`);
      toast.success('Task status updated!');
    },
    onError: (error) => {
      toast.error('Failed to update task: ' + error.message);
    }
  });

  const handleAddTask = () => {
    if (!newTask.name || !newTask.project_id) {
      toast.error('Please fill in all required fields');
      return;
    }
    addTaskMutation.mutate(newTask);
  };

  const handleEditTask = () => {
    if (!editingTask) return;
    
    updateTaskMutation.mutate({
      taskId: editingTask.id,
      updates: {
        name: editingTask.name,
        project_id: editingTask.project_id,
        assignee_id: editingTask.assignee_id,
        date: editingTask.date,
        deadline: editingTask.deadline,
        estimated_duration: editingTask.estimated_duration
      }
    });
  };

  const handleStatusChange = (taskId: string, newStatus: string) => {
    const status = newStatus as 'Not Started' | 'In Progress' | 'Completed';
    updateTaskStatusMutation.mutate({ taskId, status });
  };

  const toggleTaskExpansion = (taskId: string) => {
    const newExpanded = new Set(expandedTasks);
    if (newExpanded.has(taskId)) {
      newExpanded.delete(taskId);
    } else {
      newExpanded.add(taskId);
    }
    setExpandedTasks(newExpanded);
  };

  const clearFilters = () => {
    setFilters({ client: '', project: '', status: '', billing: '', assignee: '', assigner: '' });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive'> = {
      'Not Started': 'secondary',
      'In Progress': 'default',
      'Completed': 'destructive'
    };
    return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
  };

  const uniqueClients = Array.from(new Set(projects.map(p => p.clients.name)));

  const handleTimeTrackerUpdate = (taskId: string) => {
    updateTaskHoursMutation.mutate({ taskId });
  };

  const openEditDialog = (task: Task) => {
    setEditingTask({
      ...task,
      deadline: task.deadline || '',
      estimated_duration: task.estimated_duration || null
    });
    setIsEditDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <Navigation />
        <div className="flex items-center justify-center py-8">
          <div className="text-lg">Loading tasks...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <Navigation />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Tasks</h1>
            <p className="text-gray-600 mt-2">Manage and track your project tasks</p>
          </div>
          
          {canCreateTasks && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Task
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Create New Task</DialogTitle>
                  <DialogDescription>
                    Add a new task to track your work progress.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  <div className="space-y-2">
                    <Label htmlFor="taskName">Task Name</Label>
                    <Input
                      id="taskName"
                      value={newTask.name}
                      onChange={(e) => setNewTask({...newTask, name: e.target.value})}
                      placeholder="Enter task name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="project">Project</Label>
                    <Select value={newTask.project_id} onValueChange={(value) => setNewTask({...newTask, project_id: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a project" />
                      </SelectTrigger>
                      <SelectContent>
                        {projects.map((project) => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.name} - {project.clients.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="assignee">Assignee</Label>
                    <Select value={newTask.assignee_id} onValueChange={(value) => setNewTask({...newTask, assignee_id: value === 'unassigned' ? '' : value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select assignee (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">No assignee</SelectItem>
                        {employees.map((employee) => (
                          <SelectItem key={employee.id} value={employee.id}>
                            {employee.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="date">Date</Label>
                    <Input
                      id="date"
                      type="date"
                      value={newTask.date}
                      onChange={(e) => setNewTask({...newTask, date: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="deadline">Deadline (Optional)</Label>
                    <Input
                      id="deadline"
                      type="date"
                      value={newTask.deadline}
                      onChange={(e) => setNewTask({...newTask, deadline: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="estimatedDuration">Estimated Duration (Hours)</Label>
                    <Input
                      id="estimatedDuration"
                      type="number"
                      step="0.5"
                      min="0"
                      value={newTask.estimated_duration}
                      onChange={(e) => setNewTask({...newTask, estimated_duration: e.target.value})}
                      placeholder="Enter estimated hours"
                    />
                  </div>
                  <Button 
                    onClick={handleAddTask} 
                    className="w-full"
                    disabled={addTaskMutation.isPending}
                  >
                    {addTaskMutation.isPending ? 'Creating...' : 'Create Task'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Edit Task Dialog - Only for teamleads, managers, and admins */}
        {canEditTasks && (
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Edit Task</DialogTitle>
                <DialogDescription>
                  Update the task details.
                </DialogDescription>
              </DialogHeader>
              {editingTask && (
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  <div className="space-y-2">
                    <Label htmlFor="editTaskName">Task Name</Label>
                    <Input
                      id="editTaskName"
                      value={editingTask.name}
                      onChange={(e) => setEditingTask({...editingTask, name: e.target.value})}
                      placeholder="Enter task name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="editProject">Project</Label>
                    <Select value={editingTask.project_id} onValueChange={(value) => setEditingTask({...editingTask, project_id: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a project" />
                      </SelectTrigger>
                      <SelectContent>
                        {projects.map((project) => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.name} - {project.clients.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="editAssignee">Assignee</Label>
                    <Select value={editingTask.assignee_id || 'unassigned'} onValueChange={(value) => setEditingTask({...editingTask, assignee_id: value === 'unassigned' ? null : value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select assignee (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">No assignee</SelectItem>
                        {employees.map((employee) => (
                          <SelectItem key={employee.id} value={employee.id}>
                            {employee.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="editDate">Date</Label>
                    <Input
                      id="editDate"
                      type="date"
                      value={editingTask.date}
                      onChange={(e) => setEditingTask({...editingTask, date: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="editDeadline">Deadline (Optional)</Label>
                    <Input
                      id="editDeadline"
                      type="date"
                      value={editingTask.deadline || ''}
                      onChange={(e) => setEditingTask({...editingTask, deadline: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="editEstimatedDuration">Estimated Duration (Hours)</Label>
                    <Input
                      id="editEstimatedDuration"
                      type="number"
                      step="0.5"
                      min="0"
                      value={editingTask.estimated_duration || ''}
                      onChange={(e) => setEditingTask({...editingTask, estimated_duration: e.target.value ? parseFloat(e.target.value) : null})}
                      placeholder="Enter estimated hours"
                    />
                  </div>
                  <Button 
                    onClick={handleEditTask} 
                    className="w-full"
                    disabled={updateTaskMutation.isPending}
                  >
                    {updateTaskMutation.isPending ? 'Updating...' : 'Update Task'}
                  </Button>
                </div>
              )}
            </DialogContent>
          </Dialog>
        )}

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Filter className="h-5 w-5 mr-2" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`grid grid-cols-1 md:grid-cols-${canSeeBilling ? '7' : '6'} gap-4 items-end`}>
              <div className="space-y-2">
                <Label>Client</Label>
                <Select value={filters.client} onValueChange={(value) => setFilters({...filters, client: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="All clients" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All clients</SelectItem>
                    {uniqueClients.map((client) => (
                      <SelectItem key={client} value={client}>
                        {client}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Project</Label>
                <Select value={filters.project} onValueChange={(value) => setFilters({...filters, project: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="All projects" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All projects</SelectItem>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Assignee</Label>
                <Select value={filters.assignee} onValueChange={(value) => setFilters({...filters, assignee: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="All assignees" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All assignees</SelectItem>
                    {employees.map((employee) => (
                      <SelectItem key={employee.id} value={employee.id}>
                        {employee.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Assigner</Label>
                <Select value={filters.assigner} onValueChange={(value) => setFilters({...filters, assigner: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="All assigners" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All assigners</SelectItem>
                    {employees.map((employee) => (
                      <SelectItem key={employee.id} value={employee.id}>
                        {employee.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={filters.status} onValueChange={(value) => setFilters({...filters, status: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="Not Started">Not Started</SelectItem>
                    <SelectItem value="In Progress">In Progress</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {canSeeBilling && (
                <div className="space-y-2">
                  <Label>Billing</Label>
                  <Select value={filters.billing} onValueChange={(value) => setFilters({...filters, billing: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="All tasks" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All tasks</SelectItem>
                      <SelectItem value="billed">Billed</SelectItem>
                      <SelectItem value="unbilled">Unbilled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              <Button variant="outline" onClick={clearFilters}>
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tasks Table */}
        <Card>
          <CardHeader>
            <CardTitle>Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead></TableHead>
                  <TableHead>Task</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Assignee</TableHead>
                  <TableHead>Assigner</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Hours</TableHead>
                  <TableHead>Deadline</TableHead>
                  <TableHead>Est. Duration</TableHead>
                  <TableHead>Date</TableHead>
                  {canSeeBilling && <TableHead>Billing</TableHead>}
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.map((task) => (
                  <React.Fragment key={task.id}>
                    <TableRow className={isOverdue(task) || isDurationExceeded(task) ? 'bg-red-50' : ''}>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleTaskExpansion(task.id)}
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                      </TableCell>
                      <TableCell className="font-medium">{task.name}</TableCell>
                      <TableCell>{task.projects.clients.name}</TableCell>
                      <TableCell>{task.projects.name}</TableCell>
                      <TableCell>{task.assignee?.name || 'Unassigned'}</TableCell>
                      <TableCell>{task.assigner?.name || 'N/A'}</TableCell>
                      <TableCell>{getStatusBadge(task.status)}</TableCell>
                      <TableCell>
                        <div className={`flex items-center ${isDurationExceeded(task) ? 'text-red-600' : ''}`}>
                          <Clock className="h-4 w-4 mr-1 text-gray-500" />
                          {task.hours}h
                          {isDurationExceeded(task) && task.estimated_duration && (
                            <span className="ml-1 text-xs">
                              (+{getDurationExcess(task.hours, task.estimated_duration)}h)
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {task.deadline ? (
                          <div className={`flex items-center ${isOverdue(task) ? 'text-red-600' : ''}`}>
                            {task.deadline}
                            {isOverdue(task) && (
                              <div className="ml-2 flex items-center">
                                <AlertTriangle className="h-4 w-4 mr-1" />
                                <span className="text-xs">
                                  {getDateLag(task.deadline)}d overdue
                                </span>
                              </div>
                            )}
                          </div>
                        ) : (
                          'N/A'
                        )}
                      </TableCell>
                      <TableCell>
                        {task.estimated_duration ? `${task.estimated_duration}h` : 'N/A'}
                      </TableCell>
                      <TableCell>{task.date}</TableCell>
                      {canSeeBilling && (
                        <TableCell>
                          <Badge variant={task.invoiced ? 'default' : 'secondary'}>
                            {task.invoiced ? 'Billed' : 'Unbilled'}
                          </Badge>
                        </TableCell>
                      )}
                      <TableCell>
                        <div className="flex space-x-2">
                          {task.status !== 'Completed' && (
                            <TimeTrackerWithComment 
                              task={task} 
                              onSuccess={() => handleTimeTrackerUpdate(task.id)} 
                            />
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => toggleTaskExpansion(task.id)}
                          >
                            <History className="h-4 w-4" />
                          </Button>
                          {canEditTasks && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openEditDialog(task)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                          <Select value={task.status} onValueChange={(value) => handleStatusChange(task.id, value)}>
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Not Started">Not Started</SelectItem>
                              <SelectItem value="In Progress">In Progress</SelectItem>
                              <SelectItem value="Completed">Completed</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </TableCell>
                    </TableRow>
                    {expandedTasks.has(task.id) && (
                      <TableRow>
                        <TableCell colSpan={canSeeBilling ? 13 : 12} className="bg-gray-50">
                          <div className="p-4">
                            <TaskHistory 
                              taskId={task.id} 
                              onUpdate={() => handleTimeTrackerUpdate(task.id)}
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
            {tasks.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No tasks found. {canCreateTasks ? 'Create your first task to get started.' : 'No tasks assigned to you.'}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Tasks;
