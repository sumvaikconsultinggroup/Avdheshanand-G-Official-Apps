/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Do not fail the production build on ESLint style rules (no-explicit-any,
    // prefer-const, etc.). These are lint-only and don't affect runtime.
    // TypeScript type-checking stays ENABLED, so real type errors still block a
    // bad deploy. Run `npm run lint` locally to clean these up over time.
    ignoreDuringBuilds: true,
  },
  images: {
    // next/image blocks external hosts unless whitelisted. These are the hosts
    // our content images come from (Cloudinary uploads, YouTube thumbnails,
    // Google account avatars).
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: 'img.youtube.com' },
      { protocol: 'https', hostname: 'i.ytimg.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
    ],
  },
};

export default nextConfig;
