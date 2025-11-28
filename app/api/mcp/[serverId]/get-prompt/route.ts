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
        { error: 'Prompt name is required' },
        { status: 400 }
      );
    }

    const prompt = await client.getPrompt({
      name,
      arguments: args || {},
    });

    return NextResponse.json(prompt);
  } catch (error) {
    console.error('Error getting prompt:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to get prompt' 
      },
      { status: 500 }
    );
  }
}

