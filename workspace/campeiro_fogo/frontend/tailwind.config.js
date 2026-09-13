/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: 'var(--primary-color)',
        secondary: 'var(--secondary-color)',
        slate: {
          950: '#12100E', // Deepest Cast-Iron Canvas
          900: '#1A1613', // Elevated Aged-Wood Card
          850: '#201B17', // Elevated Section Card
          800: '#2D241D', // Warm Cinder / Hearth Border
          750: '#362C23',
          700: '#42362C', // Subtle interactive border
          650: '#54463A',
          600: '#6E5C4E',
          500: '#8A7A6E', // Muted Ash
          400: '#A89F96', // Warm Smoke Text
          350: '#C2B8AF',
          300: '#D8D0C7', // Light Stone Text
          200: '#EBE5DE',
          100: '#FAF7F2', // Crisp Warm White
          50: '#FDFAF7',
        },
        amber: {
          300: '#F0C265',
          400: '#E5A93C', // Warm Brass / Gold
          500: '#C85A17', // Rich Ember
          600: '#A3430B', // Deep Hearth Ember
        }
      }
    },
  },
  plugins: [],
}
