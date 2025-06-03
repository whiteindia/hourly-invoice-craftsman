import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CalendarIcon, Download, Filter } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import Navigation from '@/components/Navigation';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { cn } from '@/lib/utils';

interface WageRecord {
  id: string;
  employee_id: string;
  task_id: string;
  hours_worked: number;
  hourly_rate: number;
  wage_amount: number;
  date: string;
  tasks: {
    name: string;
    projects: {
      name: string;
      services: {
        id: string;
        name: string;
      };
    };
  };
  employees: {
    name: string;
  };
}

interface Employee {
  id: string;
  name: string;
}

interface Service {
  id: string;
  name: string;
}

const Wages = () => {
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [globalServiceFilter, setGlobalServiceFilter] = useState<string>('all');

  // Fetch wage records
  const { data: wageRecords = [], isLoading } = useQuery({
    queryKey: ['wage-records', selectedEmployee, selectedMonth, globalServiceFilter],
    queryFn: async () => {
      const startDate = startOfMonth(selectedMonth).toISOString();
      const endDate = endOfMonth(selectedMonth).toISOString();

      let query = supabase
        .from('wage_records')
        .select(`
          *,
          tasks(
            name,
            projects(
              name,
              services(
                id,
                name
              )
            )
          ),
          employees(name)
        `)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false });

      if (selectedEmployee !== 'all') {
        query = query.eq('employee_id', selectedEmployee);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching wage records:", error);
        throw error;
      }

      return data as WageRecord[];
    }
  });

  // Fetch employees
  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .order('name');

      if (error) {
        console.error("Error fetching employees:", error);
        throw error;
      }

      return data as Employee[];
    }
  });

  // Fetch services
  const { data: services = [] } = useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .order('name');

      if (error) {
        console.error("Error fetching services:", error);
        throw error;
      }

      return data as Service[];
    }
  });

  // Filter wage records based on filters
  const filteredWageRecords = wageRecords.filter(record => {
    const matchesEmployee = selectedEmployee === 'all' || record.employee_id === selectedEmployee;
    const matchesService = globalServiceFilter === 'all' || record.tasks?.projects?.services?.id === globalServiceFilter;
    return matchesEmployee && matchesService;
  });

  // Calculate total hours and total wages
  const totalHours = filteredWageRecords.reduce((sum, record) => sum + record.hours_worked, 0);
  const totalWages = filteredWageRecords.reduce((sum, record) => sum + record.wage_amount, 0);

  return (
    <Navigation>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Employee Wages</h1>
            <p className="text-gray-600 mt-2">Track employee hours and calculate wages</p>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Global Service Filter */}
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <Select value={globalServiceFilter} onValueChange={setGlobalServiceFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by service" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Services</SelectItem>
                  {services.map((service) => (
                    <SelectItem key={service.id} value={service.id}>
                      {service.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Employee</Label>
                <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Employees</SelectItem>
                    {employees.map((employee) => (
                      <SelectItem key={employee.id} value={employee.id}>
                        {employee.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Month</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !selectedMonth && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedMonth ? format(selectedMonth, "MMMM yyyy") : "Select month"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={selectedMonth}
                      onSelect={(date) => date && setSelectedMonth(date)}
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Card>
            <CardContent className="p-6">
              <CardTitle>Total Hours</CardTitle>
              <CardDescription>Total hours worked this month</CardDescription>
              <div className="text-2xl font-bold">{totalHours.toFixed(2)} hours</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <CardTitle>Total Wages</CardTitle>
              <CardDescription>Total wages to be paid this month</CardDescription>
              <div className="text-2xl font-bold">₹{totalWages.toFixed(2)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <CardTitle>Average Hourly Rate</CardTitle>
              <CardDescription>Average hourly rate across all employees</CardDescription>
              <div className="text-2xl font-bold">
                ₹{(filteredWageRecords.length > 0 ? totalWages / totalHours : 0).toFixed(2)}/hour
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Wage Records */}
        <Card>
          <CardHeader>
            <CardTitle>Detailed Wage Records</CardTitle>
            <CardDescription>
              Employee work hours and wage calculations for {format(selectedMonth, "MMMM yyyy")}
              {globalServiceFilter !== 'all' && ` filtered by ${services.find(s => s.id === globalServiceFilter)?.name}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Task</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Hours Worked</TableHead>
                  <TableHead>Hourly Rate</TableHead>
                  <TableHead>Wage Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredWageRecords.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>{record.employees?.name}</TableCell>
                    <TableCell>{record.tasks?.name}</TableCell>
                    <TableCell>{record.tasks?.projects?.services?.name}</TableCell>
                    <TableCell>{format(new Date(record.date), "PPP")}</TableCell>
                    <TableCell>{record.hours_worked}</TableCell>
                    <TableCell>₹{record.hourly_rate}</TableCell>
                    <TableCell>₹{record.wage_amount}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </Navigation>
  );
};

export default Wages;
