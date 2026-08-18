import { supabase } from '../lib/supabaseClient';

// 고양이 민원 창구 (§2.16). deletion_requests(계정 삭제)와 분리된 신규 테이블 cat_reports.
// 처리는 개발자 1명이 Supabase 대시보드에서 한다 — 인앱 관리 화면 없음.

/**
 * 고양이 관련 요청 등록. cat_id 는 항상 NULL — 고양이 특정은 note 로 한다.
 * status/created_at 은 DB default 에 맡긴다.
 * ⚠️ .select() read-back 을 붙이지 않는다 — INSERT 성공 여부만 본다.
 */
export async function submitCatReport({ kind, note }) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('LOGIN_REQUIRED');

  const { error } = await supabase.from('cat_reports').insert({
    user_id: user.id,
    cat_id: null,
    kind,
    note: note?.trim() || null,
  });
  if (error) throw error;
}

/** 내 요청 목록 (최신순). RLS 가 본인 행만 내려주므로 user_id 필터를 걸지 않는다. */
export async function fetchMyReports() {
  const { data, error } = await supabase
    .from('cat_reports')
    .select('id, created_at, kind, note, status, admin_note')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}
