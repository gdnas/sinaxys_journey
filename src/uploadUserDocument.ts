// src/services/uploadUserDocument.ts
import { supabase } from '../lib/supabase'; // ajuste se seu client estiver em outro lugar

export async function uploadUserDocument({
  file,
  title,
  category,
}: {
  file: File;
  title: string;
  category: string;
}) {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user) {
    return { success: false, message: 'Usuário não autenticado.' };
  }
  const user = userData.user;

  const timestamp = Date.now();
  const safeFileName = file.name.replace(/\s+/g, '_');
  const filePath = `user-documents/${user.id}/${timestamp}_${safeFileName}`;

  // upload para o bucket (troque 'user-documents' se seu bucket tiver outro nome)
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('user-documents')
    .upload(filePath, file, { cacheControl: '3600', upsert: false });

  if (uploadError) {
    return { success: false, message: uploadError.message || 'Erro no upload' };
  }

  // inserir metadados na tabela (troque 'user_documents' pelo nome da sua tabela)
  const { data: insertData, error: insertError } = await supabase
    .from('user_documents')
    .insert([
      {
        user_id: user.id,
        title,
        category,
        file_path: uploadData?.path ?? filePath,
        mime_type: file.type,
      },
    ]);

  if (insertError) {
    // tenta limpar o arquivo se a insert falhar
    await supabase.storage.from('user-documents').remove([uploadData?.path ?? filePath]);
    return { success: false, message: insertError.message || 'Erro ao salvar metadados' };
  }

  return { success: true, data: insertData };
}
