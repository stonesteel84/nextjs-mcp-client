import { NextRequest, NextResponse } from 'next/server';
import { mcpClientManager, MCPServerConfig } from '@/lib/mcp-client';
import { getMCPServer } from '@/app/actions/mcp';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ serverId: string }> }
) {
  let server = null;
  try {
    const { serverId } = await params;
    server = await getMCPServer(serverId);

    if (!server) {
      return NextResponse.json(
        { error: 'Server not found' },
        { status: 404 }
      );
    }

    if (mcpClientManager.isConnected(serverId)) {
      return NextResponse.json(
        { error: 'Server is already connected' },
        { status: 400 }
      );
    }

    const config: MCPServerConfig = {
      id: server.id,
      name: server.name,
      transport: server.transport,
      command: server.command,
      args: server.args,
      env: server.env,
      url: server.url,
      headers: server.headers,
    };

    await mcpClientManager.connect(config);

    return NextResponse.json({ success: true, connected: true });
  } catch (error) {
    console.error('Error connecting to MCP server:', error);
    
    let errorMessage = 'Failed to connect to server';
    if (error instanceof Error) {
      errorMessage = error.message;
      // HTTP 에러인 경우 더 명확한 메시지 제공
      if (errorMessage.includes('403') || errorMessage.includes('Access Denied')) {
        errorMessage = `서버에 접근할 수 없습니다 (403). URL이 올바른지 확인하세요: ${server?.url || 'N/A'}`;
      } else if (errorMessage.includes('404') || errorMessage.includes('Not Found')) {
        errorMessage = `서버를 찾을 수 없습니다 (404). URL이 올바른지 확인하세요: ${server?.url || 'N/A'}`;
      } else if (errorMessage.includes('ENOTFOUND') || errorMessage.includes('getaddrinfo')) {
        errorMessage = `서버 주소를 찾을 수 없습니다. URL이 올바른지 확인하세요: ${server?.url || 'N/A'}`;
      }
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

