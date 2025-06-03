import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface Invitation {
  id: string;
  email: string;
  role: string;
  invited_by: string;
  client_id: string | null;
  employee_data: any;
  status: string;
  created_at: string;
  expires_at: string;
}

export const useInvitations = () => {
  const queryClient = useQueryClient();

  const { data: invitations = [], isLoading } = useQuery({
    queryKey: ['invitations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invitations')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Invitation[];
    }
  });

  const sendInvitation = useMutation({
    mutationFn: async (invitationData: {
      email: string;
      role: string;
      client_id?: string;
      employee_data?: any;
    }) => {
      // Get current user session instead of accessing auth.users table
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      console.log('Creating invitation record...');
      const { data, error } = await supabase
        .from('invitations')
        .insert([{
          ...invitationData,
          invited_by: user.id
        }])
        .select()
        .single();
      
      if (error) {
        console.error('Failed to create invitation record:', error);
        throw error;
      }
      
      console.log('Invitation record created successfully:', data);
      
      // Send actual email notification
      try {
        console.log('Preparing to send email...');
        const emailPayload = {
          email: invitationData.email,
          role: invitationData.role,
          invitedBy: user.id,
          ...(invitationData.role === 'client' ? {
            clientData: invitationData.employee_data
          } : {
            employeeData: invitationData.employee_data
          })
        };

        console.log('Invoking send-invitation-email function with payload:', emailPayload);

        const { data: emailResponse, error: emailError } = await supabase.functions.invoke(
          'send-invitation-email',
          {
            body: emailPayload
          }
        );

        if (emailError) {
          console.error('Failed to send invitation email:', emailError);
          toast.error('Invitation created but email failed to send: ' + emailError.message);
          // Don't throw here - invitation was created successfully
          return data;
        }

        if (!emailResponse?.success) {
          console.error('Email function returned error:', emailResponse);
          toast.error('Invitation created but email failed to send: ' + (emailResponse?.error || 'Unknown error'));
          return data;
        }

        console.log('Invitation email sent successfully:', emailResponse);
        toast.success('Invitation created and email sent successfully!');
      } catch (emailError) {
        console.error('Email sending error:', emailError);
        toast.error('Invitation created but email failed to send: ' + (emailError as Error).message);
        // Don't throw here - invitation was created successfully, just email failed
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
    },
    onError: (error) => {
      console.error('Failed to create invitation:', error);
      toast.error('Failed to create invitation: ' + error.message);
    }
  });

  const deleteInvitation = useMutation({
    mutationFn: async (invitationId: string) => {
      const { error } = await supabase
        .from('invitations')
        .delete()
        .eq('id', invitationId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
    }
  });

  return {
    invitations,
    isLoading,
    sendInvitation,
    deleteInvitation
  };
};
