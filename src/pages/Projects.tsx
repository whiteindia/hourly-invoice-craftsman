
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
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface Project {
  id: string;
  name: string;
  type: string;
  hourly_rate: number;
  total_hours: number;
  status: string;
  clients: {
    name: string;
  };
}

interface Client {
  id: string;
  name: string;
}

const Projects = () => {
  const queryClient = useQueryClient();
  const [newProject, setNewProject] = useState({
    name: '',
    client_id: '',
    type: '',
    hourly_rate: ''
  });
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const projectTypes = [
    { value: "DevOps", rate: 100 },
    { value: "Marketing", rate: 120 },
    { value: "Consulting", rate: 100 },
    { value: "Strategy", rate: 150 },
    { value: "Technical Writing", rate: 80 }
  ];

  // Fetch projects with client data
  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          clients(name)
        `);
      
      if (error) throw error;
      return data as Project[];
    }
  });

  // Fetch clients for dropdown
  const { data: clients = [] } = useQuery({
    queryKey: ['clients-simple'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name');
      
      if (error) throw error;
      return data as Client[];
    }
  });

  // Add project mutation
  const addProjectMutation = useMutation({
    mutationFn: async (projectData: {
      name: string;
      client_id: string;
      type: string;
      hourly_rate: number;
    }) => {
      const { data, error } = await supabase
        .from('projects')
        .insert([projectData])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setNewProject({ name: '', client_id: '', type: '', hourly_rate: '' });
      setIsDialogOpen(false);
      toast.success('Project created successfully!');
    },
    onError: (error) => {
      toast.error('Failed to create project: ' + error.message);
    }
  });

  const handleProjectTypeChange = (type: string) => {
    const projectType = projectTypes.find(pt => pt.value === type);
    setNewProject({
      ...newProject,
      type,
      hourly_rate: projectType ? projectType.rate.toString() : ''
    });
  };

  const handleAddProject = () => {
    if (!newProject.name || !newProject.client_id || !newProject.type || !newProject.hourly_rate) {
      toast.error('Please fill in all fields');
      return;
    }

    addProjectMutation.mutate({
      name: newProject.name,
      client_id: newProject.client_id,
      type: newProject.type as any,
      hourly_rate: parseFloat(newProject.hourly_rate)
    });
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-lg">Loading projects...</div>
      </div>
    );
  }

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
                  <Select value={newProject.client_id} onValueChange={(value) => setNewProject({...newProject, client_id: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a client" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
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
                          {type.value} (₹{type.rate}/hr)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hourlyRate">Hourly Rate (₹)</Label>
                  <Input
                    id="hourlyRate"
                    type="number"
                    value={newProject.hourly_rate}
                    onChange={(e) => setNewProject({...newProject, hourly_rate: e.target.value})}
                    placeholder="100"
                  />
                </div>
                <Button 
                  onClick={handleAddProject} 
                  className="w-full"
                  disabled={addProjectMutation.isPending}
                >
                  {addProjectMutation.isPending ? 'Creating...' : 'Create Project'}
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
                  <span>{project.clients.name}</span>
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
                      <span className="font-medium">₹{project.hourly_rate}/hr</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Clock className="h-4 w-4 text-blue-600" />
                      <span>{project.total_hours}h logged</span>
                    </div>
                  </div>
                  <div className="pt-2 border-t">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Total Value</span>
                      <span className="font-bold text-lg text-green-600">
                        ₹{(project.hourly_rate * project.total_hours).toFixed(2)}
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
