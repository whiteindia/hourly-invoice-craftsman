
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, CheckCircle, Clock, Filter, FileText, History } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import Navigation from '@/components/Navigation';
import TaskHistory from '@/components/TaskHistory';
import TimeTracker from '@/components/TimeTracker';
import { useAuth } from '@/contexts/AuthContext';

interface Task {
  id: string;
  name: string;
  project_id: string;
  status: 'Not Started' | 'In Progress' | 'Completed';
  hours: number;
  date: string;
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
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState({
    client: '',
    project: '',
    status: '',
    billing: '',
    assignee: ''
  });
  const [newTask, setNewTask] = useState({
    name: '',
    project_id: '',
    assignee_id: '',
    date: new Date().toISOString().split('T')[0]
  });

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
        `)
        .order('date', { ascending: false });

      if (filters.project && filters.project !== 'all') {
        query = query.eq('project_id', filters.project);
      }
      if (filters.status && filters.status !== 'all') {
        query = query.eq('status', filters.status as 'Not Started' | 'In Progress' | 'Completed');
      }
      if (filters.billing && filters.billing !== 'all') {
        query = query.eq('invoiced', filters.billing === 'billed');
      }
      if (filters.assignee && filters.assignee !== 'all') {
        query = query.eq('assignee_id', filters.assignee);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Task[];
    }
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects-for-tasks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select(`
          id,
          name,
          clients(name)
        `)
        .eq('status', 'Active')
        .order('name');
      
      if (error) throw error;
      return data as Project[];
    }
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
          ...taskData,
          assigner_id: currentEmployee?.id || null
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setNewTask({
        name: '',
        project_id: '',
        assignee_id: '',
        date: new Date().toISOString().split('T')[0]
      });
      setIsDialogOpen(false);
      toast.success('Task created successfully!');
    },
    onError: (error) => {
      toast.error('Failed to create task: ' + error.message);
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
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
    setFilters({ client: '', project: '', status: '', billing: '', assignee: '' });
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
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" />
                Add Task
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Task</DialogTitle>
                <DialogDescription>
                  Add a new task to track your work progress.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
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
                  <Select value={newTask.assignee_id} onValueChange={(value) => setNewTask({...newTask, assignee_id: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select assignee (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No assignee</SelectItem>
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
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Filter className="h-5 w-5 mr-2" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
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
                  <TableHead>Date</TableHead>
                  <TableHead>Billing</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.map((task) => (
                  <React.Fragment key={task.id}>
                    <TableRow>
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
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 mr-1 text-gray-500" />
                          {task.hours}h
                        </div>
                      </TableCell>
                      <TableCell>{task.date}</TableCell>
                      <TableCell>
                        <Badge variant={task.invoiced ? 'default' : 'secondary'}>
                          {task.invoiced ? 'Billed' : 'Unbilled'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <TimeTracker 
                            task={task} 
                            onSuccess={() => handleTimeTrackerUpdate(task.id)} 
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => toggleTaskExpansion(task.id)}
                          >
                            <History className="h-4 w-4 mr-1" />
                            History
                          </Button>
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
                        <TableCell colSpan={11} className="bg-gray-50">
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
                No tasks found. Create your first task to get started.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Tasks;
