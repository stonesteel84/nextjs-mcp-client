# 🤖 Next.js MCP Client

> Cursor AI와 Google Gemini를 활용한 Model Context Protocol (MCP) 클라이언트

이 프로젝트는 **Cursor**를 개발 도구로 사용하여, **Google Gemini API**를 기반으로 한 MCP 클라이언트를 구축하는 Next.js 애플리케이션입니다.

## ✨ 주요 기능

- 🎯 **MCP 프로토콜 지원**: Model Context Protocol을 통한 AI와의 상호작용
- 🚀 **Next.js App Router**: 최신 Next.js 기능을 활용한 서버/클라이언트 통합
- 🎨 **shadcn/ui**: 아름답고 접근성 높은 UI 컴포넌트
- 💬 **실시간 스트리밍**: SSE를 통한 토큰 단위 실시간 응답
- 🔒 **보안 우선**: 서버 사이드 전용 API 호출, 환경 변수 기반 키 관리

## 🛠️ 기술 스택

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **Icons**: Lucide React
- **LLM**: Google Gemini API
- **Package Manager**: pnpm

## 📦 설치 및 실행

### 필수 요구사항

- Node.js LTS 버전
- pnpm 설치

### 설치

```bash
pnpm install
```

### 개발 서버 실행

```bash
pnpm dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 확인하세요.

### 기타 명령어

```bash
# 타입 체크
pnpm typecheck

# 린트 및 포맷
pnpm lint && pnpm format

# 프로덕션 빌드
pnpm build

# 프로덕션 서버 실행
pnpm start
```

## 🔐 환경 변수 설정

프로젝트 루트에 `.env.local` 파일을 생성하고 다음 변수를 설정하세요:

```env
GEMINI_API_KEY=your_gemini_api_key_here
LLM_MODEL=gemini-pro
```

> ⚠️ **보안 주의**: `.env.local` 파일은 절대 Git에 커밋하지 마세요!

## 📁 프로젝트 구조

```
nextjs-mcp-client/
├── app/              # Next.js App Router 페이지 및 라우트
├── components/       # React 컴포넌트
├── lib/             # 유틸리티 함수 및 헬퍼
├── .cursor/         # Cursor 설정 및 규칙
└── public/          # 정적 파일
```

## 🎯 개발 원칙

- **단순성**: 깔끔하고 읽기 쉬운 코드
- **모듈화**: 단일 책임 원칙(SRP) 준수
- **성능**: 서버 사이드 렌더링 및 스트리밍 최적화
- **보안**: 클라이언트 직접 API 호출 금지
- **확장성**: MVP 범위 내에서 확장 가능한 구조

## 🚀 배포

이 프로젝트는 [Vercel](https://vercel.com)에 배포하는 것을 권장합니다.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/stonesteel84/nextjs-mcp-client)

## 📝 라이선스

이 프로젝트는 MIT 라이선스를 따릅니다.

## 🤝 기여

이슈와 풀 리퀘스트를 환영합니다! 프로젝트 개선을 위한 제안이 있으시면 언제든지 알려주세요.

---

**Made with ❤️ using Cursor AI and Gemini**
