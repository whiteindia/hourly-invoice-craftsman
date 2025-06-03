import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProjectOperations } from '@/hooks/useProjectOperations';

interface ProjectFormProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  editingProject: any;
  onClose: () => void;
}

const ProjectForm = ({ isOpen, onOpenChange, editingProject, onClose }: ProjectFormProps) => {
  const { createProjectMutation, updateProjectMutation } = useProjectOperations();
  
  const [formData, setFormData] = useState({
    name: '',
    client_id: '',
    type: '',
    hourly_rate: '',
    project_amount: '',
    start_date: '',
    deadline: '',
    status: 'Active'
  });
  const [brdFile, setBrdFile] = useState<File | null>(null);

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  useEffect(() => {
    if (editingProject) {
      setFormData({
        name: editingProject.name,
        client_id: editingProject.client_id,
        type: editingProject.type,
        hourly_rate: editingProject.hourly_rate?.toString() || '',
        project_amount: editingProject.project_amount?.toString() || '',
        start_date: editingProject.start_date?.split('T')[0] || '',
        deadline: editingProject.deadline?.split('T')[0] || '',
        status: editingProject.status
      });
    } else {
      setFormData({
        name: '',
        client_id: '',
        type: '',
        hourly_rate: '',
        project_amount: '',
        start_date: '',
        deadline: '',
        status: 'Active'
      });
    }
  }, [editingProject]);

  const handleSubmit = () => {
    if (!formData.name || !formData.client_id || !formData.type) {
      return;
    }

    const projectData = {
      name: formData.name,
      client_id: formData.client_id,
      type: formData.type as 'Fixed Price' | 'Hourly',
      hourly_rate: formData.hourly_rate ? parseFloat(formData.hourly_rate) : 0,
      project_amount: formData.project_amount ? parseFloat(formData.project_amount) : 0,
      start_date: formData.start_date || null,
      deadline: formData.deadline || null,
      status: formData.status as 'Active' | 'On Hold' | 'Completed'
    };

    if (editingProject) {
      updateProjectMutation.mutate({ id: editingProject.id, updates: projectData, brdFile });
    } else {
      createProjectMutation.mutate({ projectData, brdFile });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editingProject ? 'Edit Project' : 'Create New Project'}</DialogTitle>
          <DialogDescription>
            {editingProject ? 'Update project details' : 'Create a new project'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="projectName">Project Name</Label>
            <Input
              id="projectName"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              placeholder="e.g., New Website Design"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="client">Client</Label>
            <Select onValueChange={(value) => setFormData({...formData, client_id: value})}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a client" defaultValue={formData.client_id} />
              </SelectTrigger>
              <SelectContent>
                {clients.map((client: any) => (
                  <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="type">Type</Label>
            <Select onValueChange={(value) => setFormData({...formData, type: value})}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select project type" defaultValue={formData.type} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Hourly">Hourly</SelectItem>
                <SelectItem value="Fixed Price">Fixed Price</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {formData.type === 'Hourly' && (
            <div className="space-y-2">
              <Label htmlFor="hourlyRate">Hourly Rate</Label>
              <Input
                id="hourlyRate"
                type="number"
                value={formData.hourly_rate}
                onChange={(e) => setFormData({...formData, hourly_rate: e.target.value})}
                placeholder="e.g., 50.00"
              />
            </div>
          )}
          {formData.type === 'Fixed Price' && (
            <div className="space-y-2">
              <Label htmlFor="projectAmount">Project Amount</Label>
              <Input
                id="projectAmount"
                type="number"
                value={formData.project_amount}
                onChange={(e) => setFormData({...formData, project_amount: e.target.value})}
                placeholder="e.g., 5000.00"
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="startDate">Start Date</Label>
            <Input
              id="startDate"
              type="date"
              value={formData.start_date}
              onChange={(e) => setFormData({...formData, start_date: e.target.value})}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="deadline">Deadline</Label>
            <Input
              id="deadline"
              type="date"
              value={formData.deadline}
              onChange={(e) => setFormData({...formData, deadline: e.target.value})}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select onValueChange={(value) => setFormData({...formData, status: value})}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select status" defaultValue={formData.status} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="On Hold">On Hold</SelectItem>
                <SelectItem value="Completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="brdFile">BRD File (Optional)</Label>
            <Input
              id="brdFile"
              type="file"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  setBrdFile(e.target.files[0]);
                }
              }}
            />
          </div>
        </div>
        <div className="flex justify-end space-x-2 mt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={createProjectMutation.isPending || updateProjectMutation.isPending}>
            {editingProject ? 'Update' : 'Create'} Project
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProjectForm;
