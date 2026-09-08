import React, { useEffect, useState, useCallback } from 'react';
import { Bell, CheckCheck, Eye, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import NotificationsPanel from '@/components/common/NotificationsPanel';
import { formatRelative } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function NotificationsBell() {
  const { clinicId, user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);

  // 🔁 Carrega notificações mais recentes
  const fetchUnreadCount = useCallback(async () => {
    if (!clinicId || !user?.id) {
      console.log('🔔 SKIP Notifications - clinicId:', clinicId, 'user.id:', user?.id);
      return;
    }

    // 🐛 DEBUG: Verificar valores dos UUIDs
    console.log('🔔 DEBUG Notifications - clinicId:', clinicId, 'type:', typeof clinicId);
    console.log('🔔 DEBUG Notifications - user.id:', user.id, 'type:', typeof user.id);

    try {
      const { data, error } = await supabase.rpc('get_unread_notifications_count', {
        p_clinic_id: clinicId,
        p_user_id: user.id,
      });
      if (error) {
        throw error;
      }
      setUnreadCount(data[0]?.count || 0);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  }, [clinicId, user?.id]);

  const loadNotifications = useCallback(async () => {
    if (!clinicId || !user?.id) {
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*, read:notifications_read(notification_id)')
        .eq('clinic_id', clinicId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        throw error;
      }

      const processed = data.map((n) => ({
        ...n,
        is_read: n.read.length > 0,
      }));
      setNotifications(processed);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [clinicId, user?.id]);

  // ✅ Marca todas como lidas
  const markAllRead = async () => {
    if (!clinicId || !user?.id || notifications.length === 0) {
      return;
    }
    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);
    if (unreadIds.length === 0) {
      return;
    }

    const toInsert = unreadIds.map((id) => ({ notification_id: id, user_id: user.id }));

    await supabase
      .from('notifications_read')
      .upsert(toInsert, { onConflict: 'notification_id,user_id' });
    setUnreadCount(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setPopoverOpen(false);
  };

  // 🔔 Escuta alterações em tempo real via Realtime
  useEffect(() => {
    if (!clinicId) {
      return;
    }
    fetchUnreadCount();
    const channel = supabase
      .channel('public:notifications')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications' },
        (payload) => {
          fetchUnreadCount();
          if (popoverOpen) {
            loadNotifications();
          }
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications_read' },
        (payload) => {
          fetchUnreadCount();
          if (popoverOpen) {
            loadNotifications();
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [clinicId, user, fetchUnreadCount, loadNotifications, popoverOpen]);

  const handlePopoverOpen = (open) => {
    setPopoverOpen(open);
    if (open) {
      loadNotifications();
    }
  };

  const handlePanelClose = () => {
    setPanelOpen(false);
    fetchUnreadCount();
  };

  return (
    <>
      <Popover open={popoverOpen} onOpenChange={handlePopoverOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="relative">
            <Bell size={20} />
            {unreadCount > 0 && (
              <Badge
                variant="destructive"
                className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs rounded-full"
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-96 p-0" align="end">
          <div className="p-4 border-b flex items-center justify-between">
            <h3 className="font-semibold text-base text-gray-800 dark:text-gray-200">
              Notificações
            </h3>
            {unreadCount > 0 && (
              <Button
                variant="link"
                size="sm"
                onClick={markAllRead}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                <CheckCheck className="w-4 h-4 mr-1" /> Marcar todas como lidas
              </Button>
            )}
          </div>

          <ScrollArea className="h-[400px]">
            <div className="p-2">
              {loading ? (
                <div className="flex items-center justify-center p-6 text-sm text-gray-500">
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Carregando...
                </div>
              ) : notifications.length === 0 ? (
                <p className="text-center text-sm text-gray-500 py-6">Nenhuma notificação nova.</p>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`mb-2 p-3 rounded-md transition-colors ${!n.is_read ? 'bg-blue-50 dark:bg-blue-900/30 border-l-4 border-blue-500' : 'bg-transparent'}`}
                  >
                    <p
                      className={`font-semibold ${!n.is_read ? 'text-blue-800 dark:text-blue-300' : ''}`}
                    >
                      {n.title}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{n.message}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      {formatRelative(new Date(n.created_at), new Date(), { locale: ptBR })}
                    </p>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>

          <Separator />

          <div className="flex justify-center p-2 bg-gray-50 dark:bg-gray-800/50">
            <Button
              variant="ghost"
              size="sm"
              className="w-full flex items-center text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
              onClick={() => {
                setPanelOpen(true);
                setPopoverOpen(false);
              }}
            >
              <Eye className="w-4 h-4 mr-2" />
              Ver todas as notificações
            </Button>
          </div>
        </PopoverContent>
      </Popover>
      {panelOpen && <NotificationsPanel onClose={handlePanelClose} />}
    </>
  );
}
