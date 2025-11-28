'use server';

import { createServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { generateSessionId, generateMessageId, mapDbToMessage, mapDbToSession } from '@/lib/utils';
import { CHAT, DB_TABLES, ERROR_MESSAGES } from '@/lib/constants';
import type { Message, ChatSession, DbMessage, DbChatSession } from '@/types';

// Re-export types for backward compatibility
export type { Message, ChatSession };

/**
 * 모든 채팅 세션 가져오기
 */
export async function getChatSessions(): Promise<ChatSession[]> {
  const supabase = createServerClient();

  const { data: sessions, error } = await supabase
    .from(DB_TABLES.CHAT_SESSIONS)
    .select('*')
    .order('updated_at', { ascending: false });

  if (error) {
    console.error(ERROR_MESSAGES.FAILED_TO_FETCH_SESSIONS, error);
    return [];
  }

  // 각 세션의 메시지 가져오기
  const sessionsWithMessages = await Promise.all(
    (sessions || []).map(async (session: DbChatSession) => {
      const { data: messages } = await supabase
        .from(DB_TABLES.MESSAGES)
        .select('*')
        .eq('session_id', session.id)
        .order('created_at', { ascending: true });

      return mapDbToSession(session, (messages || []).map(mapDbToMessage));
    })
  );

  return sessionsWithMessages;
}

/**
 * 채팅 세션 생성
 */
export async function createChatSession(title: string = CHAT.DEFAULT_SESSION_TITLE): Promise<ChatSession> {
  const supabase = createServerClient();
  const sessionId = generateSessionId();
  const now = Date.now();

  const { data, error } = await supabase
    .from(DB_TABLES.CHAT_SESSIONS)
    .insert({
      id: sessionId,
      title,
      created_at: now,
      updated_at: now,
    })
    .select()
    .single();

  if (error) {
    console.error(ERROR_MESSAGES.FAILED_TO_CREATE_SESSION, error);
    throw new Error(`${ERROR_MESSAGES.FAILED_TO_CREATE_SESSION}: ${error.message}`);
  }

  revalidatePath('/');

  return mapDbToSession(data as DbChatSession, []);
}

/**
 * 채팅 세션 업데이트
 */
export async function updateChatSession(
  sessionId: string,
  updates: { title?: string }
): Promise<void> {
  const supabase = createServerClient();

  const updateData: Record<string, unknown> = {
    updated_at: Date.now(),
  };

  if (updates.title !== undefined) {
    updateData.title = updates.title;
  }

  const { error } = await supabase
    .from(DB_TABLES.CHAT_SESSIONS)
    .update(updateData)
    .eq('id', sessionId);

  if (error) {
    console.error(ERROR_MESSAGES.FAILED_TO_UPDATE_SESSION, error);
    throw new Error(ERROR_MESSAGES.FAILED_TO_UPDATE_SESSION);
  }

  revalidatePath('/');
}

/**
 * 채팅 세션 삭제
 */
export async function deleteChatSession(sessionId: string): Promise<void> {
  const supabase = createServerClient();

  const { error } = await supabase
    .from(DB_TABLES.CHAT_SESSIONS)
    .delete()
    .eq('id', sessionId);

  if (error) {
    console.error(ERROR_MESSAGES.FAILED_TO_DELETE_SESSION, error);
    throw new Error(ERROR_MESSAGES.FAILED_TO_DELETE_SESSION);
  }

  revalidatePath('/');
}

/**
 * 메시지 추가
 */
export async function addMessage(
  sessionId: string,
  message: Omit<Message, 'id'>
): Promise<Message> {
  const supabase = createServerClient();
  const messageId = generateMessageId();
  const now = Date.now();

  const { data, error } = await supabase
    .from(DB_TABLES.MESSAGES)
    .insert({
      id: messageId,
      session_id: sessionId,
      role: message.role,
      content: message.content,
      image_url: message.imageUrl || null,
      created_at: now,
    })
    .select()
    .single();

  if (error) {
    console.error(ERROR_MESSAGES.FAILED_TO_ADD_MESSAGE, error);
    throw new Error(ERROR_MESSAGES.FAILED_TO_ADD_MESSAGE);
  }

  // 세션 업데이트 시간 갱신
  await supabase
    .from(DB_TABLES.CHAT_SESSIONS)
    .update({ updated_at: now })
    .eq('id', sessionId);

  // 첫 사용자 메시지인 경우 세션 제목 업데이트
  if (message.role === 'user') {
    const { data: session } = await supabase
      .from(DB_TABLES.CHAT_SESSIONS)
      .select('title')
      .eq('id', sessionId)
      .single();

    if (session?.title === CHAT.DEFAULT_SESSION_TITLE) {
      const title = message.content.slice(0, CHAT.SESSION_TITLE_MAX_LENGTH);
      await supabase
        .from(DB_TABLES.CHAT_SESSIONS)
        .update({ title })
        .eq('id', sessionId);
    }
  }

  revalidatePath('/');

  return mapDbToMessage(data as DbMessage);
}

/**
 * 메시지 업데이트 (스트리밍 중 내용 업데이트용)
 */
export async function updateMessage(
  messageId: string, 
  content: string, 
  imageUrl?: string
): Promise<void> {
  const supabase = createServerClient();

  const updateData: { content: string; image_url?: string | null } = { content };
  if (imageUrl !== undefined) {
    updateData.image_url = imageUrl || null;
  }

  const { error } = await supabase
    .from(DB_TABLES.MESSAGES)
    .update(updateData)
    .eq('id', messageId);

  if (error) {
    console.error(ERROR_MESSAGES.FAILED_TO_UPDATE_MESSAGE, error);
    throw new Error(ERROR_MESSAGES.FAILED_TO_UPDATE_MESSAGE);
  }

  // 스트리밍 중에는 revalidatePath를 호출하지 않음 (성능 최적화)
}

/**
 * 세션의 모든 메시지 가져오기
 */
export async function getSessionMessages(sessionId: string): Promise<Message[]> {
  const supabase = createServerClient();

  const { data: messages, error } = await supabase
    .from(DB_TABLES.MESSAGES)
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error(ERROR_MESSAGES.FAILED_TO_FETCH_MESSAGES, error);
    return [];
  }

  return (messages || []).map(mapDbToMessage);
}
