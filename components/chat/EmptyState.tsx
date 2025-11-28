'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { EXTERNAL_URLS } from '@/lib/constants';

/**
 * 채팅 빈 상태 컴포넌트
 * 메시지가 없을 때 표시되는 환영 메시지
 */
export function EmptyState() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-center text-muted-foreground">
        <div className="mx-auto mb-4 flex items-center justify-center gap-2">
          <Avatar className="h-16 w-16 ring-4 ring-blue-500/20">
            <AvatarImage src={EXTERNAL_URLS.GEMINI_AVATAR} alt="Gemini" />
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
  );
}

