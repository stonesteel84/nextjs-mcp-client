import { GoogleGenAI, FunctionCallingConfigMode, Type } from '@google/genai';
import { NextRequest } from 'next/server';
import { LLM, ERROR_MESSAGES, SSE } from '@/lib/constants';
import { mcpClientManager } from '@/lib/mcp-client';
import { extractAndUploadImages } from '@/lib/utils/image-storage';
import { updateMessage } from '@/app/actions/chat';
import type { GeminiMessage, ChatHistory, SSEEvent } from '@/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * 히스토리를 Gemini API 형식으로 변환
 */
function formatHistory(history: ChatHistory[]): GeminiMessage[] {
  return history.map((item) => ({
    role: item.role === 'assistant' ? 'model' : item.role,
    parts: item.parts || [{ text: '' }],
  }));
}

/**
 * SSE 이벤트 생성 헬퍼
 */
function createSSEEvent(event: SSEEvent): string {
  return `${SSE.DATA_PREFIX}${JSON.stringify(event)}\n\n`;
}

/**
 * MCP 도구 스키마를 Gemini FunctionDeclaration으로 변환
 */
function convertMCPToolToFunctionDeclaration(tool: {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
}) {
  return {
    name: tool.name,
    description: tool.description || '',
    parameters: tool.inputSchema || { type: Type.OBJECT, properties: {} },
  };
}

/**
 * 채팅 API 핸들러
 * Gemini API + MCP Tools를 통해 스트리밍 응답 생성
 */
