/**
 * DB 레코드 ↔ 애플리케이션 타입 매핑 유틸리티
 * snake_case ↔ camelCase 변환을 중앙화
 */

import type {
  Message,
  ChatSession,
  StoredMCPServer,
  DbMessage,
  DbChatSession,
  DbMCPServer,
  TransportType,
} from '@/types';

// ============================================
// Chat 매핑
// ============================================

/**
 * DB 메시지 레코드를 Message 타입으로 변환
 */
export function mapDbToMessage(db: DbMessage): Message {
  return {
    id: db.id,
    role: db.role as 'user' | 'assistant',
    content: db.content,
    imageUrl: db.image_url || undefined,
  };
}

/**
 * Message를 DB 삽입용 객체로 변환
 */
export function mapMessageToDb(
  message: Omit<Message, 'id'>,
  sessionId: string,
  id: string,
  createdAt: number
): Omit<DbMessage, 'id'> & { id: string } {
  return {
    id,
    session_id: sessionId,
    role: message.role,
    content: message.content,
    image_url: message.imageUrl || null,
    created_at: createdAt,
  };
}

/**
 * DB 세션 레코드를 ChatSession 타입으로 변환 (메시지 없이)
 */
export function mapDbToSession(db: DbChatSession, messages: Message[] = []): ChatSession {
  return {
    id: db.id,
    title: db.title,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
    messages,
  };
}

// ============================================
// MCP Server 매핑
// ============================================

/**
 * DB MCP 서버 레코드를 StoredMCPServer 타입으로 변환
 */
export function mapDbToMCPServer(db: DbMCPServer): StoredMCPServer {
  return {
    id: db.id,
    name: db.name,
    transport: db.transport as TransportType,
    command: db.command || undefined,
    args: db.args || undefined,
    env: db.env || undefined,
    url: db.url || undefined,
    headers: db.headers || undefined,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}

/**
 * StoredMCPServer를 DB 삽입/업데이트용 객체로 변환
 */
export function mapMCPServerToDb(
  server: Omit<StoredMCPServer, 'createdAt' | 'updatedAt'>,
  createdAt: number,
  updatedAt: number
): Omit<DbMCPServer, 'created_at' | 'updated_at'> & { created_at: number; updated_at: number } {
  return {
    id: server.id,
    name: server.name,
    transport: server.transport,
    command: server.command || null,
    args: server.args || null,
    env: server.env || null,
    url: server.url || null,
    headers: server.headers || null,
    created_at: createdAt,
    updated_at: updatedAt,
  };
}

/**
 * DB 업데이트용 객체 생성 (부분 업데이트)
 */
export function mapMCPServerToDbUpdate(
  server: Omit<StoredMCPServer, 'createdAt' | 'updatedAt'>,
  updatedAt: number
): Partial<DbMCPServer> {
  return {
    name: server.name,
    transport: server.transport,
    command: server.command || null,
    args: server.args || null,
    env: server.env || null,
    url: server.url || null,
    headers: server.headers || null,
    updated_at: updatedAt,
  };
}

