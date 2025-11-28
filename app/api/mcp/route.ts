import { NextRequest, NextResponse } from 'next/server';
import { getMCPServers, saveMCPServer, deleteMCPServer, type StoredMCPServer } from '@/app/actions/mcp';
import { mcpClientManager } from '@/lib/mcp-client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET: 서버 목록 조회
export async function GET() {
  try {
    const servers = await getMCPServers();
    const connectedServers = mcpClientManager.getConnectedServers();
    
    const serversWithStatus = servers.map((server) => ({
      ...server,
      connected: connectedServers.includes(server.id),
    }));

    return NextResponse.json({ servers: serversWithStatus });
  } catch (error) {
    console.error('Error fetching MCP servers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch servers' },
      { status: 500 }
    );
  }
}

// POST: 서버 등록
export async function POST(req: NextRequest) {
  try {
    // 요청 본문 파싱
    let body;
    try {
      body = await req.json();
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return NextResponse.json(
        { error: '요청 본문이 유효한 JSON 형식이 아닙니다.' },
        { status: 400 }
      );
    }

    const { name, transport, command, args, env, url, headers } = body;

    // 필수 필드 검증
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: '서버 이름은 필수입니다.' },
        { status: 400 }
      );
    }

    if (!transport || !['stdio', 'streamable-http', 'sse'].includes(transport)) {
      return NextResponse.json(
        { error: '유효한 transport 타입이 필요합니다 (stdio, streamable-http, sse)' },
        { status: 400 }
      );
    }

    // Transport 타입별 필수 필드 검증
    if (transport === 'stdio') {
      if (!command || typeof command !== 'string' || command.trim().length === 0) {
        return NextResponse.json(
          { error: 'STDIO transport는 command가 필수입니다.' },
          { status: 400 }
        );
      }
    }

    if (transport === 'streamable-http' || transport === 'sse') {
      if (!url || typeof url !== 'string' || url.trim().length === 0) {
        return NextResponse.json(
          { error: 'HTTP/SSE transport는 URL이 필수입니다.' },
          { status: 400 }
        );
      }

      // URL 형식 검증
      try {
        new URL(url);
      } catch {
        return NextResponse.json(
          { error: '유효한 URL 형식이 아닙니다.' },
          { status: 400 }
        );
      }

      // Headers 검증 (JSON 형식)
      if (headers !== undefined && headers !== null) {
        if (typeof headers === 'string') {
          try {
            JSON.parse(headers);
          } catch {
            return NextResponse.json(
              { error: 'Headers는 유효한 JSON 형식이어야 합니다.' },
              { status: 400 }
            );
          }
        } else if (typeof headers !== 'object' || Array.isArray(headers)) {
          return NextResponse.json(
            { error: 'Headers는 객체 형식이어야 합니다.' },
            { status: 400 }
          );
        }
      }
    }

    // Args 검증 (배열 또는 문자열)
    let parsedArgs: string[] | undefined;
    if (args !== undefined && args !== null) {
      if (Array.isArray(args)) {
        parsedArgs = args.filter((a) => typeof a === 'string' && a.trim().length > 0);
      } else if (typeof args === 'string') {
        parsedArgs = args.split('\n').filter((a) => a.trim().length > 0);
      }
    }

    // Env 검증 (JSON 객체)
    let parsedEnv: Record<string, string> | undefined;
    if (env !== undefined && env !== null) {
      if (typeof env === 'string') {
        try {
          const parsed = JSON.parse(env);
          if (typeof parsed !== 'object' || Array.isArray(parsed)) {
            throw new Error('Invalid format');
          }
          parsedEnv = parsed;
        } catch {
          return NextResponse.json(
            { error: '환경 변수는 유효한 JSON 객체 형식이어야 합니다.' },
            { status: 400 }
          );
        }
      } else if (typeof env === 'object' && !Array.isArray(env)) {
        parsedEnv = env;
      } else {
        return NextResponse.json(
          { error: '환경 변수는 객체 형식이어야 합니다.' },
          { status: 400 }
        );
      }
    }

    // Headers 파싱 (이미 객체인 경우 그대로 사용)
    let parsedHeaders: Record<string, string> | undefined;
    if (headers !== undefined && headers !== null) {
      if (typeof headers === 'string') {
        try {
          parsedHeaders = JSON.parse(headers);
        } catch {
          return NextResponse.json(
            { error: 'Headers는 유효한 JSON 형식이어야 합니다.' },
            { status: 400 }
          );
        }
      } else if (typeof headers === 'object' && !Array.isArray(headers)) {
        parsedHeaders = headers;
      }
    }

    const server: Omit<StoredMCPServer, 'createdAt' | 'updatedAt'> = {
      id: `mcp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: name.trim(),
      transport: transport as 'stdio' | 'streamable-http' | 'sse',
      command: transport === 'stdio' ? command.trim() : undefined,
      args: parsedArgs,
      env: parsedEnv,
      url: (transport === 'streamable-http' || transport === 'sse') ? url.trim() : undefined,
      headers: parsedHeaders,
    };

    const savedServer = await saveMCPServer(server);

    return NextResponse.json({ server: savedServer }, { status: 201 });
  } catch (error) {
    console.error('Error creating MCP server:', error);
    
    // 더 구체적인 에러 메시지 제공
    if (error instanceof Error) {
      // DB 관련 에러인 경우
      if (error.message.includes('duplicate') || error.message.includes('unique')) {
        return NextResponse.json(
          { error: '이미 존재하는 서버 이름입니다.' },
          { status: 409 }
        );
      }
      
      // 타입 에러인 경우
      if (error.message.includes('type') || error.message.includes('Type')) {
        return NextResponse.json(
          { error: '입력 데이터 형식이 올바르지 않습니다.' },
          { status: 400 }
        );
      }
    }

    // 최종 에러 응답
    const errorMessage = error instanceof Error 
      ? error.message 
      : '서버 생성에 실패했습니다. 입력 정보를 확인해주세요.';
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

// DELETE: 서버 삭제
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const serverId = searchParams.get('id');

    if (!serverId) {
      return NextResponse.json(
        { error: 'Server ID is required' },
        { status: 400 }
      );
    }

    // 연결되어 있으면 먼저 해제
    if (mcpClientManager.isConnected(serverId)) {
      await mcpClientManager.disconnect(serverId);
    }

    await deleteMCPServer(serverId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting MCP server:', error);
    return NextResponse.json(
      { error: 'Failed to delete server' },
      { status: 500 }
    );
  }
}

