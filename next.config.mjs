/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: true },
  experimental: {
    serverComponentsExternalPackages: ['pdf-parse', '@huggingface/transformers', 'onnxruntime-node', 'sharp', 'ws'],
  },
};
export default nextConfig;
