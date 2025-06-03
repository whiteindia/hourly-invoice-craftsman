
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Calendar, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import SprintDialog from '@/components/SprintDialog';
import SprintCard from '@/components/SprintCard';
import Navigation from '@/components/Navigation';
import { toast } from '@/hooks/use-toast';

interface Sprint {
  id: string;
  title: string;
  deadline: string;
  status: 'Not Started' | 'In Progress' | 'Completed';
  created_at: string;
  updated_at: string;
}

interface Task {
  id: string;
  name: string;
  status: 'Not Started' | 'In Progress' | 'Completed';
  project_id: string;
  assignee_id: string | null;
  deadline: string | null;
  hours: number;
  projects?: {
    name: string;
    clients: {
      name: string;
    };
  };
  employees?: {
    name: string;
  };
}

interface SprintWithTasks extends Sprint {
  tasks: Task[];
}

const Sprints = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSprint, setEditingSprint] = useState<Sprint | null>(null);
  const [selectedClient, setSelectedClient] = useState<string>('all');
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [selectedAssignee, setSelectedAssignee] = useState<string>('all');
  const [selectedAssigner, setSelectedAssigner] = useState<string>('all');
  const [selectedService, setSelectedService] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('active'); // Hide completed by default
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [globalServiceFilter, setGlobalServiceFilter] = useState<string>('all');
  const queryClient = useQueryClient();

  // Fetch clients for filter
  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data || [];
    }
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, client_id')
        .order('name');
      if (error) throw error;
      return data || [];
    }
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employees')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data || [];
    }
  });

  const { data: services = [] } = useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('services')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data || [];
    }
  });

  // Fetch sprints with their tasks
  const { data: sprints = [], isLoading } = useQuery({
    queryKey: ['sprints'],
    queryFn: async () => {
      const { data: sprintsData, error: sprintsError } = await supabase
        .from('sprints')
        .select('*')
        .order('deadline', { ascending: true });

      if (sprintsError) throw sprintsError;

      const sprintsWithTasks: SprintWithTasks[] = [];
      
      for (const sprint of sprintsData || []) {
        const { data: sprintTasks, error: tasksError } = await supabase
          .from('sprint_tasks')
          .select(`
            task_id,
            tasks (
              id,
              name,
              status,
              project_id,
              assignee_id,
              deadline,
              hours,
              projects (
                name,
                type,
                clients (
                  name
                )
              )
            )
          `)
          .eq('sprint_id', sprint.id);

        if (tasksError) throw tasksError;

        const tasks: Task[] = [];
        
        for (const st of sprintTasks || []) {
          if (st.tasks) {
            const task = st.tasks as any;
            let employeeData = null;
            
            if (task.assignee_id) {
              const { data: employee } = await supabase
                .from('employees')
                .select('name')
                .eq('id', task.assignee_id)
                .single();
              
              if (employee) {
                employeeData = { name: employee.name };
              }
            }
            
            tasks.push({
              id: task.id,
              name: task.name,
              status: task.status as 'Not Started' | 'In Progress' | 'Completed',
              project_id: task.project_id,
              assignee_id: task.assignee_id,
              deadline: task.deadline,
              hours: task.hours,
              projects: task.projects,
              employees: employeeData
            });
          }
        }
        
        sprintsWithTasks.push({
          ...sprint,
          status: sprint.status as 'Not Started' | 'In Progress' | 'Completed',
          tasks
        });
      }

      return sprintsWithTasks;
    }
  });

  // Generate available years and months from sprints
  const availableYears = [...new Set(sprints.map(sprint => new Date(sprint.deadline).getFullYear()))].sort((a, b) => b - a);
  const months = [
    { value: '0', label: 'January' }, { value: '1', label: 'February' }, { value: '2', label: 'March' },
    { value: '3', label: 'April' }, { value: '4', label: 'May' }, { value: '5', label: 'June' },
    { value: '6', label: 'July' }, { value: '7', label: 'August' }, { value: '8', label: 'September' },
    { value: '9', label: 'October' }, { value: '10', label: 'November' }, { value: '11', label: 'December' }
  ];

  // Enhanced filter logic
  const filteredSprints = sprints.filter(sprint => {
    // Global service filter - check project service type
    if (globalServiceFilter !== 'all') {
      const hasMatchingService = sprint.tasks.some(task => 
        task.projects?.type === globalServiceFilter
      );
      if (!hasMatchingService && sprint.tasks.length > 0) {
        return false;
      }
    }

    // Status filter - by default hide completed sprints
    if (selectedStatus === 'active' && sprint.status === 'Completed') {
      return false;
    }
    if (selectedStatus !== 'all' && selectedStatus !== 'active' && sprint.status !== selectedStatus) {
      return false;
    }

    // Year filter
    if (selectedYear !== 'all') {
      const sprintYear = new Date(sprint.deadline).getFullYear();
      if (sprintYear !== parseInt(selectedYear)) {
        return false;
      }
    }

    // Month filter
    if (selectedMonth !== 'all') {
      const sprintMonth = new Date(sprint.deadline).getMonth();
      if (sprintMonth !== parseInt(selectedMonth)) {
        return false;
      }
    }

    if (sprint.tasks.length === 0) {
      return selectedClient === 'all' && selectedProject === 'all' && selectedAssignee === 'all' && selectedAssigner === 'all' && selectedService === 'all';
    }

    return sprint.tasks.some(task => {
      if (selectedClient !== 'all') {
        const clientName = clients.find(c => c.id === selectedClient)?.name;
        if (task.projects?.clients?.name !== clientName) {
          return false;
        }
      }

      if (selectedProject !== 'all') {
        if (task.project_id !== selectedProject) {
          return false;
        }
      }

      if (selectedAssignee !== 'all') {
        if (task.assignee_id !== selectedAssignee) {
          return false;
        }
      }

      if (selectedService !== 'all') {
        if (task.projects?.type !== selectedService) {
          return false;
        }
      }

      return true;
    });
  });

  // Delete sprint mutation
  const deleteSprint = useMutation({
    mutationFn: async (sprintId: string) => {
      // First delete sprint_tasks relationships
      const { error: sprintTasksError } = await supabase
        .from('sprint_tasks')
        .delete()
        .eq('sprint_id', sprintId);
      
      if (sprintTasksError) throw sprintTasksError;

      // Then delete the sprint
      const { error } = await supabase
        .from('sprints')
        .delete()
        .eq('id', sprintId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sprints'] });
      toast({
        title: "Success",
        description: "Sprint deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete sprint",
        variant: "destructive",
      });
    }
  });

  // Update task status mutation
  const updateTaskStatus = useMutation({
    mutationFn: async ({ taskId, status }: { taskId: string; status: 'Not Started' | 'In Progress' | 'Completed' }) => {
      const { error } = await supabase
        .from('tasks')
        .update({ status })
        .eq('id', taskId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sprints'] });
      toast({
        title: "Success",
        description: "Task status updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update task status",
        variant: "destructive",
      });
    }
  });

  const updateSprintStatus = useMutation({
    mutationFn: async ({ sprintId, status }: { sprintId: string; status: string }) => {
      const { error } = await supabase
        .from('sprints')
        .update({ status })
        .eq('id', sprintId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sprints'] });
    }
  });

  const handleTaskStatusChange = (taskId: string, newStatus: 'Not Started' | 'In Progress' | 'Completed', sprintId: string) => {
    updateTaskStatus.mutate({ taskId, status: newStatus });
    
    const sprint = sprints.find(s => s.id === sprintId);
    if (sprint) {
      const updatedTasks = sprint.tasks.map(t => 
        t.id === taskId ? { ...t, status: newStatus } : t
      );
      
      let sprintStatus: 'Not Started' | 'In Progress' | 'Completed' = 'Not Started';
      if (updatedTasks.every(t => t.status === 'Completed')) {
        sprintStatus = 'Completed';
      } else if (updatedTasks.some(t => t.status === 'In Progress' || t.status === 'Completed')) {
        sprintStatus = 'In Progress';
      }
      
      if (sprintStatus !== sprint.status) {
        updateSprintStatus.mutate({ sprintId, status: sprintStatus });
      }
    }
  };

  const handleEditSprint = (sprint: Sprint) => {
    setEditingSprint(sprint);
    setDialogOpen(true);
  };

  const handleDeleteSprint = (sprintId: string) => {
    if (confirm('Are you sure you want to delete this sprint? This action cannot be undone.')) {
      deleteSprint.mutate(sprintId);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'In Progress':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed':
        return 'bg-green-100 text-green-800';
      case 'In Progress':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const resetFilters = () => {
    setSelectedClient('all');
    setSelectedProject('all');
    setSelectedAssignee('all');
    setSelectedAssigner('all');
    setSelectedService('all');
    setSelectedStatus('active');
    setSelectedYear('all');
    setSelectedMonth('all');
    setGlobalServiceFilter('all');
  };

  const hasActiveFilters = selectedClient !== 'all' || selectedProject !== 'all' || selectedAssignee !== 'all' || selectedAssigner !== 'all' || selectedService !== 'all' || selectedStatus !== 'active' || selectedYear !== 'all' || selectedMonth !== 'all' || globalServiceFilter !== 'all';

  if (isLoading) {
    return (
      <Navigation>
        <div className="container mx-auto p-6">
          <div className="flex justify-center items-center h-64">
            <div className="text-lg">Loading sprints...</div>
          </div>
        </div>
      </Navigation>
    );
  }

  return (
    <Navigation>
      <div className="container mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Sprints</h1>
          <div className="flex items-center gap-4">
            <div className="w-48">
              <Select value={globalServiceFilter} onValueChange={setGlobalServiceFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by Service" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Services</SelectItem>
                  {services.map((service) => (
                    <SelectItem key={service.id} value={service.name}>
                      {service.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => {
              setEditingSprint(null);
              setDialogOpen(true);
            }}>
              <Plus className="h-4 w-4 mr-2" />
              Create Sprint
            </Button>
          </div>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Filters</CardTitle>
              {hasActiveFilters && (
                <Button variant="outline" size="sm" onClick={resetFilters}>
                  Clear Filters
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {/* First row - Date and Status filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-2">Status</label>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sprint Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sprints</SelectItem>
                    <SelectItem value="active">Active Sprints (Hide Completed)</SelectItem>
                    <SelectItem value="Not Started">Not Started</SelectItem>
                    <SelectItem value="In Progress">In Progress</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Year</label>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Years" />
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

              <div>
                <label className="block text-sm font-medium mb-2">Month</label>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Months" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Months</SelectItem>
                    {months.map((month) => (
                      <SelectItem key={month.value} value={month.value}>
                        {month.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Second row - Task-based filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Client</label>
                <Select value={selectedClient} onValueChange={setSelectedClient}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Clients" />
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

              <div>
                <label className="block text-sm font-medium mb-2">Project</label>
                <Select value={selectedProject} onValueChange={setSelectedProject}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Projects" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Projects</SelectItem>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Assignee</label>
                <Select value={selectedAssignee} onValueChange={setSelectedAssignee}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Assignees" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Assignees</SelectItem>
                    {employees.map((employee) => (
                      <SelectItem key={employee.id} value={employee.id}>
                        {employee.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Service</label>
                <Select value={selectedService} onValueChange={setSelectedService}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Services" />
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
            </div>
            
            {hasActiveFilters && (
              <div className="mt-4 flex flex-wrap gap-2">
                {globalServiceFilter !== 'all' && (
                  <Badge variant="secondary">
                    Service: {services.find(s => s.name === globalServiceFilter)?.name}
                  </Badge>
                )}
                {selectedStatus !== 'active' && (
                  <Badge variant="secondary">
                    Status: {selectedStatus === 'all' ? 'All' : selectedStatus}
                  </Badge>
                )}
                {selectedYear !== 'all' && (
                  <Badge variant="secondary">Year: {selectedYear}</Badge>
                )}
                {selectedMonth !== 'all' && (
                  <Badge variant="secondary">
                    Month: {months.find(m => m.value === selectedMonth)?.label}
                  </Badge>
                )}
                {selectedClient !== 'all' && (
                  <Badge variant="secondary">
                    Client: {clients.find(c => c.id === selectedClient)?.name}
                  </Badge>
                )}
                {selectedProject !== 'all' && (
                  <Badge variant="secondary">
                    Project: {projects.find(p => p.id === selectedProject)?.name}
                  </Badge>
                )}
                {selectedAssignee !== 'all' && (
                  <Badge variant="secondary">
                    Assignee: {employees.find(e => e.id === selectedAssignee)?.name}
                  </Badge>
                )}
                {selectedService !== 'all' && (
                  <Badge variant="secondary">
                    Task Service: {services.find(s => s.name === selectedService)?.name}
                  </Badge>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          {filteredSprints.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Calendar className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No sprints found</h3>
                <p className="text-gray-500 text-center mb-4">
                  {sprints.length === 0 
                    ? "Get started by creating your first sprint to organize your tasks."
                    : "No sprints match the current filters. Try adjusting your filter criteria."
                  }
                </p>
                {hasActiveFilters && (
                  <Button variant="outline" onClick={resetFilters} className="mb-4">
                    Clear Filters
                  </Button>
                )}
                <Button onClick={() => {
                  setEditingSprint(null);
                  setDialogOpen(true);
                }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Sprint
                </Button>
              </CardContent>
            </Card>
          ) : (
            filteredSprints.map((sprint) => (
              <SprintCard
                key={sprint.id}
                sprint={sprint}
                onTaskStatusChange={handleTaskStatusChange}
                onEdit={() => handleEditSprint(sprint)}
                onDelete={() => handleDeleteSprint(sprint.id)}
                getStatusIcon={getStatusIcon}
                getStatusColor={getStatusColor}
              />
            ))
          )}
        </div>

        <SprintDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          editingSprint={editingSprint}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['sprints'] });
            setDialogOpen(false);
            setEditingSprint(null);
          }}
        />
      </div>
    </Navigation>
  );
};

export default Sprints;
