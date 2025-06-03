
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

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

      const { data, error } = await supabase
        .from('invitations')
        .insert([{
          ...invitationData,
          invited_by: user.id
        }])
        .select()
        .single();
      
      if (error) throw error;
      
      // Send actual email notification
      try {
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

        const { data: emailResponse, error: emailError } = await supabase.functions.invoke(
          'send-invitation-email',
          {
            body: emailPayload
          }
        );

        if (emailError) {
          console.error('Failed to send invitation email:', emailError);
          throw new Error('Failed to send invitation email: ' + emailError.message);
        }

        console.log('Invitation email sent successfully:', emailResponse);
      } catch (emailError) {
        console.error('Email sending error:', emailError);
        // Don't throw here - invitation was created successfully, just email failed
        console.log('Invitation created but email failed to send');
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
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
