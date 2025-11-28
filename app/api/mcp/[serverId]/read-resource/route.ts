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
    const { uri } = body;

    if (!uri) {
      return NextResponse.json(
        { error: 'Resource URI is required' },
        { status: 400 }
      );
    }

    const resource = await client.readResource({ uri });

    return NextResponse.json(resource);
  } catch (error) {
    console.error('Error reading resource:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to read resource' 
      },
      { status: 500 }
    );
  }
}

