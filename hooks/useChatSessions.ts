'use client';

import { useState, useCallback, useEffect } from 'react';
import type { ChatSession, Message } from '@/types';
import {
  getChatSessions,
  createChatSession,
  deleteChatSession,
  getSessionMessages,
} from '@/app/actions/chat';

interface UseChatSessionsReturn {
  sessions: ChatSession[];
  currentSessionId: string | null;
  isLoading: boolean;
  createNewSession: () => Promise<void>;
  selectSession: (sessionId: string) => Promise<Message[]>;
  deleteSession: (sessionId: string) => Promise<void>;
  refreshSessions: () => Promise<ChatSession[]>;
  setCurrentSessionId: (id: string | null) => void;
}

/**
 * 채팅 세션 관리 훅
 * 세션 CRUD 및 상태 관리를 담당
 */
export function useChatSessions(): UseChatSessionsReturn {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 세션 목록 새로고침
  const refreshSessions = useCallback(async () => {
    try {
      const loadedSessions = await getChatSessions();
      setSessions(loadedSessions);
      return loadedSessions;
    } catch (error) {
      console.error('Failed to refresh sessions:', error);
      return [];
    }
  }, []);

  // 새 세션 생성
  const createNewSession = useCallback(async () => {
    try {
      const newSession = await createChatSession();
      setSessions((prev) => [newSession, ...prev]);
      setCurrentSessionId(newSession.id);
    } catch (error) {
      console.error('Failed to create session:', error);
      throw error;
    }
  }, []);

  // 세션 선택 및 메시지 로드
  const selectSession = useCallback(async (sessionId: string): Promise<Message[]> => {
    try {
      const messages = await getSessionMessages(sessionId);
      setCurrentSessionId(sessionId);
      return messages;
    } catch (error) {
      console.error('Failed to load session messages:', error);
      return [];
    }
  }, []);

  // 세션 삭제
  const deleteSession = useCallback(async (sessionId: string) => {
    try {
      await deleteChatSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      
      // 현재 세션이 삭제된 경우 다른 세션으로 전환
      if (currentSessionId === sessionId) {
        const updatedSessions = await getChatSessions();
        if (updatedSessions.length > 0) {
          setCurrentSessionId(updatedSessions[0].id);
        } else {
          // 세션이 없으면 새로 생성
          await createNewSession();
        }
      }
    } catch (error) {
      console.error('Failed to delete session:', error);
      throw error;
    }
  }, [currentSessionId, createNewSession]);

  // 초기 로드 (마운트 시 한 번만)
  useEffect(() => {
    let mounted = true;
    
    const initializeSessions = async () => {
      setIsLoading(true);
      try {
        const loadedSessions = await getChatSessions();
        if (!mounted) return;
        
        if (loadedSessions.length > 0) {
          setSessions(loadedSessions);
          setCurrentSessionId(loadedSessions[0].id);
        } else {
          // 직접 세션 생성 (createNewSession 호출 대신)
          const newSession = await createChatSession();
          if (!mounted) return;
          setSessions([newSession]);
          setCurrentSessionId(newSession.id);
        }
      } catch (error) {
        console.error('Failed to initialize sessions:', error);
        // 에러 시에도 새 세션 생성 시도
        try {
          const newSession = await createChatSession();
          if (!mounted) return;
          setSessions([newSession]);
          setCurrentSessionId(newSession.id);
        } catch (e) {
          console.error('Failed to create fallback session:', e);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    initializeSessions();
    
    return () => {
      mounted = false;
    };
  }, []); // 의존성 배열 비움

  return {
    sessions,
    currentSessionId,
    isLoading,
    createNewSession,
    selectSession,
    deleteSession,
    refreshSessions,
    setCurrentSessionId,
  };
}

