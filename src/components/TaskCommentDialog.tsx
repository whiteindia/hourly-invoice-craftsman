
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface TaskCommentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  taskId: string;
  onTimeLogged: (hours: number) => void;
}

const TaskCommentDialog: React.FC<TaskCommentDialogProps> = ({
  isOpen,
  onClose,
  taskId,
  onTimeLogged
}) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [comment, setComment] = useState('');
  const [hoursLogged, setHoursLogged] = useState('');

  const addCommentMutation = useMutation({
    mutationFn: async ({ comment, hours }: { comment: string; hours: number }) => {
      const { data, error } = await supabase
        .from('task_comments')
        .insert([{
          task_id: taskId,
          comment,
          hours_logged: hours,
          user_id: user?.id
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['task-comments', taskId] });
      onTimeLogged(data.hours_logged);
      setComment('');
      setHoursLogged('');
      onClose();
      toast.success('Comment and time logged successfully!');
    },
    onError: (error) => {
      toast.error('Failed to log comment: ' + error.message);
    }
  });

  const handleSubmit = () => {
    if (!comment.trim()) {
      toast.error('Please enter a comment');
      return;
    }
    
    const hours = parseFloat(hoursLogged) || 0;
    addCommentMutation.mutate({ comment: comment.trim(), hours });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log Time & Add Comment</DialogTitle>
          <DialogDescription>
            Add a comment and log the time spent on this task.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="hours">Hours Logged</Label>
            <Input
              id="hours"
              type="number"
              step="0.25"
              value={hoursLogged}
              onChange={(e) => setHoursLogged(e.target.value)}
              placeholder="0.0"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="comment">Comment</Label>
            <Textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Describe what you worked on..."
              rows={4}
            />
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={addCommentMutation.isPending}
            >
              {addCommentMutation.isPending ? 'Logging...' : 'Log Time'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TaskCommentDialog;
