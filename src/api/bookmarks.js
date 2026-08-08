import { supabase } from '../lib/supabaseClient';

// 마이캣 북마크 (§2.12). bookmarks 테이블 PK = (user_id, cat_id), 실물 DELETE만 — soft-delete 없음.

/** 북마크 토글. isBookmarked 는 토글 "전" 상태 — true 면 delete, false 면 insert. */
export async function toggleBookmark(catId, isBookmarked) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('LOGIN_REQUIRED');

  if (isBookmarked) {
    // 0행 삭제도 정상 케이스라 read-back을 붙이지 않는다 — 에러 유무만 본다.
    const { error } = await supabase.from('bookmarks')
      .delete().eq('user_id', user.id).eq('cat_id', catId);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('bookmarks')
      .insert({ user_id: user.id, cat_id: catId });
    if (error) throw error;
  }
}

/** 내 북마크 전체 (MyCatPage 목록용). */
export async function fetchMyBookmarks() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase.from('bookmarks')
    .select('cat_id, created_at').eq('user_id', user.id);
  if (error) throw error;
  return data;
}

/** 이 고양이가 북마크돼 있는지 (CatDetailPage 초기 상태용). */
export async function isBookmarked(catId) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data, error } = await supabase.from('bookmarks')
    .select('cat_id').eq('user_id', user.id).eq('cat_id', catId);
  if (error) throw error;
  return (data ?? []).length > 0;
}
