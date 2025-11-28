'use client';

import { forwardRef, KeyboardEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send } from 'lucide-react';
import { MCPToolToggle } from './MCPToolToggle';

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  disabled?: boolean;
  // MCP 관련 props
  mcpEnabled?: boolean;
  onMcpToggle?: (enabled: boolean) => void;
  enabledServerIds?: string[];
  onServerIdsChange?: (ids: string[]) => void;
}

/**
 * 채팅 입력 컴포넌트
 */
export const ChatInput = forwardRef<HTMLInputElement, ChatInputProps>(
  ({ 
    value, 
    onChange, 
    onSend, 
    disabled = false, 
    mcpEnabled = false,
    onMcpToggle,
    enabledServerIds = [],
    onServerIdsChange,
  }, ref) => {
    const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        onSend();
      }
    };

    return (
      <div className="border-t px-4 py-4">
        <div className="mx-auto max-w-4xl">
          {/* MCP 도구 토글 */}
          {onMcpToggle && onServerIdsChange && (
            <div className="mb-2 flex items-center">
              <MCPToolToggle
                enabled={mcpEnabled}
                onToggle={onMcpToggle}
                enabledServerIds={enabledServerIds}
                onServerIdsChange={onServerIdsChange}
              />
              {mcpEnabled && (
                <span className="ml-2 text-xs text-muted-foreground">
                  MCP 도구가 활성화되었습니다
                </span>
              )}
            </div>
          )}
          
          {/* 입력 영역 */}
          <div className="flex gap-2">
            <Input
              ref={ref}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={disabled}
              className="flex-1"
              autoFocus
            />
            <Button
              onClick={onSend}
              disabled={!value.trim() || disabled}
              size="icon"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }
);

ChatInput.displayName = 'ChatInput';
