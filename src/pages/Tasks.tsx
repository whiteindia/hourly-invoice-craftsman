
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Clock, Play, Square, Filter, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import Navigation from '@/components/Navigation';
import TaskCommentDialog from '@/components/TaskCommentDialog';
import TaskHistory from '@/components/TaskHistory';

interface Task {
  id: string;
  name: string;
  hours: number;
  status: string;
  date: string;
  invoiced: boolean;
  projects: {
    name: string;
    clients: {
      name: string;
    };
  };
}

interface Project {
  id: string;
  name: string;
  clients: {
    name: string;
  };
}

interface Client {
  id: string;
  name: string;
}

const Tasks = () => {
  const queryClient = useQueryClient();
  const [newTask, setNewTask] = useState({
    name: '',
    project_id: '',
    hours: ''
  });
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [commentDialogOpen, setCommentDialogOpen] = useState(false);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [expandedTask, setExpandedTask] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    client_id: '',
    project_id: '',
    status: '',
    billing_status: ''
  });

  // Fetch tasks with project and client data
  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks', filters],
    queryFn: async () => {
      let query = supabase
        .from('tasks')
        .select(`
          *,
          projects(
            name,
            clients(name)
          )
        `)
        .order('created_at', { ascending: false });

      if (filters.project_id) {
        query = query.eq('project_id', filters.project_id);
      }
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.billing_status === 'billed') {
        query = query.eq('invoiced', true);
      } else if (filters.billing_status === 'unbilled') {
        query = query.eq('invoiced', false);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      // Filter by client if needed
      let filteredData = data as Task[];
      if (filters.client_id) {
        filteredData = filteredData.filter(task => 
          task.projects.clients.name === filters.client_id
        );
      }
      
      return filteredData;
    }
  });

  // Fetch projects for dropdown
  const { data: projects = [] } = useQuery({
    queryKey: ['projects-with-clients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select(`
          id,
          name,
          clients(name)
        `);
      
      if (error) throw error;
      return data as Project[];
    }
  });

  // Fetch clients for filters
  const { data: clients = [] } = useQuery({
    queryKey: ['clients-for-filters'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name')
        .order('name');
      
      if (error) throw error;
      return data as Client[];
    }
  });

  // Add task mutation
  const addTaskMutation = useMutation({
    mutationFn: async (taskData: {
      name: string;
      project_id: string;
      hours: number;
    }) => {
      const { data, error } = await supabase
        .from('tasks')
        .insert([{
          ...taskData,
          status: taskData.hours > 0 ? 'Completed' : 'Not Started'
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setNewTask({ name: '', project_id: '', hours: '' });
      setIsDialogOpen(false);
      toast.success('Task added successfully!');
    },
    onError: (error) => {
      toast.error('Failed to add task: ' + error.message);
    }
  });

  // Update task hours mutation
  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, hours }: { id: string; hours: number }) => {
      const { data, error } = await supabase
        .from('tasks')
        .update({ 
          hours,
          status: 'Completed'
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    }
  });

  const handleAddTask = () => {
    if (!newTask.name || !newTask.project_id) {
      toast.error('Please fill in required fields');
      return;
    }

    addTaskMutation.mutate({
      name: newTask.name,
      project_id: newTask.project_id,
      hours: parseFloat(newTask.hours) || 0
    });
  };

  const startTimer = (taskId: string) => {
    setActiveTaskId(taskId);
    setCommentDialogOpen(true);
  };

  const handleTimeLogged = (hours: number) => {
    if (activeTaskId) {
      const task = tasks.find(t => t.id === activeTaskId);
      if (task) {
        updateTaskMutation.mutate({
          id: activeTaskId,
          hours: task.hours + hours
        });
      }
    }
    setActiveTaskId(null);
  };

  const clearFilters = () => {
    setFilters({ client_id: '', project_id: '', status: '', billing_status: '' });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed':
        return 'bg-green-100 text-green-800';
      case 'In Progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'Not Started':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getBillingStatusColor = (invoiced: boolean) => {
    return invoiced 
      ? 'bg-blue-100 text-blue-800' 
      : 'bg-orange-100 text-orange-800';
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
            <h1 className="text-3xl font-bold text-gray-900">Tasks & Time Tracking</h1>
            <p className="text-gray-600 mt-2">Log hours and track your work</p>
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
                <DialogTitle>Add New Task</DialogTitle>
                <DialogDescription>
                  Create a new task and log hours worked.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="taskName">Task Name</Label>
                  <Input
                    id="taskName"
                    value={newTask.name}
                    onChange={(e) => setNewTask({...newTask, name: e.target.value})}
                    placeholder="Enter task description"
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
                          {project.name} ({project.clients.name})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hours">Hours Worked</Label>
                  <Input
                    id="hours"
                    type="number"
                    step="0.25"
                    value={newTask.hours}
                    onChange={(e) => setNewTask({...newTask, hours: e.target.value})}
                    placeholder="0.0"
                  />
                </div>
                <Button 
                  onClick={handleAddTask} 
                  className="w-full"
                  disabled={addTaskMutation.isPending}
                >
                  {addTaskMutation.isPending ? 'Adding...' : 'Add Task'}
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
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
              <div className="space-y-2">
                <Label>Client</Label>
                <Select value={filters.client_id} onValueChange={(value) => setFilters({...filters, client_id: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="All clients" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All clients</SelectItem>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.name}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Project</Label>
                <Select value={filters.project_id} onValueChange={(value) => setFilters({...filters, project_id: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="All projects" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All projects</SelectItem>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
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
                    <SelectItem value="">All statuses</SelectItem>
                    <SelectItem value="Not Started">Not Started</SelectItem>
                    <SelectItem value="In Progress">In Progress</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Billing Status</Label>
                <Select value={filters.billing_status} onValueChange={(value) => setFilters({...filters, billing_status: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All</SelectItem>
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

        <div className="space-y-6">
          {tasks.map((task) => (
            <Card key={task.id} className="hover:shadow-lg transition-shadow duration-200">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{task.name}</CardTitle>
                    <CardDescription className="mt-1">
                      {task.projects.name} • {task.projects.clients.name}
                    </CardDescription>
                  </div>
                  <div className="flex space-x-2">
                    <Badge className={getStatusColor(task.status)}>
                      {task.status}
                    </Badge>
                    <Badge className={getBillingStatusColor(task.invoiced)}>
                      {task.invoiced ? 'Billed' : 'Unbilled'}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-6">
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-blue-600" />
                      <span className="font-medium">{task.hours.toFixed(2)}h</span>
                    </div>
                    <span className="text-sm text-gray-600">{task.date}</span>
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => startTimer(task.id)}
                    >
                      <Play className="h-4 w-4 mr-1" />
                      Log Time
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setExpandedTask(expandedTask === task.id ? null : task.id)}
                    >
                      <MessageSquare className="h-4 w-4 mr-1" />
                      History
                    </Button>
                  </div>
                </div>
                
                {expandedTask === task.id && (
                  <div className="pt-4 border-t">
                    <TaskHistory taskId={task.id} />
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <TaskCommentDialog
          isOpen={commentDialogOpen}
          onClose={() => {
            setCommentDialogOpen(false);
            setActiveTaskId(null);
          }}
          taskId={activeTaskId || ''}
          onTimeLogged={handleTimeLogged}
        />
      </div>
    </div>
  );
};

export default Tasks;
