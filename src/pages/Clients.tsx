
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Mail, Phone, Building, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const Clients = () => {
  const [clients, setClients] = useState([
    {
      id: 1,
      name: "TechCorp Solutions",
      email: "contact@techcorp.com",
      phone: "+1 (555) 123-4567",
      company: "TechCorp Solutions",
      projects: 3
    },
    {
      id: 2,
      name: "StartupXYZ",
      email: "hello@startupxyz.com",
      phone: "+1 (555) 987-6543",
      company: "StartupXYZ Inc.",
      projects: 1
    },
    {
      id: 3,
      name: "LocalBiz",
      email: "info@localbiz.com",
      phone: "+1 (555) 456-7890",
      company: "Local Business LLC",
      projects: 2
    }
  ]);

  const [newClient, setNewClient] = useState({
    name: '',
    email: '',
    phone: '',
    company: ''
  });

  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleAddClient = () => {
    if (!newClient.name || !newClient.email) {
      toast.error('Please fill in required fields');
      return;
    }

    const client = {
      id: clients.length + 1,
      ...newClient,
      projects: 0
    };

    setClients([...clients, client]);
    setNewClient({ name: '', email: '', phone: '', company: '' });
    setIsDialogOpen(false);
    toast.success('Client added successfully!');
  };

  const handleDeleteClient = (id: number) => {
    setClients(clients.filter(client => client.id !== id));
    toast.success('Client deleted successfully!');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Clients</h1>
            <p className="text-gray-600 mt-2">Manage your client relationships</p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" />
                Add Client
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Client</DialogTitle>
                <DialogDescription>
                  Enter the client details to add them to your system.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={newClient.name}
                    onChange={(e) => setNewClient({...newClient, name: e.target.value})}
                    placeholder="Client name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newClient.email}
                    onChange={(e) => setNewClient({...newClient, email: e.target.value})}
                    placeholder="client@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={newClient.phone}
                    onChange={(e) => setNewClient({...newClient, phone: e.target.value})}
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company">Company</Label>
                  <Input
                    id="company"
                    value={newClient.company}
                    onChange={(e) => setNewClient({...newClient, company: e.target.value})}
                    placeholder="Company name"
                  />
                </div>
                <Button onClick={handleAddClient} className="w-full">
                  Add Client
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {clients.map((client) => (
            <Card key={client.id} className="hover:shadow-lg transition-shadow duration-200">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{client.name}</CardTitle>
                    <CardDescription>{client.company}</CardDescription>
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="ghost" size="sm">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleDeleteClient(client.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <Mail className="h-4 w-4" />
                    <span>{client.email}</span>
                  </div>
                  {client.phone && (
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Phone className="h-4 w-4" />
                      <span>{client.phone}</span>
                    </div>
                  )}
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <Building className="h-4 w-4" />
                    <span>{client.projects} active projects</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Clients;
