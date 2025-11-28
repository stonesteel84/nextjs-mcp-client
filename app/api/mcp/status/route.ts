import { NextResponse } from 'next/server';
import { mcpClientManager } from '@/lib/mcp-client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET: 연결된 MCP 서버 상태 조회
 */
export async function GET() {
  try {
    const connections = mcpClientManager.getConnectionsInfo();
    const connectedServers = mcpClientManager.getConnectedServers();

    return NextResponse.json({
      connections,
      connectedServerIds: connectedServers,
      totalConnected: connectedServers.length,
    });
  } catch (error) {
    console.error('Error fetching MCP status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch MCP status' },
      { status: 500 }
    );
  }
}

