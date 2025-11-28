-- Storage bucket 생성 (chat-images)
-- Supabase Storage는 SQL로 직접 생성할 수 없으므로
-- Supabase Dashboard에서 수동으로 생성하거나
-- Supabase Management API를 사용해야 합니다.

-- 참고: 이 마이그레이션은 주석으로만 남겨두고,
-- 실제 bucket 생성은 Supabase Dashboard에서 수행하거나
-- 아래 주석의 SQL을 Supabase SQL Editor에서 실행하세요.

/*
-- Storage bucket 생성은 Supabase Dashboard의 Storage 섹션에서 수행하거나
-- 다음 설정으로 생성:
-- Bucket Name: chat-images
-- Public: true
-- File size limit: 5MB
-- Allowed MIME types: image/png, image/jpeg, image/jpg, image/gif, image/webp
*/

-- RLS 정책 추가 (bucket이 생성된 후)
-- Storage bucket에 대한 RLS 정책은 Supabase Dashboard에서 설정하거나
-- Storage API를 통해 설정해야 합니다.

