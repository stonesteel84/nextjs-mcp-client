'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface ChatHeaderProps {
  connectedServersCount: number;
  hasMessages: boolean;
  onClear: () => void;
}

/**
 * 채팅 헤더 컴포넌트
 */
export function ChatHeader({ connectedServersCount, hasMessages, onClear }: ChatHeaderProps) {
  const handleClear = () => {
    if (confirm('채팅 내역을 모두 삭제하시겠습니까?')) {
      onClear();
    }
  };

  return (
    <header className="border-b px-4 py-3">
      <div className="mx-auto flex max-w-4xl items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold">AI 채팅</h1>
          {connectedServersCount > 0 && (
            <Badge variant="secondary" className="gap-1">
              <span className="inline-block w-2 h-2 bg-green-500 rounded-full" />
              {connectedServersCount} MCP 서버 연결됨
            </Badge>
          )}
        </div>
        {hasMessages && (
          <Button variant="outline" size="sm" onClick={handleClear}>
            채팅 삭제
          </Button>
        )}
      </div>
    </header>
  );
}

