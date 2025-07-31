// src/styles/tokens.ts
export const theme = {
  palette: {
    brand: {
      teal: "#139FA0",
      tealLight: "#EAFDF9"
    },
    primary: "#139FA0",
    secondary: "#2C6E91",
    success: "#10B981",
    info: "#3B82F6",
    neutral: "#6B7280",
    background: {
      default: "#FFFFFF",
      surface: "#F9FAFB",
      light: "#EAFDF9"
    },
    text: {
      primary: "#111827",
      secondary: "#6B7280"
    },
    border: "#E5E7EB"
  },
  typography: {
    fontFamily: {
      body: "Inter, sans-serif",
      heading: "Poppins, sans-serif"
    },
    fontSize: {
      xs: "0.75rem", 
      sm: "0.875rem",
      md: "1rem",
      lg: "1.125rem",
      xl: "1.25rem"
    },
    fontWeight: {
      regular: 400,
      medium: 500,
      bold: 600
    },
    lineHeight: {
      normal: 1.5,
      heading: 1.2
    }
  },
  spacing: {
    xs: "4px",
    sm: "8px",
    md: "16px",
    lg: "24px",
    xl: "32px"
  },
  borderRadius: {
    sm: "4px",
    md: "8px",
    lg: "12px",
    full: "9999px"
  },
  shadows: {
    sm: "0 1px 2px rgba(0,0,0,0.05)",
    md: "0 4px 6px rgba(0,0,0,0.1)",
    lg: "0 10px 15px rgba(0,0,0,0.15)"
  },
  components: {
    sidebar: {
      width: "250px",
      background: "#EAFDF9",
      text: "#111827"
    },
    header: {
      height: "64px",
      background: "#FFFFFF",
      borderBottom: "1px solid #E5E7EB"
    },
    button: {
      borderRadius: "8px",
      padding: "8px 16px",
      fontSize: "1rem"
    },
    card: {
      background: "#FFFFFF",
      border: "1px solid #E5E7EB",
      borderRadius: "8px",
      padding: "16px"
    }
  }
} as const;

// Legacy tokens for backward compatibility - will be gradually replaced
export const tokens = {
  colors: {
    primary: {
      DEFAULT: theme.palette.primary,
      hover: '#0F766E',
      light: theme.palette.brand.tealLight,
    },
    heading: {
      DEFAULT: theme.palette.text.primary,
      h2: theme.palette.text.primary,
    },
    diary: {
      symptom: {
        severe: { bg: 'bg-gradient-to-r from-red-50 to-white', text: 'text-red-600' },
        moderate: { bg: 'bg-gradient-to-r from-amber-50 to-white', text: 'text-amber-600' },
        mild: { bg: 'bg-gradient-to-r from-emerald-50 to-white', text: 'text-emerald-600' }
      },
      appointment: { bg: 'bg-gradient-to-r from-violet-50 to-white', text: 'text-violet-600' },
      diagnosis: { bg: 'bg-gradient-to-r from-indigo-50 to-white', text: 'text-indigo-600' },
      treatment: { bg: 'bg-gradient-to-r from-pink-50 to-white', text: 'text-pink-600' },
      note: { bg: 'bg-gradient-to-r from-gray-50 to-white', text: 'text-gray-600' },
      ai: { bg: 'bg-gradient-to-r from-blue-50 to-white', text: 'text-blue-600' }
    },
    accent: {
      DEFAULT: theme.palette.secondary,
      hover: '#319795',
    },
    coral: {
      light: 'from-coral-400 to-coral-600',
      DEFAULT: 'from-coral-500 to-coral-600',
      hover: 'from-coral-600 to-coral-700',
      focus: 'ring-coral-500',
      text: 'text-coral-500',
    },
    neutral: {
      50: theme.palette.background.surface,
      100: '#F3F4F6',
      200: theme.palette.border,
      300: '#D1D5DB',
      600: theme.palette.text.secondary,
      700: '#374151',
      800: '#1F2937',
      900: theme.palette.text.primary,
    },
    feedback: {
      error: '#F56565',
      warning: '#ED8936',
      success: theme.palette.success,
      info: theme.palette.info,
    }
  },
  spacing: {
    xs: theme.spacing.xs,
    sm: theme.spacing.sm,
    md: theme.spacing.md,
    lg: theme.spacing.lg,
    xl: theme.spacing.xl,
  },
  typography: {
    fontFamily: {
      default: theme.typography.fontFamily.body,
      heading: theme.typography.fontFamily.heading,
    },
    sizes: {
      h1: 'text-4xl font-bold font-heading text-heading-DEFAULT',
      h2: 'text-3xl font-semibold font-heading !text-heading-h2',
      h3: 'text-2xl font-medium font-heading text-heading-DEFAULT',
      section: 'text-xl font-medium font-heading text-heading-DEFAULT',
      body: 'text-base text-gray-800',
      label: 'text-sm text-gray-600',
    }
  },
  components: {
    card: {
      base: 'bg-white shadow-sm rounded-xl p-4',
      hover: 'hover:shadow-md transition-shadow duration-200',
    },
    input: {
      base: 'rounded-md border border-gray-300 px-4 py-2 text-base w-full',
      focus: 'focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-2',
    },
    button: {
      primary: 'bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white rounded-md px-4 py-2 font-semibold shadow-sm transition-all duration-200',
      secondary: 'bg-gradient-to-r from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 text-gray-800 rounded-md px-4 py-2 shadow-sm transition-all duration-200',
      danger: 'bg-gradient-to-r from-coral-500 to-coral-600 hover:from-coral-600 hover:to-coral-700 text-white rounded-md px-4 py-2 shadow-sm transition-all duration-200',
    }
  },
  animation: {
    fadeDown: {
      enter: 'animate-fade-down',
      keyframes: `@keyframes fadeDown {
        0% { opacity: 0; transform: translateY(-10px); }
        100% { opacity: 1; transform: translateY(0); }
      }`
    }
  }
} as const;
