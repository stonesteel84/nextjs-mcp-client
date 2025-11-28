/**
 * 애플리케이션 상수 정의
 * 마법 문자열/숫자를 상수화하여 유지보수성 향상
 */

// ============================================
// 채팅 관련 상수
// ============================================

export const CHAT = {
  DEFAULT_SESSION_TITLE: '새 채팅',
  SESSION_TITLE_MAX_LENGTH: 50,
  CLEAR_COMMANDS: [
    '대화내용을 다 지우라',
    '대화내용을 지워라',
    '대화 삭제',
    '채팅 삭제',
    '대화 지우기',
    '채팅 지우기',
  ],
} as const;

// ============================================
// LLM 관련 상수
// ============================================

export const LLM = {
  DEFAULT_MODEL: 'gemini-2.0-flash-001',
  CLIENT_NAME: 'nextjs-mcp-client',
  CLIENT_VERSION: '1.0.0',
} as const;

// ============================================
// UI 관련 상수
// ============================================

export const UI = {
  MESSAGE_MAX_WIDTH: '80%',
  AVATAR_SIZE: {
    SM: 'h-10 w-10',
    LG: 'h-16 w-16',
  },
  SCROLL_DELAY_MS: 0,
} as const;

// ============================================
// 에러 메시지
// ============================================

export const ERROR_MESSAGES = {
  GEMINI_NOT_CONFIGURED: 'GEMINI_API_KEY is not configured',
  MESSAGE_REQUIRED: 'Message is required',
  INTERNAL_SERVER_ERROR: 'Internal server error',
  FAILED_TO_CREATE_SESSION: 'Failed to create chat session',
  FAILED_TO_UPDATE_SESSION: 'Failed to update chat session',
  FAILED_TO_DELETE_SESSION: 'Failed to delete chat session',
  FAILED_TO_ADD_MESSAGE: 'Failed to add message',
  FAILED_TO_UPDATE_MESSAGE: 'Failed to update message',
  FAILED_TO_FETCH_SESSIONS: 'Error fetching chat sessions',
  FAILED_TO_FETCH_MESSAGES: 'Error fetching messages',
  SERVER_NOT_FOUND: 'Server not found',
  SERVER_ALREADY_CONNECTED: 'Server is already connected',
  SERVER_NOT_CONNECTED: 'Server is not connected',
  FAILED_TO_CONNECT: 'Failed to connect to server',
  FAILED_TO_CREATE_MCP_SERVER: 'Failed to create MCP server',
  FAILED_TO_UPDATE_MCP_SERVER: 'Failed to update MCP server',
  FAILED_TO_DELETE_MCP_SERVER: 'Failed to delete MCP server',
  MISSING_SUPABASE_ENV: 'Missing Supabase environment variables',
  INVALID_JSON_FORMAT: 'Invalid format: expected array',
  INVALID_ENV_JSON: '환경 변수는 유효한 JSON 형식이어야 합니다.',
} as const;

// ============================================
// SSE 이벤트 상수
// ============================================

export const SSE = {
  DONE_SIGNAL: '[DONE]',
  DATA_PREFIX: 'data: ',
  EVENT_TYPES: {
    TEXT: 'text',
    FUNCTION_CALL: 'function_call',
    FUNCTION_RESULT: 'function_result',
    DONE: 'done',
    ERROR: 'error',
  },
} as const;

// ============================================
// 외부 URL 상수
// ============================================

export const EXTERNAL_URLS = {
  GEMINI_AVATAR: 'https://www.gstatic.com/lamda/images/gemini_sparkle_v002_d4735304ff6292a690345.svg',
  USER_AVATAR: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=100&h=100&fit=crop&crop=center',
  BACKGROUND_IMAGE: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&h=1080&fit=crop',
} as const;

// ============================================
// DB 테이블명
// ============================================

export const DB_TABLES = {
  CHAT_SESSIONS: 'chat_sessions',
  MESSAGES: 'messages',
  MCP_SERVERS: 'mcp_servers',
} as const;

