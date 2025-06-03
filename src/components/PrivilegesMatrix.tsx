
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];
type CrudOperation = Database['public']['Enums']['crud_operation'];

interface Privilege {
  id: string;
  role: AppRole;
  page_name: string;
  operation: CrudOperation;
  allowed: boolean;
}

const PrivilegesMatrix = () => {
  const [privileges, setPrivileges] = useState<Privilege[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const roles: AppRole[] = ['admin', 'manager', 'teamlead', 'associate', 'accountant'];
  const pages = ['dashboard', 'clients', 'employees', 'projects', 'tasks', 'invoices', 'payments', 'services', 'wages'];
  const operations: CrudOperation[] = ['create', 'read', 'update', 'delete'];

  useEffect(() => {
    fetchPrivileges();
  }, []);

  const fetchPrivileges = async () => {
    try {
      const { data, error } = await supabase
        .from('role_privileges')
        .select('*')
        .order('role')
        .order('page_name')
        .order('operation');

      if (error) throw error;
      setPrivileges(data || []);
    } catch (error) {
      console.error('Error fetching privileges:', error);
      toast.error('Failed to fetch privileges');
    } finally {
      setLoading(false);
    }
  };

  const updatePrivilege = async (id: string, allowed: boolean) => {
    try {
      const { error } = await supabase
        .from('role_privileges')
        .update({ allowed, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      setPrivileges(prev => 
        prev.map(p => p.id === id ? { ...p, allowed } : p)
      );
      
      toast.success('Privilege updated successfully');
    } catch (error) {
      console.error('Error updating privilege:', error);
      toast.error('Failed to update privilege');
    }
  };

  const getPrivilege = (role: AppRole, page: string, operation: CrudOperation) => {
    return privileges.find(p => p.role === role && p.page_name === page && p.operation === operation);
  };

  const saveAllChanges = async () => {
    setSaving(true);
    try {
      // This is just a confirmation since changes are saved immediately
      toast.success('All privileges are up to date');
    } catch (error) {
      console.error('Error saving changes:', error);
      toast.error('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-lg">Loading privileges...</div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Role Privileges Matrix</CardTitle>
        <CardDescription>
          Configure CRUD permissions for each role and page. Changes are saved automatically.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {pages.map(page => (
            <div key={page} className="border rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-4 capitalize">{page}</h3>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="text-left p-2 border-b font-medium">Role</th>
                      {operations.map(operation => (
                        <th key={operation} className="text-center p-2 border-b font-medium capitalize">
                          {operation}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {roles.map(role => (
                      <tr key={role} className="hover:bg-gray-50">
                        <td className="p-2 border-b font-medium capitalize">{role}</td>
                        {operations.map(operation => {
                          const privilege = getPrivilege(role, page, operation);
                          return (
                            <td key={operation} className="p-2 border-b text-center">
                              <Checkbox
                                checked={privilege?.allowed || false}
                                onCheckedChange={(checked) => {
                                  if (privilege) {
                                    updatePrivilege(privilege.id, checked as boolean);
                                  }
                                }}
                                disabled={!privilege}
                              />
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
          
          <div className="flex justify-end pt-4">
            <Button onClick={saveAllChanges} disabled={saving}>
              {saving ? 'Saving...' : 'Refresh Status'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PrivilegesMatrix;
