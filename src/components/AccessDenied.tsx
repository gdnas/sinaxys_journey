import { AlertCircle } from 'lucide-react';

export default function AccessDenied({ message }: { message?: string }) {
  return (
    <div className="flex min-h-[400px] items-center justify-center p-8">
      <div className="text-center">
        <AlertCircle className="mx-auto mb-4 h-16 w-16 text-red-500" />
        <h1 className="text-2xl font-bold text-red-600">Acesso negado</h1>
        <p className="mt-2 text-muted-foreground">
          {message ?? 'Você não tem permissão para acessar este projeto.'}
        </p>
      </div>
    </div>
  );
}
