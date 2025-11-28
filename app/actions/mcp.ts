'use server';

import { createServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { generateMCPServerId, mapDbToMCPServer } from '@/lib/utils';
import { DB_TABLES, ERROR_MESSAGES } from '@/lib/constants';
import type { StoredMCPServer, TransportType, DbMCPServer } from '@/types';

// Re-export types for backward compatibility
export type { StoredMCPServer };

/**
 * 모든 MCP 서버 가져오기
 */
export async function getMCPServers(): Promise<StoredMCPServer[]> {
  const supabase = createServerClient();

  const { data: servers, error } = await supabase
    .from(DB_TABLES.MCP_SERVERS)
    .select('*')
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Error fetching MCP servers:', error);
    return [];
  }

  return (servers || []).map(mapDbToMCPServer);
}

/**
 * MCP 서버 저장 (upsert 사용)
 */
export async function saveMCPServer(
  server: Omit<StoredMCPServer, 'createdAt' | 'updatedAt'>
): Promise<StoredMCPServer> {
  let supabase;
  try {
    supabase = createServerClient();
  } catch (error) {
    console.error('Supabase client creation failed:', error);
    throw new Error('데이터베이스 연결에 실패했습니다. 환경 변수를 확인해주세요.');
  }
  
  const now = Date.now();

  // 입력 검증
  if (!server.id || !server.name || !server.transport) {
    throw new Error('서버 ID, 이름, transport는 필수입니다.');
  }

  // Transport별 필수 필드 검증
  if (server.transport === 'stdio' && !server.command) {
    throw new Error('STDIO transport는 command가 필수입니다.');
  }

  if ((server.transport === 'streamable-http' || server.transport === 'sse') && !server.url) {
    throw new Error('HTTP/SSE transport는 URL이 필수입니다.');
  }

  // Supabase upsert 사용으로 중복 코드 제거
  const { data, error } = await supabase
    .from(DB_TABLES.MCP_SERVERS)
    .upsert(
      {
        id: server.id,
        name: server.name.trim(),
        transport: server.transport,
        command: server.command?.trim() || null,
        args: server.args && server.args.length > 0 ? server.args : null,
        env: server.env && Object.keys(server.env).length > 0 ? server.env : null,
        url: server.url?.trim() || null,
        headers: server.headers && Object.keys(server.headers).length > 0 ? server.headers : null,
        created_at: now,
        updated_at: now,
      },
      {
        onConflict: 'id',
        ignoreDuplicates: false,
      }
    )
    .select()
    .single();

  if (error) {
    console.error('Error saving MCP server:', error);
    
    // 더 구체적인 에러 메시지
    if (error.code === '23505') {
      // Unique constraint violation
      throw new Error('이미 존재하는 서버 ID입니다.');
    }
    
    if (error.code === '23503') {
      // Foreign key violation
      throw new Error('참조 무결성 오류가 발생했습니다.');
    }

    throw new Error(ERROR_MESSAGES.FAILED_TO_CREATE_MCP_SERVER);
  }

  if (!data) {
    throw new Error('서버 저장 후 데이터를 가져올 수 없습니다.');
  }

  revalidatePath('/mcp');

  return mapDbToMCPServer(data as DbMCPServer);
}

/**
 * MCP 서버 삭제
 */
export async function deleteMCPServer(serverId: string): Promise<void> {
  const supabase = createServerClient();

  const { error } = await supabase
    .from(DB_TABLES.MCP_SERVERS)
    .delete()
    .eq('id', serverId);

  if (error) {
    console.error('Error deleting MCP server:', error);
    throw new Error(ERROR_MESSAGES.FAILED_TO_DELETE_MCP_SERVER);
  }

  revalidatePath('/mcp');
}

/**
 * MCP 서버 가져오기
 */
export async function getMCPServer(serverId: string): Promise<StoredMCPServer | null> {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from(DB_TABLES.MCP_SERVERS)
    .select('*')
    .eq('id', serverId)
    .single();

  if (error || !data) {
    return null;
  }

  return mapDbToMCPServer(data as DbMCPServer);
}
