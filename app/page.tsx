'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Send, Bot, User } from 'lucide-react';
import { AvatarImage } from '@/components/ui/avatar';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

const STORAGE_KEY = 'ai-chat-history';

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // LocalStorage에서 채팅 내역 로드
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setMessages(parsed);
        }
      } catch (error) {
        console.error('Failed to load chat history:', error);
      }
    }
  }, []);

  // 채팅 내역이 변경될 때마다 LocalStorage에 저장
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    }
  }, [messages]);

  // 스크롤을 맨 아래로 이동
  useEffect(() => {
    if (scrollRef.current) {
      const viewport = scrollRef.current.querySelector('[data-slot="scroll-area-viewport"]');
      if (viewport) {
        viewport.scrollTop = viewport.scrollHeight;
      }
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
    };

    // 대화 삭제 명령 확인
    const clearCommands = ['대화내용을 다 지우라', '대화내용을 지워라', '대화 삭제', '채팅 삭제', '대화 지우기', '채팅 지우기'];
    const shouldClear = clearCommands.some(cmd => 
      userMessage.content.toLowerCase().includes(cmd.toLowerCase())
    );

    if (shouldClear) {
      setMessages([]);
      localStorage.removeItem(STORAGE_KEY);
      setInput('');
      // 포커스를 입력창으로 유지
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
      return;
    }

    // 이전 요청 취소
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    // 메시지 상태 업데이트를 한 번에 처리
    setMessages((prev) => {
      const updatedMessages = [...prev, userMessage];
      const assistantMessage: Message = {
        id: `${Date.now()}-assistant`,
        role: 'assistant',
        content: '',
      };
      return [...updatedMessages, assistantMessage];
    });
    
    setInput('');
    setIsLoading(true);
    
    // 포커스를 입력창으로 유지
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);

    try {
      // 최신 메시지 상태를 사용하여 히스토리 구성
      const currentHistory = messages.map((m) => ({
        role: m.role,
        parts: [{ text: m.content }],
      }));
      
      // API Route로 요청 전송
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage.content,
          history: currentHistory,
        }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body');
      }

      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              break;
            }
            try {
              const parsed = JSON.parse(data);
              if (parsed.text) {
                setMessages((prev) => {
                  // 불변성 유지하며 마지막 assistant 메시지 업데이트
                  const updated = [...prev];
                  const lastIndex = updated.length - 1;
                  if (lastIndex >= 0 && updated[lastIndex].role === 'assistant') {
                    updated[lastIndex] = {
                      ...updated[lastIndex],
                      content: updated[lastIndex].content + parsed.text,
                    };
                  }
                  return updated;
                });
              }
            } catch (e) {
              // JSON 파싱 실패 무시
            }
          }
        }
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Request aborted');
        return;
      }
      console.error('Chat error:', error);
      const errorMessage = error.message || '오류가 발생했습니다. 다시 시도해주세요.';
      setMessages((prev) => {
        // 불변성 유지하며 에러 메시지 업데이트
        const updated = [...prev];
        const lastIndex = updated.length - 1;
        if (lastIndex >= 0 && updated[lastIndex].role === 'assistant') {
          updated[lastIndex] = {
            ...updated[lastIndex],
            content: errorMessage,
          };
        } else {
          // assistant 메시지가 없으면 추가
          updated.push({
            id: `${Date.now()}-error`,
            role: 'assistant',
            content: errorMessage,
          });
        }
        return updated;
      });
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
      // 응답 후에도 포커스를 입력창으로 유지
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
      // 포커스를 입력창으로 유지
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    }
  };

  const handleClear = () => {
    if (confirm('채팅 내역을 모두 삭제하시겠습니까?')) {
      setMessages([]);
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  return (
    <div 
      className="flex h-screen flex-col bg-background relative"
      style={{
        backgroundImage: 'url(https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&h=1080&fit=crop)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}
    >
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
      <div className="relative z-10 flex h-screen flex-col">
      {/* Header */}
      <header className="border-b px-4 py-3">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <h1 className="text-xl font-semibold">AI 채팅</h1>
          {messages.length > 0 && (
            <Button variant="outline" size="sm" onClick={handleClear}>
              채팅 삭제
            </Button>
          )}
        </div>
      </header>

      {/* Chat Messages */}
      <ScrollArea className="flex-1 px-4 py-6">
        <div className="mx-auto max-w-4xl space-y-4" ref={scrollRef}>
          {messages.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <div className="text-center text-muted-foreground">
                <div className="mx-auto mb-4 flex items-center justify-center gap-2">
                  <Avatar className="h-16 w-16 ring-4 ring-blue-500/20">
                    <AvatarImage 
                      src="https://www.gstatic.com/lamda/images/gemini_sparkle_v002_d4735304ff6292a690345.svg" 
                      alt="Gemini"
                    />
                    <AvatarFallback className="bg-gradient-to-br from-blue-400 to-purple-500 text-white text-3xl">
                      🤖
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-4xl animate-bounce">👋</span>
                </div>
                <p className="text-lg font-medium">안녕하세요! 무엇을 도와드릴까요?</p>
                <p className="mt-2 text-sm">💬 대화를 시작해보세요!</p>
              </div>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {message.role === 'assistant' && (
                  <Avatar className="h-10 w-10 ring-2 ring-blue-500/20">
                    <AvatarImage 
                      src="https://www.gstatic.com/lamda/images/gemini_sparkle_v002_d4735304ff6292a690345.svg" 
                      alt="Gemini"
                    />
                    <AvatarFallback className="bg-gradient-to-br from-blue-400 to-purple-500 text-white text-lg font-bold">
                      🤖
                    </AvatarFallback>
                  </Avatar>
                )}
                <Card
                  className={`max-w-[80%] px-4 py-3 shadow-sm transition-all hover:shadow-md ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted border-l-4 border-blue-500'
                  }`}
                >
                  {message.role === 'assistant' ? (
                    <MarkdownRenderer 
                      content={message.content || '...'} 
                    />
                  ) : (
                    <p className="whitespace-pre-wrap break-words leading-relaxed">
                      {message.content || '...'}
                    </p>
                  )}
                </Card>
                {message.role === 'user' && (
                  <Avatar className="h-10 w-10 ring-2 ring-orange-500/20">
                    <AvatarImage 
                      src="https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=100&h=100&fit=crop&crop=center" 
                      alt="User"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                    <AvatarFallback className="bg-gradient-to-br from-orange-300 to-pink-300 text-white text-2xl flex items-center justify-center">
                      🐱
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))
          )}
          {isLoading && messages.length > 0 && (
            <div className="flex gap-3 justify-start">
              <Avatar className="h-10 w-10 ring-2 ring-blue-500/20 animate-pulse">
                <AvatarImage 
                  src="https://www.gstatic.com/lamda/images/gemini_sparkle_v002_d4735304ff6292a690345.svg" 
                  alt="Gemini"
                />
                <AvatarFallback className="bg-gradient-to-br from-blue-400 to-purple-500 text-white text-lg font-bold">
                  🤖
                </AvatarFallback>
              </Avatar>
              <Card className="max-w-[80%] px-4 py-2 bg-muted border-l-4 border-blue-500">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">입력 중</span>
                  <span className="animate-bounce">💭</span>
                </div>
              </Card>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="border-t px-4 py-4">
        <div className="mx-auto flex max-w-4xl gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="메시지를 입력하세요..."
            disabled={isLoading}
            className="flex-1"
            autoFocus
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            size="icon"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
      </div>
    </div>
  );
}
