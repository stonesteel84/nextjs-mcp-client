-- MCP 서버에 커스텀 헤더 필드 추가 (Smithery 등 HTTP 기반 서버 인증용)
ALTER TABLE mcp_servers ADD COLUMN IF NOT EXISTS headers JSONB;

-- 기존 레코드에 null 값 설정 (이미 null이 기본값)
COMMENT ON COLUMN mcp_servers.headers IS 'Custom HTTP headers for streamable-http/sse transport (e.g., Authorization)';

