'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Wrench, ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MCPServer {
  id: string;
  name: string;
  connected: boolean;
}

interface MCPToolToggleProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  enabledServerIds: string[];
  onServerIdsChange: (ids: string[]) => void;
}

export function MCPToolToggle({
  enabled,
  onToggle,
  enabledServerIds,
  onServerIdsChange,
}: MCPToolToggleProps) {
  const [connectedServers, setConnectedServers] = useState<MCPServer[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);

  // 연결된 MCP 서버 목록 가져오기
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/mcp/status');
        if (res.ok) {
          const data = await res.json();
          setConnectedServers(
            data.connections?.filter((c: MCPServer) => c.connected) || []
          );
        }
      } catch (error) {
        console.error('Failed to fetch MCP status:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
    // 주기적으로 상태 갱신
    const interval = setInterval(fetchStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleToggle = () => {
    const newEnabled = !enabled;
    onToggle(newEnabled);
    
    // 활성화 시 모든 연결된 서버를 기본으로 선택
    if (newEnabled && enabledServerIds.length === 0) {
      onServerIdsChange(connectedServers.map((s) => s.id));
    }
  };

  const handleServerToggle = (serverId: string) => {
    if (enabledServerIds.includes(serverId)) {
      onServerIdsChange(enabledServerIds.filter((id) => id !== serverId));
    } else {
      onServerIdsChange([...enabledServerIds, serverId]);
    }
  };

  const activeCount = enabledServerIds.length;
  const hasConnectedServers = connectedServers.length > 0;

  return (
    <div className="relative">
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant={enabled ? 'default' : 'outline'}
          size="sm"
          onClick={handleToggle}
          disabled={!hasConnectedServers}
          className={cn(
            'h-8 gap-1.5 transition-all',
            enabled && 'bg-emerald-600 hover:bg-emerald-700'
          )}
          title={
            hasConnectedServers
              ? enabled
                ? 'MCP 도구 비활성화'
                : 'MCP 도구 활성화'
              : '연결된 MCP 서버가 없습니다'
          }
        >
          <Wrench className="h-3.5 w-3.5" />
          <span className="text-xs">MCP</span>
          {enabled && activeCount > 0 && (
            <span className="ml-0.5 rounded-full bg-white/20 px-1.5 text-[10px]">
              {activeCount}
            </span>
          )}
        </Button>

        {enabled && hasConnectedServers && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => setShowDropdown(!showDropdown)}
          >
            <ChevronDown
              className={cn(
                'h-3.5 w-3.5 transition-transform',
                showDropdown && 'rotate-180'
              )}
            />
          </Button>
        )}
      </div>

      {/* 서버 선택 드롭다운 */}
      {showDropdown && enabled && (
        <div className="absolute bottom-full left-0 mb-2 w-56 rounded-lg border bg-background p-2 shadow-lg">
          <div className="mb-2 px-2 text-xs font-medium text-muted-foreground">
            활성화할 MCP 서버
          </div>
          {connectedServers.map((server) => (
            <button
              key={server.id}
              type="button"
              className={cn(
                'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
                'hover:bg-muted',
                enabledServerIds.includes(server.id) && 'bg-muted'
              )}
              onClick={() => handleServerToggle(server.id)}
            >
              <div
                className={cn(
                  'flex h-4 w-4 items-center justify-center rounded border',
                  enabledServerIds.includes(server.id)
                    ? 'border-emerald-500 bg-emerald-500 text-white'
                    : 'border-muted-foreground'
                )}
              >
                {enabledServerIds.includes(server.id) && (
                  <Check className="h-3 w-3" />
                )}
              </div>
              <span className="flex-1 truncate text-left">{server.name}</span>
              <span className="text-[10px] text-emerald-500">● 연결됨</span>
            </button>
          ))}
          {connectedServers.length === 0 && (
            <div className="px-2 py-4 text-center text-sm text-muted-foreground">
              {loading ? '로딩 중...' : '연결된 서버가 없습니다'}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

