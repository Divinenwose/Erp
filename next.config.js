/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
  experimental: {
    serverActions: true,
  },
  webpack: (config, { isServer, webpack }) => {
    if (!isServer) {
      // pptxgenjs's bundle references Node built-ins (fs, https) that are
      // only exercised on its Node code path; in the browser it uses
      // writeFile() to trigger a download instead, so these are never
      // actually called. webpack 5 treats "node:fs" as a distinct URI
      // scheme it rejects outright before resolve.fallback/alias ever run,
      // so first rewrite "node:x" -> "x" via NormalModuleReplacementPlugin,
      // then let fallback:false stub out the resulting bare specifiers.
      config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(/^node:/, (resource) => {
          resource.request = resource.request.replace(/^node:/, '');
        })
      );
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        https: false,
        http: false,
        path: false,
        os: false,
        stream: false,
        util: false,
        buffer: false,
      };
    }
    return config;
  },
};

module.exports = nextConfig;
