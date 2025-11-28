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

    const resources = await client.listResources();

    return NextResponse.json(resources);
  } catch (error) {
    console.error('Error listing resources:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to list resources' 
      },
      { status: 500 }
    );
  }
}

