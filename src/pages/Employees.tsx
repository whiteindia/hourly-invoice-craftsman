import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import Navigation from '@/components/Navigation';
import EmployeeServicesSelect from '@/components/EmployeeServicesSelect';
import { useRoles } from '@/hooks/useRoles';

interface Employee {
  id: string;
  name: string;
  email: string;
  contact_number: string | null;
  role: string;
  created_at: string;
  updated_at: string;
}

interface EmployeeService {
  employee_id: string;
  service_id: string;
}

interface Service {
  id: string;
  name: string;
}

const Employees = () => {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [newEmployee, setNewEmployee] = useState({
    name: '',
    email: '',
    contact_number: '',
    role: 'associate'
  });

  // Fetch dynamic roles
  const { roles, loading: rolesLoading } = useRoles();

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data as Employee[];
    }
  });

  // Get employee services - simplified query
  const { data: employeeServices = [] } = useQuery({
    queryKey: ['employee-services'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('employee_services')
          .select('employee_id, service_id');
        
        if (error) throw error;
        return data as EmployeeService[];
      } catch (error) {
        console.log('Employee services query failed:', error);
        return [];
      }
    }
  });

  // Get all services for mapping
  const { data: services = [] } = useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('services')
        .select('id, name');
      
      if (error) throw error;
      return data as Service[];
    }
  });

  const addEmployeeMutation = useMutation({
    mutationFn: async (employeeData: typeof newEmployee) => {
      const { data, error } = await supabase
        .from('employees')
        .insert([employeeData])
        .select()
        .single();
      
      if (error) throw error;
      
      // Add employee services if any selected
      if (selectedServices.length > 0) {
        try {
          const serviceInserts = selectedServices.map(serviceId => ({
            employee_id: data.id,
            service_id: serviceId
          }));
          
          const { error: servicesError } = await supabase
            .from('employee_services')
            .insert(serviceInserts);
          
          if (servicesError) throw servicesError;
        } catch (servicesError) {
          console.log('Failed to add employee services:', servicesError);
        }
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['employee-services'] });
      setNewEmployee({ name: '', email: '', contact_number: '', role: 'associate' });
      setSelectedServices([]);
      setIsDialogOpen(false);
      toast.success('Employee created successfully!');
    },
    onError: (error) => {
      toast.error('Failed to create employee: ' + error.message);
    }
  });

  const updateEmployeeMutation = useMutation({
    mutationFn: async ({ id, ...updateData }: Partial<Employee> & { id: string }) => {
      const { data, error } = await supabase
        .from('employees')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      
      // Update employee services
      try {
        // First delete existing services
        await supabase
          .from('employee_services')
          .delete()
          .eq('employee_id', id);
        
        // Then add new services
        if (selectedServices.length > 0) {
          const serviceInserts = selectedServices.map(serviceId => ({
            employee_id: id,
            service_id: serviceId
          }));
          
          const { error: servicesError } = await supabase
            .from('employee_services')
            .insert(serviceInserts);
          
          if (servicesError) throw servicesError;
        }
      } catch (servicesError) {
        console.log('Failed to update employee services:', servicesError);
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['employee-services'] });
      setEditingEmployee(null);
      setSelectedServices([]);
      setIsDialogOpen(false);
      toast.success('Employee updated successfully!');
    },
    onError: (error) => {
      toast.error('Failed to update employee: ' + error.message);
    }
  });

  const deleteEmployeeMutation = useMutation({
    mutationFn: async (employeeId: string) => {
      const { error } = await supabase
        .from('employees')
        .delete()
        .eq('id', employeeId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['employee-services'] });
      toast.success('Employee deleted successfully!');
    },
    onError: (error) => {
      toast.error('Failed to delete employee: ' + error.message);
    }
  });

  const handleSubmit = () => {
    if (editingEmployee) {
      updateEmployeeMutation.mutate({ id: editingEmployee.id, ...newEmployee });
    } else {
      if (!newEmployee.name || !newEmployee.email) {
        toast.error('Please fill in all required fields');
        return;
      }
      addEmployeeMutation.mutate(newEmployee);
    }
  };

  const handleEdit = async (employee: Employee) => {
    setEditingEmployee(employee);
    setNewEmployee({
      name: employee.name,
      email: employee.email,
      contact_number: employee.contact_number || '',
      role: employee.role
    });
    
    // Load employee services
    const empServices = employeeServices
      .filter(es => es.employee_id === employee.id)
      .map(es => es.service_id);
    setSelectedServices(empServices);
    
    setIsDialogOpen(true);
  };

  const handleDelete = (employeeId: string) => {
    if (window.confirm('Are you sure you want to delete this employee?')) {
      deleteEmployeeMutation.mutate(employeeId);
    }
  };

  const resetForm = () => {
    setNewEmployee({ name: '', email: '', contact_number: '', role: roles[0] || 'associate' });
    setSelectedServices([]);
    setEditingEmployee(null);
  };

  const getEmployeeServices = (employeeId: string) => {
    const empServiceIds = employeeServices
      .filter(es => es.employee_id === employeeId)
      .map(es => es.service_id);
    
    const serviceNames = empServiceIds
      .map(serviceId => services.find(s => s.id === serviceId)?.name)
      .filter(Boolean);
    
    return serviceNames.join(', ') || 'None';
  };

  if (isLoading || rolesLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <Navigation />
        <div className="flex items-center justify-center py-8">
          <div className="text-lg">Loading employees...</div>
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
            <h1 className="text-3xl font-bold text-gray-900">Employees</h1>
            <p className="text-gray-600 mt-2">Manage your team members, their roles, and services</p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" />
                Add Employee
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editingEmployee ? 'Edit Employee' : 'Add New Employee'}</DialogTitle>
                <DialogDescription>
                  {editingEmployee ? 'Update employee information and services.' : 'Add a new team member with their services.'}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={newEmployee.name}
                    onChange={(e) => setNewEmployee({...newEmployee, name: e.target.value})}
                    placeholder="Enter employee name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newEmployee.email}
                    onChange={(e) => setNewEmployee({...newEmployee, email: e.target.value})}
                    placeholder="Enter email address"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact">Contact Number</Label>
                  <Input
                    id="contact"
                    value={newEmployee.contact_number}
                    onChange={(e) => setNewEmployee({...newEmployee, contact_number: e.target.value})}
                    placeholder="Enter contact number"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select value={newEmployee.role} onValueChange={(value) => setNewEmployee({...newEmployee, role: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map((role) => (
                        <SelectItem key={role} value={role} className="capitalize">
                          {role}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <EmployeeServicesSelect 
                  selectedServices={selectedServices}
                  onServicesChange={setSelectedServices}
                />
                <Button 
                  onClick={handleSubmit} 
                  className="w-full"
                  disabled={addEmployeeMutation.isPending || updateEmployeeMutation.isPending}
                >
                  {addEmployeeMutation.isPending || updateEmployeeMutation.isPending 
                    ? (editingEmployee ? 'Updating...' : 'Creating...') 
                    : (editingEmployee ? 'Update Employee' : 'Create Employee')}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Employees</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Services</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map((employee) => (
                  <TableRow key={employee.id}>
                    <TableCell className="font-medium">{employee.name}</TableCell>
                    <TableCell>{employee.email}</TableCell>
                    <TableCell>{employee.contact_number || 'N/A'}</TableCell>
                    <TableCell>
                      <span className="capitalize">{employee.role}</span>
                    </TableCell>
                    <TableCell className="max-w-48 truncate">
                      {getEmployeeServices(employee.id)}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(employee)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(employee.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {employees.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No employees found. Add your first team member to get started.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Employees;
