
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type ProjectType = Database['public']['Enums']['project_type'];
type ProjectStatus = Database['public']['Enums']['project_status'];

interface Client {
  id: string;
  name: string;
}

interface Service {
  id: string;
  name: string;
}

interface ProjectData {
  id: string;
  name: string;
  client_id: string;
  type: ProjectType;
  hourly_rate: number;
  project_amount: number | null;
  total_hours: number;
  status: ProjectStatus;
  start_date: string | null;
  deadline: string | null;
  brd_file_url: string | null;
  created_at: string;
  clients: {
    name: string;
  };
}

interface ProjectFormProps {
  clients: Client[];
  services: Service[];
  newProject: {
    name: string;
    client_id: string;
    type: ProjectType;
    billing_type: 'hourly' | 'project';
    hourly_rate: number;
    project_amount: number;
    start_date: string;
    deadline: string;
    brd_file: File | null;
  };
  setNewProject: React.Dispatch<React.SetStateAction<any>>;
  editingProject: ProjectData | null;
  setEditingProject: React.Dispatch<React.SetStateAction<ProjectData | null>>;
  editBillingType: 'hourly' | 'project';
  setEditBillingType: React.Dispatch<React.SetStateAction<'hourly' | 'project'>>;
  editBrdFile: File | null;
  setEditBrdFile: React.Dispatch<React.SetStateAction<File | null>>;
  isDialogOpen: boolean;
  setIsDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isEditDialogOpen: boolean;
  setIsEditDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
  uploadingBRD: boolean;
  onCreateProject: () => void;
  onUpdateProject: () => void;
  onViewBRD: (url: string) => void;
}

