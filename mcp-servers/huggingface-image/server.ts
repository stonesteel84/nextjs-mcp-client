#!/usr/bin/env node

/**
 * Hugging Face Image Generation MCP Server
 * Text-to-image generation using Hugging Face Inference API
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { InferenceClient } from '@huggingface/inference';

const HF_TOKEN = process.env.HF_TOKEN;

if (!HF_TOKEN) {
  console.error('Error: HF_TOKEN environment variable is required');
  process.exit(1);
}

const client = new InferenceClient(HF_TOKEN);

const server = new Server(
  {
    name: 'huggingface-image-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

/**
 * Blob을 base64 문자열로 변환
 */
async function blobToBase64(blob: Blob): Promise<{ base64: string; mimeType: string }> {
  const arrayBuffer = await blob.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const base64 = buffer.toString('base64');
  
  // MIME 타입 감지 (기본값: PNG)
  const mimeType = blob.type || 'image/png';
  
  return {
    base64: `data:${mimeType};base64,${base64}`,
    mimeType,
  };
}

// 도구 목록 제공
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'textToImage',
        description: 'Generate an image from text using Hugging Face FLUX.1-schnell model',
        inputSchema: {
          type: 'object',
          properties: {
            prompt: {
              type: 'string',
              description: 'Text prompt describing the image to generate',
            },
            num_inference_steps: {
              type: 'number',
              description: 'Number of inference steps (default: 5)',
              default: 5,
            },
            provider: {
              type: 'string',
              description: 'Provider to use (default: nebius)',
              default: 'nebius',
              enum: ['nebius'],
            },
            model: {
              type: 'string',
              description: 'Model to use (default: black-forest-labs/FLUX.1-schnell)',
              default: 'black-forest-labs/FLUX.1-schnell',
            },
          },
          required: ['prompt'],
        },
      },
    ],
  };
});

// 도구 호출 처리
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === 'textToImage') {
    try {
      const prompt = args?.prompt as string;
      const numInferenceSteps = (args?.num_inference_steps as number) || 5;
      const provider = (args?.provider as string) || 'nebius';
      const model = (args?.model as string) || 'black-forest-labs/FLUX.1-schnell';

      if (!prompt || typeof prompt !== 'string') {
        throw new McpError(
          ErrorCode.InvalidParams,
          'Prompt is required and must be a string'
        );
      }

      // 이미지 생성
      const imageResult: unknown = await client.textToImage({
        provider: provider as 'nebius',
        model: model,
        inputs: prompt,
        parameters: { num_inference_steps: numInferenceSteps },
      });

      // 반환값을 처리하여 base64 이미지로 변환
      let base64Data: string;
      let mimeType = 'image/png';

      if (imageResult && typeof imageResult === 'object' && 'arrayBuffer' in imageResult) {
        // Blob 객체인 경우
        const blob = imageResult as Blob;
        const { base64, mimeType: detectedMimeType } = await blobToBase64(blob);
        base64Data = base64.split(',')[1];
        mimeType = detectedMimeType;
      } else if (typeof imageResult === 'string') {
        // Base64 문자열인 경우
        if (imageResult.startsWith('data:')) {
          const parts = imageResult.split(',');
          const header = parts[0];
          const mimeMatch = header.match(/data:([^;]+)/);
          if (mimeMatch) {
            mimeType = mimeMatch[1];
          }
          base64Data = parts[1];
        } else {
          base64Data = imageResult;
        }
      } else if (imageResult instanceof ArrayBuffer) {
        // ArrayBuffer인 경우
        const buffer = Buffer.from(imageResult);
        base64Data = buffer.toString('base64');
      } else if (Buffer.isBuffer(imageResult)) {
        // Buffer인 경우
        base64Data = imageResult.toString('base64');
      } else {
        // 기타 경우 - 에러
        throw new Error('Unsupported image result type');
      }

      // Base64 이미지 URL 생성
      const base64ImageUrl = `data:${mimeType};base64,${base64Data}`;

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              prompt: prompt,
              model: model,
              provider: provider,
              num_inference_steps: numInferenceSteps,
              mimeType: mimeType,
            }, null, 2),
          },
          {
            type: 'image',
            data: base64Data,
            mimeType: mimeType,
          },
          {
            type: 'text',
            text: base64ImageUrl, // 마크다운 렌더러에서 인식할 수 있도록
          },
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to generate image: ${errorMessage}`
      );
    }
  }

  throw new McpError(
    ErrorCode.MethodNotFound,
    `Unknown tool: ${name}`
  );
});

// 서버 시작
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Hugging Face Image MCP server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

