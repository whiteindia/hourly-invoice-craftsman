import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, DollarSign, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import Navigation from '@/components/Navigation';
import { useAuth } from '@/contexts/AuthContext';
import { logActivity } from '@/utils/activityLogger';

interface Service {
  id: string;
  name: string;
  description: string | null;
  hourly_rate: number;
  created_at: string;
}

const Services = () => {
  const { userRole } = useAuth();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    hourly_rate: ''
  });

  const { data: services = [], isLoading } = useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Service[];
    }
  });

  const createServiceMutation = useMutation({
    mutationFn: async (serviceData: {
      name: string;
      description: string;
      hourly_rate: number;
    }) => {
      const { data, error } = await supabase
        .from('services')
        .insert([serviceData])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      resetForm();
      toast.success('Service created successfully!');
      
      // Log activity
      await logActivity({
        action_type: 'created',
        entity_type: 'service',
        entity_id: data.id,
        entity_name: data.name,
        description: `Created new service: ${data.name} with hourly rate ₹${data.hourly_rate}`,
        comment: `Hourly Rate: ₹${data.hourly_rate}`
      });
    },
    onError: (error) => {
      toast.error('Failed to create service: ' + error.message);
    }
  });

  const updateServiceMutation = useMutation({
    mutationFn: async ({ id, ...serviceData }: {
      id: string;
      name: string;
      description: string;
      hourly_rate: number;
    }) => {
      const { data, error } = await supabase
        .from('services')
        .update(serviceData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      resetForm();
      toast.success('Service updated successfully!');
      
      // Log activity
      await logActivity({
        action_type: 'updated',
        entity_type: 'service',
        entity_id: data.id,
        entity_name: data.name,
        description: `Updated service: ${data.name}`,
        comment: `New hourly rate: ₹${data.hourly_rate}`
      });
    },
    onError: (error) => {
      toast.error('Failed to update service: ' + error.message);
    }
  });

  const deleteServiceMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('services')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return id;
    },
    onSuccess: async (deletedId) => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      toast.success('Service deleted successfully!');
      
      // Log activity
      const deletedService = services.find(s => s.id === deletedId);
      if (deletedService) {
        await logActivity({
          action_type: 'deleted',
          entity_type: 'service',
          entity_id: deletedService.id,
          entity_name: deletedService.name,
          description: `Deleted service: ${deletedService.name}`,
          comment: `Previous hourly rate: ₹${deletedService.hourly_rate}`
        });
      }
    },
    onError: (error) => {
      toast.error('Failed to delete service: ' + error.message);
    }
  });

  const resetForm = () => {
    setFormData({ name: '', description: '', hourly_rate: '' });
    setEditingService(null);
    setIsDialogOpen(false);
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.hourly_rate) {
      toast.error('Please fill in required fields');
      return;
    }

    const serviceData = {
      name: formData.name,
      description: formData.description,
      hourly_rate: parseFloat(formData.hourly_rate)
    };

    if (editingService) {
      updateServiceMutation.mutate({ id: editingService.id, ...serviceData });
    } else {
      createServiceMutation.mutate(serviceData);
    }
  };

  const handleEdit = (service: Service) => {
    setEditingService(service);
    setFormData({
      name: service.name,
      description: service.description || '',
      hourly_rate: service.hourly_rate.toString()
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this service?')) {
      deleteServiceMutation.mutate(id);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <Navigation />
        <div className="flex items-center justify-center py-8">
          <div className="text-lg">Loading services...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <Navigation>
        <div className="mb-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Services</h1>
              <p className="text-gray-600 mt-2">Manage your service offerings and hourly rates</p>
            </div>
            
            {userRole === 'admin' && (
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => setEditingService(null)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Service
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {editingService ? 'Edit Service' : 'Add New Service'}
                    </DialogTitle>
                    <DialogDescription>
                      {editingService ? 'Update service details' : 'Create a new service offering with hourly rate'}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="serviceName">Service Name</Label>
                      <Input
                        id="serviceName"
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        placeholder="e.g., DevOps, Content Writing"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData({...formData, description: e.target.value})}
                        placeholder="Describe the service..."
                        rows={3}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="hourlyRate">Hourly Rate (₹)</Label>
                      <Input
                        id="hourlyRate"
                        type="number"
                        step="0.01"
                        value={formData.hourly_rate}
                        onChange={(e) => setFormData({...formData, hourly_rate: e.target.value})}
                        placeholder="75.00"
                      />
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" onClick={resetForm}>
                        Cancel
                      </Button>
                      <Button 
                        onClick={handleSubmit}
                        disabled={createServiceMutation.isPending || updateServiceMutation.isPending}
                      >
                        {editingService ? 'Update' : 'Create'} Service
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((service) => (
              <Card key={service.id} className="hover:shadow-lg transition-shadow duration-200">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">{service.name}</CardTitle>
                    {userRole === 'admin' && (
                      <div className="flex space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(service)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(service.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    )}
                  </div>
                  {service.description && (
                    <CardDescription>{service.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className="flex items-center space-x-1">
                      <DollarSign className="h-3 w-3" />
                      <span>₹{service.hourly_rate}/hour</span>
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </Navigation>
    </div>
  );
};

export default Services;
