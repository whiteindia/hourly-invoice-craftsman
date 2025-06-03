
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, Building, Calendar, Clock } from 'lucide-react';
import { format } from 'date-fns';

interface Task {
  id: string;
  name: string;
  status: 'Not Started' | 'In Progress' | 'Completed';
  project_id: string;
  assignee_id: string | null;
  deadline: string | null;
  hours: number;
  projects?: {
    name: string;
    clients: {
      name: string;
    };
  };
  employees?: {
    name: string;
  };
}

interface TaskKanbanProps {
  tasks: Task[];
  onTaskStatusChange: (taskId: string, newStatus: string) => void;
}

const TaskKanban: React.FC<TaskKanbanProps> = ({ tasks, onTaskStatusChange }) => {
  const columns = [
    {
      title: 'Not Started',
      status: 'Not Started',
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-200'
    },
    {
      title: 'In Progress',
      status: 'In Progress',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200'
    },
    {
      title: 'Completed',
      status: 'Completed',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200'
    }
  ];

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('text/plain', taskId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, status: string) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain');
    const task = tasks.find(t => t.id === taskId);
    
    if (task && task.status !== status) {
      onTaskStatusChange(taskId, status);
    }
  };

  const getTasksByStatus = (status: string) => {
    return tasks.filter(task => task.status === status);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {columns.map((column) => (
        <div
          key={column.status}
          className={`${column.bgColor} ${column.borderColor} border-2 border-dashed rounded-lg p-4 min-h-[400px]`}
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, column.status)}
        >
          <h3 className="font-semibold text-lg mb-4 text-center">
            {column.title}
            <Badge variant="secondary" className="ml-2">
              {getTasksByStatus(column.status).length}
            </Badge>
          </h3>
          
          <div className="space-y-3">
            {getTasksByStatus(column.status).map((task) => (
              <Card
                key={task.id}
                className="cursor-move hover:shadow-md transition-shadow"
                draggable
                onDragStart={(e) => handleDragStart(e, task.id)}
              >
                <CardContent className="p-4">
                  <h4 className="font-medium mb-2 text-sm">{task.name}</h4>
                  
                  <div className="space-y-2 text-xs text-gray-600">
                    {task.projects && (
                      <div className="flex items-center space-x-1">
                        <Building className="h-3 w-3" />
                        <span>{task.projects.name}</span>
                      </div>
                    )}
                    
                    {task.projects?.clients && (
                      <div className="flex items-center space-x-1">
                        <User className="h-3 w-3" />
                        <span>{task.projects.clients.name}</span>
                      </div>
                    )}
                    
                    {task.employees && (
                      <div className="flex items-center space-x-1">
                        <User className="h-3 w-3" />
                        <span>Assigned to: {task.employees.name}</span>
                      </div>
                    )}
                    
                    {task.deadline && (
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-3 w-3" />
                        <span>Due: {format(new Date(task.deadline), 'MMM dd')}</span>
                      </div>
                    )}
                    
                    <div className="flex items-center space-x-1">
                      <Clock className="h-3 w-3" />
                      <span>{task.hours}h logged</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default TaskKanban;
