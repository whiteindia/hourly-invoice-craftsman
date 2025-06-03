import React, { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  DollarSign, 
  Users, 
  FolderOpen, 
  CheckSquare, 
  Clock,
  TrendingUp,
  Calendar,
  Play,
  FileText,
  Activity
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import Navigation from '@/components/Navigation';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const Index = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, userRole } = useAuth();

  console.log('Dashboard - Current user:', user?.email, 'Role:', userRole);

  // Set up real-time subscription for activity feed
  useEffect(() => {
    const channel = supabase
      .channel('activity-feed-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'activity_feed'
        },
        () => {
          // Invalidate activity feed query to refetch data
          queryClient.invalidateQueries({ queryKey: ['activity-feed'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Get running tasks (tasks with active time entries)
  const { data: runningTasks = [], error: runningTasksError } = useQuery({
    queryKey: ['running-tasks'],
    queryFn: async () => {
      console.log('Fetching running tasks...');
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
      
      if (error) {
        console.error('Running tasks error:', error);
        throw error;
      }
      console.log('Running tasks data:', data);
      return data || [];
    }
  });

  // Get summary statistics
  const { data: stats, error: statsError } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      console.log('Fetching dashboard stats...');
      const [clientsRes, projectsRes, tasksRes, paymentsRes] = await Promise.all([
        supabase.from('clients').select('id', { count: 'exact' }),
        supabase.from('projects').select('id', { count: 'exact' }),
        supabase.from('tasks').select('id', { count: 'exact' }),
        supabase.from('payments').select('amount')
      ]);

      console.log('Stats responses:', {
        clients: clientsRes,
        projects: projectsRes,
        tasks: tasksRes,
        payments: paymentsRes
      });

      if (clientsRes.error) console.error('Clients error:', clientsRes.error);
      if (projectsRes.error) console.error('Projects error:', projectsRes.error);
      if (tasksRes.error) console.error('Tasks error:', tasksRes.error);
      if (paymentsRes.error) console.error('Payments error:', paymentsRes.error);

      const totalRevenue = paymentsRes.data?.reduce((sum, payment) => sum + payment.amount, 0) || 0;

      const result = {
        clients: clientsRes.count || 0,
        projects: projectsRes.count || 0,
        tasks: tasksRes.count || 0,
        revenue: totalRevenue
      };

      console.log('Dashboard stats result:', result);
      return result;
    }
  });

  // Get projects with upcoming deadlines (this week and next week)
  const { data: upcomingProjects = [], error: upcomingProjectsError } = useQuery({
    queryKey: ['upcoming-projects'],
    queryFn: async () => {
      console.log('Fetching upcoming projects...');
      const today = new Date();
      const nextWeek = new Date(today);
      nextWeek.setDate(today.getDate() + 14); // Next 2 weeks

      const { data, error } = await supabase
        .from('projects')
        .select(`
          id,
          name,
          type,
          hourly_rate,
          project_amount,
          total_hours,
          status,
          deadline,
          brd_file_url,
          clients (name)
        `)
        .eq('status', 'Active')
        .not('deadline', 'is', null)
        .gte('deadline', today.toISOString().split('T')[0])
        .lte('deadline', nextWeek.toISOString().split('T')[0])
        .order('deadline', { ascending: true })
        .limit(5);
      
      if (error) {
        console.error('Upcoming projects error:', error);
        throw error;
      }
      console.log('Upcoming projects data:', data);
      return data || [];
    }
  });

  // Get activity feed with better error handling and manual join
  const { data: activityFeed = [], error: activityError, isLoading: activityLoading } = useQuery({
    queryKey: ['activity-feed'],
    queryFn: async () => {
      console.log('Fetching activity feed...');
      
      // First get the activity feed data
      const { data: activities, error: activitiesError } = await supabase
        .from('activity_feed')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (activitiesError) {
        console.error('Activity feed error:', activitiesError);
        throw activitiesError;
      }

      // Then get profile data for the users
      if (activities && activities.length > 0) {
        const userIds = [...new Set(activities.map(activity => activity.user_id))];
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', userIds);

        if (profilesError) {
          console.error('Profiles error:', profilesError);
          // Don't throw here, just continue without profile data
        }

        // Manually join the data
        const activitiesWithProfiles = activities.map(activity => ({
          ...activity,
          profiles: profiles?.find(profile => profile.id === activity.user_id) || null
        }));

        console.log('Activity feed data with profiles:', activitiesWithProfiles);
        return activitiesWithProfiles;
      }

      console.log('Activity feed data:', activities);
      return activities || [];
    }
  });

  // Log all errors for debugging
  useEffect(() => {
    if (runningTasksError) console.error('Running tasks error:', runningTasksError);
    if (statsError) console.error('Stats error:', statsError);
    if (upcomingProjectsError) console.error('Upcoming projects error:', upcomingProjectsError);
    if (activityError) console.error('Activity error:', activityError);
  }, [runningTasksError, statsError, upcomingProjectsError, activityError]);

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

  const handleBRDClick = (brdUrl: string) => {
    if (brdUrl) {
      window.open(brdUrl, '_blank');
    }
  };

  const getTimeUntilDeadline = (deadline: string) => {
    const deadlineDate = new Date(deadline);
    const today = new Date();
    const diffTime = deadlineDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays <= 7) return `${diffDays} days`;
    return `${Math.ceil(diffDays / 7)} weeks`;
  };

  const formatActivityTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const getActivityIcon = (actionType: string) => {
    switch (actionType) {
      case 'created':
        return '✨';
      case 'updated':
        return '📝';
      case 'completed':
        return '✅';
      case 'logged_time':
        return '⏱️';
      case 'timer_started':
        return '▶️';
      case 'timer_stopped':
        return '⏹️';
      case 'logged_in':
        return '🔑';
      case 'status_changed_to_in_progress':
        return '🚀';
      case 'status_changed_to_completed':
        return '🎉';
      case 'status_changed_to_not_started':
        return '📋';
      default:
        return '📌';
    }
  };

  return (
    <Navigation>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-2">Welcome back!</p>
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
              {statsError && <p className="text-xs text-red-500 mt-1">Error loading data</p>}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
              <FolderOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.projects || 0}</div>
              {statsError && <p className="text-xs text-red-500 mt-1">Error loading data</p>}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
              <CheckSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.tasks || 0}</div>
              {statsError && <p className="text-xs text-red-500 mt-1">Error loading data</p>}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{stats?.revenue || 0}</div>
              {statsError && <p className="text-xs text-red-500 mt-1">Error loading data</p>}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
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

          {/* Upcoming Deadlines */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="h-5 w-5 mr-2 text-orange-600" />
                Upcoming Deadlines
              </CardTitle>
            </CardHeader>
            <CardContent>
              {upcomingProjects.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No upcoming deadlines</p>
                  <p className="text-sm">Projects with deadlines will appear here</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {upcomingProjects.map((project: any) => (
                    <div
                      key={project.id}
                      className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-gray-900">{project.name}</h4>
                        <Badge variant="outline">{project.type}</Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">{project.clients.name}</p>
                      
                      <div className="flex items-center justify-between">
                        {project.brd_file_url ? (
                          <div 
                            className="flex items-center space-x-2 cursor-pointer text-blue-600 hover:text-blue-800"
                            onClick={() => handleBRDClick(project.brd_file_url)}
                          >
                            <FileText className="h-4 w-4" />
                            <span className="text-sm font-medium">View BRD</span>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-1">
                            <TrendingUp className="h-4 w-4 text-green-600" />
                            <span className="text-sm font-medium">₹{project.hourly_rate}/hr</span>
                          </div>
                        )}
                        <div className="flex items-center space-x-1">
                          <Clock className="h-4 w-4 text-orange-600" />
                          <span className="text-sm font-medium">{getTimeUntilDeadline(project.deadline)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => navigate('/projects')}
                  >
                    View All Projects
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Activity Feed */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Activity className="h-5 w-5 mr-2 text-purple-600" />
                Recent Activity
                {activityLoading && <span className="ml-2 text-sm text-gray-500">(Loading...)</span>}
                {activityError && <span className="ml-2 text-sm text-red-500">(Error)</span>}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activityError ? (
                <div className="text-center py-8 text-red-500">
                  <p>Error loading activity feed</p>
                  <p className="text-sm">{activityError.message}</p>
                </div>
              ) : activityFeed.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Activity className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No recent activity</p>
                  <p className="text-sm">Activity will appear here as team members work</p>
                </div>
              ) : (
                <ScrollArea className="h-96">
                  <div className="space-y-4 pr-4">
                    {activityFeed.map((activity: any) => (
                      <div key={activity.id} className="p-3 border rounded-lg bg-gray-50">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <span className="text-lg">{getActivityIcon(activity.action_type)}</span>
                              <p className="text-sm font-medium text-gray-900">
                                {activity.profiles?.full_name || 'Unknown User'}
                              </p>
                            </div>
                            <p className="text-sm text-gray-700">
                              {activity.description}
                            </p>
                            <p className="text-xs text-gray-600 mt-1">
                              {activity.entity_type} • {activity.entity_name}
                            </p>
                            {activity.comment && (
                              <p className="text-xs text-gray-500 mt-2 italic">
                                "{activity.comment}"
                              </p>
                            )}
                          </div>
                          <span className="text-xs text-gray-400 ml-2">
                            {formatActivityTime(activity.created_at)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Button 
                className="justify-start" 
                variant="outline"
                onClick={() => navigate('/tasks')}
              >
                <CheckSquare className="h-4 w-4 mr-2" />
                View All Tasks
              </Button>
              <Button 
                className="justify-start" 
                variant="outline"
                onClick={() => navigate('/projects')}
              >
                <FolderOpen className="h-4 w-4 mr-2" />
                Manage Projects
              </Button>
              <Button 
                className="justify-start" 
                variant="outline"
                onClick={() => navigate('/employees')}
              >
                <Users className="h-4 w-4 mr-2" />
                Team Management
              </Button>
              <Button 
                className="justify-start" 
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
    </Navigation>
  );
};

export default Index;
