/** @type {import('next').NextConfig} */
const withPWA = require('next-pwa')({ dest: 'public', register: false, skipWaiting: true, disable: process.env.NODE_ENV === 'development', runtimeCaching: [] });
const nextConfig = { reactStrictMode: true, images: { unoptimized: true } };
module.exports = withPWA(nextConfig);
