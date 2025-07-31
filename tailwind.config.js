/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#139FA0',
          hover: '#0F766E',
          light: '#EAFDF9',
        },
        secondary: {
          DEFAULT: '#2C6E91',
          hover: '#1E4A6B',
        },
        brand: {
          teal: '#139FA0',
          tealLight: '#EAFDF9'
        },
        background: {
          default: '#FFFFFF',
          surface: '#F9FAFB',
          light: '#EAFDF9'
        },
        text: {
          primary: '#111827',
          secondary: '#6B7280'
        },
        border: '#E5E7EB',
        success: '#10B981',
        info: '#3B82F6',
        neutral: '#6B7280',
        coral: {
          400: '#FF8A65',
          500: '#FF7043',
          600: '#F4511E',
          700: '#E64A19'
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        heading: ['Poppins', 'sans-serif'],
      },
      fontSize: {
        xs: '0.75rem',
        sm: '0.875rem',
        md: '1rem',
        lg: '1.125rem',
        xl: '1.25rem'
      },
      fontWeight: {
        regular: 400,
        medium: 500,
        bold: 600
      },
      lineHeight: {
        normal: 1.5,
        heading: 1.2
      },
      spacing: {
        xs: '4px',
        sm: '8px',
        md: '16px',
        lg: '24px',
        xl: '32px'
      },
      borderRadius: {
        sm: '4px',
        md: '8px',
        lg: '12px',
        full: '9999px'
      },
      boxShadow: {
        sm: '0 1px 2px rgba(0,0,0,0.05)',
        md: '0 4px 6px rgba(0,0,0,0.1)',
        lg: '0 10px 15px rgba(0,0,0,0.15)'
      }
    },
  },
  plugins: [],
};
