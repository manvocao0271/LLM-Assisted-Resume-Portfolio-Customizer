/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Work Sans"', 'sans-serif'],
        body: ['"Inter"', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#f9f4ff',
          100: '#efe4ff',
          200: '#e0cbff',
          300: '#cfa3ff',
          400: '#b778ff',
          500: '#9f4dff',
          600: '#7c3aed',
          700: '#5e2ab1',
          800: '#3f1c7f',
          900: '#23114f',
        },
        accent: {
          50: '#e0fcff',
          100: '#b2f0ff',
          200: '#7ee0ff',
          300: '#2ad5ff',
          400: '#00bce0',
          500: '#00a2cc',
          600: '#008db8',
          700: '#006b94',
          800: '#004c70',
          900: '#002f4c',
        },
      },
      boxShadow: {
        card: '0 20px 45px -20px rgba(15, 23, 42, 0.6)',
      },
    },
  },
  plugins: [],
};
