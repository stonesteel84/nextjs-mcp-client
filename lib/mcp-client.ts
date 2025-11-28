import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { LLM, ERROR_MESSAGES } from '@/lib/constants';
import type { TransportType, MCPServerConfig } from '@/types';

// Re-export types for backward compatibility
export type { TransportType, MCPServerConfig };

type MCPTransport = StdioClientTransport | StreamableHTTPClientTransport | SSEClientTransport;

interface MCPConnection {
  client: Client;
  transport: MCPTransport;
  config: MCPServerConfig;
  connected: boolean;
}

// Global 타입 확장 (Node.js 환경에서 인스턴스 유지)
declare global {
  // eslint-disable-next-line no-var
  var __mcpClientManager: MCPClientManager | undefined;
}

/**
 * MCP 클라이언트 매니저
 * Node.js global 객체를 사용하여 서버 인스턴스 간 연결 공유
 * 페이지 새로고침/이동 시에도 연결 유지
 */
class MCPClientManager {
  private connections: Map<string, MCPConnection> = new Map();

  constructor() {}

  /**
   * 전역 인스턴스 가져오기
   * Node.js global 객체를 사용하여 HMR에서도 인스턴스 유지
   */
  static getInstance(): MCPClientManager {
    if (!global.__mcpClientManager) {
      global.__mcpClientManager = new MCPClientManager();
    }
    return global.__mcpClientManager;
  }

  /**
   * Transport 생성
   */
  private createTransport(config: MCPServerConfig): MCPTransport {
    switch (config.transport) {
      case 'stdio':
        if (!config.command) {
          throw new Error('Command is required for STDIO transport');
        }
        return new StdioClientTransport({
          command: config.command,
          args: config.args || [],
          env: config.env,
        });

      case 'streamable-http':
        if (!config.url) {
          throw new Error('URL is required for Streamable HTTP transport');
        }
        return new StreamableHTTPClientTransport(
          new URL(config.url),
          config.headers
            ? {
                requestInit: {
                  headers: config.headers,
                },
              }
            : undefined
        );

      case 'sse':
        if (!config.url) {
          throw new Error('URL is required for SSE transport');
        }
        return new SSEClientTransport(
          new URL(config.url),
          config.headers
            ? {
                requestInit: {
                  headers: config.headers,
                },
              }
            : undefined
        );

      default:
        throw new Error(`Unsupported transport type: ${config.transport}`);
    }
  }

  /**
   * 서버에 연결
   */
  async connect(config: MCPServerConfig): Promise<void> {
    // 기존 연결 확인 및 정리
    if (this.connections.has(config.id)) {
      const existing = this.connections.get(config.id)!;
      if (existing.connected) {
        throw new Error(ERROR_MESSAGES.SERVER_ALREADY_CONNECTED);
      }
      await this.safeClose(existing.client);
    }

    const client = new Client({
      name: LLM.CLIENT_NAME,
      version: LLM.CLIENT_VERSION,
    });

    try {
      const transport = this.createTransport(config);
      await client.connect(transport);

      this.connections.set(config.id, {
        client,
        transport,
        config,
        connected: true,
      });
    } catch (error) {
      await this.safeClose(client);
      throw error;
    }
  }

  /**
   * 서버 연결 해제
   */
  async disconnect(serverId: string): Promise<void> {
    const connection = this.connections.get(serverId);
    if (!connection) {
      throw new Error(ERROR_MESSAGES.SERVER_NOT_CONNECTED);
    }

    await this.safeClose(connection.client);
    this.connections.delete(serverId);
  }

  /**
   * 클라이언트 가져오기
   */
  getClient(serverId: string): Client | null {
    const connection = this.connections.get(serverId);
    return connection?.connected ? connection.client : null;
  }

  /**
   * 연결 상태 확인
   */
  isConnected(serverId: string): boolean {
    return this.connections.get(serverId)?.connected ?? false;
  }

  /**
   * 연결된 서버 목록 가져오기
   */
  getConnectedServers(): string[] {
    return Array.from(this.connections.entries())
      .filter(([_, conn]) => conn.connected)
      .map(([id]) => id);
  }

  /**
   * 연결된 모든 클라이언트 가져오기
   */
  getAllConnectedClients(): Client[] {
    return Array.from(this.connections.values())
      .filter((conn) => conn.connected)
      .map((conn) => conn.client);
  }

  /**
   * 연결된 서버의 설정 정보 가져오기
   */
  getConnectionConfig(serverId: string): MCPServerConfig | null {
    return this.connections.get(serverId)?.config ?? null;
  }

  /**
   * 모든 연결 정보 가져오기 (디버깅용)
   */
  getConnectionsInfo(): Array<{ id: string; name: string; connected: boolean }> {
    return Array.from(this.connections.entries()).map(([id, conn]) => ({
      id,
      name: conn.config.name,
      connected: conn.connected,
    }));
  }

  /**
   * 모든 연결 해제
   */
  async disconnectAll(): Promise<void> {
    const disconnectPromises = Array.from(this.connections.keys()).map((id) =>
      this.disconnect(id).catch((error) => {
        console.error(`Error disconnecting ${id}:`, error);
      })
    );
    await Promise.all(disconnectPromises);
  }

  /**
   * 안전한 클라이언트 종료
   */
  private async safeClose(client: Client): Promise<void> {
    try {
      await client.close();
    } catch {
      // 무시
    }
  }
}

export const mcpClientManager = MCPClientManager.getInstance();
