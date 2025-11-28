'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import { EXTERNAL_URLS } from '@/lib/constants';
import type { Message } from '@/types';

interface ChatMessageProps {
  message: Message;
}

/**
 * 개별 채팅 메시지 컴포넌트
 */
export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && <AssistantAvatar />}
      <MessageBubble message={message} isUser={isUser} />
      {isUser && <UserAvatar />}
    </div>
  );
}

/**
 * AI 아바타
 */
function AssistantAvatar() {
  return (
    <Avatar className="h-10 w-10 ring-2 ring-blue-500/20">
      <AvatarImage src={EXTERNAL_URLS.GEMINI_AVATAR} alt="Gemini" />
      <AvatarFallback className="bg-gradient-to-br from-blue-400 to-purple-500 text-white text-lg font-bold">
        🤖
      </AvatarFallback>
    </Avatar>
  );
}

/**
 * 사용자 아바타
 */
function UserAvatar() {
  return (
    <Avatar className="h-10 w-10 ring-2 ring-orange-500/20">
      <AvatarImage
        src={EXTERNAL_URLS.USER_AVATAR}
        alt="User"
        onError={(e) => {
          e.currentTarget.style.display = 'none';
        }}
      />
      <AvatarFallback className="bg-gradient-to-br from-orange-300 to-pink-300 text-white text-2xl flex items-center justify-center">
        🐱
      </AvatarFallback>
    </Avatar>
  );
}

/**
 * 메시지 버블
 */
function MessageBubble({ message, isUser }: { message: Message; isUser: boolean }) {
  return (
    <Card
      className={`max-w-[80%] px-4 py-3 shadow-sm transition-all hover:shadow-md ${
        isUser
          ? 'bg-primary text-primary-foreground'
          : 'bg-muted border-l-4 border-blue-500'
      }`}
    >
      {isUser ? (
        <p className="whitespace-pre-wrap break-words leading-relaxed">
          {message.content || '...'}
        </p>
      ) : (
        <>
          {message.imageUrl && (
            <div className="mb-3">
              <img
                src={message.imageUrl}
                alt="Generated image"
                className="max-w-full h-auto rounded-lg shadow-lg border border-gray-200 dark:border-gray-700"
                loading="lazy"
              />
            </div>
          )}
          <MarkdownRenderer content={message.content || '...'} imageUrl={message.imageUrl} />
        </>
      )}
    </Card>
  );
}

/**
 * 로딩 중 메시지 표시
 */
export function LoadingMessage() {
  return (
    <div className="flex gap-3 justify-start">
      <Avatar className="h-10 w-10 ring-2 ring-blue-500/20 animate-pulse">
        <AvatarImage src={EXTERNAL_URLS.GEMINI_AVATAR} alt="Gemini" />
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
  );
}

