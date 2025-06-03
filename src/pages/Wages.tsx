import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Filter, Clock, CheckCircle, X } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import Navigation from '@/components/Navigation';
import { toast } from 'sonner';

interface WageTask {
  id: string;
  name: string;
  hours: number;
  date: string;
  wage_status: 'wpaid' | 'wnotpaid';
  assignee: { name: string } | null;
  projects: { name: string; clients: { name: string } };
  time_entries: { duration_minutes: number; comment: string; start_time: string }[];
}

const Wages = () => {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({
    assignee: '',
    project: '',
    client: '',
    status: '',
    year: '',
    month: ''
  });

  // Generate year options (current year and previous 5 years)
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 6 }, (_, i) => currentYear - i);

  // Month options
  const monthOptions = [
    { value: '01', label: 'January' },
    { value: '02', label: 'February' },
    { value: '03', label: 'March' },
    { value: '04', label: 'April' },
    { value: '05', label: 'May' },
    { value: '06', label: 'June' },
    { value: '07', label: 'July' },
    { value: '08', label: 'August' },
    { value: '09', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' },
  ];

  const { data: wageTasks = [], isLoading } = useQuery({
    queryKey: ['wage-tasks', filters],
    queryFn: async () => {
      let query = supabase
        .from('tasks')
        .select(`
          *,
          assignee:employees!tasks_assignee_id_fkey(name),
          projects!inner(
            name,
            clients!inner(name)
          ),
          time_entries(duration_minutes, comment, start_time)
        `)
        .eq('invoiced', true)
        .order('date', { ascending: false });

      if (filters.assignee && filters.assignee !== 'all') {
        query = query.eq('assignee_id', filters.assignee);
      }
      if (filters.project && filters.project !== 'all') {
        query = query.eq('project_id', filters.project);
      }
      if (filters.status && filters.status !== 'all') {
        query = query.eq('wage_status', filters.status);
      }
      if (filters.year && filters.year !== 'all') {
        const startDate = `${filters.year}-01-01`;
        const endDate = `${filters.year}-12-31`;
        query = query.gte('date', startDate).lte('date', endDate);
      }
      if (filters.month && filters.month !== 'all' && filters.year && filters.year !== 'all') {
        const startDate = `${filters.year}-${filters.month}-01`;
        const daysInMonth = new Date(parseInt(filters.year), parseInt(filters.month), 0).getDate();
        const endDate = `${filters.year}-${filters.month}-${daysInMonth.toString().padStart(2, '0')}`;
        query = query.gte('date', startDate).lte('date', endDate);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as WageTask[];
    }
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees-for-wages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employees')
        .select('id, name')
        .order('name');
      
      if (error) throw error;
      return data;
    }
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects-for-wages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, clients(name)')
        .order('name');
      
      if (error) throw error;
      return data;
    }
  });

  const updateWageStatusMutation = useMutation({
    mutationFn: async ({ taskId, status }: { taskId: string; status: 'wpaid' | 'wnotpaid' }) => {
      const { data, error } = await supabase
        .from('tasks')
        .update({ wage_status: status })
        .eq('id', taskId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wage-tasks'] });
      toast.success('Wage status updated!');
    },
    onError: (error) => {
      toast.error('Failed to update wage status: ' + error.message);
    }
  });

  const clearFilters = () => {
    setFilters({ assignee: '', project: '', client: '', status: '', year: '', month: '' });
  };

  const groupedTasks = wageTasks.reduce((acc, task) => {
    const assigneeName = task.assignee?.name || 'Unassigned';
    if (!acc[assigneeName]) {
      acc[assigneeName] = [];
    }
    acc[assigneeName].push(task);
    return acc;
  }, {} as Record<string, WageTask[]>);

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <Navigation />
        <div className="flex items-center justify-center py-8">
          <div className="text-lg">Loading wages...</div>
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
            <h1 className="text-3xl font-bold text-gray-900">Wages</h1>
            <p className="text-gray-600 mt-2">Track employee wage payments for completed tasks</p>
          </div>
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
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
              <div className="space-y-2">
                <Label>Year</Label>
                <Select value={filters.year} onValueChange={(value) => setFilters({...filters, year: value, month: value === 'all' ? '' : filters.month})}>
                  <SelectTrigger>
                    <SelectValue placeholder="All years" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All years</SelectItem>
                    {yearOptions.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Month</Label>
                <Select 
                  value={filters.month} 
                  onValueChange={(value) => setFilters({...filters, month: value})}
                  disabled={!filters.year || filters.year === 'all'}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All months" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All months</SelectItem>
                    {monthOptions.map((month) => (
                      <SelectItem key={month.value} value={month.value}>
                        {month.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Assignee</Label>
                <Select value={filters.assignee} onValueChange={(value) => setFilters({...filters, assignee: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="All assignees" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All assignees</SelectItem>
                    {employees.map((employee) => (
                      <SelectItem key={employee.id} value={employee.id}>
                        {employee.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Project</Label>
                <Select value={filters.project} onValueChange={(value) => setFilters({...filters, project: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="All projects" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All projects</SelectItem>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Wage Status</Label>
                <Select value={filters.status} onValueChange={(value) => setFilters({...filters, status: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="wpaid">Wage Paid</SelectItem>
                    <SelectItem value="wnotpaid">Wage Not Paid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button variant="outline" onClick={clearFilters}>
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Grouped Tasks by Assignee */}
        <div className="space-y-6">
          {Object.entries(groupedTasks).map(([assigneeName, tasks]) => (
            <Card key={assigneeName}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{assigneeName}</span>
                  <Badge variant="outline">
                    {tasks.length} task{tasks.length !== 1 ? 's' : ''}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {tasks.map((task) => (
                    <div key={task.id} className="border rounded-lg p-4 bg-gray-50">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="font-medium">{task.name}</h4>
                          <p className="text-sm text-gray-600">
                            {task.projects.name} • {task.projects.clients.name}
                          </p>
                          <p className="text-sm text-gray-500">Date: {task.date}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant={task.wage_status === 'wpaid' ? 'default' : 'secondary'}>
                            {task.wage_status === 'wpaid' ? 'Wage Paid' : 'Wage Not Paid'}
                          </Badge>
                          <Select 
                            value={task.wage_status || 'wnotpaid'} 
                            onValueChange={(value) => updateWageStatusMutation.mutate({ 
                              taskId: task.id, 
                              status: value as 'wpaid' | 'wnotpaid' 
                            })}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="wnotpaid">Not Paid</SelectItem>
                              <SelectItem value="wpaid">Paid</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      
                      {/* Time Slots */}
                      {task.time_entries && task.time_entries.length > 0 && (
                        <div className="space-y-2">
                          <h5 className="text-sm font-medium text-gray-700">Time Slots:</h5>
                          {task.time_entries.map((entry, index) => (
                            <div key={index} className="text-sm bg-white p-2 rounded border">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                  <Clock className="h-3 w-3 text-gray-500" />
                                  <span>{Math.round((entry.duration_minutes || 0) / 60 * 100) / 100}h</span>
                                  <span>•</span>
                                  <span>{formatTime(entry.start_time)}</span>
                                </div>
                              </div>
                              {entry.comment && (
                                <p className="text-gray-600 mt-1 text-xs">{entry.comment}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {Object.keys(groupedTasks).length === 0 && (
          <Card>
            <CardContent className="text-center py-8 text-gray-500">
              No billed tasks found with current filters.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Wages;
