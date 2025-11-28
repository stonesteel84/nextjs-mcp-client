'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { mcpStorage } from '@/lib/mcp-storage';
import type { StoredMCPServer } from '@/types';

interface MCPContextType {
  servers: StoredMCPServer[];
  connectedServers: Set<string>;
  refreshServers: () => Promise<void>;
  addServer: (server: Omit<StoredMCPServer, 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateServer: (server: StoredMCPServer) => Promise<void>;
  deleteServer: (serverId: string) => Promise<void>;
  setConnected: (serverId: string, connected: boolean) => void;
}

const MCPContext = createContext<MCPContextType | undefined>(undefined);

/**
 * MCP Context Provider
 * MCP 서버 상태 관리
 */
export function MCPProvider({ children }: { children: ReactNode }) {
  const [servers, setServers] = useState<StoredMCPServer[]>([]);
  const [connectedServers, setConnectedServers] = useState<Set<string>>(new Set());

  const refreshServers = useCallback(async () => {
    const loadedServers = await mcpStorage.getAll();
    setServers(loadedServers);
  }, []);

  const addServer = useCallback(async (server: Omit<StoredMCPServer, 'createdAt' | 'updatedAt'>) => {
    const newServer: StoredMCPServer = {
      ...server,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await mcpStorage.save(newServer);
    await refreshServers();
  }, [refreshServers]);

  const updateServer = useCallback(async (server: StoredMCPServer) => {
    await mcpStorage.save(server);
    await refreshServers();
  }, [refreshServers]);

  const deleteServer = useCallback(async (serverId: string) => {
    await mcpStorage.delete(serverId);
    setConnectedServers((prev) => {
      const next = new Set(prev);
      next.delete(serverId);
      return next;
    });
    await refreshServers();
  }, [refreshServers]);

  const setConnected = useCallback((serverId: string, connected: boolean) => {
    setConnectedServers((prev) => {
      const next = new Set(prev);
      if (connected) {
        next.add(serverId);
      } else {
        next.delete(serverId);
      }
      return next;
    });
  }, []);

  useEffect(() => {
    refreshServers();
  }, [refreshServers]);

  return (
    <MCPContext.Provider
      value={{
        servers,
        connectedServers,
        refreshServers,
        addServer,
        updateServer,
        deleteServer,
        setConnected,
      }}
    >
      {children}
    </MCPContext.Provider>
  );
}

/**
 * MCP Context Hook
 */
export function useMCP() {
  const context = useContext(MCPContext);
  if (context === undefined) {
    throw new Error('useMCP must be used within an MCPProvider');
  }
  return context;
}
