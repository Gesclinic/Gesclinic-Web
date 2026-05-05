import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

/**
 * Componente reutilizável para exibir informações de usuário
 * Props: user { full_name, email, phone, role, status, avatar_url }
 */
export default function UserInfoCard({ user }) {
  if (!user) {
    return null;
  }
  return (
    <Card className="flex flex-col md:flex-row items-center gap-4 p-4">
      <Avatar>
        <AvatarImage src={user.avatar_url} alt={user.full_name} />
        <AvatarFallback>{user.full_name?.[0] || 'U'}</AvatarFallback>
      </Avatar>
      <CardContent className="flex-1">
        <div className="font-semibold text-lg">{user.full_name}</div>
        <div className="text-sm text-muted-foreground">{user.email}</div>
        {user.phone && <div className="text-sm">Telefone: {user.phone}</div>}
        <div className="flex gap-2 mt-2">
          {user.role && <Badge variant="secondary">{user.role}</Badge>}
          {user.status && (
            <Badge variant={user.status === 'active' ? 'success' : 'destructive'}>
              {user.status === 'active' ? 'Ativo' : 'Inativo'}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
