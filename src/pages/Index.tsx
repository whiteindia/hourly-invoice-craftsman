
import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, FolderOpen, Clock, FileText, DollarSign, TrendingUp } from 'lucide-react';

const Index = () => {
  // Mock data for dashboard metrics
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

  const quickActions = [
    {
      title: "Add New Client",
      description: "Register a new client for your consulting services",
      icon: Users,
      link: "/clients",
      color: "bg-blue-50 hover:bg-blue-100 border-blue-200"
    },
    {
      title: "Create Project",
      description: "Start a new project with hourly rates",
      icon: FolderOpen,
      link: "/projects",
      color: "bg-green-50 hover:bg-green-100 border-green-200"
    },
    {
      title: "Log Time",
      description: "Track hours spent on tasks",
      icon: Clock,
      link: "/tasks",
      color: "bg-purple-50 hover:bg-purple-100 border-purple-200"
    },
    {
      title: "Generate Invoice",
      description: "Create invoices from logged hours",
      icon: FileText,
      link: "/invoices",
      color: "bg-orange-50 hover:bg-orange-100 border-orange-200"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
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
            <nav className="hidden md:flex space-x-8">
              <Link to="/clients" className="text-gray-600 hover:text-blue-600 transition-colors">Clients</Link>
              <Link to="/projects" className="text-gray-600 hover:text-blue-600 transition-colors">Projects</Link>
              <Link to="/tasks" className="text-gray-600 hover:text-blue-600 transition-colors">Tasks</Link>
              <Link to="/invoices" className="text-gray-600 hover:text-blue-600 transition-colors">Invoices</Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome back!</h2>
          <p className="text-lg text-gray-600">Here's an overview of your consulting business</p>
        </div>

        {/* Metrics Grid */}
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

        {/* Recent Activity */}
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
      </main>
    </div>
  );
};

export default Index;