export async function POST(req: NextRequest) {
  try {
    const { message, history, mcpEnabled = false, enabledServerIds = [], sessionId } = await req.json();

    if (!message || typeof message !== 'string') {
      return new Response(
        JSON.stringify({ error: ERROR_MESSAGES.MESSAGE_REQUIRED }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    const model = process.env.LLM_MODEL || LLM.DEFAULT_MODEL;

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: ERROR_MESSAGES.GEMINI_NOT_CONFIGURED }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const ai = new GoogleGenAI({ apiKey });

    // 채팅 히스토리 구성
    let contents: GeminiMessage[] | string;
    if (history && Array.isArray(history) && history.length > 0) {
      const formattedHistory = formatHistory(history);
      contents = [
        ...formattedHistory,
        { role: 'user', parts: [{ text: message }] },
      ];
    } else {
      contents = message;
    }

    // MCP 도구 및 클라이언트 수집
    const functionDeclarations: ReturnType<typeof convertMCPToolToFunctionDeclaration>[] = [];
    const mcpClients: Map<string, { serverId: string; client: ReturnType<typeof mcpClientManager.getClient> }> = new Map();
    
    if (mcpEnabled) {
      const serverIds = enabledServerIds.length > 0 
        ? enabledServerIds 
        : mcpClientManager.getConnectedServers();
      
      for (const serverId of serverIds) {
        const client = mcpClientManager.getClient(serverId);
        if (client) {
          try {
            // MCP 서버에서 도구 목록 가져오기
            const toolsResult = await client.listTools();
            for (const tool of toolsResult.tools) {
              functionDeclarations.push(convertMCPToolToFunctionDeclaration(tool));
              mcpClients.set(tool.name, { serverId, client });
            }
          } catch (error) {
            console.error(`Failed to list tools from ${serverId}:`, error);
          }
        }
      }
    }

    // ReadableStream으로 변환하여 클라이언트에 전송
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          // MCP 도구가 있는 경우
          if (functionDeclarations.length > 0) {
            // 사용 가능한 도구 정보 전송
            controller.enqueue(
              encoder.encode(
                createSSEEvent({
                  type: 'function_call',
                  data: {
                    functionCall: {
                      id: 'tools-available',
                      name: '🔧 사용 가능한 MCP 도구',
                      args: { tools: functionDeclarations.map(t => t.name) },
                    },
                  },
                })
              )
            );

            // Gemini에 도구와 함께 요청
            const response = await ai.models.generateContent({
              model,
              contents,
              config: {
                tools: [{ functionDeclarations }],
                toolConfig: {
                  functionCallingConfig: {
                    mode: FunctionCallingConfigMode.AUTO,
                  },
                },
              },
            });

            // 함수 호출이 있는지 확인
            if (response.functionCalls && response.functionCalls.length > 0) {
              const functionResults: { name: string; response: unknown; imageUrl?: string }[] = [];

              for (const call of response.functionCalls) {
                const toolName = call.name || 'unknown';
                const toolArgs = (call.args as Record<string, unknown>) || {};

                // 함수 호출 시작 이벤트
                controller.enqueue(
                  encoder.encode(
                    createSSEEvent({
                      type: 'function_call',
                      data: {
                        functionCall: {
                          id: `call-${Date.now()}`,
                          name: toolName,
                          args: toolArgs,
                        },
                      },
                    })
                  )
                );

                // MCP 클라이언트를 통해 실제 도구 호출
                const mcpClient = mcpClients.get(toolName);
                if (mcpClient?.client) {
                  try {
                    const result = await mcpClient.client.callTool({
                      name: toolName,
                      arguments: toolArgs,
                    });

                    // 이미지가 포함된 경우 Storage에 업로드
                    let uploadedImageUrl: string | undefined;
                    if (sessionId && result.content) {
                      try {
                        const imageUrls = await extractAndUploadImages(
                          result.content,
                          sessionId,
                          `tool-${Date.now()}`
                        );
                        if (imageUrls.length > 0) {
                          uploadedImageUrl = imageUrls[0]; // 첫 번째 이미지 URL 사용
                        }
                      } catch (imageError) {
                        console.error('Failed to upload image:', imageError);
                        // 이미지 업로드 실패해도 도구 호출은 계속 진행
                      }
                    }

                    // 함수 결과 이벤트
                    controller.enqueue(
                      encoder.encode(
                        createSSEEvent({
                          type: 'function_result',
                          data: {
                            functionResult: {
                              id: `result-${Date.now()}`,
                              name: toolName,
                              result: result.content,
                              imageUrl: uploadedImageUrl,
                            },
                          },
                        })
                      )
                    );

                    functionResults.push({
                      name: toolName,
                      response: result.content,
                      imageUrl: uploadedImageUrl,
                    });
                  } catch (error) {
                    console.error(`Tool call failed for ${toolName}:`, error);
                    controller.enqueue(
                      encoder.encode(
                        createSSEEvent({
                          type: 'function_result',
                          data: {
                            functionResult: {
                              id: `error-${Date.now()}`,
                              name: toolName,
                              result: { error: error instanceof Error ? error.message : 'Tool call failed' },
                            },
                          },
                        })
                      )
                    );
                  }
                }
              }

              // 함수 결과를 포함하여 최종 응답 생성
              if (functionResults.length > 0) {
                // 이미지 URL 추출 (첫 번째 이미지만 사용)
                const imageUrl = functionResults.find(r => r.imageUrl)?.imageUrl;
                
                // 함수 결과를 텍스트로 변환
                const resultSummary = functionResults.map(result => {
                  const resultText = Array.isArray(result.response) 
                    ? result.response.map((r: { type?: string; text?: string }) => r.text || JSON.stringify(r)).join('\n')
                    : typeof result.response === 'string' 
                      ? result.response 
                      : JSON.stringify(result.response);
                  return `${result.name} 결과: ${resultText}`;
                }).join('\n');

                // 결과를 포함하여 후속 요청
                const followUpMessage = `사용자 질문: ${message}\n\n도구 호출 결과:\n${resultSummary}\n\n위 결과를 바탕으로 사용자에게 친절하게 답변해주세요.`;

                const finalResponse = await ai.models.generateContent({
                  model,
                  contents: followUpMessage,
                });

                const finalText = finalResponse.text || '';
                if (finalText) {
                  controller.enqueue(
                    encoder.encode(
                      createSSEEvent({
                        type: 'text',
                        data: { 
                          text: `\n---\n\n${finalText}`,
                          imageUrl: imageUrl, // 이미지 URL 포함
                        },
                      })
                    )
                  );
                }
              }
            } else {
              // 함수 호출 없이 바로 텍스트 응답
              const text = response.text || '';
              if (text) {
                controller.enqueue(
                  encoder.encode(
                    createSSEEvent({
                      type: 'text',
                      data: { text },
                    })
                  )
                );
              }
            }

            controller.enqueue(
              encoder.encode(
                createSSEEvent({
                  type: 'done',
                  data: {},
                })
              )
            );
            controller.close();
          } else {
            // MCP 도구 없이 일반 스트리밍
            const stream = await ai.models.generateContentStream({
              model,
              contents,
            });

            for await (const chunk of stream) {
              const text = chunk.text || '';
              if (text) {
                controller.enqueue(
                  encoder.encode(
                    createSSEEvent({
                      type: 'text',
                      data: { text },
                    })
                  )
                );
              }
            }

            controller.enqueue(
              encoder.encode(
                createSSEEvent({
                  type: 'done',
                  data: {},
                })
              )
            );
            controller.close();
          }
        } catch (error) {
          console.error('Stream error:', error);
          controller.enqueue(
            encoder.encode(
              createSSEEvent({
                type: 'error',
                data: {
                  error: error instanceof Error ? error.message : 'Stream error',
                },
              })
            )
          );
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
