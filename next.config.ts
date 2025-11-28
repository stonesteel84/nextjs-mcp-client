import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // TypeScript 설정에서 mcp-servers가 제외되도록 함
  typescript: {
    // 빌드 시 타입 체크는 하지만, mcp-servers는 tsconfig.json에서 제외됨
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
