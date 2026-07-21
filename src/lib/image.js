// ============================================================
// 업로드 전처리 — 원칙 4 (EXIF GPS 제거, 비협상)
//
// 캔버스에 다시 그린 뒤 내보내면 EXIF 가 통째로 사라진다.
// "GPS 태그만 골라 지운다"보다 안전하다 — 빠뜨릴 태그가 없다.
//
// ⚠️ 반드시 이 함수를 통과한 Blob 만 Storage 로 보낼 것.
//    원본 File 을 그대로 업로드하는 코드가 하나라도 있으면 원칙 4가 깨진다.
// ============================================================

import { POLICY } from '../config/policy';

const HEIC_RE = /\.hei[cf]$/i;

export function isHeic(file) {
  return HEIC_RE.test(file.name) || file.type === 'image/heic' || file.type === 'image/heif';
}

export async function sanitizeImage(file, opts = {}) {
  const maxSide = opts.maxSide ?? POLICY.PHOTO_MAX_SIDE;
  const quality = opts.quality ?? POLICY.PHOTO_QUALITY;

  // HEIC: 대부분의 브라우저가 디코딩하지 못한다.
  // Phase D 에서 heic2any 를 붙일 것:  npm i heic2any
  //   const heic2any = (await import('heic2any')).default;
  //   source = await heic2any({ blob: file, toType: 'image/jpeg', quality });
  if (isHeic(file)) throw new Error('HEIC_NOT_SUPPORTED_YET');

  // imageOrientation: 'from-image' → 회전 EXIF 를 픽셀에 반영한 뒤 버린다.
  // (빼면 아이폰 세로 사진이 눕는다)
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });

  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  canvas.getContext('2d').drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();

  const blob = await new Promise((res, rej) =>
    canvas.toBlob((b) => (b ? res(b) : rej(new Error('ENCODE_FAILED'))), 'image/jpeg', quality)
  );
  return { blob, width: w, height: h };
}

/** 목록용 썸네일 */
export const makeThumb = (file) => sanitizeImage(file, { maxSide: 480, quality: 0.75 });
