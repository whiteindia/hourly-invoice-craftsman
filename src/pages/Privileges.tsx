
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Navigation from '@/components/Navigation';

const Privileges = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <Navigation />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Privileges</h1>
          <p className="text-gray-600 mt-2">Manage user privileges and permissions</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>User Privileges</CardTitle>
            <CardDescription>
              Configure access levels and permissions for different user roles
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-gray-500">
              Privileges management interface will be implemented here.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Privileges;
