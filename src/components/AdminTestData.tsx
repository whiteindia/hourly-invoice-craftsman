
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const AdminTestData = () => {
  const createSampleData = async () => {
    try {
      console.log('Creating sample data...');
      
      // Create a sample client
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .insert([{
          name: 'Test Client',
          email: 'testclient@example.com',
          company: 'Test Company Ltd',
          phone: '+1234567890'
        }])
        .select()
        .single();

      if (clientError) {
        console.error('Client creation error:', clientError);
        throw clientError;
      }

      console.log('Client created:', client);

      // Create a sample project
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .insert([{
          name: 'Sample Project',
          client_id: client.id,
          type: 'Fixed',
          hourly_rate: 50,
          project_amount: 5000,
          total_hours: 100,
          status: 'Active',
          deadline: '2025-07-01'
        }])
        .select()
        .single();

      if (projectError) {
        console.error('Project creation error:', projectError);
        throw projectError;
      }

      console.log('Project created:', project);

      // Create a sample task
      const { data: task, error: taskError } = await supabase
        .from('tasks')
        .insert([{
          name: 'Sample Task',
          project_id: project.id,
          status: 'Not Started',
          hours: 0,
          estimated_duration: 8,
          deadline: '2025-06-15'
        }])
        .select()
        .single();

      if (taskError) {
        console.error('Task creation error:', taskError);
        throw taskError;
      }

      console.log('Task created:', task);

      // Create a sample employee
      const { data: employee, error: employeeError } = await supabase
        .from('employees')
        .insert([{
          name: 'John Doe',
          email: 'john.doe@example.com',
          role: 'developer',
          contact_number: '+1234567891'
        }])
        .select()
        .single();

      if (employeeError) {
        console.error('Employee creation error:', employeeError);
        throw employeeError;
      }

      console.log('Employee created:', employee);

      // Create a sample service
      const { data: service, error: serviceError } = await supabase
        .from('services')
        .insert([{
          name: 'Web Development',
          description: 'Full-stack web development services',
          hourly_rate: 75
        }])
        .select()
        .single();

      if (serviceError) {
        console.error('Service creation error:', serviceError);
        throw serviceError;
      }

      console.log('Service created:', service);

      toast.success('Sample data created successfully!');
      
      // Refresh the page to see updated data
      setTimeout(() => {
        window.location.reload();
      }, 1000);

    } catch (error) {
      console.error('Error creating sample data:', error);
      toast.error(`Error creating sample data: ${error.message}`);
    }
  };

  return (
    <Card className="border-blue-200">
      <CardHeader>
        <CardTitle className="text-blue-700">Admin Test Data Creator</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-600 mb-4">
          Click the button below to create sample data (1 client, 1 project, 1 task, 1 employee, 1 service) 
          to test if the admin permissions are working correctly.
        </p>
        <Button onClick={createSampleData} className="w-full">
          Create Sample Data
        </Button>
      </CardContent>
    </Card>
  );
};

export default AdminTestData;
