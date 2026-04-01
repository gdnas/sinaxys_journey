// Simple internal API to compute company initials (client-side helper)
import { supabase } from "@/integrations/supabase/client";

export default async function handler(req: any, res: any) {
  const { companyId } = req.query;
  if (!companyId) return res.status(400).json({ error: 'companyId required' });
  try {
    const { data: comp, error } = await supabase.from('companies').select('name, trade_name').eq('id', companyId).maybeSingle();
    if (error) throw error;
    const companyName = (comp && (comp.trade_name || comp.name)) || 'COMP';
    const words = companyName.replace(/[^\p{L}\s]/gu, ' ').split(/\s+/).filter(Boolean).slice(0,5);
    const ignore = new Set(['da','de','do','das','dos','e','the','and','of','&']);
    const initialsArr: string[] = [];
    for (const w of words) {
      const lw = w.toLowerCase();
      if (words.length > 2 && ignore.has(lw)) continue;
      const m = w.match(/\p{L}/u);
      if (m) initialsArr.push(w[0].toUpperCase());
      if (initialsArr.length >= 3) break;
    }
    const initials = (initialsArr.join('') || companyName.slice(0,2).toUpperCase()).replace(/[^A-Z]/g, '').slice(0,3);
    return res.status(200).json({ initials });
  } catch (e:any) {
    return res.status(500).json({ error: e?.message || String(e) });
  }
}
