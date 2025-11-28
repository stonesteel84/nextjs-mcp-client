import { NextRequest, NextResponse } from 'next/server';
import { getMCPServer, saveMCPServer, deleteMCPServer, type StoredMCPServer } from '@/app/actions/mcp';
import { mcpClientManager } from '@/lib/mcp-client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET: 개별 서버 정보 조회
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ serverId: string }> }
) {
  try {
    const { serverId } = await params;
    const server = await getMCPServer(serverId);

    if (!server) {
      return NextResponse.json(
        { error: 'Server not found' },
        { status: 404 }
      );
    }

    const connected = mcpClientManager.isConnected(serverId);

    return NextResponse.json({
      ...server,
      connected,
    });
  } catch (error) {
    console.error('Error fetching MCP server:', error);
    return NextResponse.json(
      { error: 'Failed to fetch server' },
      { status: 500 }
    );
  }
}

// PUT: 서버 정보 업데이트
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ serverId: string }> }
) {
  try {
    const { serverId } = await params;
    const body = await req.json();
    const { name, transport, command, args, env, url } = body;

    const existingServer = await getMCPServer(serverId);
    if (!existingServer) {
      return NextResponse.json(
        { error: 'Server not found' },
        { status: 404 }
      );
    }

    // 연결되어 있으면 먼저 해제
    if (mcpClientManager.isConnected(serverId)) {
      await mcpClientManager.disconnect(serverId);
    }

    const updatedServer: StoredMCPServer = {
      ...existingServer,
      name: name || existingServer.name,
      transport: transport || existingServer.transport,
      command: command !== undefined ? command : existingServer.command,
      args: args !== undefined ? args : existingServer.args,
      env: env !== undefined ? env : existingServer.env,
      url: url !== undefined ? url : existingServer.url,
      updatedAt: Date.now(),
    };

    const savedServer = await saveMCPServer(updatedServer);

    return NextResponse.json({ server: savedServer });
  } catch (error) {
    console.error('Error updating MCP server:', error);
    return NextResponse.json(
      { error: 'Failed to update server' },
      { status: 500 }
    );
  }
}

// DELETE: 서버 삭제
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ serverId: string }> }
) {
  try {
    const { serverId } = await params;

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


