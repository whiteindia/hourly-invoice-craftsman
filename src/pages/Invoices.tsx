
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, FileText, Download, Eye, DollarSign } from 'lucide-react';
import { toast } from 'sonner';

const Invoices = () => {
  const [invoices, setInvoices] = useState([
    {
      id: "INV-001",
      client: "TechCorp Solutions",
      project: "DevOps Infrastructure Setup",
      amount: 2450.00,
      hours: 24.5,
      rate: 100,
      status: "Paid",
      date: "2024-01-15",
      dueDate: "2024-02-15"
    },
    {
      id: "INV-002",
      client: "StartupXYZ",
      project: "Marketing Strategy Development",
      amount: 1800.00,
      hours: 15.0,
      rate: 120,
      status: "Sent",
      date: "2024-01-10",
      dueDate: "2024-02-10"
    },
    {
      id: "INV-003",
      client: "LocalBiz",
      project: "Business Process Optimization",
      amount: 3200.00,
      hours: 32.0,
      rate: 100,
      status: "Draft",
      date: "2024-01-08",
      dueDate: "2024-02-08"
    }
  ]);

  const [newInvoice, setNewInvoice] = useState({
    client: '',
    project: '',
    hours: '',
    rate: '',
    description: ''
  });

  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const clients = ["TechCorp Solutions", "StartupXYZ", "LocalBiz"];
  const projects = [
    { name: "DevOps Infrastructure Setup", client: "TechCorp Solutions", rate: 100 },
    { name: "Marketing Strategy Development", client: "StartupXYZ", rate: 120 },
    { name: "Business Process Optimization", client: "LocalBiz", rate: 100 }
  ];

  const handleProjectChange = (projectName: string) => {
    const project = projects.find(p => p.name === projectName);
    if (project) {
      setNewInvoice({
        ...newInvoice,
        project: projectName,
        client: project.client,
        rate: project.rate.toString()
      });
    }
  };

  const handleCreateInvoice = () => {
    if (!newInvoice.client || !newInvoice.project || !newInvoice.hours || !newInvoice.rate) {
      toast.error('Please fill in all required fields');
      return;
    }

    const hours = parseFloat(newInvoice.hours);
    const rate = parseFloat(newInvoice.rate);
    const amount = hours * rate;

    const invoice = {
      id: `INV-${String(invoices.length + 1).padStart(3, '0')}`,
      ...newInvoice,
      hours,
      rate,
      amount,
      status: "Draft",
      date: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    };

    setInvoices([...invoices, invoice]);
    setNewInvoice({ client: '', project: '', hours: '', rate: '', description: '' });
    setIsDialogOpen(false);
    toast.success('Invoice created successfully!');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Paid':
        return 'bg-green-100 text-green-800';
      case 'Sent':
        return 'bg-blue-100 text-blue-800';
      case 'Draft':
        return 'bg-yellow-100 text-yellow-800';
      case 'Overdue':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const updateInvoiceStatus = (invoiceId: string, newStatus: string) => {
    setInvoices(invoices.map(invoice => 
      invoice.id === invoiceId 
        ? { ...invoice, status: newStatus }
        : invoice
    ));
    toast.success(`Invoice ${invoiceId} marked as ${newStatus.toLowerCase()}`);
  };

  const totalRevenue = invoices.filter(inv => inv.status === 'Paid').reduce((sum, inv) => sum + inv.amount, 0);
  const pendingRevenue = invoices.filter(inv => inv.status === 'Sent').reduce((sum, inv) => sum + inv.amount, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Invoices</h1>
            <p className="text-gray-600 mt-2">Generate and manage your invoices</p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" />
                Create Invoice
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Invoice</DialogTitle>
                <DialogDescription>
                  Generate an invoice from project hours.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="project">Project</Label>
                  <Select value={newInvoice.project} onValueChange={handleProjectChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a project" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map((project) => (
                        <SelectItem key={project.name} value={project.name}>
                          {project.name} ({project.client})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hours">Hours Worked</Label>
                  <Input
                    id="hours"
                    type="number"
                    step="0.25"
                    value={newInvoice.hours}
                    onChange={(e) => setNewInvoice({...newInvoice, hours: e.target.value})}
                    placeholder="0.0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rate">Hourly Rate ($)</Label>
                  <Input
                    id="rate"
                    type="number"
                    value={newInvoice.rate}
                    onChange={(e) => setNewInvoice({...newInvoice, rate: e.target.value})}
                    placeholder="100"
                    readOnly={!!newInvoice.project}
                  />
                </div>
                {newInvoice.hours && newInvoice.rate && (
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Total Amount:</span>
                      <span className="text-2xl font-bold text-green-600">
                        ${(parseFloat(newInvoice.hours) * parseFloat(newInvoice.rate)).toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}
                <Button onClick={handleCreateInvoice} className="w-full">
                  Create Invoice
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Revenue Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                  <p className="text-2xl font-bold text-green-600">${totalRevenue.toFixed(2)}</p>
                </div>
                <DollarSign className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pending Revenue</p>
                  <p className="text-2xl font-bold text-blue-600">${pendingRevenue.toFixed(2)}</p>
                </div>
                <FileText className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Invoices</p>
                  <p className="text-2xl font-bold text-gray-900">{invoices.length}</p>
                </div>
                <FileText className="h-8 w-8 text-gray-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Invoices List */}
        <div className="space-y-4">
          {invoices.map((invoice) => (
            <Card key={invoice.id} className="hover:shadow-lg transition-shadow duration-200">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-4 mb-2">
                      <h3 className="text-lg font-semibold">{invoice.id}</h3>
                      <Badge className={getStatusColor(invoice.status)}>
                        {invoice.status}
                      </Badge>
                    </div>
                    <p className="text-gray-600 mb-1">{invoice.client}</p>
                    <p className="text-sm text-gray-500">{invoice.project}</p>
                    <div className="mt-3 flex items-center space-x-6 text-sm text-gray-600">
                      <span>{invoice.hours}h × ${invoice.rate}/hr</span>
                      <span>Due: {invoice.dueDate}</span>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className="text-2xl font-bold text-gray-900 mb-4">
                      ${invoice.amount.toFixed(2)}
                    </p>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-1" />
                        PDF
                      </Button>
                      {invoice.status === 'Draft' && (
                        <Button 
                          size="sm"
                          onClick={() => updateInvoiceStatus(invoice.id, 'Sent')}
                        >
                          Send
                        </Button>
                      )}
                      {invoice.status === 'Sent' && (
                        <Button 
                          size="sm"
                          onClick={() => updateInvoiceStatus(invoice.id, 'Paid')}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          Mark Paid
                        </Button>
                      )}
                    </div>
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

export default Invoices;
