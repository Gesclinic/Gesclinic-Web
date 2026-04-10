
import React from 'react';
import { Loader2 } from 'lucide-react';

const Loading = () => {
  return (
    <div className="flex items-center justify-center h-screen w-screen bg-background">
      <div className="flex flex-col items-center space-y-4">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    </div>
  );
};

export default Loading;
