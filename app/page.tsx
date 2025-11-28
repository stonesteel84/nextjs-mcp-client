'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChatSidebar } from '@/components/ChatSidebar';
import { ChatMessage, LoadingMessage, ChatInput, ChatHeader, EmptyState } from '@/components/chat';
import { useMCP } from '@/contexts/MCPContext';
import { useChatSessions } from '@/hooks/useChatSessions';
import { useChat } from '@/hooks/useChat';
import { EXTERNAL_URLS } from '@/lib/constants';

export default function Home() {
  const { connectedServers } = useMCP();
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // 세션 관리 훅
  const {
    sessions,
    currentSessionId,
    createNewSession,
    selectSession,
    deleteSession,
    refreshSessions,
  } = useChatSessions();

  // 채팅 관리 훅 (MCP 기능 포함)
  const {
    messages,
    isLoading,
    inputRef,
    sendMessage,
    clearMessages,
    setMessages,
    // MCP 관련
    mcpEnabled,
    setMcpEnabled,
    enabledServerIds,
    setEnabledServerIds,
  } = useChat({
    currentSessionId,
    onSessionsUpdate: refreshSessions,
  });

  // 세션 선택 시 메시지 로드
  const handleSessionSelect = useCallback(async (sessionId: string) => {
    const loadedMessages = await selectSession(sessionId);
    setMessages(loadedMessages);
  }, [selectSession, setMessages]);

  // 세션 삭제 핸들러
  const handleDeleteSession = useCallback(async (sessionId: string) => {
    await deleteSession(sessionId);
    if (sessions.length > 1) {
      const remainingSessions = sessions.filter(s => s.id !== sessionId);
      if (remainingSessions.length > 0) {
        const loadedMessages = await selectSession(remainingSessions[0].id);
        setMessages(loadedMessages);
      }
    } else {
      setMessages([]);
    }
  }, [deleteSession, sessions, selectSession, setMessages]);

  // 새 세션 생성 핸들러
  const handleNewSession = useCallback(async () => {
    await createNewSession();
    setMessages([]);
  }, [createNewSession, setMessages]);

  // 메시지 전송 핸들러
  const handleSend = useCallback(() => {
    if (input.trim()) {
      sendMessage(input);
      setInput('');
    }
  }, [input, sendMessage]);

  // 초기 메시지 로드 (세션 변경 시에만)
  useEffect(() => {
    if (currentSessionId && sessions.length > 0) {
      const currentSession = sessions.find(s => s.id === currentSessionId);
      if (currentSession && currentSession.messages.length > 0) {
        // 현재 메시지가 비어있을 때만 로드
        setMessages((prev) => {
          if (prev.length === 0) {
            return currentSession.messages;
          }
          return prev;
        });
      }
    }
  }, [currentSessionId]); // sessions 의존성 제거

  // 스크롤 자동 이동
  useEffect(() => {
    if (scrollRef.current) {
      const viewport = scrollRef.current.querySelector('[data-slot="scroll-area-viewport"]');
      if (viewport) {
        viewport.scrollTop = viewport.scrollHeight;
      }
    }
  }, [messages]);

  return (
    <div
      className="flex h-screen flex-col bg-background relative"
      style={{
        backgroundImage: `url(${EXTERNAL_URLS.BACKGROUND_IMAGE})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}
    >
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
      <div className="relative z-10 flex h-screen flex-col">
        {/* 사이드바 */}
        <ChatSidebar
          sessions={sessions}
          currentSessionId={currentSessionId}
          onSessionSelect={handleSessionSelect}
          onNewSession={handleNewSession}
          onDeleteSession={handleDeleteSession}
        />

        {/* 메인 콘텐츠 영역 */}
        <div className="flex flex-1 flex-col md:ml-64">
          {/* Header */}
          <ChatHeader
            connectedServersCount={connectedServers.size}
            hasMessages={messages.length > 0}
            onClear={clearMessages}
          />

          {/* Chat Messages */}
          <ScrollArea className="flex-1 px-4 py-6">
            <div className="mx-auto max-w-4xl space-y-4" ref={scrollRef}>
              {messages.length === 0 ? (
                <EmptyState />
              ) : (
                messages.map((message) => (
                  <ChatMessage key={message.id} message={message} />
                ))
              )}
              {isLoading && messages.length > 0 && <LoadingMessage />}
            </div>
          </ScrollArea>

          {/* Input Area with MCP Toggle */}
          <ChatInput
            ref={inputRef}
            value={input}
            onChange={setInput}
            onSend={handleSend}
            disabled={isLoading}
            mcpEnabled={mcpEnabled}
            onMcpToggle={setMcpEnabled}
            enabledServerIds={enabledServerIds}
            onServerIdsChange={setEnabledServerIds}
          />
        </div>
      </div>
    </div>
  );
}
