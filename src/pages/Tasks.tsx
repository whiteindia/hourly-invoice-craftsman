
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Clock, Play, Pause, Square } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface Task {
  id: string;
  name: string;
  hours: number;
  status: string;
  date: string;
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

const Tasks = () => {
  const queryClient = useQueryClient();
  const [newTask, setNewTask] = useState({
    name: '',
    project_id: '',
    hours: ''
  });
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeTimer, setActiveTimer] = useState<string | null>(null);
  const [timerSeconds, setTimerSeconds] = useState(0);

  // Fetch tasks with project and client data
  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          projects(
            name,
            clients(name)
          )
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Task[];
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
    setActiveTimer(taskId);
    setTimerSeconds(0);
    
    const interval = setInterval(() => {
      setTimerSeconds(prev => prev + 1);
    }, 1000);

    (window as any).timerInterval = interval;
  };

  const stopTimer = (taskId: string) => {
    if ((window as any).timerInterval) {
      clearInterval((window as any).timerInterval);
    }
    
    const hours = timerSeconds / 3600;
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      updateTaskMutation.mutate({
        id: taskId,
        hours: task.hours + hours
      });
    }
    
    setActiveTimer(null);
    setTimerSeconds(0);
    toast.success(`Logged ${hours.toFixed(2)} hours for task`);
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-lg">Loading tasks...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
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
                  <Badge className={getStatusColor(task.status)}>
                    {task.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-6">
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-blue-600" />
                      <span className="font-medium">
                        {activeTimer === task.id 
                          ? formatTime(timerSeconds)
                          : `${task.hours.toFixed(2)}h`
                        }
                      </span>
                    </div>
                    <span className="text-sm text-gray-600">{task.date}</span>
                  </div>
                  
                  <div className="flex space-x-2">
                    {activeTimer === task.id ? (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => stopTimer(task.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Square className="h-4 w-4 mr-1" />
                        Stop
                      </Button>
                    ) : (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => startTimer(task.id)}
                        disabled={activeTimer !== null}
                      >
                        <Play className="h-4 w-4 mr-1" />
                        Start
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Tasks;
