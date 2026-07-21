import { supabase } from '../lib/supabaseClient';
import { POLICY } from '../config/policy';

/** 과급식 경고용 */
export async function lastFeeding(catId) {
  const { data, error } = await supabase
    .from('feedings').select('id, kind, fed_at')
    .eq('cat_id', catId).is('deleted_at', null)
    .order('fed_at', { ascending: false }).limit(1).maybeSingle();
  if (error) throw error;
  return data;
}

export function isTooSoon(lastFedAt) {
  if (!lastFedAt) return false;
  return (Date.now() - new Date(lastFedAt).getTime()) / 3600000
         < POLICY.RECENT_FEED_WARN_HOURS;
}

/** 급식 원탭. kind 기본값이 'food' 라서 버튼 한 번이면 끝난다. */
export async function addFeeding({ catId, kind = 'food' }) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('LOGIN_REQUIRED');

  const { data, error } = await supabase.from('feedings')
    .insert({ cat_id: catId, giver_id: user.id, kind })
    .select().single();
  if (error) throw error;
  return data;
}
