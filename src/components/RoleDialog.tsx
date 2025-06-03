
import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];
type CrudOperation = Database['public']['Enums']['crud_operation'];

interface Privilege {
  id?: string;
  role: AppRole;
  page_name: string;
  operation: CrudOperation;
  allowed: boolean;
}

interface RoleDialogProps {
  open: boolean;
  onClose: () => void;
  role: AppRole | null;
  isEditing: boolean;
}

const RoleDialog: React.FC<RoleDialogProps> = ({ open, onClose, role, isEditing }) => {
  const [roleName, setRoleName] = useState('');
  const [privileges, setPrivileges] = useState<Privilege[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const pages = ['dashboard', 'clients', 'employees', 'projects', 'tasks', 'invoices', 'payments', 'services', 'wages'];
  const operations: CrudOperation[] = ['create', 'read', 'update', 'delete'];

  useEffect(() => {
    if (open) {
      if (isEditing && role) {
        setRoleName(role);
        fetchRolePrivileges(role);
      } else {
        setRoleName('');
        initializeDefaultPrivileges();
      }
    }
  }, [open, isEditing, role]);

  const fetchRolePrivileges = async (roleToFetch: AppRole) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('role_privileges')
        .select('*')
        .eq('role', roleToFetch)
        .order('page_name')
        .order('operation');

      if (error) throw error;
      setPrivileges(data || []);
    } catch (error) {
      console.error('Error fetching privileges:', error);
      toast.error('Failed to fetch role privileges');
    } finally {
      setLoading(false);
    }
  };

  const initializeDefaultPrivileges = () => {
    const defaultPrivileges: Privilege[] = [];
    pages.forEach(page => {
      operations.forEach(operation => {
        defaultPrivileges.push({
          role: 'associate', // Default role, will be updated when user enters role name
          page_name: page,
          operation,
          allowed: false
        });
      });
    });
    setPrivileges(defaultPrivileges);
  };

  const getPrivilege = (page: string, operation: CrudOperation) => {
    return privileges.find(p => p.page_name === page && p.operation === operation);
  };

  const updatePrivilege = (page: string, operation: CrudOperation, allowed: boolean) => {
    setPrivileges(prev => 
      prev.map(p => 
        p.page_name === page && p.operation === operation 
          ? { ...p, allowed } 
          : p
      )
    );
  };

  const handleSave = async () => {
    if (!roleName.trim()) {
      toast.error('Role name is required');
      return;
    }

    // Validate that the role name is one of the valid enum values
    const validRoles: AppRole[] = ['admin', 'manager', 'teamlead', 'associate', 'accountant'];
    if (!validRoles.includes(roleName as AppRole)) {
      toast.error(`Role must be one of: ${validRoles.join(', ')}`);
      return;
    }

    setSaving(true);
    try {
      if (isEditing && role) {
        // Update existing privileges
        for (const privilege of privileges) {
          if (privilege.id) {
            const { error } = await supabase
              .from('role_privileges')
              .update({ 
                allowed: privilege.allowed, 
                updated_at: new Date().toISOString() 
              })
              .eq('id', privilege.id);

            if (error) throw error;
          }
        }
        toast.success('Role updated successfully');
      } else {
        // First, check if privileges already exist for this role
        const { data: existingPrivileges, error: checkError } = await supabase
          .from('role_privileges')
          .select('*')
          .eq('role', roleName as AppRole);

        if (checkError) throw checkError;

        if (existingPrivileges && existingPrivileges.length > 0) {
          toast.error(`Role ${roleName} already exists. Please edit the existing role instead.`);
          return;
        }

        // Create new role privileges
        const privilegesToInsert = privileges.map(p => ({
          role: roleName as AppRole,
          page_name: p.page_name,
          operation: p.operation,
          allowed: p.allowed
        }));

        const { error } = await supabase
          .from('role_privileges')
          .insert(privilegesToInsert);

        if (error) throw error;
        toast.success('Role created successfully');
      }

      onClose();
    } catch (error) {
      console.error('Error saving role:', error);
      toast.error('Failed to save role');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? `Edit Role: ${role}` : 'Create New Role'}
          </DialogTitle>
          <DialogDescription>
            Configure role permissions for different pages and operations. Valid roles: admin, manager, teamlead, associate, accountant
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="roleName">Role Name</Label>
            <Input
              id="roleName"
              value={roleName}
              onChange={(e) => setRoleName(e.target.value)}
              placeholder="Enter role name (admin, manager, teamlead, associate, accountant)"
              disabled={isEditing}
              className={isEditing ? "bg-gray-100" : ""}
            />
            <p className="text-sm text-gray-500">
              Must be one of: admin, manager, teamlead, associate, accountant
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center p-8">
              <div className="text-lg">Loading privileges...</div>
            </div>
          ) : (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">Privileges Matrix</h3>
              {pages.map(page => (
                <div key={page} className="border rounded-lg p-4">
                  <h4 className="text-md font-semibold mb-4 capitalize">{page}</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr>
                          <th className="text-left p-2 border-b font-medium">Operation</th>
                          <th className="text-center p-2 border-b font-medium">Allowed</th>
                        </tr>
                      </thead>
                      <tbody>
                        {operations.map(operation => {
                          const privilege = getPrivilege(page, operation);
                          return (
                            <tr key={operation} className="hover:bg-gray-50">
                              <td className="p-2 border-b font-medium capitalize">{operation}</td>
                              <td className="p-2 border-b text-center">
                                <Checkbox
                                  checked={privilege?.allowed || false}
                                  onCheckedChange={(checked) => {
                                    updatePrivilege(page, operation, checked as boolean);
                                  }}
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : isEditing ? 'Update Role' : 'Create Role'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RoleDialog;
