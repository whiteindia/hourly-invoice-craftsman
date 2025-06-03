
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

interface TimeEntry {
  id: string;
  employee_id: string;
  task_id: string;
  duration_minutes: number;
  created_at: string;
  start_time: string;
  tasks: {
    name: string;
    projects: {
      name: string;
      hourly_rate: number;
    };
  };
  employees: {
    name: string;
    employee_services?: {
      service_id: string;
    }[];
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

  // Fetch time entries with employee services data
  const { data: timeEntries = [], isLoading } = useQuery({
    queryKey: ['time-entries', selectedEmployee, selectedMonth, globalServiceFilter],
    queryFn: async () => {
      const startDate = startOfMonth(selectedMonth).toISOString();
      const endDate = endOfMonth(selectedMonth).toISOString();

      let query = supabase
        .from('time_entries')
        .select(`
          *,
          tasks(
            name,
            projects(
              name,
              hourly_rate
            )
          ),
          employees(
            name,
            employee_services(service_id)
          )
        `)
        .gte('start_time', startDate)
        .lte('start_time', endDate)
        .order('start_time', { ascending: false });

      if (selectedEmployee !== 'all') {
        query = query.eq('employee_id', selectedEmployee);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching time entries:", error);
        throw error;
      }

      return data as TimeEntry[];
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

  // Calculate wages from time entries
  const wageRecords = timeEntries.map(entry => ({
    id: entry.id,
    employee_id: entry.employee_id,
    task_id: entry.task_id,
    hours_worked: entry.duration_minutes ? entry.duration_minutes / 60 : 0,
    hourly_rate: entry.tasks?.projects?.hourly_rate || 0,
    wage_amount: entry.duration_minutes && entry.tasks?.projects?.hourly_rate ? 
      (entry.duration_minutes / 60) * entry.tasks.projects.hourly_rate : 0,
    date: entry.start_time,
    tasks: entry.tasks,
    employees: entry.employees
  }));

  // Filter wage records based on filters including service filter
  const filteredWageRecords = wageRecords.filter(record => {
    const matchesEmployee = selectedEmployee === 'all' || record.employee_id === selectedEmployee;
    
    // Properly implement service filter through employee services
    const matchesService = globalServiceFilter === 'all' || 
      (record.employees?.employee_services && 
       record.employees.employee_services.some(es => es.service_id === globalServiceFilter));
    
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
            <CardTitle>Detailed Time Entries</CardTitle>
            <CardDescription>
              Employee time entries and wage calculations for {format(selectedMonth, "MMMM yyyy")}
              {globalServiceFilter !== 'all' && ` filtered by ${services.find(s => s.id === globalServiceFilter)?.name}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Task</TableHead>
                  <TableHead>Project</TableHead>
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
                    <TableCell>{record.tasks?.projects?.name}</TableCell>
                    <TableCell>{format(new Date(record.date), "PPP")}</TableCell>
                    <TableCell>{record.hours_worked.toFixed(2)}</TableCell>
                    <TableCell>₹{record.hourly_rate}</TableCell>
                    <TableCell>₹{record.wage_amount.toFixed(2)}</TableCell>
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
