import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, FolderOpen, Clock, FileText, DollarSign, TrendingUp, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import Navigation from '@/components/Navigation';

const Index = () => {
  const { user, userRole, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    toast.success('Successfully signed out');
  };

  // Mock data for dashboard metrics - in real app, fetch based on user role
  const metrics = [
    {
      title: "Total Clients",
      value: "12",
      icon: Users,
      color: "text-blue-600"
    },
    {
      title: "Active Projects",
      value: "8",
      icon: FolderOpen,
      color: "text-green-600"
    },
    {
      title: "Hours This Month",
      value: "127.5",
      icon: Clock,
      color: "text-purple-600"
    },
    {
      title: "Pending Invoices",
      value: "$8,450",
      icon: FileText,
      color: "text-orange-600"
    }
  ];

  // Role-based quick actions
  const getQuickActions = () => {
    const baseActions = [
      {
        title: "View Projects",
        description: userRole === 'admin' ? "Manage all projects" : "View your projects",
        icon: FolderOpen,
        link: "/projects",
        color: "bg-green-50 hover:bg-green-100 border-green-200"
      },
      {
        title: "View Tasks",
        description: userRole === 'admin' ? "Manage all tasks" : "View your tasks",
        icon: Clock,
        link: "/tasks",
        color: "bg-purple-50 hover:bg-purple-100 border-purple-200"
      },
      {
        title: "View Invoices",
        description: userRole === 'admin' ? "Manage all invoices" : "View your invoices",
        icon: FileText,
        link: "/invoices",
        color: "bg-orange-50 hover:bg-orange-100 border-orange-200"
      }
    ];

    if (userRole === 'admin') {
      baseActions.unshift({
        title: "Manage Clients",
        description: "Add and manage clients",
        icon: Users,
        link: "/clients",
        color: "bg-blue-50 hover:bg-blue-100 border-blue-200"
      });
    }

    return baseActions;
  };

  const quickActions = getQuickActions();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <Navigation />
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <div className="bg-blue-600 p-2 rounded-lg">
                <DollarSign className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">ConsultPro</h1>
                <p className="text-sm text-gray-600">Professional Invoicing System</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{user?.email}</p>
                <p className="text-xs text-gray-600 capitalize">{userRole} User</p>
              </div>
              <nav className="hidden md:flex space-x-8">
                {userRole === 'admin' && (
                  <Link to="/clients" className="text-gray-600 hover:text-blue-600 transition-colors">Clients</Link>
                )}
                <Link to="/projects" className="text-gray-600 hover:text-blue-600 transition-colors">Projects</Link>
                <Link to="/tasks" className="text-gray-600 hover:text-blue-600 transition-colors">Tasks</Link>
                <Link to="/invoices" className="text-gray-600 hover:text-blue-600 transition-colors">Invoices</Link>
              </nav>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleSignOut}
                className="flex items-center space-x-2"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign Out</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome back{userRole === 'admin' ? ', Admin' : ''}!
          </h2>
          <p className="text-lg text-gray-600">
            {userRole === 'admin' 
              ? "Here's an overview of your consulting business" 
              : "Here's an overview of your projects and activities"
            }
          </p>
        </div>

        {/* Metrics Grid - Show for admin users */}
        {userRole === 'admin' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {metrics.map((metric, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow duration-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">{metric.title}</p>
                      <p className="text-2xl font-bold text-gray-900">{metric.value}</p>
                    </div>
                    <metric.icon className={`h-8 w-8 ${metric.color}`} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Quick Actions */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {quickActions.map((action, index) => (
              <Link key={index} to={action.link}>
                <Card className={`${action.color} border-2 transition-all duration-200 cursor-pointer h-full`}>
                  <CardHeader className="text-center">
                    <action.icon className="h-12 w-12 mx-auto mb-2 text-gray-700" />
                    <CardTitle className="text-lg text-gray-900">{action.title}</CardTitle>
                    <CardDescription className="text-gray-600">{action.description}</CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Activity - Show for admin users */}
        {userRole === 'admin' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5" />
                <span>Recent Activity</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between py-2 border-b">
                  <div>
                    <p className="font-medium">DevOps consultation for TechCorp</p>
                    <p className="text-sm text-gray-600">4.5 hours logged</p>
                  </div>
                  <span className="text-green-600 font-medium">$450.00</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b">
                  <div>
                    <p className="font-medium">Marketing strategy for StartupXYZ</p>
                    <p className="text-sm text-gray-600">3 hours logged</p>
                  </div>
                  <span className="text-green-600 font-medium">$360.00</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <div>
                    <p className="font-medium">Business consulting for LocalBiz</p>
                    <p className="text-sm text-gray-600">2.5 hours logged</p>
                  </div>
                  <span className="text-green-600 font-medium">$250.00</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default Index;
