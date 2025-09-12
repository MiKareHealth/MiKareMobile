export const supabaseRegions = {
  AU: {
    url: process.env.EXPO_PUBLIC_SUPABASE_AU_URL || '',
    anonKey: process.env.EXPO_PUBLIC_SUPABASE_AU_ANON_KEY || '',
  },
  UK: {
    url: process.env.EXPO_PUBLIC_SUPABASE_UK_URL || '',
    anonKey: process.env.EXPO_PUBLIC_SUPABASE_UK_ANON_KEY || '',
  },
  USA: {
    url: process.env.EXPO_PUBLIC_SUPABASE_USA_URL || '',
    anonKey: process.env.EXPO_PUBLIC_SUPABASE_USA_ANON_KEY || '',
  },
};
