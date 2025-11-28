import { NextRequest, NextResponse } from 'next/server';
import { mcpClientManager } from '@/lib/mcp-client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ serverId: string }> }
) {
  try {
    const { serverId } = await params;
    const client = mcpClientManager.getClient(serverId);

    if (!client) {
      return NextResponse.json(
        { error: 'Server is not connected' },
        { status: 400 }
      );
    }

    const tools = await client.listTools();

    return NextResponse.json(tools);
  } catch (error) {
    console.error('Error listing tools:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to list tools' 
      },
      { status: 500 }
    );
  }
}

