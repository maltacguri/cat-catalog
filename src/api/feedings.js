import { supabase } from '../lib/supabaseClient';
import { POLICY } from '../config/policy';
import { KIND_ORDER } from '../lib/format';

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

/** 집사 프로필 급식 카운터 3종 (§2.8-15). 로그인 안 돼 있으면 null. */
export async function fetchMyFeedCounts() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const results = await Promise.all(
    KIND_ORDER.map((k) => supabase.from('feedings')
      .select('*', { count: 'exact', head: true })
      .eq('giver_id', user.id).eq('kind', k))
  );

  const counts = {};
  KIND_ORDER.forEach((k, i) => {
    const { count, error } = results[i];
    if (error) throw error;
    counts[k] = count;
  });
  return counts;
}

/** 내가 급식한 고양이별 마지막 fed_at (§2.12, MyCatPage "밥 준 적 있음"). */
export async function fetchMyFeedTouches() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return {};

  const { data, error } = await supabase.from('feedings')
    .select('cat_id, fed_at').eq('giver_id', user.id);
  if (error) throw error;

  const lastFedByCat = {};
  (data ?? []).forEach((f) => {
    const prev = lastFedByCat[f.cat_id];
    if (!prev || new Date(f.fed_at) > new Date(prev)) lastFedByCat[f.cat_id] = f.fed_at;
  });
  return lastFedByCat;
}
