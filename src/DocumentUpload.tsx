// src/components/DocumentUpload.tsx
import React, { useState } from 'react';
import { uploadUserDocument } from '../uploadUserDocument';

export default function DocumentUpload({ onDone }: { onDone?: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return alert('Escolha um arquivo');
    setLoading(true);
    const res = await uploadUserDocument({ file, title, category });
    setLoading(false);
    if (!res.success) {
      alert('Erro: ' + (res.message ?? 'Desconhecido'));
      return;
    }
    alert('Upload concluído');
    onDone?.();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input
        className="w-full p-2 rounded-md"
        placeholder="Título"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <input
        className="w-full p-2 rounded-md"
        placeholder="Categoria"
        value={category}
        onChange={(e) => setCategory(e.target.value)}
      />
      <input
        type="file"
        accept="application/pdf,image/*"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
      />
      <button
        type="submit"
        className="px-4 py-2 rounded-md bg-violet-600 text-white"
        disabled={loading}
      >
        {loading ? 'Enviando...' : 'Adicionar'}
      </button>
    </form>
  );
}