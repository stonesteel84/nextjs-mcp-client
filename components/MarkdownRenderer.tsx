'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';
import { Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface MarkdownRendererProps {
  content: string;
  className?: string;
  imageUrl?: string; // 이미 업로드된 이미지 URL이 있으면 base64 이미지 제거
}

/**
 * base64 이미지 데이터를 마크다운 이미지로 변환
 * MCP 도구 응답에서 raw base64 이미지를 감지하여 변환
 */
function processContentForBase64Images(content: string): string {
  // data:image URL을 마크다운 이미지로 변환 (이미 마크다운 형식이 아닌 경우)
  // 예: data:image/png;base64,... -> ![Generated Image](data:image/png;base64,...)
  const base64ImagePattern = /(?<![!\[.*\]\())(data:image\/[a-zA-Z]+;base64,[A-Za-z0-9+/=]+)/g;
  let processed = content.replace(base64ImagePattern, (match) => {
    return `\n\n![Generated Image](${match})\n\n`;
  });
  
  // JSON 형식의 MCP 이미지 응답 처리
  // 예: {"type":"image","data":"base64...","mimeType":"image/png"}
  const jsonImagePattern = /\{"type"\s*:\s*"image"\s*,\s*"data"\s*:\s*"([^"]+)"\s*,\s*"mimeType"\s*:\s*"([^"]+)"\s*\}/g;
  processed = processed.replace(jsonImagePattern, (_, data, mimeType) => {
    return `\n\n![Generated Image](data:${mimeType};base64,${data})\n\n`;
  });
  
  // 역순 JSON 형식도 처리
  const jsonImagePattern2 = /\{"mimeType"\s*:\s*"([^"]+)"\s*,\s*"type"\s*:\s*"image"\s*,\s*"data"\s*:\s*"([^"]+)"\s*\}/g;
  processed = processed.replace(jsonImagePattern2, (_, mimeType, data) => {
    return `\n\n![Generated Image](data:${mimeType};base64,${data})\n\n`;
  });

  return processed;
}

export function MarkdownRenderer({ content, className, imageUrl }: MarkdownRendererProps) {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  
  // 이미 업로드된 이미지 URL이 있으면 base64 이미지를 제거
  let processedContent = content;
  if (imageUrl) {
    // base64 이미지 패턴 제거 (마크다운 이미지 태그 포함)
    processedContent = processedContent.replace(/!\[[^\]]*\]\(data:image\/[^)]+\)/g, '');
    processedContent = processedContent.replace(/!\[Generated Image\]\(data:image\/[^)]+\)/g, '');
    processedContent = processedContent.replace(/data:image\/[a-zA-Z]+;base64,[A-Za-z0-9+/=]+/g, '');
    // 빈 이미지 태그 제거
    processedContent = processedContent.replace(/!\[[^\]]*\]\(\)/g, '');
    processedContent = processedContent.replace(/!\[[^\]]*\]\(""\)/g, '');
  } else {
    // base64 이미지를 마크다운으로 변환
    processedContent = processContentForBase64Images(processedContent);
  }

  const copyToClipboard = async (code: string, id: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(id);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  return (
    <div className={cn('markdown-body', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ node, inline, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || '');
            const codeString = String(children).replace(/\n$/, '');
            const codeId = `code-${Math.random().toString(36).substr(2, 9)}`;

            return !inline && match ? (
              <div className="relative group my-4">
                <div className="flex items-center justify-between bg-[#1e1e1e] px-4 py-2 rounded-t-lg border-b border-gray-700">
                  <span className="text-xs text-gray-400 uppercase">{match[1]}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs hover:bg-gray-700"
                    onClick={() => copyToClipboard(codeString, codeId)}
                  >
                    {copiedCode === codeId ? (
                      <>
                        <Check className="h-3 w-3 mr-1" />
                        복사됨
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3 mr-1" />
                        복사
                      </>
                    )}
                  </Button>
                </div>
                <SyntaxHighlighter
                  {...props}
                  PreTag="div"
                  language={match[1]}
                  style={vscDarkPlus}
                  customStyle={{
                    margin: 0,
                    borderRadius: '0 0 0.5rem 0.5rem',
                    padding: '1rem',
                  }}
                  codeTagProps={{
                    style: {
                      fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
                    },
                  }}
                >
                  {codeString}
                </SyntaxHighlighter>
              </div>
            ) : (
              <code
                {...props}
                className={cn(
                  'relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm',
                  className
                )}
              >
                {children}
              </code>
            );
          },
          h1: ({ node, ...props }) => (
            <h1 className="text-3xl font-bold mt-6 mb-4 pb-2 border-b" {...props} />
          ),
          h2: ({ node, ...props }) => (
            <h2 className="text-2xl font-semibold mt-5 mb-3" {...props} />
          ),
          h3: ({ node, ...props }) => (
            <h3 className="text-xl font-semibold mt-4 mb-2" {...props} />
          ),
          h4: ({ node, ...props }) => (
            <h4 className="text-lg font-semibold mt-3 mb-2" {...props} />
          ),
          p: ({ node, ...props }) => (
            <p className="mb-4 leading-7" {...props} />
          ),
          ul: ({ node, ...props }) => (
            <ul className="mb-4 ml-6 list-disc space-y-2" {...props} />
          ),
          ol: ({ node, ...props }) => (
            <ol className="mb-4 ml-6 list-decimal space-y-2" {...props} />
          ),
          li: ({ node, ...props }) => (
            <li className="leading-7" {...props} />
          ),
          blockquote: ({ node, ...props }) => (
            <blockquote
              className="mb-4 border-l-4 border-gray-300 pl-4 italic text-gray-600 dark:border-gray-600 dark:text-gray-400"
              {...props}
            />
          ),
          a: ({ node, ...props }) => (
            <a
              className="text-blue-600 hover:underline dark:text-blue-400"
              target="_blank"
              rel="noopener noreferrer"
              {...props}
            />
          ),
          table: ({ node, ...props }) => (
            <div className="my-4 overflow-x-auto">
              <table className="min-w-full border-collapse border border-gray-300 dark:border-gray-700" {...props} />
            </div>
          ),
          thead: ({ node, ...props }) => (
            <thead className="bg-gray-100 dark:bg-gray-800" {...props} />
          ),
          tbody: ({ node, ...props }) => (
            <tbody {...props} />
          ),
          tr: ({ node, ...props }) => (
            <tr className="border-b border-gray-300 dark:border-gray-700" {...props} />
          ),
          th: ({ node, ...props }) => (
            <th className="border border-gray-300 px-4 py-2 text-left font-semibold dark:border-gray-700" {...props} />
          ),
          td: ({ node, ...props }) => (
            <td className="border border-gray-300 px-4 py-2 dark:border-gray-700" {...props} />
          ),
          hr: ({ node, ...props }) => (
            <hr className="my-6 border-gray-300 dark:border-gray-700" {...props} />
          ),
          img: ({ node, src, alt, ...props }) => {
            // base64 이미지 또는 일반 URL 이미지 렌더링
            const srcStr = typeof src === 'string' ? src : '';
            
            // src가 비어있거나 유효하지 않으면 렌더링하지 않음
            if (!srcStr || srcStr.trim() === '') {
              return null;
            }
            
            const isBase64 = srcStr.startsWith('data:image/');
            return (
              <img
                src={srcStr}
                alt={alt || 'image'}
                className={cn(
                  'max-w-full h-auto rounded-lg my-4',
                  isBase64 ? 'shadow-lg border border-gray-200 dark:border-gray-700' : ''
                )}
                loading="lazy"
                {...props}
              />
            );
          },
        }}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  );
}


