import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, DollarSign, Clock, User, Upload, Filter, Edit } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import Navigation from '@/components/Navigation';

type ProjectType = Database['public']['Enums']['project_type'];
type ProjectStatus = Database['public']['Enums']['project_status'];

interface Project {
  id: string;
  name: string;
  type: ProjectType;
  hourly_rate: number;
  total_hours: number;
  status: ProjectStatus;
  start_date?: string;
  created_at: string;
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
    type: '' as ProjectType | '',
    hourly_rate: '',
    basis: 'tasks' as 'tasks' | 'brd',
    start_date: '',
    brd_file: null as File | null
  });
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [filters, setFilters] = useState({
    year: new Date().getFullYear().toString(),
    client_id: 'all-clients',
    status: 'all-statuses'
  });

  const projectTypes: { value: ProjectType; rate: number }[] = [
    { value: "DevOps", rate: 100 },
    { value: "Marketing", rate: 120 },
    { value: "Consulting", rate: 100 },
    { value: "Strategy", rate: 150 },
    { value: "Technical Writing", rate: 80 }
  ];

  // Get years for filter dropdown
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  // Fetch projects with client data and filters
  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects', filters],
    queryFn: async () => {
      let query = supabase
        .from('projects')
        .select(`
          *,
          clients(name)
        `);

      // Filter by status - only apply if not "all-statuses"
      if (filters.status !== 'all-statuses') {
        query = query.eq('status', filters.status as ProjectStatus);
      } else {
        // Only show Active and Completed projects by default when no specific status is selected
        const statusFilter: ProjectStatus[] = ['Active', 'Completed'];
        query = query.in('status', statusFilter);
      }

      // Filter by year
      if (filters.year) {
        const startOfYear = `${filters.year}-01-01`;
        const endOfYear = `${filters.year}-12-31`;
        query = query.gte('created_at', startOfYear).lte('created_at', endOfYear + 'T23:59:59');
      }

      // Filter by client
      if (filters.client_id && filters.client_id !== 'all-clients') {
        query = query.eq('client_id', filters.client_id);
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      
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
      type: ProjectType;
      hourly_rate?: number;
      start_date: string;
    }) => {
      const { data, error } = await supabase
        .from('projects')
        .insert({
          ...projectData,
          hourly_rate: projectData.hourly_rate || 0
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setNewProject({ 
        name: '', 
        client_id: '', 
        type: '', 
        hourly_rate: '', 
        basis: 'tasks', 
        start_date: '',
        brd_file: null 
      });
      setIsDialogOpen(false);
      toast.success('Project created successfully!');
    },
    onError: (error) => {
      toast.error('Failed to create project: ' + error.message);
    }
  });

  // Update project mutation
  const updateProjectMutation = useMutation({
    mutationFn: async (projectData: {
      id: string;
      name: string;
      type: ProjectType;
      hourly_rate: number;
      status: ProjectStatus;
      start_date?: string;
    }) => {
      const { data, error } = await supabase
        .from('projects')
        .update({
          name: projectData.name,
          type: projectData.type,
          hourly_rate: projectData.hourly_rate,
          status: projectData.status,
          start_date: projectData.start_date
        })
        .eq('id', projectData.id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setEditingProject(null);
      setIsEditDialogOpen(false);
      toast.success('Project updated successfully!');
    },
    onError: (error) => {
      toast.error('Failed to update project: ' + error.message);
    }
  });

  const handleProjectTypeChange = (type: ProjectType) => {
    const projectType = projectTypes.find(pt => pt.value === type);
    setNewProject({
      ...newProject,
      type,
      hourly_rate: projectType && newProject.basis === 'tasks' ? projectType.rate.toString() : ''
    });
  };

  const handleBasisChange = (basis: 'tasks' | 'brd') => {
    const projectType = projectTypes.find(pt => pt.value === newProject.type);
    setNewProject({
      ...newProject,
      basis,
      hourly_rate: basis === 'tasks' && projectType ? projectType.rate.toString() : '',
      brd_file: null
    });
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setNewProject({ ...newProject, brd_file: file });
    } else {
      toast.error('Please select a PDF file');
    }
  };

  const handleAddProject = () => {
    if (!newProject.name || !newProject.client_id || !newProject.type || !newProject.start_date) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (newProject.basis === 'tasks' && !newProject.hourly_rate) {
      toast.error('Please enter hourly rate for task-based projects');
      return;
    }

    if (newProject.basis === 'brd' && !newProject.brd_file) {
      toast.error('Please upload BRD file for BRD-based projects');
      return;
    }

    addProjectMutation.mutate({
      name: newProject.name,
      client_id: newProject.client_id,
      type: newProject.type as ProjectType,
      hourly_rate: newProject.basis === 'tasks' ? parseFloat(newProject.hourly_rate) : undefined,
      start_date: newProject.start_date
    });
  };

  const handleEditProject = (project: Project) => {
    setEditingProject(project);
    setIsEditDialogOpen(true);
  };

  const handleUpdateProject = () => {
    if (!editingProject) return;

    updateProjectMutation.mutate({
      id: editingProject.id,
      name: editingProject.name,
      type: editingProject.type,
      hourly_rate: editingProject.hourly_rate,
      status: editingProject.status,
      start_date: editingProject.start_date
    });
  };

  const clearFilters = () => {
    setFilters({ 
      year: new Date().getFullYear().toString(), 
      client_id: 'all-clients', 
      status: 'all-statuses' 
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <Navigation />
        <div className="flex items-center justify-center py-8">
          <div className="text-lg">Loading projects...</div>
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
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Project</DialogTitle>
                <DialogDescription>
                  Set up a new project with client and project details.
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
                          {type.value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="basis">Project Basis</Label>
                  <Select value={newProject.basis} onValueChange={handleBasisChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select project basis" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tasks">Tasks Basis</SelectItem>
                      <SelectItem value="brd">BRD Basis</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {newProject.basis === 'tasks' && (
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
                )}
                {newProject.basis === 'brd' && (
                  <div className="space-y-2">
                    <Label htmlFor="brdFile">Upload BRD (PDF)</Label>
                    <div className="flex items-center space-x-2">
                      <Input
                        id="brdFile"
                        type="file"
                        accept=".pdf"
                        onChange={handleFileUpload}
                        className="flex-1"
                      />
                      <Upload className="h-4 w-4 text-gray-500" />
                    </div>
                    {newProject.brd_file && (
                      <p className="text-sm text-green-600">File selected: {newProject.brd_file.name}</p>
                    )}
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={newProject.start_date}
                    onChange={(e) => setNewProject({...newProject, start_date: e.target.value})}
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

        {/* Edit Project Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Project</DialogTitle>
              <DialogDescription>
                Update project details and status.
              </DialogDescription>
            </DialogHeader>
            {editingProject && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="editProjectName">Project Name</Label>
                  <Input
                    id="editProjectName"
                    value={editingProject.name}
                    onChange={(e) => setEditingProject({...editingProject, name: e.target.value})}
                    placeholder="Enter project name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editType">Project Type</Label>
                  <Select value={editingProject.type} onValueChange={(value) => setEditingProject({...editingProject, type: value as ProjectType})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select project type" />
                    </SelectTrigger>
                    <SelectContent>
                      {projectTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editHourlyRate">Hourly Rate (₹)</Label>
                  <Input
                    id="editHourlyRate"
                    type="number"
                    value={editingProject.hourly_rate}
                    onChange={(e) => setEditingProject({...editingProject, hourly_rate: parseFloat(e.target.value) || 0})}
                    placeholder="100"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editStatus">Project Status</Label>
                  <Select value={editingProject.status} onValueChange={(value) => setEditingProject({...editingProject, status: value as ProjectStatus})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Completed">Completed</SelectItem>
                      <SelectItem value="On Hold">On Hold</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editStartDate">Start Date</Label>
                  <Input
                    id="editStartDate"
                    type="date"
                    value={editingProject.start_date || ''}
                    onChange={(e) => setEditingProject({...editingProject, start_date: e.target.value})}
                  />
                </div>
                <Button 
                  onClick={handleUpdateProject} 
                  className="w-full"
                  disabled={updateProjectMutation.isPending}
                >
                  {updateProjectMutation.isPending ? 'Updating...' : 'Update Project'}
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Filter className="h-5 w-5 mr-2" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div className="space-y-2">
                <Label>Year</Label>
                <Select value={filters.year} onValueChange={(value) => setFilters({...filters, year: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Client</Label>
                <Select value={filters.client_id} onValueChange={(value) => setFilters({...filters, client_id: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="All clients" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all-clients">All clients</SelectItem>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
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
                    <SelectItem value="all-statuses">All statuses</SelectItem>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
                    <SelectItem value="On Hold">On Hold</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button variant="outline" onClick={clearFilters}>
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {projects.map((project) => (
            <Card key={project.id} className="hover:shadow-lg transition-shadow duration-200">
              <CardHeader>
                <div className="flex justify-between items-start mb-2">
                  <CardTitle className="text-lg leading-tight">{project.name}</CardTitle>
                  <div className="flex items-center space-x-2">
                    <Badge className={getStatusColor(project.status)}>
                      {project.status}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditProject(project)}
                      className="h-8 w-8 p-0"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
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
                  {project.start_date && (
                    <div className="text-sm text-gray-600">
                      Started: {project.start_date}
                    </div>
                  )}
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

        {projects.length === 0 && (
          <Card>
            <CardContent className="text-center py-8 text-gray-500">
              No projects found with current filters.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );

  function getStatusColor(status: string) {
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
  }

  function getTypeColor(type: string) {
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
  }
};

export default Projects;
