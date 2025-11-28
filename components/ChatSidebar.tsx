'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Plus, MessageSquare, Trash2, Menu, Settings } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { formatRelativeTime } from '@/lib/utils/date';
import type { ChatSession } from '@/types';

interface ChatSidebarProps {
  sessions: ChatSession[];
  currentSessionId: string | null;
  onSessionSelect: (sessionId: string) => void;
  onNewSession: () => void;
  onDeleteSession: (sessionId: string) => void;
}

/**
 * 세션 아이템 컴포넌트
 */
function SessionItem({
  session,
  isSelected,
  onSelect,
  onDelete,
}: {
  session: ChatSession;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className={cn(
        'group relative flex items-center gap-2 rounded-lg p-3 cursor-pointer transition-colors',
        isSelected ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
      )}
      onClick={onSelect}
    >
      <MessageSquare className="h-4 w-4 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{session.title}</p>
        <p className="text-xs opacity-70">{formatRelativeTime(session.updatedAt)}</p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 opacity-0 group-hover:opacity-100 shrink-0"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
      >
        <Trash2 className="h-3 w-3" />
      </Button>
    </div>
  );
}

/**
 * 사이드바 헤더 (새 채팅 + MCP 관리 버튼)
 */
function SidebarHeader({
  onNewSession,
  onMCPClick,
}: {
  onNewSession: () => void;
  onMCPClick?: () => void;
}) {
  return (
    <div className="border-b p-4 space-y-2">
      <Button onClick={onNewSession} className="w-full" size="sm">
        <Plus className="mr-2 h-4 w-4" />
        새 채팅
      </Button>
      <Link href="/mcp" className="w-full">
        <Button variant="outline" className="w-full" size="sm" onClick={onMCPClick}>
          <Settings className="mr-2 h-4 w-4" />
          MCP 관리
        </Button>
      </Link>
    </div>
  );
}

/**
 * 세션 목록 컴포넌트
 */
function SessionList({
  sessions,
  currentSessionId,
  onSessionSelect,
  onDeleteSession,
}: Omit<ChatSidebarProps, 'onNewSession'>) {
  return (
    <ScrollArea className="flex-1">
      <div className="p-2 space-y-1">
        {sessions.map((session) => (
          <SessionItem
            key={session.id}
            session={session}
            isSelected={currentSessionId === session.id}
            onSelect={() => onSessionSelect(session.id)}
            onDelete={() => onDeleteSession(session.id)}
          />
        ))}
      </div>
    </ScrollArea>
  );
}

/**
 * 채팅 사이드바 컴포넌트
 * 모바일/데스크톱 반응형 지원
 */
export function ChatSidebar({
  sessions,
  currentSessionId,
  onSessionSelect,
  onNewSession,
  onDeleteSession,
}: ChatSidebarProps) {
  const [open, setOpen] = useState(false);

  const handleSessionSelect = (sessionId: string) => {
    onSessionSelect(sessionId);
    setOpen(false);
  };

  return (
    <>
      {/* 모바일용 햄버거 메뉴 */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[280px] p-0">
          <div className="flex h-full flex-col">
            <SidebarHeader onNewSession={onNewSession} onMCPClick={() => setOpen(false)} />
            <SessionList
              sessions={sessions}
              currentSessionId={currentSessionId}
              onSessionSelect={handleSessionSelect}
              onDeleteSession={onDeleteSession}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* 데스크톱용 고정 사이드바 */}
      <div className="hidden md:flex md:w-64 md:flex-col md:border-r">
        <SidebarHeader onNewSession={onNewSession} />
        <SessionList
          sessions={sessions}
          currentSessionId={currentSessionId}
          onSessionSelect={onSessionSelect}
          onDeleteSession={onDeleteSession}
        />
      </div>
    </>
  );
}
