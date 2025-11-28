/**
 * Supabase Storage 이미지 업로드 유틸리티
 */

import { createServerClient } from '@/lib/supabase/server';

const BUCKET_NAME = 'chat-images';

/**
 * Base64 이미지를 Supabase Storage에 업로드
 * @param base64Data - data:image/png;base64,... 형식의 base64 문자열
 * @param sessionId - 채팅 세션 ID (폴더 구조화용)
 * @param messageId - 메시지 ID (파일명용)
 * @returns 업로드된 이미지의 public URL
 */
export async function uploadImageToStorage(
  base64Data: string,
  sessionId: string,
  messageId: string
): Promise<string> {
  const supabase = createServerClient();

  // Base64 데이터 파싱
  const base64Match = base64Data.match(/^data:image\/(\w+);base64,(.+)$/);
  if (!base64Match) {
    throw new Error('Invalid base64 image format. Expected: data:image/<type>;base64,<data>');
  }

  const [, imageType, base64String] = base64Match;
  const imageBuffer = Buffer.from(base64String, 'base64');

  // 파일명 생성: {messageId}.{ext}
  const extension = imageType === 'jpeg' ? 'jpg' : imageType;
  const fileName = `${messageId}.${extension}`;
  const filePath = `${sessionId}/${fileName}`;

  // Storage에 업로드
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, imageBuffer, {
      contentType: `image/${imageType}`,
      upsert: true, // 같은 파일이 있으면 덮어쓰기
    });

  if (error) {
    console.error('Error uploading image to storage:', error);
    throw new Error(`Failed to upload image: ${error.message}`);
  }

  // Public URL 생성
  const { data: urlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(filePath);

  if (!urlData?.publicUrl) {
    throw new Error('Failed to get public URL for uploaded image');
  }

  return urlData.publicUrl;
}

/**
 * MCP 도구 응답에서 base64 이미지 추출 및 업로드
 * @param toolResult - MCP 도구 호출 결과
 * @param sessionId - 채팅 세션 ID
 * @param messageId - 메시지 ID
 * @returns 업로드된 이미지 URL 배열
 */
export async function extractAndUploadImages(
  toolResult: unknown,
  sessionId: string,
  messageId: string
): Promise<string[]> {
  const imageUrls: string[] = [];
  
  if (!toolResult) {
    return imageUrls;
  }

  // MCP content 배열 형식 처리 (type: 'image' 또는 type: 'text' with data:image/)
  if (Array.isArray(toolResult)) {
    for (let i = 0; i < toolResult.length; i++) {
      const item = toolResult[i];
      
      // MCP content 형식: { type: 'image', data: base64Data, mimeType: 'image/png' }
      if (typeof item === 'object' && item !== null && 'type' in item) {
        const contentItem = item as { type: string; data?: string; text?: string; mimeType?: string };
        
        // type이 'image'이고 data가 있는 경우
        if (contentItem.type === 'image' && contentItem.data && contentItem.mimeType) {
          try {
            // base64Data를 data:image/... 형식으로 변환
            const base64ImageUrl = `data:${contentItem.mimeType};base64,${contentItem.data}`;
            const url = await uploadImageToStorage(base64ImageUrl, sessionId, `${messageId}-${i}`);
            imageUrls.push(url);
          } catch (error) {
            console.error(`Failed to upload image from content[${i}]:`, error);
          }
        }
        // type이 'text'이고 data:image/로 시작하는 경우
        else if (contentItem.type === 'text' && typeof contentItem.text === 'string' && contentItem.text.startsWith('data:image/')) {
          try {
            const url = await uploadImageToStorage(contentItem.text, sessionId, `${messageId}-${i}`);
            imageUrls.push(url);
          } catch (error) {
            console.error(`Failed to upload image from content[${i}].text:`, error);
          }
        }
        // 일반 객체인 경우 재귀적으로 처리
        else if (typeof item === 'object' && item !== null) {
          const urls = await extractImagesFromObject(item as Record<string, unknown>, sessionId, `${messageId}-${i}`);
          imageUrls.push(...urls);
        }
      }
      // 문자열인 경우 (data:image/로 시작)
      else if (typeof item === 'string' && item.startsWith('data:image/')) {
        try {
          const url = await uploadImageToStorage(item, sessionId, `${messageId}-${i}`);
          imageUrls.push(url);
        } catch (error) {
          console.error(`Failed to upload image from array[${i}]:`, error);
        }
      }
      // 일반 객체인 경우
      else if (typeof item === 'object' && item !== null) {
        const urls = await extractImagesFromObject(item as Record<string, unknown>, sessionId, `${messageId}-${i}`);
        imageUrls.push(...urls);
      }
    }
  } 
  // toolResult가 객체인 경우
  else if (typeof toolResult === 'object' && toolResult !== null && !Array.isArray(toolResult)) {
    const urls = await extractImagesFromObject(toolResult as Record<string, unknown>, sessionId, messageId);
    imageUrls.push(...urls);
  }

  return imageUrls;
}

