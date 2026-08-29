/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  outputFileTracingExcludes: {
    '*': ['./src-tauri/**/*', './target/**/*', './src-tauri/target/**/*']
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb'
    }
  },
  async rewrites() {
    return [
      {
        source: '/uploads/:path*',
        destination: '/api/uploads/:path*',
      },
    ];
  },
};
export default nextConfig;