const ProjectForm: React.FC<ProjectFormProps> = ({
  clients,
  services,
  newProject,
  setNewProject,
  editingProject,
  setEditingProject,
  editBillingType,
  setEditBillingType,
  editBrdFile,
  setEditBrdFile,
  isDialogOpen,
  setIsDialogOpen,
  isEditDialogOpen,
  setIsEditDialogOpen,
  uploadingBRD,
  onCreateProject,
  onUpdateProject,
  onViewBRD
}) => {
  const isProjectBased = (project: ProjectData) => {
    return project.project_amount !== null || project.brd_file_url !== null;
  };

  return (
    <>
      {/* Create Project Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Button className="bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4 mr-2" />
            Add Project
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
            <DialogDescription>
              Add a new project for a client.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Project Name</Label>
              <Input
                id="name"
                placeholder="Project name"
                value={newProject.name}
                onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="client">Client</Label>
              <Select value={newProject.client_id} onValueChange={(value) => setNewProject({ ...newProject, client_id: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Project Type (Service)</Label>
              <Select value={newProject.type} onValueChange={(value) => setNewProject({ ...newProject, type: value as ProjectType })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select project type" />
                </SelectTrigger>
                <SelectContent>
                  {services.map((service) => (
                    <SelectItem key={service.id} value={service.name}>
                      {service.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {newProject.type !== 'BRD' && (
              <div className="space-y-2">
                <Label htmlFor="billing_type">Billing Type</Label>
                <Select value={newProject.billing_type} onValueChange={(value) => setNewProject({ ...newProject, billing_type: value as 'hourly' | 'project' })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select billing type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hourly">Hourly</SelectItem>
                    <SelectItem value="project">Project-based</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            
            {newProject.type === 'BRD' ? (
              <div className="space-y-2">
                <Label htmlFor="project_amount">BRD Amount (₹)</Label>
                <Input
                  id="project_amount"
                  type="number"
                  placeholder="BRD project amount"
                  value={newProject.project_amount}
                  onChange={(e) => setNewProject({ ...newProject, project_amount: Number(e.target.value) })}
                />
              </div>
            ) : newProject.billing_type === 'hourly' ? (
              <div className="space-y-2">
                <Label htmlFor="hourly_rate">Hourly Rate (₹)</Label>
                <Input
                  id="hourly_rate"
                  type="number"
                  placeholder="Hourly rate"
                  value={newProject.hourly_rate}
                  onChange={(e) => setNewProject({ ...newProject, hourly_rate: Number(e.target.value) })}
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="project_amount">Project Amount (₹)</Label>
                <Input
                  id="project_amount"
                  type="number"
                  placeholder="Total project amount"
                  value={newProject.project_amount}
                  onChange={(e) => setNewProject({ ...newProject, project_amount: Number(e.target.value) })}
                />
              </div>
            )}

            {(newProject.billing_type === 'project' || newProject.type === 'BRD') && (
              <div className="space-y-2">
                <Label htmlFor="deadline">Deadline</Label>
                <Input
                  id="deadline"
                  type="date"
                  value={newProject.deadline}
                  onChange={(e) => setNewProject({ ...newProject, deadline: e.target.value })}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="brd_file">BRD Document</Label>
              <Input
                id="brd_file"
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={(e) => setNewProject({ ...newProject, brd_file: e.target.files?.[0] || null })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="start_date">Start Date</Label>
              <Input
                id="start_date"
                type="date"
                value={newProject.start_date}
                onChange={(e) => setNewProject({ ...newProject, start_date: e.target.value })}
              />
            </div>

            <Button onClick={onCreateProject} className="w-full" disabled={uploadingBRD}>
              {uploadingBRD ? 'Uploading BRD...' : 'Create Project'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Project Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
            <DialogDescription>
              Update project details.
            </DialogDescription>
          </DialogHeader>
          {editingProject && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Project Name</Label>
                <Input
                  id="edit-name"
                  placeholder="Project name"
                  value={editingProject.name}
                  onChange={(e) => setEditingProject({ ...editingProject, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-client">Client</Label>
                <Select value={editingProject.client_id} onValueChange={(value) => setEditingProject({ ...editingProject, client_id: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-type">Project Type (Service)</Label>
                <Select value={editingProject.type} onValueChange={(value) => setEditingProject({ ...editingProject, type: value as ProjectType })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select project type" />
                  </SelectTrigger>
                  <SelectContent>
                    {services.map((service) => (
                      <SelectItem key={service.id} value={service.name}>
                        {service.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {editingProject.type !== 'BRD' && (
                <div className="space-y-2">
                  <Label htmlFor="edit-billing-type">Billing Type</Label>
                  <Select value={editBillingType} onValueChange={(value) => setEditBillingType(value as 'hourly' | 'project')}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select billing type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hourly">Hourly</SelectItem>
                      <SelectItem value="project">Project-based</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              {editingProject.type === 'BRD' ? (
                <div className="space-y-2">
                  <Label htmlFor="edit-project-amount">BRD Amount (₹)</Label>
                  <Input
                    id="edit-project-amount"
                    type="number"
                    placeholder="BRD project amount"
                    value={editingProject.project_amount || 0}
                    onChange={(e) => setEditingProject({ ...editingProject, project_amount: Number(e.target.value) })}
                  />
                </div>
              ) : editBillingType === 'hourly' ? (
                <div className="space-y-2">
                  <Label htmlFor="edit-hourly-rate">Hourly Rate (₹)</Label>
                  <Input
                    id="edit-hourly-rate"
                    type="number"
                    placeholder="Hourly rate"
                    value={editingProject.hourly_rate}
                    onChange={(e) => setEditingProject({ ...editingProject, hourly_rate: Number(e.target.value) })}
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="edit-project-amount">Project Amount (₹)</Label>
                  <Input
                    id="edit-project-amount"
                    type="number"
                    placeholder="Total project amount"
                    value={editingProject.project_amount || 0}
                    onChange={(e) => setEditingProject({ ...editingProject, project_amount: Number(e.target.value) })}
                  />
                </div>
              )}

              {(editBillingType === 'project' || editingProject.type === 'BRD') && (
                <div className="space-y-2">
                  <Label htmlFor="edit-deadline">Deadline</Label>
                  <Input
                    id="edit-deadline"
                    type="date"
                    value={editingProject.deadline || ''}
                    onChange={(e) => setEditingProject({ ...editingProject, deadline: e.target.value })}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="edit-brd-file">Update BRD Document</Label>
                <Input
                  id="edit-brd-file"
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={(e) => setEditBrdFile(e.target.files?.[0] || null)}
                />
                {editingProject.brd_file_url && (
                  <div className="text-sm text-gray-600">
                    Current BRD: 
                    <Button
                      variant="link"
                      className="text-blue-600 p-0 ml-1"
                      onClick={() => onViewBRD(editingProject.brd_file_url!)}
                    >
                      View existing BRD
                    </Button>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-start-date">Start Date</Label>
                <Input
                  id="edit-start-date"
                  type="date"
                  value={editingProject.start_date || ''}
                  onChange={(e) => setEditingProject({ ...editingProject, start_date: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-status">Status</Label>
                <Select value={editingProject.status} onValueChange={(value) => setEditingProject({ ...editingProject, status: value as ProjectStatus })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
                    <SelectItem value="On Hold">On Hold</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={onUpdateProject} className="w-full" disabled={uploadingBRD}>
                {uploadingBRD ? 'Uploading BRD...' : 'Update Project'}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ProjectForm;
