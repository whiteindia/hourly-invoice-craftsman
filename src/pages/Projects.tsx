import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Edit, Trash2, Upload, FileText, Eye, Filter } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import Navigation from '@/components/Navigation';

type ProjectType = Database['public']['Enums']['project_type'];
type ProjectStatus = Database['public']['Enums']['project_status'];

interface ProjectData {
  id: string;
  name: string;
  client_id: string;
  type: ProjectType;
  hourly_rate: number;
  project_amount: number | null;
  total_hours: number;
  status: ProjectStatus;
  start_date: string | null;
  deadline: string | null;
  brd_file_url: string | null;
  created_at: string;
  clients: {
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
    client_id: '',
    type: '' as ProjectType,
    billing_type: 'hourly' as 'hourly' | 'project',
    hourly_rate: 0,
    project_amount: 0,
    start_date: '',
    deadline: '',
    brd_file: null as File | null
  });
  const [editingProject, setEditingProject] = useState<ProjectData | null>(null);
  const [editBillingType, setEditBillingType] = useState<'hourly' | 'project'>('hourly');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [uploadingBRD, setUploadingBRD] = useState(false);
  const [editBrdFile, setEditBrdFile] = useState<File | null>(null);

  // Filter states
  const [selectedClient, setSelectedClient] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedYear, setSelectedYear] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch projects with client data
  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          clients(name)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as ProjectData[];
    }
  });

  // Fetch clients for dropdown
  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name')
        .order('name');
      
      if (error) throw error;
      return data as Client[];
    }
  });

  // Fetch services for project types and filtering
  const { data: services = [] } = useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('services')
        .select('id, name')
        .order('name');
      
      if (error) throw error;
      return data as Service[];
    }
  });

  // Filter projects based on selected filters
  const filteredProjects = React.useMemo(() => {
    return projects.filter(project => {
      const matchesClient = selectedClient === 'all' || project.client_id === selectedClient;
      const matchesStatus = selectedStatus === 'all' || project.status === selectedStatus;
      const matchesType = selectedType === 'all' || project.type === selectedType;
      const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           project.clients?.name.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Year and month filtering based on created_at
      const projectDate = new Date(project.created_at);
      const matchesYear = selectedYear === 'all' || projectDate.getFullYear().toString() === selectedYear;
      const matchesMonth = selectedMonth === 'all' || (projectDate.getMonth() + 1).toString() === selectedMonth;
      
      return matchesClient && matchesStatus && matchesType && matchesSearch && matchesYear && matchesMonth;
    });
  }, [projects, selectedClient, selectedStatus, selectedType, selectedYear, selectedMonth, searchTerm]);

  // Get unique years from projects
  const availableYears = React.useMemo(() => {
    const years = projects.map(project => new Date(project.created_at).getFullYear());
    return [...new Set(years)].sort((a, b) => b - a);
  }, [projects]);

  // Function to upload BRD file
  const uploadBRDFile = async (file: File, projectId: string) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `brd-${projectId}-${Date.now()}.${fileExt}`;
    
    const { data, error } = await supabase.storage
      .from('project-files')
      .upload(fileName, file);
    
    if (error) throw error;
    
    const { data: { publicUrl } } = supabase.storage
      .from('project-files')
      .getPublicUrl(fileName);
    
    return publicUrl;
  };

  // Mutation to create a new project
  const createProjectMutation = useMutation({
    mutationFn: async (projectData: any) => {
      const { data, error } = await supabase
        .from('projects')
        .insert([projectData])
        .select()
        .single();
      
      if (error) throw error;
      
      // Upload BRD file if provided
      if (newProject.brd_file) {
        try {
          setUploadingBRD(true);
          const brdUrl = await uploadBRDFile(newProject.brd_file, data.id);
          
          const { error: updateError } = await supabase
            .from('projects')
            .update({ brd_file_url: brdUrl })
            .eq('id', data.id);
          
          if (updateError) throw updateError;
        } catch (uploadError) {
          console.error('BRD upload failed:', uploadError);
          toast.error('Project created but BRD upload failed');
        } finally {
          setUploadingBRD(false);
        }
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setNewProject({
        name: '',
        client_id: '',
        type: 'DevOps',
        billing_type: 'hourly',
        hourly_rate: 0,
        project_amount: 0,
        start_date: '',
        deadline: '',
        brd_file: null
      });
      setIsDialogOpen(false);
      toast.success('Project created successfully!');
    },
    onError: (error) => {
      toast.error('Failed to create project: ' + error.message);
    }
  });

  // Mutation to update an existing project
  const updateProjectMutation = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & any) => {
      // Handle BRD file upload for edit
      if (editBrdFile) {
        try {
          setUploadingBRD(true);
          const brdUrl = await uploadBRDFile(editBrdFile, id);
          updates.brd_file_url = brdUrl;
        } catch (uploadError) {
          console.error('BRD upload failed:', uploadError);
          toast.error('BRD upload failed');
          throw uploadError;
        } finally {
          setUploadingBRD(false);
        }
      }

      const { data, error } = await supabase
        .from('projects')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setEditingProject(null);
      setEditBrdFile(null);
      setIsEditDialogOpen(false);
      toast.success('Project updated successfully!');
    },
    onError: (error) => {
      toast.error('Failed to update project: ' + error.message);
    }
  });

  // Mutation to delete a project with proper cascade handling
  const deleteProjectMutation = useMutation({
    mutationFn: async (id: string) => {
      console.log('Starting project deletion for ID:', id);
      
      // Step 1: Get all tasks for this project
      const { data: projectTasks, error: tasksError } = await supabase
        .from('tasks')
        .select('id')
        .eq('project_id', id);
      
      if (tasksError) {
        console.error('Error fetching tasks:', tasksError);
        throw tasksError;
      }
      
      console.log('Found tasks:', projectTasks?.length || 0);
      
      if (projectTasks && projectTasks.length > 0) {
        const taskIds = projectTasks.map(task => task.id);
        console.log('Task IDs to process:', taskIds);
        
        // Step 2: Delete all time entries for these tasks first
        const { error: timeEntriesError } = await supabase
          .from('time_entries')
          .delete()
          .in('task_id', taskIds);
        
        if (timeEntriesError) {
          console.error('Error deleting time entries:', timeEntriesError);
          throw timeEntriesError;
        }
        console.log('Deleted time entries for tasks');
        
        // Step 3: Delete all task comments for these tasks
        const { error: commentsError } = await supabase
          .from('task_comments')
          .delete()
          .in('task_id', taskIds);
        
        if (commentsError) {
          console.error('Error deleting task comments:', commentsError);
          throw commentsError;
        }
        console.log('Deleted task comments');
        
        // Step 4: Delete sprint_tasks associations
        const { error: sprintTasksError } = await supabase
          .from('sprint_tasks')
          .delete()
          .in('task_id', taskIds);
        
        if (sprintTasksError) {
          console.error('Error deleting sprint tasks:', sprintTasksError);
          throw sprintTasksError;
        }
        console.log('Deleted sprint task associations');
        
        // Step 5: Delete invoice_tasks associations
        const { error: invoiceTasksError } = await supabase
          .from('invoice_tasks')
          .delete()
          .in('task_id', taskIds);
        
        if (invoiceTasksError) {
          console.error('Error deleting invoice tasks:', invoiceTasksError);
          throw invoiceTasksError;
        }
        console.log('Deleted invoice task associations');
        
        // Step 6: Now delete the tasks themselves
        const { error: deleteTasksError } = await supabase
          .from('tasks')
          .delete()
          .eq('project_id', id);
        
        if (deleteTasksError) {
          console.error('Error deleting tasks:', deleteTasksError);
          throw deleteTasksError;
        }
        console.log('Deleted tasks');
      }
      
      // Step 7: Delete invoices for this project
      const { error: invoicesError } = await supabase
        .from('invoices')
        .delete()
        .eq('project_id', id);
      
      if (invoicesError) {
        console.error('Error deleting invoices:', invoicesError);
        throw invoicesError;
      }
      console.log('Deleted invoices');
      
      // Step 8: Delete payments for this project
      const { error: paymentsError } = await supabase
        .from('payments')
        .delete()
        .eq('project_id', id);
      
      if (paymentsError) {
        console.error('Error deleting payments:', paymentsError);
        throw paymentsError;
      }
      console.log('Deleted payments');
      
      // Step 9: Finally, delete the project itself
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id);
      
      if (error) {
        console.error('Error deleting project:', error);
        throw error;
      }
      console.log('Project deleted successfully');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Project and all related data deleted successfully!');
    },
    onError: (error) => {
      console.error('Project deletion failed:', error);
      toast.error('Failed to delete project: ' + error.message);
    }
  });

  const handleCreateProject = () => {
    const projectData = {
      name: newProject.name,
      client_id: newProject.client_id,
      type: newProject.type,
      hourly_rate: newProject.type === 'BRD' ? 0 : newProject.hourly_rate,
      project_amount: newProject.billing_type === 'project' || newProject.type === 'BRD' ? newProject.project_amount : null,
      start_date: newProject.start_date || null,
      deadline: newProject.billing_type === 'project' && newProject.deadline ? newProject.deadline : null
    };
    createProjectMutation.mutate(projectData);
  };

  const handleUpdateProject = () => {
    if (editingProject) {
      const updates = {
        id: editingProject.id,
        name: editingProject.name,
        client_id: editingProject.client_id,
        type: editingProject.type,
        hourly_rate: editingProject.type === 'BRD' ? 0 : editingProject.hourly_rate,
        project_amount: editBillingType === 'project' || editingProject.type === 'BRD' ? editingProject.project_amount : null,
        start_date: editingProject.start_date || null,
        deadline: editBillingType === 'project' && editingProject.deadline ? editingProject.deadline : null
      };
      updateProjectMutation.mutate(updates);
    }
  };

  const handleDeleteProject = (id: string) => {
    deleteProjectMutation.mutate(id);
  };

  const openBRDFile = (url: string) => {
    window.open(url, '_blank');
  };

  const isProjectBased = (project: ProjectData) => {
    return project.project_amount !== null || project.brd_file_url !== null;
  };

  const clearFilters = () => {
    setSelectedClient('all');
    setSelectedStatus('all');
    setSelectedType('all');
    setSelectedYear('all');
    setSelectedMonth('all');
    setSearchTerm('');
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Projects</h1>
            <p className="text-gray-600 mt-2">Manage your client projects</p>
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
                  Add a new project for a client.
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
                  <Label htmlFor="type">Project Type (Service)</Label>
                  <Select value={newProject.type} onValueChange={(value) => setNewProject({ ...newProject, type: value as ProjectType })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select project type" />
                    </SelectTrigger>
                    <SelectContent>
                      {services.map((service) => (
                        <SelectItem key={service.id} value={service.name}>
                          {service.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {newProject.type !== 'BRD' && (
                  <div className="space-y-2">
                    <Label htmlFor="billing_type">Billing Type</Label>
                    <Select value={newProject.billing_type} onValueChange={(value) => setNewProject({ ...newProject, billing_type: value as 'hourly' | 'project' })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select billing type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hourly">Hourly</SelectItem>
                        <SelectItem value="project">Project-based</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
                {newProject.type === 'BRD' ? (
                  <div className="space-y-2">
                    <Label htmlFor="project_amount">BRD Amount (₹)</Label>
                    <Input
                      id="project_amount"
                      type="number"
                      placeholder="BRD project amount"
                      value={newProject.project_amount}
                      onChange={(e) => setNewProject({ ...newProject, project_amount: Number(e.target.value) })}
                    />
                  </div>
                ) : newProject.billing_type === 'hourly' ? (
                  <div className="space-y-2">
                    <Label htmlFor="hourly_rate">Hourly Rate (₹)</Label>
                    <Input
                      id="hourly_rate"
                      type="number"
                      placeholder="Hourly rate"
                      value={newProject.hourly_rate}
                      onChange={(e) => setNewProject({ ...newProject, hourly_rate: Number(e.target.value) })}
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="project_amount">Project Amount (₹)</Label>
                    <Input
                      id="project_amount"
                      type="number"
                      placeholder="Total project amount"
                      value={newProject.project_amount}
                      onChange={(e) => setNewProject({ ...newProject, project_amount: Number(e.target.value) })}
                    />
                  </div>
                )}

                {(newProject.billing_type === 'project' || newProject.type === 'BRD') && (
                  <div className="space-y-2">
                    <Label htmlFor="deadline">Deadline</Label>
                    <Input
                      id="deadline"
                      type="date"
                      value={newProject.deadline}
                      onChange={(e) => setNewProject({ ...newProject, deadline: e.target.value })}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="brd_file">BRD Document</Label>
                  <Input
                    id="brd_file"
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={(e) => setNewProject({ ...newProject, brd_file: e.target.files?.[0] || null })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="start_date">Start Date</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={newProject.start_date}
                    onChange={(e) => setNewProject({ ...newProject, start_date: e.target.value })}
                  />
                </div>

                <Button onClick={handleCreateProject} className="w-full" disabled={uploadingBRD}>
                  {uploadingBRD ? 'Uploading BRD...' : 'Create Project'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters Section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-4">
              <div className="space-y-2">
                <Label>Search</Label>
                <Input
                  placeholder="Search projects or clients..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Client</Label>
                <Select value={selectedClient} onValueChange={setSelectedClient}>
                  <SelectTrigger>
                    <SelectValue placeholder="All clients" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Clients</SelectItem>
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
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
                    <SelectItem value="On Hold">On Hold</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger>
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {services.map((service) => (
                      <SelectItem key={service.id} value={service.name}>
                        {service.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Year</Label>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger>
                    <SelectValue placeholder="All years" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Years</SelectItem>
                    {availableYears.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Month</Label>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger>
                    <SelectValue placeholder="All months" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Months</SelectItem>
                    <SelectItem value="1">January</SelectItem>
                    <SelectItem value="2">February</SelectItem>
                    <SelectItem value="3">March</SelectItem>
                    <SelectItem value="4">April</SelectItem>
                    <SelectItem value="5">May</SelectItem>
                    <SelectItem value="6">June</SelectItem>
                    <SelectItem value="7">July</SelectItem>
                    <SelectItem value="8">August</SelectItem>
                    <SelectItem value="9">September</SelectItem>
                    <SelectItem value="10">October</SelectItem>
                    <SelectItem value="11">November</SelectItem>
                    <SelectItem value="12">December</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button variant="outline" onClick={clearFilters} className="w-full md:w-auto">
              Clear All Filters
            </Button>
          </CardContent>
        </Card>

        {/* Projects List */}
        <Card>
          <CardHeader>
            <CardTitle>Projects ({filteredProjects.length})</CardTitle>
            <CardDescription>
              {filteredProjects.length !== projects.length 
                ? `Showing ${filteredProjects.length} of ${projects.length} projects`
                : `All projects and their details`
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Billing</TableHead>
                  <TableHead>Rate/Amount</TableHead>
                  <TableHead>Total Hours</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Deadline</TableHead>
                  <TableHead>BRD</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProjects.map((project) => (
                  <TableRow key={project.id}>
                    <TableCell className="font-medium">{project.name}</TableCell>
                    <TableCell>{project.clients?.name}</TableCell>
                    <TableCell>
                      <Badge className="bg-purple-100 text-purple-800">
                        {project.type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={isProjectBased(project) ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}>
                        {isProjectBased(project) ? 'Project' : 'Hourly'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {isProjectBased(project) ? `₹${project.project_amount || 0}` : `₹${project.hourly_rate}/hr`}
                    </TableCell>
                    <TableCell>{project.total_hours}</TableCell>
                    <TableCell>
                      <Badge className={
                        project.status === 'Active' ? 'bg-green-100 text-green-800' : 
                        project.status === 'Completed' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }>
                        {project.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {project.deadline ? new Date(project.deadline).toLocaleDateString() : 'N/A'}
                    </TableCell>
                    <TableCell>
                      {project.brd_file_url ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openBRDFile(project.brd_file_url!)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      ) : (
                        'N/A'
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingProject(project);
                            setEditBillingType(isProjectBased(project) ? 'project' : 'hourly');
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
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Project</DialogTitle>
              <DialogDescription>
                Update project details.
              </DialogDescription>
            </DialogHeader>
            {editingProject && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Project Name</Label>
                  <Input
                    id="edit-name"
                    placeholder="Project name"
                    value={editingProject.name}
                    onChange={(e) => setEditingProject({ ...editingProject, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-client">Client</Label>
                  <Select value={editingProject.client_id} onValueChange={(value) => setEditingProject({ ...editingProject, client_id: value })}>
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
                  <Label htmlFor="edit-type">Project Type (Service)</Label>
                  <Select value={editingProject.type} onValueChange={(value) => setEditingProject({ ...editingProject, type: value as ProjectType })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select project type" />
                    </SelectTrigger>
                    <SelectContent>
                      {services.map((service) => (
                        <SelectItem key={service.id} value={service.name}>
                          {service.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {editingProject.type !== 'BRD' && (
                  <div className="space-y-2">
                    <Label htmlFor="edit-billing-type">Billing Type</Label>
                    <Select value={editBillingType} onValueChange={(value) => setEditBillingType(value as 'hourly' | 'project')}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select billing type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hourly">Hourly</SelectItem>
                        <SelectItem value="project">Project-based</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
                {editingProject.type === 'BRD' ? (
                  <div className="space-y-2">
                    <Label htmlFor="edit-project-amount">BRD Amount (₹)</Label>
                    <Input
                      id="edit-project-amount"
                      type="number"
                      placeholder="BRD project amount"
                      value={editingProject.project_amount || 0}
                      onChange={(e) => setEditingProject({ ...editingProject, project_amount: Number(e.target.value) })}
                    />
                  </div>
                ) : editBillingType === 'hourly' ? (
                  <div className="space-y-2">
                    <Label htmlFor="edit-hourly-rate">Hourly Rate (₹)</Label>
                    <Input
                      id="edit-hourly-rate"
                      type="number"
                      placeholder="Hourly rate"
                      value={editingProject.hourly_rate}
                      onChange={(e) => setEditingProject({ ...editingProject, hourly_rate: Number(e.target.value) })}
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="edit-project-amount">Project Amount (₹)</Label>
                    <Input
                      id="edit-project-amount"
                      type="number"
                      placeholder="Total project amount"
                      value={editingProject.project_amount || 0}
                      onChange={(e) => setEditingProject({ ...editingProject, project_amount: Number(e.target.value) })}
                    />
                  </div>
                )}

                {(editBillingType === 'project' || editingProject.type === 'BRD') && (
                  <div className="space-y-2">
                    <Label htmlFor="edit-deadline">Deadline</Label>
                    <Input
                      id="edit-deadline"
                      type="date"
                      value={editingProject.deadline || ''}
                      onChange={(e) => setEditingProject({ ...editingProject, deadline: e.target.value })}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="edit-brd-file">Update BRD Document</Label>
                  <Input
                    id="edit-brd-file"
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={(e) => setEditBrdFile(e.target.files?.[0] || null)}
                  />
                  {editingProject.brd_file_url && (
                    <div className="text-sm text-gray-600">
                      Current BRD: 
                      <Button
                        variant="link"
                        className="text-blue-600 p-0 ml-1"
                        onClick={() => openBRDFile(editingProject.brd_file_url!)}
                      >
                        View existing BRD
                      </Button>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-start-date">Start Date</Label>
                  <Input
                    id="edit-start-date"
                    type="date"
                    value={editingProject.start_date || ''}
                    onChange={(e) => setEditingProject({ ...editingProject, start_date: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-status">Status</Label>
                  <Select value={editingProject.status} onValueChange={(value) => setEditingProject({ ...editingProject, status: value as ProjectStatus })}>
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

                <Button onClick={handleUpdateProject} className="w-full" disabled={uploadingBRD}>
                  {uploadingBRD ? 'Uploading BRD...' : 'Update Project'}
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Navigation>
  );
};

export default Projects;
