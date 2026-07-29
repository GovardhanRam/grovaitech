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
        grovaitech: {
          dark: '#0F172A',
          darker: '#0A0F1A',
          slate: '#1E293B',
          blue: '#3B82F6',
          blueDark: '#2563EB',
          blueLight: '#60A5FA',
          text: '#FFFFFF',
          textSecondary: '#94A3B8',
          border: '#1E293B',
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
