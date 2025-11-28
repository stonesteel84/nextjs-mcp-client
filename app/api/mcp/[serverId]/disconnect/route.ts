import { NextRequest, NextResponse } from 'next/server';
import { mcpClientManager } from '@/lib/mcp-client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ serverId: string }> }
) {
  try {
    const { serverId } = await params;

    if (!mcpClientManager.isConnected(serverId)) {
      return NextResponse.json(
        { error: 'Server is not connected' },
        { status: 400 }
      );
    }

    await mcpClientManager.disconnect(serverId);

    return NextResponse.json({ success: true, connected: false });
  } catch (error) {
    console.error('Error disconnecting from MCP server:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to disconnect from server' 
      },
      { status: 500 }
    );
  }
}

