import {
  getMCPServers,
  saveMCPServer,
  deleteMCPServer,
  getMCPServer,
} from '@/app/actions/mcp';
import { ERROR_MESSAGES } from '@/lib/constants';
import type { StoredMCPServer } from '@/types';

// Re-export types for backward compatibility
export type { StoredMCPServer };

/**
 * MCP 서버 저장소 인터페이스
 * Server Actions를 래핑하여 일관된 API 제공
 */
export const mcpStorage = {
  /**
   * 모든 서버 가져오기
   */
  async getAll(): Promise<StoredMCPServer[]> {
    return getMCPServers();
  },

  /**
   * 서버 저장
   */
  async save(server: StoredMCPServer): Promise<void> {
    await saveMCPServer(server);
  },

  /**
   * 서버 삭제
   */
  async delete(serverId: string): Promise<void> {
    await deleteMCPServer(serverId);
  },

  /**
   * 서버 가져오기
   */
  async get(serverId: string): Promise<StoredMCPServer | null> {
    return getMCPServer(serverId);
  },

  /**
   * 서버 설정 내보내기
   */
  async export(): Promise<string> {
    const servers = await this.getAll();
    return JSON.stringify(servers, null, 2);
  },

  /**
   * 서버 설정 가져오기
   */
  async import(jsonString: string): Promise<void> {
    try {
      const imported = JSON.parse(jsonString);
      if (!Array.isArray(imported)) {
        throw new Error(ERROR_MESSAGES.INVALID_JSON_FORMAT);
      }

      // 각 서버를 저장
      for (const server of imported) {
        if (server.id && server.name && server.transport) {
          await this.save(server);
        }
      }
    } catch (error) {
      console.error('Failed to import MCP servers:', error);
      throw error;
    }
  },
};
