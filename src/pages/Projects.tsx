
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, DollarSign, Clock, User } from 'lucide-react';
import { toast } from 'sonner';

const Projects = () => {
  const [projects, setProjects] = useState([
    {
      id: 1,
      name: "DevOps Infrastructure Setup",
      client: "TechCorp Solutions",
      type: "DevOps",
      hourlyRate: 100,
      totalHours: 24.5,
      status: "Active"
    },
    {
      id: 2,
      name: "Marketing Strategy Development",
      client: "StartupXYZ",
      type: "Marketing",
      hourlyRate: 120,
      totalHours: 15.0,
      status: "Active"
    },
    {
      id: 3,
      name: "Business Process Optimization",
      client: "LocalBiz",
      type: "Consulting",
      hourlyRate: 100,
      totalHours: 32.0,
      status: "Completed"
    }
  ]);

  const [newProject, setNewProject] = useState({
    name: '',
    client: '',
    type: '',
    hourlyRate: ''
  });

  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const clients = ["TechCorp Solutions", "StartupXYZ", "LocalBiz"];
  const projectTypes = [
    { value: "DevOps", rate: 100 },
    { value: "Marketing", rate: 120 },
    { value: "Consulting", rate: 100 },
    { value: "Strategy", rate: 150 },
    { value: "Technical Writing", rate: 80 }
  ];

  const handleProjectTypeChange = (type: string) => {
    const projectType = projectTypes.find(pt => pt.value === type);
    setNewProject({
      ...newProject,
      type,
      hourlyRate: projectType ? projectType.rate.toString() : ''
    });
  };

  const handleAddProject = () => {
    if (!newProject.name || !newProject.client || !newProject.type || !newProject.hourlyRate) {
      toast.error('Please fill in all fields');
      return;
    }

    const project = {
      id: projects.length + 1,
      ...newProject,
      hourlyRate: parseFloat(newProject.hourlyRate),
      totalHours: 0,
      status: "Active"
    };

    setProjects([...projects, project]);
    setNewProject({ name: '', client: '', type: '', hourlyRate: '' });
    setIsDialogOpen(false);
    toast.success('Project created successfully!');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active':
        return 'bg-green-100 text-green-800';
      case 'Completed':
        return 'bg-blue-100 text-blue-800';
      case 'On Hold':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'DevOps':
        return 'bg-purple-100 text-purple-800';
      case 'Marketing':
        return 'bg-pink-100 text-pink-800';
      case 'Consulting':
        return 'bg-blue-100 text-blue-800';
      case 'Strategy':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Projects</h1>
            <p className="text-gray-600 mt-2">Manage your consulting projects</p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" />
                New Project
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Project</DialogTitle>
                <DialogDescription>
                  Set up a new project with client and hourly rates.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="projectName">Project Name</Label>
                  <Input
                    id="projectName"
                    value={newProject.name}
                    onChange={(e) => setNewProject({...newProject, name: e.target.value})}
                    placeholder="Enter project name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="client">Client</Label>
                  <Select value={newProject.client} onValueChange={(value) => setNewProject({...newProject, client: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a client" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((client) => (
                        <SelectItem key={client} value={client}>{client}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">Project Type</Label>
                  <Select value={newProject.type} onValueChange={handleProjectTypeChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select project type" />
                    </SelectTrigger>
                    <SelectContent>
                      {projectTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.value} (${type.rate}/hr)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hourlyRate">Hourly Rate ($)</Label>
                  <Input
                    id="hourlyRate"
                    type="number"
                    value={newProject.hourlyRate}
                    onChange={(e) => setNewProject({...newProject, hourlyRate: e.target.value})}
                    placeholder="100"
                  />
                </div>
                <Button onClick={handleAddProject} className="w-full">
                  Create Project
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {projects.map((project) => (
            <Card key={project.id} className="hover:shadow-lg transition-shadow duration-200">
              <CardHeader>
                <div className="flex justify-between items-start mb-2">
                  <CardTitle className="text-lg leading-tight">{project.name}</CardTitle>
                  <Badge className={getStatusColor(project.status)}>
                    {project.status}
                  </Badge>
                </div>
                <CardDescription className="flex items-center space-x-2">
                  <User className="h-4 w-4" />
                  <span>{project.client}</span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <Badge className={getTypeColor(project.type)}>
                      {project.type}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-1">
                      <DollarSign className="h-4 w-4 text-green-600" />
                      <span className="font-medium">${project.hourlyRate}/hr</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Clock className="h-4 w-4 text-blue-600" />
                      <span>{project.totalHours}h logged</span>
                    </div>
                  </div>
                  <div className="pt-2 border-t">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Total Value</span>
                      <span className="font-bold text-lg text-green-600">
                        ${(project.hourlyRate * project.totalHours).toFixed(2)}
                      </span>
                    </div>
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

export default Projects;
