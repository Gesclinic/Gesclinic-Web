import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Bell, Check, Loader2, Volume2, VolumeX } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useRealtimeManager } from '@/hooks/useRealtimeManager';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * 🔔 Painel de Notificações com Realtime + Som opcional
 * 
 * CORREÇÕES APLICADAS:
 * ✅ RealtimeManager para deduplicação
 * ✅ soundEnabled NÃO em dependências (evita re-subscribes)
 * ✅ Dedup de notificações duplicadas
 * ✅ Throttle de refetch
 * ✅ Logs estruturados
 * ✅ Cleanup seguro
 */
export default function NotificationPanel() {
  const { user, clinicId } = useAuth();
  const manager = useRealtimeManager(clinicId);

  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(() => {
    return localStorage.getItem('gesclinic-sound-enabled') !== 'false';
  });

  // 🔄 Cache de notificações recentes (para deduplicação)
  const recentNotificationIds = useRef(new Set());
  const lastRefreshTime = useRef(0);
  
  const notificationSound = new Audio('/sounds/notify.mp3');

  /**
   * 🔹 Busca notificações recentes - memoizado para evitar closures
   */
  const fetchNotifications = useCallback(async () => {
    if (!user || !clinicId) {
      return;
    }

    // Throttle: não refetch se foi feito há menos de 1s
    const now = Date.now();
    if (lastRefreshTime.current && now - lastRefreshTime.current < 1000) {
      console.log('[NotificationPanel] Throttle: ignorando refetch muito rápido');
      return;
    }

    try {
      setLoading(true);
      console.log('[NotificationPanel] Buscando notificações', { userId: user.id, clinicId });

      const { data, error } = await supabase.rpc('list_recent_notifications', {
        p_user_id: user.id,
        p_clinic_id: clinicId,
        p_limit: 10,
      });

      if (error) {
        console.error('[NotificationPanel] Erro ao buscar:', error);
        return;
      }

      if (data && data.length > 0) {
        setNotifications(data);
        const unread = data.filter((n) => !n.read_at).length;
        setUnreadCount(unread);
        console.log('[NotificationPanel] ✅ Notificações carregadas:', data.length);
      }

      lastRefreshTime.current = now;
    } catch (err) {
      console.error('[NotificationPanel] Erro:', err.message);
    } finally {
      setLoading(false);
    }
  }, [user, clinicId]);

  /**
   * 🔹 Marca uma notificação como lida
   */
  const markAsRead = useCallback(
    async (notificationId) => {
      if (!user) return;

      try {
        await supabase.rpc('mark_notification_as_read', {
          p_notification_id: notificationId,
          p_user_id: user.id,
        });
        
        // Atualizar local
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notificationId ? { ...n, read_at: new Date().toISOString() } : n
          )
        );
        
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch (err) {
        console.error('[NotificationPanel] Erro ao marcar como lida:', err);
      }
    },
    [user]
  );

  /**
   * 🔹 Listener Realtime para notificações novas - CORRIGIDO
   * NÃO coloca fetchNotifications ou soundEnabled em dependências
   */
  useEffect(() => {
    if (!user || !clinicId) {
      return;
    }

    // Carregar na montagem inicial
    fetchNotifications();

    console.log('[NotificationPanel] Setup realtime para notificações', { userId: user.id });

    // Subscribe usando RealtimeManager
    const unsubscribe = manager.subscribe('notifications', {
      onUpdate: (payload) => {
        console.log('[NotificationPanel] 📬 Notificação recebida:', {
          event: payload.eventType,
          id: payload.new?.id,
        });

        // Deduplicação: verificar se já temos essa notificação
        const notifId = payload.new?.id || payload.old?.id;
        if (recentNotificationIds.current.has(notifId)) {
          console.log('[NotificationPanel] 🔄 Notificação duplicada ignorada:', notifId);
          return;
        }

        recentNotificationIds.current.add(notifId);

        // Tocar som apenas se for nova notificação E sound habilitado
        if (payload.eventType === 'INSERT' && soundEnabled) {
          notificationSound.play().catch(() => {
            console.log('[NotificationPanel] Aviso: Som de notificação não pode ser tocado');
          });
        }

        // Refetch notificações (com throttle interno)
        fetchNotifications();
      },
      filter: `user_id=eq.${user.id}`,
    });

    return () => {
      console.log('[NotificationPanel] Limpando realtime');
      unsubscribe();
      recentNotificationIds.current.clear();
    };
  }, [user, clinicId, manager, fetchNotifications]); // NÃO incluir soundEnabled

  /**
   * 🔹 Alterna exibição do painel
   */
  const togglePanel = useCallback(async () => {
    setOpen((prev) => !prev);
    if (!open) {
      await fetchNotifications();
    }
  }, [open, fetchNotifications]);

  /**
   * 🔹 Alternar som (sem causar re-subscribe)
   */
  const toggleSound = useCallback(() => {
    const newValue = !soundEnabled;
    setSoundEnabled(newValue);
    localStorage.setItem('gesclinic-sound-enabled', String(newValue));
  }, [soundEnabled]);

  return (
    <div className="relative">
      {/* Botão principal */}
      <button
        onClick={togglePanel}
        className="relative p-2 rounded-full hover:bg-gray-100 transition"
        title="Notificações"
      >
        <Bell className="w-5 h-5 text-gray-700" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Painel */}
      {open && (
        <Card className="absolute right-0 mt-2 w-80 shadow-xl border z-50 bg-white animate-in fade-in slide-in-from-top-2">
          <CardContent className="p-0 max-h-96 overflow-y-auto">
            <div className="flex justify-between items-center p-3 border-b bg-gray-50">
              <span className="font-semibold text-sm text-gray-700">Notificações</span>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={toggleSound}
                  title={soundEnabled ? 'Desativar som de notificações' : 'Ativar som'}
                >
                  {soundEnabled ? (
                    <Volume2 className="w-4 h-4 text-gray-600" />
                  ) : (
                    <VolumeX className="w-4 h-4 text-gray-400" />
                  )}
                </Button>
                {loading && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
              </div>
            </div>

            {notifications.length === 0 ? (
              <div className="text-center text-sm text-muted-foreground py-8">
                Nenhuma notificação encontrada.
              </div>
            ) : (
              <ul className="divide-y">
                {notifications.map((n) => (
                  <li
                    key={n.id}
                    className={cn(
                      'p-3 flex justify-between gap-2 transition cursor-pointer',
                      !n.read_at ? 'bg-blue-50/40 hover:bg-blue-50' : 'hover:bg-gray-50',
                    )}
                    onClick={() => markAsRead(n.id)}
                  >
                    <div>
                      <p className="font-medium text-sm text-gray-800">
                        {n.title || 'Notificação'}
                      </p>
                      <p className="text-xs text-gray-600 line-clamp-2">{n.message}</p>
                      <p className="text-[10px] text-gray-400 mt-1">
                        {new Date(n.created_at).toLocaleString('pt-BR')}
                      </p>
                    </div>
                    {!n.read_at && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        title="Marcar como lida"
                      >
                        <Check className="w-4 h-4 text-green-600" />
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
