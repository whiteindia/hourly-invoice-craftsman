
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
      const { data, error } = await supabase
        .from('invitations')
        .insert([{
          ...invitationData,
          invited_by: (await supabase.auth.getUser()).data.user?.id
        }])
        .select()
        .single();
      
      if (error) throw error;
      
      // TODO: Send email notification
      console.log('Invitation created:', data);
      
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
