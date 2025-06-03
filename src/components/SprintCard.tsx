
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, Calendar, User, Building } from 'lucide-react';
import { format } from 'date-fns';
import TaskKanban from '@/components/TaskKanban';

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

interface Sprint {
  id: string;
  title: string;
  deadline: string;
  status: 'Not Started' | 'In Progress' | 'Completed';
  created_at: string;
  updated_at: string;
  tasks: Task[];
}

interface SprintCardProps {
  sprint: Sprint;
  onTaskStatusChange: (taskId: string, newStatus: string, sprintId: string) => void;
  getStatusIcon: (status: string) => React.ReactNode;
  getStatusColor: (status: string) => string;
}

const SprintCard: React.FC<SprintCardProps> = ({
  sprint,
  onTaskStatusChange,
  getStatusIcon,
  getStatusColor
}) => {
  const [isOpen, setIsOpen] = useState(true);

  const completedTasks = sprint.tasks.filter(t => t.status === 'Completed').length;
  const totalTasks = sprint.tasks.length;
  const progressPercentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  return (
    <Card className="w-full">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {isOpen ? (
                  <ChevronDown className="h-5 w-5 text-gray-500" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-gray-500" />
                )}
                <div>
                  <CardTitle className="text-xl">{sprint.title}</CardTitle>
                  <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                    <div className="flex items-center space-x-1">
                      <Calendar className="h-4 w-4" />
                      <span>Due: {format(new Date(sprint.deadline), 'MMM dd, yyyy')}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <span>{completedTasks}/{totalTasks} tasks completed</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="text-sm text-gray-500">
                  {progressPercentage.toFixed(0)}% complete
                </div>
                <Badge className={getStatusColor(sprint.status)}>
                  <div className="flex items-center space-x-1">
                    {getStatusIcon(sprint.status)}
                    <span>{sprint.status}</span>
                  </div>
                </Badge>
              </div>
            </div>
            
            {/* Progress bar */}
            <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent>
            {sprint.tasks.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No tasks assigned to this sprint
              </div>
            ) : (
              <TaskKanban
                tasks={sprint.tasks}
                onTaskStatusChange={(taskId, newStatus) => 
                  onTaskStatusChange(taskId, newStatus, sprint.id)
                }
              />
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export default SprintCard;
