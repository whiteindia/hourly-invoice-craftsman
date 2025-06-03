import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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
    selectedTasks: [] as number[],
    description: ''
  });

  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Mock tasks data - in a real app, this would come from your database
  const availableTasks = [
    {
      id: 1,
      name: "Server Configuration",
      project: "DevOps Infrastructure Setup",
      client: "TechCorp Solutions",
      hours: 4.5,
      rate: 100,
      status: "Completed",
      date: "2024-01-15",
      invoiced: false
    },
    {
      id: 2,
      name: "Database Setup",
      project: "DevOps Infrastructure Setup",
      client: "TechCorp Solutions",
      hours: 6.0,
      rate: 100,
      status: "Completed",
      date: "2024-01-16",
      invoiced: false
    },
    {
      id: 3,
      name: "Market Research",
      project: "Marketing Strategy Development",
      client: "StartupXYZ",
      hours: 3.0,
      rate: 120,
      status: "Completed",
      date: "2024-01-14",
      invoiced: false
    },
    {
      id: 4,
      name: "Strategy Documentation",
      project: "Marketing Strategy Development",
      client: "StartupXYZ",
      hours: 4.5,
      rate: 120,
      status: "Completed",
      date: "2024-01-15",
      invoiced: false
    },
    {
      id: 5,
      name: "Process Documentation",
      project: "Business Process Optimization",
      client: "LocalBiz",
      hours: 8.0,
      rate: 100,
      status: "Completed",
      date: "2024-01-16",
      invoiced: false
    }
  ];

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
        selectedTasks: []
      });
    }
  };

  const handleTaskSelection = (taskId: number, checked: boolean) => {
    if (checked) {
      setNewInvoice({
        ...newInvoice,
        selectedTasks: [...newInvoice.selectedTasks, taskId]
      });
    } else {
      setNewInvoice({
        ...newInvoice,
        selectedTasks: newInvoice.selectedTasks.filter(id => id !== taskId)
      });
    }
  };

  const getFilteredTasks = () => {
    return availableTasks.filter(task => 
      task.project === newInvoice.project && 
      task.status === "Completed" && 
      !task.invoiced
    );
  };

  const getSelectedTasksTotal = () => {
    const selectedTasks = availableTasks.filter(task => 
      newInvoice.selectedTasks.includes(task.id)
    );
    const totalHours = selectedTasks.reduce((sum, task) => sum + task.hours, 0);
    const totalAmount = selectedTasks.reduce((sum, task) => sum + (task.hours * task.rate), 0);
    return { totalHours, totalAmount };
  };

  const handleCreateInvoice = () => {
    if (!newInvoice.client || !newInvoice.project || newInvoice.selectedTasks.length === 0) {
      toast.error('Please select a project and at least one task');
      return;
    }

    const selectedTasks = availableTasks.filter(task => 
      newInvoice.selectedTasks.includes(task.id)
    );
    
    const totalHours = selectedTasks.reduce((sum, task) => sum + task.hours, 0);
    const totalAmount = selectedTasks.reduce((sum, task) => sum + (task.hours * task.rate), 0);
    const rate = selectedTasks.length > 0 ? selectedTasks[0].rate : 0;

    const invoice = {
      id: `INV-${String(invoices.length + 1).padStart(3, '0')}`,
      client: newInvoice.client,
      project: newInvoice.project,
      hours: totalHours,
      rate,
      amount: totalAmount,
      status: "Draft",
      date: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    };

    setInvoices([...invoices, invoice]);
    setNewInvoice({ client: '', project: '', selectedTasks: [], description: '' });
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
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Invoice</DialogTitle>
                <DialogDescription>
                  Select completed tasks to generate an invoice.
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

                {newInvoice.project && (
                  <div className="space-y-2">
                    <Label>Select Tasks to Invoice</Label>
                    <div className="border rounded-lg p-4 max-h-60 overflow-y-auto">
                      {getFilteredTasks().length === 0 ? (
                        <p className="text-gray-500 text-sm">No completed tasks available for this project.</p>
                      ) : (
                        <div className="space-y-3">
                          {getFilteredTasks().map((task) => (
                            <div key={task.id} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded">
                              <Checkbox
                                id={`task-${task.id}`}
                                checked={newInvoice.selectedTasks.includes(task.id)}
                                onCheckedChange={(checked) => handleTaskSelection(task.id, checked as boolean)}
                              />
                              <div className="flex-1">
                                <label htmlFor={`task-${task.id}`} className="text-sm font-medium cursor-pointer">
                                  {task.name}
                                </label>
                                <div className="text-xs text-gray-600">
                                  {task.hours}h × ${task.rate}/hr = ${(task.hours * task.rate).toFixed(2)}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {newInvoice.selectedTasks.length > 0 && (
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">Total Hours:</span>
                        <span className="text-lg font-bold">
                          {getSelectedTasksTotal().totalHours.toFixed(2)}h
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="font-medium">Total Amount:</span>
                        <span className="text-2xl font-bold text-green-600">
                          ${getSelectedTasksTotal().totalAmount.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <Button 
                  onClick={handleCreateInvoice} 
                  className="w-full"
                  disabled={newInvoice.selectedTasks.length === 0}
                >
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
