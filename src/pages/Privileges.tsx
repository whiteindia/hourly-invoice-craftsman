
import React from 'react';
import Navigation from '@/components/Navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const Privileges = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <Navigation />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Privileges Management</h1>
          <p className="text-gray-600 mt-2">Manage system privileges through role configuration</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Privileges Management</CardTitle>
            <CardDescription>
              Privileges are now managed through the Roles system for better organization and control.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              To manage user privileges, please use the Roles page where you can create, edit, and delete roles
              along with their specific permissions for each page and operation.
            </p>
            <Button onClick={() => navigate('/roles')}>
              Go to Roles Management
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Privileges;
