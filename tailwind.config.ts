import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          navy: '#00142E',
          blue: '#0066FF',
          blueHover: '#0052CC',
          blueLight: '#EBF3FF',
          green: '#00A859',
          orange: '#FFB703',
          red: '#E53935',
        },
        grovaitech: {
          dark: '#00142E',
          darker: '#0A0F1A',
          slate: '#1E293B',
          blue: '#0066FF',
          blueDark: '#0052CC',
          blueLight: '#EBF3FF',
          text: '#FFFFFF',
          textSecondary: '#94A3B8',
          border: '#E2E8F0',
        }
      },
      fontFamily: {
        inter: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
export default config
