
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  DollarSign, 
  Users, 
  FolderOpen, 
  CheckSquare, 
  Clock,
  TrendingUp,
  Calendar,
  Play
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import Navigation from '@/components/Navigation';
import { useNavigate } from 'react-router-dom';

const Index = () => {
  const navigate = useNavigate();

  // Get running tasks (tasks with active time entries)
  const { data: runningTasks = [] } = useQuery({
    queryKey: ['running-tasks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('time_entries')
        .select(`
          id,
          start_time,
          tasks (
            id,
            name,
            projects (
              name,
              clients (name)
            )
          )
        `)
        .is('end_time', null)
        .order('start_time', { ascending: false });
      
      if (error) throw error;
      return data || [];
    }
  });

  // Get summary statistics
  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const [clientsRes, projectsRes, tasksRes, paymentsRes] = await Promise.all([
        supabase.from('clients').select('id', { count: 'exact' }),
        supabase.from('projects').select('id', { count: 'exact' }),
        supabase.from('tasks').select('id', { count: 'exact' }),
        supabase.from('payments').select('amount')
      ]);

      const totalRevenue = paymentsRes.data?.reduce((sum, payment) => sum + payment.amount, 0) || 0;

      return {
        clients: clientsRes.count || 0,
        projects: projectsRes.count || 0,
        tasks: tasksRes.count || 0,
        revenue: totalRevenue
      };
    }
  });

  const formatElapsedTime = (startTime: string) => {
    const start = new Date(startTime);
    const now = new Date();
    const elapsed = Math.floor((now.getTime() - start.getTime()) / 1000);
    
    const hours = Math.floor(elapsed / 3600);
    const minutes = Math.floor((elapsed % 3600) / 60);
    const seconds = elapsed % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleRunningTaskClick = () => {
    navigate('/tasks?status=In Progress');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <Navigation />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-2">Welcome to FreelanceHub - Your project management center</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.clients || 0}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
              <FolderOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.projects || 0}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
              <CheckSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.tasks || 0}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${stats?.revenue || 0}</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Running Tasks */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Play className="h-5 w-5 mr-2 text-green-600" />
                Active Time Tracking
              </CardTitle>
            </CardHeader>
            <CardContent>
              {runningTasks.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Clock className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No tasks currently running</p>
                  <p className="text-sm">Start a timer on any task to track your work</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {runningTasks.map((entry: any) => (
                    <div
                      key={entry.id}
                      className="p-4 border rounded-lg bg-green-50 border-green-200 cursor-pointer hover:bg-green-100 transition-colors"
                      onClick={handleRunningTaskClick}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-green-900">{entry.tasks.name}</h4>
                          <p className="text-sm text-green-700">
                            {entry.tasks.projects.name} • {entry.tasks.projects.clients.name}
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge variant="default" className="bg-green-600">
                            Running
                          </Badge>
                          <div className="text-sm font-mono text-green-600 mt-1">
                            {formatElapsedTime(entry.start_time)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleRunningTaskClick}
                  >
                    View All In Progress Tasks
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Button 
                  className="w-full justify-start" 
                  variant="outline"
                  onClick={() => navigate('/tasks')}
                >
                  <CheckSquare className="h-4 w-4 mr-2" />
                  View All Tasks
                </Button>
                <Button 
                  className="w-full justify-start" 
                  variant="outline"
                  onClick={() => navigate('/projects')}
                >
                  <FolderOpen className="h-4 w-4 mr-2" />
                  Manage Projects
                </Button>
                <Button 
                  className="w-full justify-start" 
                  variant="outline"
                  onClick={() => navigate('/employees')}
                >
                  <Users className="h-4 w-4 mr-2" />
                  Team Management
                </Button>
                <Button 
                  className="w-full justify-start" 
                  variant="outline"
                  onClick={() => navigate('/invoices')}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Create Invoice
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Index;
