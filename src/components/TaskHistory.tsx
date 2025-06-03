
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, MessageSquare } from 'lucide-react';

interface TaskComment {
  id: string;
  comment: string;
  hours_logged: number;
  created_at: string;
  user_id: string;
}

interface TaskHistoryProps {
  taskId: string;
}

const TaskHistory: React.FC<TaskHistoryProps> = ({ taskId }) => {
  const { data: comments = [], isLoading } = useQuery({
    queryKey: ['task-comments', taskId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('task_comments')
        .select('*')
        .eq('task_id', taskId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as TaskComment[];
    }
  });

  if (isLoading) {
    return <div className="text-sm text-gray-500">Loading comments...</div>;
  }

  if (comments.length === 0) {
    return (
      <div className="text-sm text-gray-500 italic">
        No comments yet. Click "Start" to log time and add comments.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-gray-700 flex items-center">
        <MessageSquare className="h-4 w-4 mr-1" />
        Task History
      </h4>
      {comments.map((comment) => (
        <Card key={comment.id} className="border-l-4 border-l-blue-200">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2 text-xs text-gray-500">
                <Clock className="h-3 w-3" />
                <span>{comment.hours_logged}h logged</span>
                <span>•</span>
                <span>{new Date(comment.created_at).toLocaleDateString()}</span>
              </div>
            </div>
            <p className="text-sm text-gray-700">{comment.comment}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default TaskHistory;
