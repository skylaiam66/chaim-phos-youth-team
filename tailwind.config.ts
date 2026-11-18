import type { Config } from 'tailwindcss';
const config: Config = { content: ['./app/**/*.{js,ts,jsx,tsx,mdx}','./components/**/*.{js,ts,jsx,tsx,mdx}'], theme: { extend: { colors: { cpGreen:'#00A651', cpGold:'#D4AF37' }, fontFamily: { sans:['Inter','Arial','sans-serif'] } } }, plugins: [] };
export default config;
