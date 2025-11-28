'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useMCP } from '@/contexts/MCPContext';
import { TransportType } from '@/lib/mcp-client';
import { StoredMCPServer, mcpStorage } from '@/lib/mcp-storage';
import { Plus, Trash2, Power, PowerOff, Download, Upload, Play, Wrench, FileText, Database } from 'lucide-react';
import { cn } from '@/lib/utils';

// Export textarea component that loads data asynchronously
function ExportTextarea() {
  const [value, setValue] = useState('');

  useEffect(() => {
    mcpStorage.export().then(setValue).catch(console.error);
  }, []);

  return (
    <Textarea
      value={value}
      readOnly
      rows={10}
      className="font-mono text-xs"
    />
  );
}

export function MCPServerManager() {
  const { servers, connectedServers, refreshServers, addServer, deleteServer, setConnected } = useMCP();
  const [selectedServer, setSelectedServer] = useState<string | null>(null);
  const [tools, setTools] = useState<any[]>([]);
  const [prompts, setPrompts] = useState<any[]>([]);
  const [resources, setResources] = useState<any[]>([]);
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  // 서버 등록 폼 상태
  const [formData, setFormData] = useState({
    name: '',
    transport: 'stdio' as TransportType,
    command: '',
    args: '',
    env: '',
    url: '',
    headers: '',
  });

  useEffect(() => {
    refreshServers();
  }, [refreshServers]);

  const handleAddServer = async () => {
    try {
      // 기본 검증
      if (!formData.name.trim()) {
        alert('서버 이름을 입력해주세요.');
        return;
      }

      const serverData: {
        name: string;
        transport: TransportType;
        command?: string;
        args?: string[];
        env?: Record<string, string>;
        url?: string;
        headers?: Record<string, string>;
      } = {
        name: formData.name.trim(),
        transport: formData.transport,
      };

      if (formData.transport === 'stdio') {
        if (!formData.command.trim()) {
          alert('Command를 입력해주세요.');
          return;
        }
        serverData.command = formData.command.trim();
        
        if (formData.args.trim()) {
          serverData.args = formData.args
            .split('\n')
            .map((a) => a.trim())
            .filter((a) => a.length > 0);
        }
        
        if (formData.env.trim()) {
          try {
            const parsed = JSON.parse(formData.env);
            if (typeof parsed !== 'object' || Array.isArray(parsed)) {
              throw new Error('Invalid format');
            }
            serverData.env = parsed;
          } catch (error) {
            alert('환경 변수는 유효한 JSON 객체 형식이어야 합니다.\n예: {"KEY": "value"}');
            return;
          }
        }
      } else {
        // streamable-http 또는 sse
        if (!formData.url.trim()) {
          alert('URL을 입력해주세요.');
          return;
        }

        // URL 형식 검증
        try {
          new URL(formData.url.trim());
        } catch {
          alert('유효한 URL 형식을 입력해주세요.\n예: https://server.smithery.ai/serverName/mcp');
          return;
        }

        serverData.url = formData.url.trim();
        
        if (formData.headers.trim()) {
          try {
            const parsed = JSON.parse(formData.headers);
            if (typeof parsed !== 'object' || Array.isArray(parsed)) {
              throw new Error('Invalid format');
            }
            serverData.headers = parsed;
          } catch (error) {
            alert('헤더는 유효한 JSON 객체 형식이어야 합니다.\n예: {"Authorization": "Bearer your-api-key"}');
            return;
          }
        }
      }

      const response = await fetch('/api/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(serverData),
      }).catch((fetchError) => {
        // 네트워크 에러 처리
        console.error('Network error:', fetchError);
        throw new Error(
          '네트워크 연결에 실패했습니다. 서버가 실행 중인지 확인해주세요.'
        );
      });

      if (!response.ok) {
        // HTTP 에러 응답 처리
        let errorMessage = '서버 추가에 실패했습니다.';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (parseError) {
          // JSON 파싱 실패 시 상태 코드로 메시지 생성
          errorMessage = `서버 오류 (${response.status}): ${response.statusText}`;
        }
        alert(errorMessage);
        return;
      }

      // 성공 시 응답 확인
      try {
        const result = await response.json();
        console.log('Server added successfully:', result);
      } catch (parseError) {
        console.warn('Response parsing failed, but request succeeded');
      }

      // 성공 시 폼 초기화 및 다이얼로그 닫기
      setIsDialogOpen(false);
      setFormData({
        name: '',
        transport: 'stdio',
        command: '',
        args: '',
        env: '',
        url: '',
        headers: '',
      });
      await refreshServers();
    } catch (error) {
      console.error('Error adding server:', error);
      
      // 에러 타입별 메시지 처리
      let errorMessage = '서버 추가 중 오류가 발생했습니다.';
      
      if (error instanceof Error) {
        if (error.message.includes('네트워크')) {
          errorMessage = error.message;
        } else if (error.message.includes('JSON')) {
          errorMessage = '서버 응답 형식이 올바르지 않습니다.';
        } else {
          errorMessage = error.message;
        }
      }
      
      alert(errorMessage);
    }
  };

  const handleConnect = async (serverId: string) => {
    setLoading((prev) => ({ ...prev, [serverId]: true }));
    try {
      const response = await fetch(`/api/mcp/${serverId}/connect`, {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to connect');
      }

      setConnected(serverId, true);
      if (selectedServer === serverId) {
        await loadServerData(serverId);
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to connect');
    } finally {
      setLoading((prev) => ({ ...prev, [serverId]: false }));
    }
  };

  const handleDisconnect = async (serverId: string) => {
    setLoading((prev) => ({ ...prev, [serverId]: true }));
    try {
      const response = await fetch(`/api/mcp/${serverId}/disconnect`, {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to disconnect');
      }

      setConnected(serverId, false);
      setTools([]);
      setPrompts([]);
      setResources([]);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to disconnect');
    } finally {
      setLoading((prev) => ({ ...prev, [serverId]: false }));
    }
  };

  const handleDelete = async (serverId: string) => {
    if (!confirm('서버를 삭제하시겠습니까?')) return;

    try {
      if (connectedServers.has(serverId)) {
        await handleDisconnect(serverId);
      }

      const response = await fetch(`/api/mcp?id=${serverId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete server');
      }

      if (selectedServer === serverId) {
        setSelectedServer(null);
      }
      refreshServers();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to delete server');
    }
  };

  const loadServerData = async (serverId: string) => {
    if (!connectedServers.has(serverId)) return;

    try {
      // Tools 로드
      const toolsRes = await fetch(`/api/mcp/${serverId}/tools`);
      if (toolsRes.ok) {
        const toolsData = await toolsRes.json();
        setTools(toolsData.tools || []);
      }

      // Prompts 로드
      const promptsRes = await fetch(`/api/mcp/${serverId}/prompts`);
      if (promptsRes.ok) {
        const promptsData = await promptsRes.json();
        setPrompts(promptsData.prompts || []);
      }

      // Resources 로드
      const resourcesRes = await fetch(`/api/mcp/${serverId}/resources`);
      if (resourcesRes.ok) {
        const resourcesData = await resourcesRes.json();
        setResources(resourcesData.resources || []);
      }
    } catch (error) {
      console.error('Error loading server data:', error);
    }
  };

  const handleSelectServer = (serverId: string) => {
    setSelectedServer(serverId);
    if (connectedServers.has(serverId)) {
      loadServerData(serverId);
    }
  };

  const handleExecuteTool = async (serverId: string, toolName: string, args: any) => {
    try {
      const response = await fetch(`/api/mcp/${serverId}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: toolName, arguments: args }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to execute tool');
      }

      const result = await response.json();
      alert(JSON.stringify(result, null, 2));
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to execute tool');
    }
  };

  const handleExport = async () => {
    try {
      const exported = await mcpStorage.export();
      const blob = new Blob([exported], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'mcp-servers.json';
      a.click();
      URL.revokeObjectURL(url);
      setExportDialogOpen(false);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to export');
    }
  };

  const handleImport = async (jsonString: string) => {
    try {
      await mcpStorage.import(jsonString);
      await refreshServers();
      setImportDialogOpen(false);
      alert('서버 설정을 가져왔습니다.');
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to import');
    }
  };

  return (
    <div className="flex h-screen flex-col">
      <div className="border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">MCP 서버 관리</h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setExportDialogOpen(true)}>
              <Download className="mr-2 h-4 w-4" />
              내보내기
            </Button>
            <Button variant="outline" onClick={() => setImportDialogOpen(true)}>
              <Upload className="mr-2 h-4 w-4" />
              가져오기
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  서버 추가
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>MCP 서버 추가</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>서버 이름</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="서버 이름을 입력하세요"
                    />
                  </div>
                  <div>
                    <Label>Transport 타입</Label>
                    <Select
                      value={formData.transport}
                      onValueChange={(value) => setFormData({ ...formData, transport: value as TransportType })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="stdio">STDIO</SelectItem>
                        <SelectItem value="streamable-http">Streamable HTTP</SelectItem>
                        <SelectItem value="sse">SSE</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {formData.transport === 'stdio' ? (
                    <>
                      <div>
                        <Label>Command</Label>
                        <Input
                          value={formData.command}
                          onChange={(e) => setFormData({ ...formData, command: e.target.value })}
                          placeholder="node"
                        />
                      </div>
                      <div>
                        <Label>Arguments (한 줄에 하나씩)</Label>
                        <Textarea
                          value={formData.args}
                          onChange={(e) => setFormData({ ...formData, args: e.target.value })}
                          placeholder="server.js"
                          rows={3}
                        />
                      </div>
                      <div>
                        <Label>Environment Variables (JSON)</Label>
                        <Textarea
                          value={formData.env}
                          onChange={(e) => setFormData({ ...formData, env: e.target.value })}
                          placeholder='{"KEY": "value"}'
                          rows={3}
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <Label>URL</Label>
                        <Input
                          value={formData.url}
                          onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                          placeholder="https://server.smithery.ai/{serverName}/mcp"
                        />
                      </div>
                      <div>
                        <Label>HTTP Headers (JSON, 선택사항)</Label>
                        <Textarea
                          value={formData.headers}
                          onChange={(e) => setFormData({ ...formData, headers: e.target.value })}
                          placeholder='{"Authorization": "Bearer your-api-key"}'
                          rows={3}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Smithery 등 인증이 필요한 서버용. API 키를 헤더로 전달합니다.
                        </p>
                      </div>
                    </>
                  )}
                  <Button onClick={handleAddServer} className="w-full">
                    추가
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* 서버 목록 */}
        <div className="w-64 border-r p-4">
          <ScrollArea className="h-full">
            <div className="space-y-2">
              {servers.map((server) => (
                <Card
                  key={server.id}
                  className={cn(
                    'p-3 cursor-pointer transition-colors',
                    selectedServer === server.id && 'bg-primary text-primary-foreground',
                    selectedServer !== server.id && 'hover:bg-muted'
                  )}
                  onClick={() => handleSelectServer(server.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{server.name}</p>
                      <p className="text-xs opacity-70">{server.transport}</p>
                    </div>
                    <div className="flex gap-1">
                      {connectedServers.has(server.id) ? (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDisconnect(server.id);
                          }}
                          disabled={loading[server.id]}
                        >
                          <PowerOff className="h-3 w-3" />
                        </Button>
                      ) : (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleConnect(server.id);
                          }}
                          disabled={loading[server.id]}
                        >
                          <Power className="h-3 w-3" />
                        </Button>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(server.id);
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  {connectedServers.has(server.id) && (
                    <div className="mt-2 text-xs opacity-70">
                      <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-1"></span>
                      연결됨
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* 서버 상세 정보 */}
        <div className="flex-1 p-6">
          {selectedServer ? (
            <Tabs defaultValue="tools" className="h-full flex flex-col">
              <TabsList>
                <TabsTrigger value="tools">
                  <Wrench className="mr-2 h-4 w-4" />
                  Tools
                </TabsTrigger>
                <TabsTrigger value="prompts">
                  <FileText className="mr-2 h-4 w-4" />
                  Prompts
                </TabsTrigger>
                <TabsTrigger value="resources">
                  <Database className="mr-2 h-4 w-4" />
                  Resources
                </TabsTrigger>
              </TabsList>
              <TabsContent value="tools" className="flex-1 overflow-auto">
                {connectedServers.has(selectedServer) ? (
                  <div className="space-y-4 mt-4">
                    {tools.map((tool) => (
                      <Card key={tool.name} className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold">{tool.name}</h3>
                            <p className="text-sm text-muted-foreground mt-1">{tool.description}</p>
                            {tool.inputSchema && (
                              <div className="mt-3">
                                <p className="text-xs font-medium mb-1">Input Schema:</p>
                                <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                                  {JSON.stringify(tool.inputSchema, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                          <Button
                            size="sm"
                            onClick={() => {
                              const args = prompt('Tool arguments (JSON):', '{}');
                              if (args) {
                                try {
                                  const parsed = JSON.parse(args);
                                  handleExecuteTool(selectedServer, tool.name, parsed);
                                } catch {
                                  alert('Invalid JSON');
                                }
                              }
                            }}
                          >
                            <Play className="mr-2 h-3 w-3" />
                            실행
                          </Button>
                        </div>
                      </Card>
                    ))}
                    {tools.length === 0 && (
                      <p className="text-center text-muted-foreground mt-8">사용 가능한 도구가 없습니다.</p>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-muted-foreground">서버에 연결하여 도구를 확인하세요.</p>
                  </div>
                )}
              </TabsContent>
              <TabsContent value="prompts" className="flex-1 overflow-auto">
                {connectedServers.has(selectedServer) ? (
                  <div className="space-y-4 mt-4">
                    {prompts.map((prompt) => (
                      <Card key={prompt.name} className="p-4">
                        <h3 className="font-semibold">{prompt.name}</h3>
                        <p className="text-sm text-muted-foreground mt-1">{prompt.description}</p>
                        {prompt.arguments && (
                          <div className="mt-3">
                            <p className="text-xs font-medium mb-1">Arguments:</p>
                            <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                              {JSON.stringify(prompt.arguments, null, 2)}
                            </pre>
                          </div>
                        )}
                      </Card>
                    ))}
                    {prompts.length === 0 && (
                      <p className="text-center text-muted-foreground mt-8">사용 가능한 프롬프트가 없습니다.</p>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-muted-foreground">서버에 연결하여 프롬프트를 확인하세요.</p>
                  </div>
                )}
              </TabsContent>
              <TabsContent value="resources" className="flex-1 overflow-auto">
                {connectedServers.has(selectedServer) ? (
                  <div className="space-y-4 mt-4">
                    {resources.map((resource) => (
                      <Card key={resource.uri} className="p-4">
                        <h3 className="font-semibold">{resource.uri}</h3>
                        <p className="text-sm text-muted-foreground mt-1">{resource.description}</p>
                        <p className="text-xs text-muted-foreground mt-1">MIME: {resource.mimeType || 'N/A'}</p>
                      </Card>
                    ))}
                    {resources.length === 0 && (
                      <p className="text-center text-muted-foreground mt-8">사용 가능한 리소스가 없습니다.</p>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-muted-foreground">서버에 연결하여 리소스를 확인하세요.</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">서버를 선택하세요.</p>
            </div>
          )}
        </div>
      </div>

      {/* 내보내기 다이얼로그 */}
      <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>서버 설정 내보내기</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <ExportTextarea />
            <Button onClick={handleExport} className="w-full">
              파일로 저장
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 가져오기 다이얼로그 */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>서버 설정 가져오기</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="JSON 설정을 붙여넣으세요"
              rows={10}
              className="font-mono text-xs"
              id="import-textarea"
            />
            <Button
              onClick={() => {
                const textarea = document.getElementById('import-textarea') as HTMLTextAreaElement;
                if (textarea?.value) {
                  handleImport(textarea.value);
                }
              }}
              className="w-full"
            >
              가져오기
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

