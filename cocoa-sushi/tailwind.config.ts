import type { Config } from 'tailwindcss'
const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        cs: {
          dark:   '#1A352E',
          forest: '#2B5A4D',
          medium: '#3B7563',
          cream:  '#F1F0EB',
          olive:  '#8D9B62',
          khaki:  '#E0D3AA',
          pale:   '#E5E1D3',
          copper: '#9B6234',
          brown:  '#3A2314',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Montserrat', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
export default config
