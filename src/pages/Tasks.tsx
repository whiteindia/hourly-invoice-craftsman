
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

const Tasks = () => {
  const [tasks, setTasks] = useState([
    {
      id: 1,
      name: "Server Configuration",
      project: "DevOps Infrastructure Setup",
      client: "TechCorp Solutions",
      hours: 4.5,
      status: "Completed",
      date: "2024-01-15"
    },
    {
      id: 2,
      name: "Market Research",
      project: "Marketing Strategy Development",
      client: "StartupXYZ",
      hours: 3.0,
      status: "Completed",
      date: "2024-01-14"
    },
    {
      id: 3,
      name: "Process Documentation",
      project: "Business Process Optimization",
      client: "LocalBiz",
      hours: 0,
      status: "In Progress",
      date: "2024-01-16"
    }
  ]);

  const [newTask, setNewTask] = useState({
    name: '',
    project: '',
    hours: ''
  });

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeTimer, setActiveTimer] = useState<number | null>(null);
  const [timerSeconds, setTimerSeconds] = useState(0);

  const projects = [
    "DevOps Infrastructure Setup",
    "Marketing Strategy Development", 
    "Business Process Optimization"
  ];

  const handleAddTask = () => {
    if (!newTask.name || !newTask.project) {
      toast.error('Please fill in required fields');
      return;
    }

    const task = {
      id: tasks.length + 1,
      ...newTask,
      client: getClientForProject(newTask.project),
      hours: parseFloat(newTask.hours) || 0,
      status: parseFloat(newTask.hours) > 0 ? "Completed" : "Not Started",
      date: new Date().toISOString().split('T')[0]
    };

    setTasks([...tasks, task]);
    setNewTask({ name: '', project: '', hours: '' });
    setIsDialogOpen(false);
    toast.success('Task added successfully!');
  };

  const getClientForProject = (projectName: string) => {
    const projectClientMap: Record<string, string> = {
      "DevOps Infrastructure Setup": "TechCorp Solutions",
      "Marketing Strategy Development": "StartupXYZ",
      "Business Process Optimization": "LocalBiz"
    };
    return projectClientMap[projectName] || "Unknown Client";
  };

  const startTimer = (taskId: number) => {
    setActiveTimer(taskId);
    setTimerSeconds(0);
    
    const interval = setInterval(() => {
      setTimerSeconds(prev => prev + 1);
    }, 1000);

    // Store interval ID for cleanup
    (window as any).timerInterval = interval;
  };

  const stopTimer = (taskId: number) => {
    if ((window as any).timerInterval) {
      clearInterval((window as any).timerInterval);
    }
    
    const hours = timerSeconds / 3600;
    setTasks(tasks.map(task => 
      task.id === taskId 
        ? { ...task, hours: task.hours + hours, status: "Completed" }
        : task
    ));
    
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
                  <Select value={newTask.project} onValueChange={(value) => setNewTask({...newTask, project: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a project" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map((project) => (
                        <SelectItem key={project} value={project}>{project}</SelectItem>
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
                <Button onClick={handleAddTask} className="w-full">
                  Add Task
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
                      {task.project} • {task.client}
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
