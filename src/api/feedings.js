import { supabase } from '../lib/supabaseClient';
import { POLICY } from '../config/policy';

/** 과급식 되묻기 — 같은 kind 최근 기록이 이 시간 안이면 true (§2.6) */
export function isTooSoon(lastFedAt) {
  if (!lastFedAt) return false;
  return (Date.now() - new Date(lastFedAt).getTime()) / 3600000
         < POLICY.RECENT_FEED_WARN_HOURS;
}

/**
 * 급식 원탭. fed_at 은 DB default(now())가 채우므로 여기서 넣지 않는다.
 * INSERT 후 .select() 로 읽어보되, feedings_select_authed 에는 지연이 없어(db-and-rls.md §4)
 * 보통 바로 읽힌다. 혹시 0행으로 못 읽으면(PGRST116) INSERT 자체는 이미 끝난 걸로 보고
 * 성공 처리한다 — sightings 의 read-back 문제(api/cats.js createCat)와 같은 이유로,
 * 재시도로 중복 INSERT 하지는 않는다. 다른 에러(CHECK·RLS 위반 등)는 그대로 던진다.
 */
export async function addFeeding(catId, kind) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('LOGIN_REQUIRED');

  const { data, error } = await supabase.from('feedings')
    .insert({ cat_id: catId, giver_id: user.id, kind })
    .select().single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data;
}
