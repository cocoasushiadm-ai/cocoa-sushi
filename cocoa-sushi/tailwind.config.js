/** @type {import('tailwindcss').Config} */
module.exports = {
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
        }
      },
      fontFamily: {
        display: ['var(--font-display)', 'serif'],
        body:    ['var(--font-body)', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn .25s ease',
        'slide-up': 'slideUp .3s ease',
        'pulse-slow': 'pulse 3s infinite',
        'countdown': 'pulse 1s infinite',
      },
      keyframes: {
        fadeIn:  { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp: { from: { transform: 'translateY(20px)', opacity: 0 }, to: { transform: 'translateY(0)', opacity: 1 } },
      }
    }
  },
  plugins: []
}
