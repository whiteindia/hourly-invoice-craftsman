import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Edit, Trash2, Eye, Filter } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import Navigation from '@/components/Navigation';
import { logActivity } from '@/utils/activityLogger';

type ProjectStatus = Database['public']['Enums']['project_status'];

interface Project {
  id: string;
  name: string;
  description: string;
  client_id: string;
  hourly_rate: number;
  status: ProjectStatus;
  created_at: string;
  clients?: {
    name: string;
  };
  services?: {
    id: string;
    name: string;
  };
}

interface Client {
  id: string;
  name: string;
}

interface Service {
  id: string;
  name: string;
}

const Projects = () => {
  const queryClient = useQueryClient();
  const [newProject, setNewProject] = useState({
    name: '',
    description: '',
    client_id: '',
    service_id: '',
    hourly_rate: 0,
    status: 'Active' as ProjectStatus
  });
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [globalServiceFilter, setGlobalServiceFilter] = useState<string>('all');

  // Fetch projects with client data
  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          clients(name),
          services(name)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Project[];
    }
  });

  // Fetch clients for dropdown
  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data as Client[];
    }
  });

  // Fetch services for dropdown
  const { data: services = [] } = useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data as Service[];
    }
  });

  // Create project mutation
  const createProjectMutation = useMutation({
    mutationFn: async (projectData: any) => {
      const { data, error } = await supabase
        .from('projects')
        .insert([projectData])
        .select()
        .single();
      
      if (error) throw error;

      // Log activity
      await logActivity({
        action_type: 'created',
        entity_type: 'project',
        entity_id: data.id,
        entity_name: data.name,
        description: `Created project ${data.name} for ${clients.find(c => c.id === data.client_id)?.name}`,
        comment: `Hourly rate: ₹${data.hourly_rate}`
      });
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setIsDialogOpen(false);
      setNewProject({
        name: '',
        description: '',
        client_id: '',
        service_id: '',
        hourly_rate: 0,
        status: 'Active'
      });
      toast.success('Project created successfully!');
    },
    onError: (error) => {
      toast.error('Failed to create project: ' + error.message);
    }
  });

  // Update project mutation
  const updateProjectMutation = useMutation({
    mutationFn: async (projectData: any) => {
      const { data, error } = await supabase
        .from('projects')
        .update(projectData)
        .eq('id', projectData.id)
        .select()
        .single();
      
      if (error) throw error;

      // Log activity
      await logActivity({
        action_type: 'updated',
        entity_type: 'project',
        entity_id: data.id,
        entity_name: data.name,
        description: `Updated project ${data.name} for ${clients.find(c => c.id === data.client_id)?.name}`,
        comment: `Hourly rate: ₹${data.hourly_rate}`
      });
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setIsEditDialogOpen(false);
      setEditingProject(null);
      toast.success('Project updated successfully!');
    },
    onError: (error) => {
      toast.error('Failed to update project: ' + error.message);
    }
  });

  // Delete project mutation
  const deleteProjectMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;

      // Log activity
      await logActivity({
        action_type: 'deleted',
        entity_type: 'project',
        entity_id: data.id,
        entity_name: data.name,
        description: `Deleted project ${data.name} for ${clients.find(c => c.id === data.client_id)?.name}`,
        comment: `Hourly rate: ₹${data.hourly_rate}`
      });
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Project deleted successfully!');
    },
    onError: (error) => {
      toast.error('Failed to delete project: ' + error.message);
    }
  });

  // Filter projects based on global service filter
  const filteredProjects = projects.filter(project => {
    if (globalServiceFilter === 'all') return true;
    return project.services?.id === globalServiceFilter;
  });

  const handleCreateProject = async () => {
    try {
      await createProjectMutation.mutateAsync(newProject);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleUpdateProject = async () => {
    if (!editingProject) return;
    try {
      await updateProjectMutation.mutateAsync({
        id: editingProject.id,
        ...editingProject
      });
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDeleteProject = async (id: string) => {
    try {
      await deleteProjectMutation.mutateAsync(id);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active':
        return 'bg-green-100 text-green-800';
      case 'Inactive':
        return 'bg-red-100 text-red-800';
      case 'On Hold':
        return 'bg-yellow-100 text-yellow-800';
      case 'Completed':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <Navigation>
        <div className="flex items-center justify-center py-8">
          <div className="text-lg">Loading projects...</div>
        </div>
      </Navigation>
    );
  }

  return (
    <Navigation>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Projects</h1>
            <p className="text-gray-600 mt-2">Manage your client projects</p>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Global Service Filter */}
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <Select value={globalServiceFilter} onValueChange={setGlobalServiceFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by service" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Services</SelectItem>
                  {services.map((service) => (
                    <SelectItem key={service.id} value={service.id}>
                      {service.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Project
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create New Project</DialogTitle>
                  <DialogDescription>
                    Add a new project to track your work.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Project Name</Label>
                    <Input
                      id="name"
                      placeholder="Project name"
                      value={newProject.name}
                      onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Input
                      id="description"
                      placeholder="Project description"
                      value={newProject.description}
                      onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="client">Client</Label>
                    <Select value={newProject.client_id} onValueChange={(value) => setNewProject({ ...newProject, client_id: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a client" />
                      </SelectTrigger>
                      <SelectContent>
                        {clients.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="service">Service Type</Label>
                    <Select value={newProject.service_id} onValueChange={(value) => setNewProject({ ...newProject, service_id: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a service" />
                      </SelectTrigger>
                      <SelectContent>
                        {services.map((service) => (
                          <SelectItem key={service.id} value={service.id}>
                            {service.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hourly_rate">Hourly Rate</Label>
                    <Input
                      id="hourly_rate"
                      type="number"
                      placeholder="Hourly rate"
                      value={newProject.hourly_rate.toString()}
                      onChange={(e) => setNewProject({ ...newProject, hourly_rate: parseFloat(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select value={newProject.status} onValueChange={(value) => setNewProject({ ...newProject, status: value as ProjectStatus })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Active">Active</SelectItem>
                        <SelectItem value="Inactive">Inactive</SelectItem>
                        <SelectItem value="On Hold">On Hold</SelectItem>
                        <SelectItem value="Completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={handleCreateProject} className="w-full" disabled={createProjectMutation.isPending}>
                    {createProjectMutation.isPending ? 'Creating...' : 'Create Project'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Projects Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Projects</CardTitle>
            <CardDescription>
              {filteredProjects.length} project{filteredProjects.length !== 1 ? 's' : ''} 
              {globalServiceFilter !== 'all' && ` filtered by ${services.find(s => s.id === globalServiceFilter)?.name}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Rate</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProjects.map((project) => (
                  <TableRow key={project.id}>
                    <TableCell className="font-medium">{project.name}</TableCell>
                    <TableCell>{project.clients?.name}</TableCell>
                    <TableCell>{project.services?.name}</TableCell>
                    <TableCell>₹{project.hourly_rate}/hr</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(project.status)}>
                        {project.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setEditingProject(project);
                            setIsEditDialogOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleDeleteProject(project.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Edit Project Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogTrigger asChild>
            <div></div>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Project</DialogTitle>
              <DialogDescription>
                Edit project details.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Project Name</Label>
                <Input
                  id="name"
                  placeholder="Project name"
                  value={editingProject?.name || ''}
                  onChange={(e) => setEditingProject({ ...editingProject!, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  placeholder="Project description"
                  value={editingProject?.description || ''}
                  onChange={(e) => setEditingProject({ ...editingProject!, description: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="client">Client</Label>
                <Select value={editingProject?.client_id || ''} onValueChange={(value) => setEditingProject({ ...editingProject!, client_id: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="service">Service Type</Label>
                  <Select value={editingProject?.service_id || ''} onValueChange={(value) => setEditingProject({ ...editingProject!, service_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a service" />
                    </SelectTrigger>
                    <SelectContent>
                      {services.map((service) => (
                        <SelectItem key={service.id} value={service.id}>
                          {service.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              <div className="space-y-2">
                <Label htmlFor="hourly_rate">Hourly Rate</Label>
                <Input
                  id="hourly_rate"
                  type="number"
                  placeholder="Hourly rate"
                  value={editingProject?.hourly_rate?.toString() || ''}
                  onChange={(e) => setEditingProject({ ...editingProject!, hourly_rate: parseFloat(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={editingProject?.status || ''} onValueChange={(value) => setEditingProject({ ...editingProject!, status: value as ProjectStatus })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                    <SelectItem value="On Hold">On Hold</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleUpdateProject} className="w-full" disabled={updateProjectMutation.isPending}>
                {updateProjectMutation.isPending ? 'Updating...' : 'Update Project'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Navigation>
  );
};

export default Projects;