/**
 * 객체에서 base64 이미지 추출 및 업로드
 */
async function extractImagesFromObject(
  obj: Record<string, unknown>,
  sessionId: string,
  messageId: string
): Promise<string[]> {
  const imageUrls: string[] = [];

  for (const [key, value] of Object.entries(obj)) {
    // Base64 이미지 문자열인 경우
    if (typeof value === 'string' && value.startsWith('data:image/')) {
      try {
        const url = await uploadImageToStorage(value, sessionId, `${messageId}-${key}`);
        imageUrls.push(url);
      } catch (error) {
        console.error(`Failed to upload image from ${key}:`, error);
      }
    }
    // 중첩된 객체인 경우 재귀적으로 처리
    else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      const nestedUrls = await extractImagesFromObject(
        value as Record<string, unknown>,
        sessionId,
        `${messageId}-${key}`
      );
      imageUrls.push(...nestedUrls);
    }
    // 배열인 경우
    else if (Array.isArray(value)) {
      for (let i = 0; i < value.length; i++) {
        const item = value[i];
        if (typeof item === 'string' && item.startsWith('data:image/')) {
          try {
            const url = await uploadImageToStorage(item, sessionId, `${messageId}-${key}-${i}`);
            imageUrls.push(url);
          } catch (error) {
            console.error(`Failed to upload image from ${key}[${i}]:`, error);
          }
        } else if (typeof item === 'object' && item !== null) {
          const nestedUrls = await extractImagesFromObject(
            item as Record<string, unknown>,
            sessionId,
            `${messageId}-${key}-${i}`
          );
          imageUrls.push(...nestedUrls);
        }
      }
    }
  }

  return imageUrls;
}

/**
 * Storage bucket이 존재하는지 확인하고 없으면 생성
 * (개발 환경에서만 사용)
 */
export async function ensureStorageBucket(): Promise<void> {
  const supabase = createServerClient();

  // Bucket 목록 조회
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();

  if (listError) {
    console.error('Error listing buckets:', listError);
    throw new Error(`Failed to list buckets: ${listError.message}`);
  }

  // Bucket이 이미 존재하는지 확인
  const bucketExists = buckets?.some((bucket) => bucket.name === BUCKET_NAME);

  if (!bucketExists) {
    // Bucket 생성
    const { error: createError } = await supabase.storage.createBucket(BUCKET_NAME, {
      public: true, // Public으로 설정하여 URL로 직접 접근 가능
      fileSizeLimit: 5242880, // 5MB 제한
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'],
    });

    if (createError) {
      console.error('Error creating bucket:', createError);
      throw new Error(`Failed to create bucket: ${createError.message}`);
    }

    console.log(`Storage bucket "${BUCKET_NAME}" created successfully`);
  }
}

