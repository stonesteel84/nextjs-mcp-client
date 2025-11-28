'use client';

import { useState, useRef, useCallback } from 'react';
import type { Message, ChatHistory, FunctionCallInfo, SSEEvent } from '@/types';
import { addMessage, updateMessage } from '@/app/actions/chat';
import { CHAT, SSE } from '@/lib/constants';
import { generateMessageId } from '@/lib/utils/id';

interface UseChatOptions {
  currentSessionId: string | null;
  onSessionsUpdate?: () => Promise<unknown>;
}

interface UseChatReturn {
  messages: Message[];
  isLoading: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
  sendMessage: (content: string) => Promise<void>;
  clearMessages: () => void;
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  cancelRequest: () => void;
  // MCP 관련
  mcpEnabled: boolean;
  setMcpEnabled: (enabled: boolean) => void;
  enabledServerIds: string[];
  setEnabledServerIds: (ids: string[]) => void;
  functionCalls: FunctionCallInfo[];
}

/**
 * 채팅 메시지 관리 훅
 * 메시지 전송, 스트리밍 응답, MCP 도구 호출 등을 담당
 */
export function useChat({ currentSessionId, onSessionsUpdate }: UseChatOptions): UseChatReturn {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [mcpEnabled, setMcpEnabled] = useState(false);
  const [enabledServerIds, setEnabledServerIds] = useState<string[]>([]);
  const [functionCalls, setFunctionCalls] = useState<FunctionCallInfo[]>([]);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesRef = useRef<Message[]>([]);

  // 메시지 상태 동기화
  messagesRef.current = messages;

  // 대화 삭제 명령 확인
  const isClearCommand = useCallback((content: string): boolean => {
    return CHAT.CLEAR_COMMANDS.some((cmd) =>
      content.toLowerCase().includes(cmd.toLowerCase())
    );
  }, []);

  // 히스토리 구성 (Gemini API 형식)
  const buildHistory = useCallback((): ChatHistory[] => {
    return messagesRef.current
      .filter((m) => m.content)
      .map((m) => ({
        role: m.role,
        parts: [{ text: m.content }],
      }));
  }, []);

  // SSE 스트림 처리 (새로운 이벤트 형식 지원)
  const processStream = useCallback(async (
    reader: ReadableStreamDefaultReader<Uint8Array>,
    assistantMessageId: string
  ) => {
    const decoder = new TextDecoder();
    let buffer = '';
    let accumulatedText = '';
    let finalImageUrl: string | undefined;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith(SSE.DATA_PREFIX)) {
          const data = line.slice(SSE.DATA_PREFIX.length);
          
          // 레거시 형식 지원
          if (data === SSE.DONE_SIGNAL) break;

          try {
            const parsed = JSON.parse(data) as SSEEvent | { text: string };
            
            // 새로운 이벤트 형식
            if ('type' in parsed) {
              const event = parsed as SSEEvent;
              
              switch (event.type) {
                case 'text':
                  if (event.data.text) {
                    accumulatedText += event.data.text;
                    setMessages((prev) => {
                      const updated = [...prev];
                      const lastIndex = updated.length - 1;
                      if (lastIndex >= 0 && updated[lastIndex].role === 'assistant') {
                        const imageUrl = event.data.imageUrl || updated[lastIndex].imageUrl;
                        updated[lastIndex] = { 
                          ...updated[lastIndex], 
                          content: accumulatedText,
                          imageUrl: imageUrl,
                        };
                        if (imageUrl) {
                          finalImageUrl = imageUrl;
                        }
                      }
                      return updated;
                    });
                  }
                  break;
                  
                case 'function_call':
                  if (event.data.functionCall) {
                    const newCall: FunctionCallInfo = {
                      id: event.data.functionCall.id,
                      name: event.data.functionCall.name,
                      args: event.data.functionCall.args,
                      status: 'executing',
                      timestamp: Date.now(),
                    };
                    setFunctionCalls((prev) => [...prev, newCall]);
                    
                    // 함수 호출 정보를 메시지에 추가 (사용 가능한 도구 목록은 간단히 표시)
                    let callText = '';
                    if (newCall.id === 'tools-available') {
                      const tools = (newCall.args as { tools?: string[] })?.tools || [];
                      callText = `🔧 **MCP 도구 활성화됨**\n> 사용 가능: ${tools.join(', ')}\n\n`;
                    } else {
                      callText = `\n📤 **도구 호출: \`${newCall.name}\`**\n\`\`\`json\n${JSON.stringify(newCall.args, null, 2)}\n\`\`\`\n`;
                    }
                    accumulatedText += callText;
                    setMessages((prev) => {
                      const updated = [...prev];
                      const lastIndex = updated.length - 1;
                      if (lastIndex >= 0 && updated[lastIndex].role === 'assistant') {
                        updated[lastIndex] = { 
                          ...updated[lastIndex], 
                          content: accumulatedText 
                        };
                      }
                      return updated;
                    });
                  }
                  break;
                  
                case 'function_result':
                  if (event.data.functionResult) {
                    setFunctionCalls((prev) =>
                      prev.map((call) =>
                        call.name === event.data.functionResult?.name
                          ? { ...call, status: 'completed', result: event.data.functionResult.result }
                          : call
                      )
                    );
                    
                    // 함수 결과를 메시지에 추가
                    const result = event.data.functionResult.result;
                    const resultText = typeof result === 'string' 
                      ? result 
                      : JSON.stringify(result, null, 2);
                    const resultDisplay = `\n📥 **도구 결과: \`${event.data.functionResult.name}\`**\n\`\`\`\n${resultText}\n\`\`\`\n\n`;
                    accumulatedText += resultDisplay;
                    setMessages((prev) => {
                      const updated = [...prev];
                      const lastIndex = updated.length - 1;
                      if (lastIndex >= 0 && updated[lastIndex].role === 'assistant') {
                        const imageUrl = event.data.functionResult?.imageUrl || updated[lastIndex].imageUrl;
                        updated[lastIndex] = { 
                          ...updated[lastIndex], 
                          content: accumulatedText,
                          // function_result에서 이미지 URL이 있으면 사용
                          imageUrl: imageUrl,
                        };
                        if (imageUrl) {
                          finalImageUrl = imageUrl;
                        }
                      }
                      return updated;
                    });
                  }
                  break;
                  
                case 'error':
                  if (event.data.error) {
                    accumulatedText += `\n\n❌ **Error:** ${event.data.error}`;
                    setMessages((prev) => {
                      const updated = [...prev];
                      const lastIndex = updated.length - 1;
                      if (lastIndex >= 0 && updated[lastIndex].role === 'assistant') {
                        updated[lastIndex] = { 
                          ...updated[lastIndex], 
                          content: accumulatedText 
                        };
                      }
                      return updated;
                    });
                  }
                  break;
                  
                case 'done':
                  // 스트림 완료
                  break;
              }
            } else if ('text' in parsed && parsed.text) {
              // 레거시 형식 지원
              accumulatedText += parsed.text;
              setMessages((prev) => {
                const updated = [...prev];
                const lastIndex = updated.length - 1;
                if (lastIndex >= 0 && updated[lastIndex].role === 'assistant') {
                  updated[lastIndex] = { 
                    ...updated[lastIndex], 
                    content: accumulatedText 
                  };
                }
                return updated;
              });
            }
          } catch {
            // JSON 파싱 실패 무시
          }
        }
      }
    }

    // 최종 메시지 DB 업데이트
    if (accumulatedText && assistantMessageId) {
      updateMessage(assistantMessageId, accumulatedText, finalImageUrl).catch(console.error);
    }
  }, []);

  // 메시지 전송
  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading || !currentSessionId) return;

    // 대화 삭제 명령 처리
    if (isClearCommand(content)) {
      setMessages([]);
      setFunctionCalls([]);
      setTimeout(() => inputRef.current?.focus(), 0);
      return;
    }

    // 이전 요청 취소
    abortControllerRef.current?.abort();
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setIsLoading(true);
    setFunctionCalls([]); // 새 메시지 전송 시 함수 호출 기록 초기화

    try {
      // 사용자 메시지 저장
      let savedUserMessage: Message;
      try {
        savedUserMessage = await addMessage(currentSessionId, {
          role: 'user',
          content: content.trim(),
        });
      } catch (error) {
        console.error('Failed to save user message:', error);
        savedUserMessage = {
          id: generateMessageId(),
          role: 'user',
          content: content.trim(),
        };
      }

      // Assistant 메시지 생성 (스트리밍용)
      let savedAssistantMessage: Message;
      try {
        savedAssistantMessage = await addMessage(currentSessionId, {
          role: 'assistant',
          content: '',
        });
      } catch (error) {
        console.error('Failed to create assistant message:', error);
        savedAssistantMessage = {
          id: generateMessageId(),
          role: 'assistant',
          content: '',
        };
      }

      // UI 업데이트
      setMessages((prev) => [...prev, savedUserMessage, savedAssistantMessage]);

      // 히스토리 구성
      const history = buildHistory();

      // API 호출 (MCP 도구 설정 포함)
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: content.trim(), 
          history,
          mcpEnabled,
          enabledServerIds,
          sessionId: currentSessionId, // 이미지 업로드를 위해 세션 ID 전달
        }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      await processStream(reader, savedAssistantMessage.id);

      // 세션 목록 새로고침
      onSessionsUpdate?.();
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Request aborted');
        return;
      }

      console.error('Chat error:', error);
      const errorMessage = error instanceof Error 
        ? error.message 
        : '오류가 발생했습니다. 다시 시도해주세요.';

      setMessages((prev) => {
        const updated = [...prev];
        const lastIndex = updated.length - 1;
        if (lastIndex >= 0 && updated[lastIndex].role === 'assistant') {
          updated[lastIndex] = { ...updated[lastIndex], content: errorMessage };
        } else {
          updated.push({
            id: generateMessageId(),
            role: 'assistant',
            content: errorMessage,
          });
        }
        return updated;
      });
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [currentSessionId, isLoading, isClearCommand, buildHistory, processStream, onSessionsUpdate, mcpEnabled, enabledServerIds]);

  // 메시지 초기화
  const clearMessages = useCallback(() => {
    setMessages([]);
    setFunctionCalls([]);
  }, []);

  // 요청 취소
  const cancelRequest = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  return {
    messages,
    isLoading,
    inputRef,
    sendMessage,
    clearMessages,
    setMessages,
    cancelRequest,
    // MCP 관련
    mcpEnabled,
    setMcpEnabled,
    enabledServerIds,
    setEnabledServerIds,
    functionCalls,
  };
}
