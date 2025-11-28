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
    const client = mcpClientManager.getClient(serverId);

    if (!client) {
      return NextResponse.json(
        { error: 'Server is not connected' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { name, arguments: args } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Tool name is required' },
        { status: 400 }
      );
    }

    const result = await client.callTool({
      name,
      arguments: args || {},
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error executing tool:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to execute tool' 
      },
      { status: 500 }
    );
  }
}

