import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { 
  Plus, 
  Edit, 
  DollarSign, 
  Clock, 
  Calendar,
  FileText,
  Users
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import Navigation from '@/components/Navigation';
import { useToast } from '@/hooks/use-toast';

const Projects = () => {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<any>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    client_id: '',
    type: '',
    hourly_rate: '',
    project_amount: '',
    start_date: '',
    deadline: '',
    status: 'Active',
    brd_file_url: ''
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          clients (name)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    }
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data || [];
    }
  });

  const createProjectMutation = useMutation({
    mutationFn: async (projectData: any) => {
      const { data, error } = await supabase
        .from('projects')
        .insert([{
          ...projectData,
          hourly_rate: projectData.type === 'BRD' ? 0 : Number(projectData.hourly_rate),
          project_amount: projectData.type === 'BRD' ? Number(projectData.project_amount) : 0
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setIsCreateDialogOpen(false);
      resetForm();
      toast({
        title: "Success",
        description: "Project created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create project",
        variant: "destructive",
      });
    }
  });

  const updateProjectMutation = useMutation({
    mutationFn: async ({ id, ...projectData }: any) => {
      const { data, error } = await supabase
        .from('projects')
        .update({
          ...projectData,
          hourly_rate: projectData.type === 'BRD' ? 0 : Number(projectData.hourly_rate),
          project_amount: projectData.type === 'BRD' ? Number(projectData.project_amount) : 0
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setIsEditDialogOpen(false);
      resetForm();
      toast({
        title: "Success",
        description: "Project updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update project",
        variant: "destructive",
      });
    }
  });

  const resetForm = () => {
    setFormData({
      name: '',
      client_id: '',
      type: '',
      hourly_rate: '',
      project_amount: '',
      start_date: '',
      deadline: '',
      status: 'Active',
      brd_file_url: ''
    });
    setEditingProject(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingProject) {
      updateProjectMutation.mutate({ id: editingProject.id, ...formData });
    } else {
      createProjectMutation.mutate(formData);
    }
  };

  const openEditDialog = (project: any) => {
    setEditingProject(project);
    setFormData({
      name: project.name,
      client_id: project.client_id,
      type: project.type,
      hourly_rate: project.hourly_rate?.toString() || '',
      project_amount: project.project_amount?.toString() || '',
      start_date: project.start_date || '',
      deadline: project.deadline || '',
      status: project.status,
      brd_file_url: project.brd_file_url || ''
    });
    setIsEditDialogOpen(true);
  };

  const handleBRDClick = (brdUrl: string) => {
    if (brdUrl) {
      window.open(brdUrl, '_blank');
    } else {
      toast({
        title: "No Document",
        description: "BRD document not found for this project",
        variant: "destructive",
      });
    }
  };

  const getTotalValue = (project: any) => {
    if (project.type === 'BRD') {
      return `₹${project.project_amount || 0}`;
    }
    return `₹${project.hourly_rate}/hr`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <Navigation />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Projects</h1>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Project
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create New Project</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Project Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="client_id">Client</Label>
                  <Select
                    value={formData.client_id}
                    onValueChange={(value) => setFormData({ ...formData, client_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a client" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((client: any) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="type">Project Type</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) => setFormData({ ...formData, type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select project type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DevOps">DevOps</SelectItem>
                      <SelectItem value="Marketing">Marketing</SelectItem>
                      <SelectItem value="Consulting">Consulting</SelectItem>
                      <SelectItem value="Strategy">Strategy</SelectItem>
                      <SelectItem value="Technical Writing">Technical Writing</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="project_basis">Project Basis</Label>
                  <Select
                    value={formData.type === 'BRD' ? 'BRD' : 'Hourly'}
                    onValueChange={(value) => {
                      if (value === 'BRD') {
                        setFormData({ ...formData, hourly_rate: '0' });
                      } else {
                        setFormData({ ...formData, project_amount: '0' });
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select project basis" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Hourly">Hourly Based</SelectItem>
                      <SelectItem value="BRD">BRD Based</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.type === 'BRD' ? (
                  <>
                    <div>
                      <Label htmlFor="project_amount">Total Project Value (₹)</Label>
                      <Input
                        id="project_amount"
                        type="number"
                        value={formData.project_amount}
                        onChange={(e) => setFormData({ ...formData, project_amount: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="brd_file_url">BRD Document URL</Label>
                      <Input
                        id="brd_file_url"
                        type="url"
                        value={formData.brd_file_url}
                        onChange={(e) => setFormData({ ...formData, brd_file_url: e.target.value })}
                        placeholder="https://example.com/document.pdf"
                      />
                    </div>
                  </>
                ) : (
                  <div>
                    <Label htmlFor="hourly_rate">Hourly Rate (₹)</Label>
                    <Input
                      id="hourly_rate"
                      type="number"
                      value={formData.hourly_rate}
                      onChange={(e) => setFormData({ ...formData, hourly_rate: e.target.value })}
                      required
                    />
                  </div>
                )}
                
                <div>
                  <Label htmlFor="start_date">Start Date</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="deadline">Deadline</Label>
                  <Input
                    id="deadline"
                    type="date"
                    value={formData.deadline}
                    onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                  />
                </div>
                
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Completed">Completed</SelectItem>
                      <SelectItem value="On Hold">On Hold</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <Button type="submit" className="w-full">
                  Create Project
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project: any) => (
            <Card key={project.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{project.name}</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEditDialog(project)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <Badge variant="outline">{project.type}</Badge>
                  <Badge 
                    variant={project.status === 'Active' ? 'default' : 'secondary'}
                  >
                    {project.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Users className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-600">{project.clients.name}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    {project.brd_file_url ? (
                      <div 
                        className="flex items-center space-x-2 cursor-pointer text-blue-600 hover:text-blue-800"
                        onClick={() => handleBRDClick(project.brd_file_url)}
                      >
                        <FileText className="h-4 w-4" />
                        <span className="text-sm font-medium">View BRD Document</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-1">
                        <DollarSign className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-medium">{getTotalValue(project)}</span>
                      </div>
                    )}
                    <div className="flex items-center space-x-1">
                      <Clock className="h-4 w-4 text-blue-600" />
                      <span className="text-sm">{project.total_hours}h</span>
                    </div>
                  </div>

                  {project.deadline && (
                    <div className="flex items-center space-x-1">
                      <Calendar className="h-4 w-4 text-orange-600" />
                      <span className="text-sm">Due: {new Date(project.deadline).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Project</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Same form fields as create dialog */}
              <div>
                <Label htmlFor="edit_name">Project Name</Label>
                <Input
                  id="edit_name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="edit_client_id">Client</Label>
                <Select
                  value={formData.client_id}
                  onValueChange={(value) => setFormData({ ...formData, client_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client: any) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="edit_type">Project Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select project type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DevOps">DevOps</SelectItem>
                    <SelectItem value="Marketing">Marketing</SelectItem>
                    <SelectItem value="Consulting">Consulting</SelectItem>
                    <SelectItem value="Strategy">Strategy</SelectItem>
                    <SelectItem value="Technical Writing">Technical Writing</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.brd_file_url ? (
                <>
                  <div>
                    <Label htmlFor="edit_project_amount">Total Project Value (₹)</Label>
                    <Input
                      id="edit_project_amount"
                      type="number"
                      value={formData.project_amount}
                      onChange={(e) => setFormData({ ...formData, project_amount: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit_brd_file_url">BRD Document URL</Label>
                    <Input
                      id="edit_brd_file_url"
                      type="url"
                      value={formData.brd_file_url}
                      onChange={(e) => setFormData({ ...formData, brd_file_url: e.target.value })}
                      placeholder="https://example.com/document.pdf"
                    />
                  </div>
                </>
              ) : (
                <div>
                  <Label htmlFor="edit_hourly_rate">Hourly Rate (₹)</Label>
                  <Input
                    id="edit_hourly_rate"
                    type="number"
                    value={formData.hourly_rate}
                    onChange={(e) => setFormData({ ...formData, hourly_rate: e.target.value })}
                    required
                  />
                </div>
              )}
              
              <div>
                <Label htmlFor="edit_start_date">Start Date</Label>
                <Input
                  id="edit_start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="edit_deadline">Deadline</Label>
                <Input
                  id="edit_deadline"
                  type="date"
                  value={formData.deadline}
                  onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                />
              </div>
              
              <div>
                <Label htmlFor="edit_status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
                    <SelectItem value="On Hold">On Hold</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <Button type="submit" className="w-full">
                Update Project
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Projects;
