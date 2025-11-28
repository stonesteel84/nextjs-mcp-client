/**
 * 공통 타입 정의
 * 모든 타입을 중앙에서 관리하여 일관성 유지
 */

// ============================================
// Chat 관련 타입
// ============================================

export type MessageRole = 'user' | 'assistant';

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  imageUrl?: string;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: Message[];
}

// DB 레코드 타입 (snake_case)
export interface DbMessage {
  id: string;
  session_id: string;
  role: string;
  content: string;
  image_url: string | null;
  created_at: number;
}

export interface DbChatSession {
  id: string;
  title: string;
  created_at: number;
  updated_at: number;
}

// ============================================
// MCP 관련 타입
// ============================================

export type TransportType = 'stdio' | 'streamable-http' | 'sse';

export interface MCPServerConfig {
  id: string;
  name: string;
  transport: TransportType;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
  headers?: Record<string, string>;
}

export interface StoredMCPServer extends MCPServerConfig {
  createdAt: number;
  updatedAt: number;
}

// DB 레코드 타입 (snake_case)
export interface DbMCPServer {
  id: string;
  name: string;
  transport: string;
  command: string | null;
  args: string[] | null;
  env: Record<string, string> | null;
  url: string | null;
  headers: Record<string, string> | null;
  created_at: number;
  updated_at: number;
}

// ============================================
// API 응답 타입
// ============================================

export interface ApiError {
  error: string;
}

export interface ApiSuccess<T> {
  data: T;
}

// ============================================
// 폼 상태 타입
// ============================================

export interface MCPServerFormData {
  name: string;
  transport: TransportType;
  command: string;
  args: string;
  env: string;
  url: string;
  headers: string;
}

// ============================================
// Gemini API 타입
// ============================================

export interface GeminiMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}

export interface ChatHistory {
  role: MessageRole;
  parts: { text: string }[];
}

// ============================================
// MCP Tool 호출 관련 타입
// ============================================

export interface FunctionCallInfo {
  id: string;
  name: string;
  args: Record<string, unknown>;
  status: 'pending' | 'executing' | 'completed' | 'error';
  result?: unknown;
  error?: string;
  timestamp: number;
}

export interface MCPToolMessage extends Message {
  functionCalls?: FunctionCallInfo[];
}

// SSE 이벤트 타입
export type SSEEventType = 'text' | 'function_call' | 'function_result' | 'done' | 'error';

export interface SSEEvent {
  type: SSEEventType;
  data: {
    text?: string;
    imageUrl?: string;
    functionCall?: {
      id: string;
      name: string;
      args: Record<string, unknown>;
    };
    functionResult?: {
      id: string;
      name: string;
      result: unknown;
      imageUrl?: string;
    };
    error?: string;
  };
}

// MCP 도구 설정
export interface MCPToolConfig {
  enabled: boolean;
  serverIds: string[];
}

