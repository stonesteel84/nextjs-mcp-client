#!/usr/bin/env node

/**
 * Docker Hub MCP Server
 * Docker Hub API를 사용하여 이미지 검색 및 정보 조회
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';

const DOCKER_HUB_TOKEN = process.env.DOCKER_HUB_TOKEN;

if (!DOCKER_HUB_TOKEN) {
  console.error('Error: DOCKER_HUB_TOKEN environment variable is required');
  process.exit(1);
}

const server = new Server(
  {
    name: 'docker-hub-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

/**
 * Docker Hub API 호출 헬퍼
 */
async function dockerHubApi(endpoint: string, options: RequestInit = {}): Promise<any> {
  const url = `https://hub.docker.com/v2${endpoint}`;
  const headers = {
    'Authorization': `Bearer ${DOCKER_HUB_TOKEN}`,
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Docker Hub API error: ${response.status} ${response.statusText} - ${errorText}`);
  }

  return response.json();
}

// 도구 목록 제공
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'searchImages',
        description: 'Search Docker images on Docker Hub',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query for Docker images',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
              default: 1,
            },
            page_size: {
              type: 'number',
              description: 'Number of results per page (default: 10)',
              default: 10,
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'getImageTags',
        description: 'Get tags for a specific Docker image',
        inputSchema: {
          type: 'object',
          properties: {
            namespace: {
              type: 'string',
              description: 'Image namespace (e.g., "library" for official images)',
            },
            repository: {
              type: 'string',
              description: 'Repository name',
            },
            page: {
              type: 'number',
              description: 'Page number (default: 1)',
              default: 1,
            },
            page_size: {
              type: 'number',
              description: 'Number of results per page (default: 10)',
              default: 10,
            },
          },
          required: ['namespace', 'repository'],
        },
      },
      {
        name: 'getImageInfo',
        description: 'Get detailed information about a Docker image',
        inputSchema: {
          type: 'object',
          properties: {
            namespace: {
              type: 'string',
              description: 'Image namespace (e.g., "library" for official images)',
            },
            repository: {
              type: 'string',
              description: 'Repository name',
            },
          },
          required: ['namespace', 'repository'],
        },
      },
    ],
  };
});

// 도구 호출 처리
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'searchImages': {
        const query = args?.query as string;
        const page = (args?.page as number) || 1;
        const pageSize = (args?.page_size as number) || 10;

        if (!query || typeof query !== 'string') {
          throw new McpError(
            ErrorCode.InvalidParams,
            'Query is required and must be a string'
          );
        }

        const result = await dockerHubApi(
          `/repositories/search?q=${encodeURIComponent(query)}&page=${page}&page_size=${pageSize}`
        );

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'getImageTags': {
        const namespace = args?.namespace as string;
        const repository = args?.repository as string;
        const page = (args?.page as number) || 1;
        const pageSize = (args?.page_size as number) || 10;

        if (!namespace || !repository) {
          throw new McpError(
            ErrorCode.InvalidParams,
            'Namespace and repository are required'
          );
        }

        const result = await dockerHubApi(
          `/repositories/${namespace}/${repository}/tags?page=${page}&page_size=${pageSize}`
        );

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'getImageInfo': {
        const namespace = args?.namespace as string;
        const repository = args?.repository as string;

        if (!namespace || !repository) {
          throw new McpError(
            ErrorCode.InvalidParams,
            'Namespace and repository are required'
          );
        }

        const result = await dockerHubApi(`/repositories/${namespace}/${repository}`);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      default:
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Unknown tool: ${name}`
        );
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new McpError(
      ErrorCode.InternalError,
      `Failed to execute tool: ${errorMessage}`
    );
  }
});

// 서버 시작
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Docker Hub MCP server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

