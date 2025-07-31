import { theme } from './tokens';

// CSS-in-JS utilities for the theme
export const themeStyles = {
  // Background utilities
  bg: {
    default: `background-color: ${theme.palette.background.default}`,
    surface: `background-color: ${theme.palette.background.surface}`,
    light: `background-color: ${theme.palette.background.light}`,
    primary: `background-color: ${theme.palette.primary}`,
    secondary: `background-color: ${theme.palette.secondary}`,
  },
  
  // Text utilities
  text: {
    primary: `color: ${theme.palette.text.primary}`,
    secondary: `color: ${theme.palette.text.secondary}`,
    white: 'color: white',
    brand: `color: ${theme.palette.primary}`,
    accent: `color: ${theme.palette.secondary}`,
  },
  
  // Border utilities
  border: {
    default: `border: 1px solid ${theme.palette.border}`,
    primary: `border: 1px solid ${theme.palette.primary}`,
    secondary: `border: 1px solid ${theme.palette.secondary}`,
  },
  
  // Spacing utilities
  spacing: {
    xs: `padding: ${theme.spacing.xs}`,
    sm: `padding: ${theme.spacing.sm}`,
    md: `padding: ${theme.spacing.md}`,
    lg: `padding: ${theme.spacing.lg}`,
    xl: `padding: ${theme.spacing.xl}`,
  },
  
  // Border radius utilities
  borderRadius: {
    sm: `border-radius: ${theme.borderRadius.sm}`,
    md: `border-radius: ${theme.borderRadius.md}`,
    lg: `border-radius: ${theme.borderRadius.lg}`,
    full: `border-radius: ${theme.borderRadius.full}`,
  },
  
  // Shadow utilities
  shadow: {
    sm: `box-shadow: ${theme.shadows.sm}`,
    md: `box-shadow: ${theme.shadows.md}`,
    lg: `box-shadow: ${theme.shadows.lg}`,
  },
  
  // Component styles
  components: {
    card: `
      background-color: ${theme.components.card.background};
      border: ${theme.components.card.border};
      border-radius: ${theme.components.card.borderRadius};
      padding: ${theme.components.card.padding};
    `,
    button: `
      border-radius: ${theme.components.button.borderRadius};
      padding: ${theme.components.button.padding};
      font-size: ${theme.components.button.fontSize};
    `,
    sidebar: `
      width: ${theme.components.sidebar.width};
      background-color: ${theme.components.sidebar.background};
      color: ${theme.components.sidebar.text};
    `,
    header: `
      height: ${theme.components.header.height};
      background-color: ${theme.components.header.background};
      border-bottom: ${theme.components.header.borderBottom};
    `,
  },
  
  // Typography utilities
  typography: {
    fontFamily: {
      body: `font-family: ${theme.typography.fontFamily.body}`,
      heading: `font-family: ${theme.typography.fontFamily.heading}`,
    },
    fontSize: {
      xs: `font-size: ${theme.typography.fontSize.xs}`,
      sm: `font-size: ${theme.typography.fontSize.sm}`,
      md: `font-size: ${theme.typography.fontSize.md}`,
      lg: `font-size: ${theme.typography.fontSize.lg}`,
      xl: `font-size: ${theme.typography.fontSize.xl}`,
    },
    fontWeight: {
      regular: `font-weight: ${theme.typography.fontWeight.regular}`,
      medium: `font-weight: ${theme.typography.fontWeight.medium}`,
      bold: `font-weight: ${theme.typography.fontWeight.bold}`,
    },
    lineHeight: {
      normal: `line-height: ${theme.typography.lineHeight.normal}`,
      heading: `line-height: ${theme.typography.lineHeight.heading}`,
    },
  },
};

// Tailwind class utilities that map to theme values
export const themeClasses = {
  // Background classes
  bg: {
    default: 'bg-white',
    surface: 'bg-gray-50',
    light: 'bg-teal-50',
    primary: 'bg-primary',
    secondary: 'bg-secondary',
  },
  
  // Text classes
  text: {
    primary: 'text-gray-900',
    secondary: 'text-gray-600',
    white: 'text-white',
    brand: 'text-primary',
    accent: 'text-secondary',
  },
  
  // Border classes
  border: {
    default: 'border border-gray-200',
    primary: 'border border-primary',
    secondary: 'border border-secondary',
  },
  
  // Spacing classes
  spacing: {
    xs: 'p-1',
    sm: 'p-2',
    md: 'p-4',
    lg: 'p-6',
    xl: 'p-8',
  },
  
  // Border radius classes
  borderRadius: {
    sm: 'rounded',
    md: 'rounded-md',
    lg: 'rounded-lg',
    full: 'rounded-full',
  },
  
  // Shadow classes
  shadow: {
    sm: 'shadow-sm',
    md: 'shadow-md',
    lg: 'shadow-lg',
  },
  
  // Component classes
  components: {
    card: 'bg-white border border-gray-200 rounded-md p-4',
    button: 'rounded-md px-4 py-2 text-base',
    sidebar: 'w-64 bg-teal-50 text-gray-900',
    header: 'h-16 bg-white border-b border-gray-200',
  },
  
  // Typography classes
  typography: {
    fontFamily: {
      body: 'font-sans',
      heading: 'font-heading',
    },
    fontSize: {
      xs: 'text-xs',
      sm: 'text-sm',
      md: 'text-base',
      lg: 'text-lg',
      xl: 'text-xl',
    },
    fontWeight: {
      regular: 'font-normal',
      medium: 'font-medium',
      bold: 'font-semibold',
    },
  },
};

// Helper function to get theme value
export const getThemeValue = (path: string) => {
  const keys = path.split('.');
  let value: any = theme;
  
  for (const key of keys) {
    if (value && typeof value === 'object' && key in value) {
      value = value[key];
    } else {
      return undefined;
    }
  }
  
  return value;
};

// Helper function to create CSS custom properties
export const createCSSVariables = () => {
  const cssVars: Record<string, string> = {};
  
  // Palette
  Object.entries(theme.palette).forEach(([key, value]) => {
    if (typeof value === 'string') {
      cssVars[`--color-${key}`] = value;
    } else if (typeof value === 'object') {
      Object.entries(value).forEach(([subKey, subValue]) => {
        cssVars[`--color-${key}-${subKey}`] = subValue as string;
      });
    }
  });
  
  // Typography
  cssVars['--font-family-body'] = theme.typography.fontFamily.body;
  cssVars['--font-family-heading'] = theme.typography.fontFamily.heading;
  Object.entries(theme.typography.fontSize).forEach(([key, value]) => {
    cssVars[`--font-size-${key}`] = value;
  });
  Object.entries(theme.typography.fontWeight).forEach(([key, value]) => {
    cssVars[`--font-weight-${key}`] = value.toString();
  });
  Object.entries(theme.typography.lineHeight).forEach(([key, value]) => {
    cssVars[`--line-height-${key}`] = value.toString();
  });
  
  // Spacing
  Object.entries(theme.spacing).forEach(([key, value]) => {
    cssVars[`--spacing-${key}`] = value;
  });
  
  // Border radius
  Object.entries(theme.borderRadius).forEach(([key, value]) => {
    cssVars[`--border-radius-${key}`] = value;
  });
  
  // Shadows
  Object.entries(theme.shadows).forEach(([key, value]) => {
    cssVars[`--shadow-${key}`] = value;
  });
  
  return cssVars;
}; 