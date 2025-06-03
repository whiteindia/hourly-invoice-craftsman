
import React from 'react';
import Navigation from '@/components/Navigation';
import RolesManagement from '@/components/RolesManagement';

const Roles = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <Navigation />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Roles Management</h1>
          <p className="text-gray-600 mt-2">Manage system roles and their permissions</p>
        </div>
        <RolesManagement />
      </div>
    </div>
  );
};

export default Roles;
