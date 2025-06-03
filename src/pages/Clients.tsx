
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import Navigation from '@/components/Navigation';
import { useInvitations } from '@/hooks/useInvitations';

interface Client {
  id: string;
  name: string;
  email: string;
  company: string | null;
  phone: string | null;
  created_at: string;
  updated_at: string;
}

const Clients = () => {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [sendInviteEmail, setSendInviteEmail] = useState(true);
  const [newClient, setNewClient] = useState({
    name: '',
    email: '',
    company: '',
    phone: ''
  });

  const { sendInvitation } = useInvitations();

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data as Client[];
    }
  });

  const addClientMutation = useMutation({
    mutationFn: async (clientData: typeof newClient) => {
      const { data, error } = await supabase
        .from('clients')
        .insert([clientData])
        .select()
        .single();
      
      if (error) throw error;

      // Send invitation email if enabled and not editing
      if (sendInviteEmail && !editingClient) {
        try {
          await sendInvitation.mutateAsync({
            email: clientData.email,
            role: 'client',
            client_id: data.id,
            employee_data: {
              name: clientData.name,
              company: clientData.company || '',
              phone: clientData.phone || ''
            }
          });
          console.log('Client invitation sent successfully');
        } catch (inviteError) {
          console.log('Failed to send client invitation:', inviteError);
          // Don't throw error here as client was created successfully
        }
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      setNewClient({ name: '', email: '', company: '', phone: '' });
      setSendInviteEmail(true);
      setIsDialogOpen(false);
      toast.success(editingClient ? 'Client updated successfully!' : 'Client created and invitation sent!');
    },
    onError: (error) => {
      toast.error('Failed to create client: ' + error.message);
    }
  });

  const updateClientMutation = useMutation({
    mutationFn: async ({ id, ...updateData }: Partial<Client> & { id: string }) => {
      const { data, error } = await supabase
        .from('clients')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      setEditingClient(null);
      setSendInviteEmail(true);
      setIsDialogOpen(false);
      toast.success('Client updated successfully!');
    },
    onError: (error) => {
      toast.error('Failed to update client: ' + error.message);
    }
  });

  const deleteClientMutation = useMutation({
    mutationFn: async (clientId: string) => {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', clientId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success('Client deleted successfully!');
    },
    onError: (error) => {
      toast.error('Failed to delete client: ' + error.message);
    }
  });

  const handleSubmit = () => {
    if (editingClient) {
      updateClientMutation.mutate({ id: editingClient.id, ...newClient });
    } else {
      if (!newClient.name || !newClient.email) {
        toast.error('Please fill in all required fields');
        return;
      }
      addClientMutation.mutate(newClient);
    }
  };

  const handleEdit = (client: Client) => {
    setEditingClient(client);
    setNewClient({
      name: client.name,
      email: client.email,
      company: client.company || '',
      phone: client.phone || ''
    });
    setSendInviteEmail(false); // Don't send invite when editing
    setIsDialogOpen(true);
  };

  const handleDelete = (clientId: string) => {
    if (window.confirm('Are you sure you want to delete this client?')) {
      deleteClientMutation.mutate(clientId);
    }
  };

  const resetForm = () => {
    setNewClient({ name: '', email: '', company: '', phone: '' });
    setEditingClient(null);
    setSendInviteEmail(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <Navigation />
        <div className="flex items-center justify-center py-8">
          <div className="text-lg">Loading clients...</div>
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
            <h1 className="text-3xl font-bold text-gray-900">Clients</h1>
            <p className="text-gray-600 mt-2">Manage your clients and their access to the platform</p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" />
                Add Client
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editingClient ? 'Edit Client' : 'Add New Client'}</DialogTitle>
                <DialogDescription>
                  {editingClient ? 'Update client information.' : 'Add a new client. An invitation email will be sent automatically for platform access.'}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={newClient.name}
                    onChange={(e) => setNewClient({...newClient, name: e.target.value})}
                    placeholder="Enter client name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newClient.email}
                    onChange={(e) => setNewClient({...newClient, email: e.target.value})}
                    placeholder="Enter email address"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company">Company</Label>
                  <Input
                    id="company"
                    value={newClient.company}
                    onChange={(e) => setNewClient({...newClient, company: e.target.value})}
                    placeholder="Enter company name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={newClient.phone}
                    onChange={(e) => setNewClient({...newClient, phone: e.target.value})}
                    placeholder="Enter phone number"
                  />
                </div>
                {!editingClient && (
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="sendInvite"
                      checked={sendInviteEmail}
                      onChange={(e) => setSendInviteEmail(e.target.checked)}
                      className="rounded"
                    />
                    <Label htmlFor="sendInvite" className="text-sm">
                      Send password setup invitation email
                    </Label>
                  </div>
                )}
                <Button 
                  onClick={handleSubmit} 
                  className="w-full"
                  disabled={addClientMutation.isPending || updateClientMutation.isPending}
                >
                  {addClientMutation.isPending || updateClientMutation.isPending 
                    ? (editingClient ? 'Updating...' : 'Creating...') 
                    : (editingClient ? 'Update Client' : 'Create Client')}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Clients</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell className="font-medium">{client.name}</TableCell>
                    <TableCell>{client.email}</TableCell>
                    <TableCell>{client.company || 'N/A'}</TableCell>
                    <TableCell>{client.phone || 'N/A'}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(client)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(client.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {clients.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No clients found. Add your first client to get started.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Clients;
