'use client';

import { createSupabaseClient } from '@/src/lib/supabase-client';
import { useEffect, useState } from 'react';

interface Message {
    id: string;
    client_id: string;
    message: string;
    sender_type: 'client' | 'freelancer';
    is_read: boolean;
    created_at: string;
    client_name?: string;
}

export function useClientMessages(userEmail?: string) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);

    const loadUnreadMessages = async () => {
        if (!userEmail) {
            console.warn('No userEmail provided to loadUnreadMessages');
            return;
        }

        setLoading(true);
        try {
            const supabase = createSupabaseClient();
            const userResult = await supabase.auth.getUser();
            const userId = userResult?.data?.user?.id;
            if (!userId) {
                console.error('No authenticated user found in Supabase.');
                setMessages([]);
                setUnreadCount(0);
                return;
            }

            // Obtener mensajes no leídos de clientes
            const { data: messagesData, error: messagesError } = await supabase
                .from('client_messages')
                .select(`
                    *,
                    clients (
                        name,
                        user_id
                    )
                `)
                .eq('sender_type', 'client')
                .eq('is_read', false)
                .eq('clients.user_id', userId)
                .order('created_at', { ascending: false })
                .limit(10);

            if (messagesError) {
                console.error('Error loading unread messages:', messagesError);
                return;
            }

            const formattedMessages = messagesData?.map((msg: any) => ({
                ...msg,
                client_name: msg.clients?.name || 'Cliente'
            })) || [];

            setMessages(formattedMessages);
            setUnreadCount(formattedMessages.length);

        } catch (error) {
            console.error('Error in loadUnreadMessages:', error);
        } finally {
            setLoading(false);
        }
    };

    const markAsRead = async (messageId: string) => {
        try {
            const supabase = createSupabaseClient();
            
            const { error } = await supabase
                .from('client_messages')
                .update({ is_read: true })
                .eq('id', messageId);

            if (!error) {
                setMessages(prev => prev.filter(msg => msg.id !== messageId));
                setUnreadCount(prev => Math.max(0, prev - 1));
            }
        } catch (error) {
            console.error('Error marking message as read:', error);
        }
    };

    const markAllAsRead = async () => {
        try {
            const supabase = createSupabaseClient();
            const user = (await supabase.auth.getUser()).data.user;

            if (!user) return;

            const { error } = await supabase
                .from('client_messages')
                .update({ is_read: true })
                .eq('sender_type', 'client')
                .eq('is_read', false)
                .in('client_id', await supabase
                    .from('clients')
                    .select('id')
                    .eq('user_id', user.id)
                    .then(({ data }: { data?: any[] }) => data?.map((c: any) => c.id) || [])
                );

            if (!error) {
                setMessages([]);
                setUnreadCount(0);
            }
        } catch (error) {
            console.error('Error marking all messages as read:', error);
        }
    };

    useEffect(() => {
        loadUnreadMessages();
        
        // Actualizar cada 30 segundos
        const interval = setInterval(loadUnreadMessages, 30000);
        
        return () => clearInterval(interval);
    }, [userEmail]);

    return {
        messages,
        unreadCount,
        loading,
        markAsRead,
        markAllAsRead,
        refreshMessages: loadUnreadMessages
    };
}
