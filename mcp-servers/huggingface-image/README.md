# Hugging Face Image Generation MCP Server

Hugging Face Inference API를 사용하여 텍스트에서 이미지를 생성하는 MCP 서버입니다.

## 기능

- **textToImage**: 텍스트 프롬프트를 사용하여 이미지 생성
- FLUX.1-schnell 모델 사용 (빠른 생성)
- Nebius provider 사용

## 설정

1. Hugging Face 토큰 발급: https://huggingface.co/settings/tokens
2. 환경 변수 설정:
   ```bash
   export HF_TOKEN=your_huggingface_token_here
   ```

## MCP 서버 등록

MCP 관리 페이지에서 다음 설정으로 서버를 추가하세요:

### 방법 1: 프로젝트 루트에서 실행 (권장)

- **서버 이름**: Hugging Face Image
- **Transport**: STDIO
- **Command**: `pnpm`
- **Arguments** (한 줄에 하나씩):
  ```
  --dir
  mcp-servers/huggingface-image
  start
  ```
- **Environment Variables** (JSON):
  ```json
  {
    "HF_TOKEN": "your_huggingface_token_here"
  }
  ```

### 방법 2: 절대 경로 사용

- **서버 이름**: Hugging Face Image
- **Transport**: STDIO
- **Command**: `node`
- **Arguments** (한 줄에 하나씩):
  ```
  C:\Users\student\Documents\nextjs-mcp-client\mcp-servers\huggingface-image\node_modules\.bin\tsx
  C:\Users\student\Documents\nextjs-mcp-client\mcp-servers\huggingface-image\server.ts
  ```
- **Environment Variables** (JSON):
  ```json
  {
    "HF_TOKEN": "your_huggingface_token_here"
  }
  ```

### 방법 3: 상대 경로 사용 (프로젝트 루트 기준)

- **서버 이름**: Hugging Face Image
- **Transport**: STDIO
- **Command**: `node`
- **Arguments** (한 줄에 하나씩):
  ```
  mcp-servers/huggingface-image/node_modules/.bin/tsx
  mcp-servers/huggingface-image/server.ts
  ```
- **Environment Variables** (JSON):
  ```json
  {
    "HF_TOKEN": "your_huggingface_token_here"
  }
  ```

## 사용 예시

채팅에서 다음과 같이 사용할 수 있습니다:

```
"Astronaut riding a horse" 이미지를 생성해줘
```

MCP 도구가 자동으로 호출되어 이미지를 생성하고 채팅에 표시됩니다.

