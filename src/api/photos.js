import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { POLICY } from '../config/policy';
import { sanitizeImage, makeThumb } from '../lib/image';

// 로드맵 §2.4 — 사진은 두 종류.
//   cover   : 대표 사진 1장. 공개 버킷. 고정 URL. 로그인 불필요.
//   gallery : 목격 사진들. 비공개 버킷. 서명 URL. 로그인 필요.

/** 대표 사진 URL. 공개라 동기 함수 — 화면이 깜빡이지 않는다. */
export function coverUrl(path) {
  if (!path) return null;
  return supabase.storage.from(POLICY.COVER_BUCKET).getPublicUrl(path).data.publicUrl;
}

/** 갤러리 사진 URL. 비로그인이면 null 이 온다 (에러 아님, 정상 동작). */
export async function galleryUrl(path) {
  if (!path) return null;
  const { data, error } = await supabase.storage
    .from(POLICY.PHOTO_BUCKET)
    .createSignedUrl(path, POLICY.SIGNED_URL_TTL_SEC);
  return error ? null : data.signedUrl;
}

export function useGalleryUrl(path) {
  const [url, setUrl] = useState(null);
  useEffect(() => {
    let alive = true;
    if (!path) { setUrl(null); return; }
    galleryUrl(path).then((u) => alive && setUrl(u)).catch(() => alive && setUrl(null));
    return () => { alive = false; };
  }, [path]);
  return url;
}

async function upload(bucket, path, blob) {
  const { error } = await supabase.storage.from(bucket).upload(path, blob, {
    contentType: 'image/jpeg', cacheControl: '3600', upsert: false,
  });
  if (error) throw error;
  return path;
}

const stamp = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

/**
 * 대표 사진 업로드 (동아리원·관리자만 호출).
 * ⚠️ 이 사진은 인터넷에 공개된다. 한 번 퍼진 URL 은 회수할 수 없다.
 */
export async function uploadCoverPhoto(file, { catId }) {
  const { blob } = await sanitizeImage(file);
  return upload(POLICY.COVER_BUCKET, `${catId}/${stamp()}.jpg`, blob);
}

/** 목격 사진 업로드. 원본 + 썸네일 두 장. */
export async function uploadSightingPhoto(file, { catId }) {
  const [full, thumb] = await Promise.all([sanitizeImage(file), makeThumb(file)]);
  const s = stamp();
  const path = `${catId}/${s}.jpg`;
  const thumbPath = `${catId}/${s}_thumb.jpg`;
  await Promise.all([
    upload(POLICY.PHOTO_BUCKET, path, full.blob),
    upload(POLICY.PHOTO_BUCKET, thumbPath, thumb.blob),
  ]);
  return { path, thumbPath };
}
