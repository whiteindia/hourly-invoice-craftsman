
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, DollarSign, Calendar, Filter } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import Navigation from '@/components/Navigation';
import { useAuth } from '@/contexts/AuthContext';

interface Payment {
  id: string;
  amount: number;
  payment_date: string;
  payment_method: string | null;
  clients: { name: string };
  projects: { name: string };
  invoices: { id: string };
}

interface Client {
  id: string;
  name: string;
}

interface Invoice {
  id: string;
  amount: number;
  clients: { name: string };
  projects: { name: string };
}

const Payments = () => {
  const { userRole } = useAuth();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [filters, setFilters] = useState({
    client_id: '',
    start_date: '',
    end_date: ''
  });
  const [newPayment, setNewPayment] = useState({
    invoice_id: '',
    amount: '',
    payment_method: '',
    payment_date: new Date().toISOString().split('T')[0]
  });

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ['payments', filters],
    queryFn: async () => {
      let query = supabase
        .from('payments')
        .select(`
          *,
          clients(name),
          projects(name),
          invoices(id)
        `)
        .order('payment_date', { ascending: false });

      if (filters.client_id) {
        query = query.eq('client_id', filters.client_id);
      }
      if (filters.start_date) {
        query = query.gte('payment_date', filters.start_date);
      }
      if (filters.end_date) {
        query = query.lte('payment_date', filters.end_date);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Payment[];
    }
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients-for-payments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name')
        .order('name');
      
      if (error) throw error;
      return data as Client[];
    }
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['unpaid-invoices'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          id,
          amount,
          clients(name),
          projects(name)
        `)
        .eq('status', 'Sent')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Invoice[];
    }
  });

  const addPaymentMutation = useMutation({
    mutationFn: async (paymentData: any) => {
      // Get invoice details
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .select('client_id, project_id')
        .eq('id', paymentData.invoice_id)
        .single();
      
      if (invoiceError) throw invoiceError;

      // Create payment
      const { data, error } = await supabase
        .from('payments')
        .insert([{
          ...paymentData,
          client_id: invoice.client_id,
          project_id: invoice.project_id,
          amount: parseFloat(paymentData.amount)
        }])
        .select()
        .single();
      
      if (error) throw error;

      // Update invoice status to Paid
      const { error: updateError } = await supabase
        .from('invoices')
        .update({ status: 'Paid' })
        .eq('id', paymentData.invoice_id);
      
      if (updateError) throw updateError;

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['unpaid-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      setNewPayment({
        invoice_id: '',
        amount: '',
        payment_method: '',
        payment_date: new Date().toISOString().split('T')[0]
      });
      setIsDialogOpen(false);
      toast.success('Payment recorded successfully!');
    },
    onError: (error) => {
      toast.error('Failed to record payment: ' + error.message);
    }
  });

  const handleAddPayment = () => {
    if (!newPayment.invoice_id || !newPayment.amount) {
      toast.error('Please fill in required fields');
      return;
    }
    addPaymentMutation.mutate(newPayment);
  };

  const clearFilters = () => {
    setFilters({ client_id: '', start_date: '', end_date: '' });
  };

  const totalRevenue = payments.reduce((sum, payment) => sum + payment.amount, 0);
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const monthlyRevenue = payments
    .filter(payment => {
      const paymentDate = new Date(payment.payment_date);
      return paymentDate.getMonth() === currentMonth && paymentDate.getFullYear() === currentYear;
    })
    .reduce((sum, payment) => sum + payment.amount, 0);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <Navigation />
        <div className="flex items-center justify-center py-8">
          <div className="text-lg">Loading payments...</div>
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
            <h1 className="text-3xl font-bold text-gray-900">Payments</h1>
            <p className="text-gray-600 mt-2">Track and manage payment records</p>
          </div>
          
          {userRole === 'admin' && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Record Payment
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Record New Payment</DialogTitle>
                  <DialogDescription>
                    Record a payment for an invoice.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="invoice">Invoice</Label>
                    <Select value={newPayment.invoice_id} onValueChange={(value) => {
                      const invoice = invoices.find(inv => inv.id === value);
                      setNewPayment({
                        ...newPayment, 
                        invoice_id: value,
                        amount: invoice ? invoice.amount.toString() : ''
                      });
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an invoice" />
                      </SelectTrigger>
                      <SelectContent>
                        {invoices.map((invoice) => (
                          <SelectItem key={invoice.id} value={invoice.id}>
                            {invoice.id} - {invoice.clients.name} (₹{invoice.amount})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="amount">Amount</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      value={newPayment.amount}
                      onChange={(e) => setNewPayment({...newPayment, amount: e.target.value})}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="paymentMethod">Payment Method</Label>
                    <Select value={newPayment.payment_method} onValueChange={(value) => setNewPayment({...newPayment, payment_method: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select payment method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                        <SelectItem value="UPI">UPI</SelectItem>
                        <SelectItem value="Credit Card">Credit Card</SelectItem>
                        <SelectItem value="Cash">Cash</SelectItem>
                        <SelectItem value="Cheque">Cheque</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="paymentDate">Payment Date</Label>
                    <Input
                      id="paymentDate"
                      type="date"
                      value={newPayment.payment_date}
                      onChange={(e) => setNewPayment({...newPayment, payment_date: e.target.value})}
                    />
                  </div>
                  <Button 
                    onClick={handleAddPayment} 
                    className="w-full"
                    disabled={addPaymentMutation.isPending}
                  >
                    {addPaymentMutation.isPending ? 'Recording...' : 'Record Payment'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Revenue Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">This Month's Revenue</p>
                  <p className="text-3xl font-bold text-green-600">₹{monthlyRevenue.toFixed(2)}</p>
                </div>
                <Calendar className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                  <p className="text-3xl font-bold text-blue-600">₹{totalRevenue.toFixed(2)}</p>
                </div>
                <DollarSign className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Filter className="h-5 w-5 mr-2" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div className="space-y-2">
                <Label>Client</Label>
                <Select value={filters.client_id} onValueChange={(value) => setFilters({...filters, client_id: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="All clients" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All clients</SelectItem>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={filters.start_date}
                  onChange={(e) => setFilters({...filters, start_date: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={filters.end_date}
                  onChange={(e) => setFilters({...filters, end_date: e.target.value})}
                />
              </div>
              <Button variant="outline" onClick={clearFilters}>
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Payments Table */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Records</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Invoice ID</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Payment Date</TableHead>
                  <TableHead>Payment Method</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-medium">{payment.clients.name}</TableCell>
                    <TableCell>{payment.invoices.id}</TableCell>
                    <TableCell>{payment.projects.name}</TableCell>
                    <TableCell className="font-semibold text-green-600">
                      ₹{payment.amount.toFixed(2)}
                    </TableCell>
                    <TableCell>{payment.payment_date}</TableCell>
                    <TableCell>{payment.payment_method || 'N/A'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {payments.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No payments found with current filters.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Payments;
