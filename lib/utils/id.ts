/**
 * ID 생성 유틸리티
 * 일관된 ID 생성 로직 제공
 */

/**
 * 고유 ID 생성 (timestamp + random string)
 * @param prefix - ID 앞에 붙을 접두사
 * @returns 생성된 고유 ID
 */
export function generateId(prefix?: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 11);
  
  if (prefix) {
    return `${prefix}-${timestamp}-${random}`;
  }
  return `${timestamp}-${random}`;
}

/**
 * 세션 ID 생성
 */
export function generateSessionId(): string {
  return generateId('session');
}

/**
 * 메시지 ID 생성
 */
export function generateMessageId(): string {
  return generateId();
}

/**
 * MCP 서버 ID 생성
 */
export function generateMCPServerId(): string {
  return generateId('mcp');
}

