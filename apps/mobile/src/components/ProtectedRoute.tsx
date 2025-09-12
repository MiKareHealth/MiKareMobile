import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  redirectTo?: string;
}

export function ProtectedRoute({ 
  children, 
  requireAuth = true, 
  redirectTo = '/' 
}: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    console.log('ProtectedRoute effect:', { loading, user: user?.email, requireAuth });
    if (!loading) {
      if (requireAuth && !user) {
        // User needs to be authenticated but isn't
        console.log('Redirecting to:', redirectTo);
        router.replace(redirectTo);
      } else if (!requireAuth && user) {
        // User is authenticated but shouldn't be on this page (e.g., sign-in page)
        console.log('Redirecting to dashboard');
        router.replace('/(tabs)/home');
      }
    }
  }, [user, loading, requireAuth, redirectTo, router]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#008080" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  // Show children if authentication requirements are met
  if ((requireAuth && user) || (!requireAuth && !user)) {
    return <>{children}</>;
  }

  // Don't render anything while redirecting
  return null;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#4a5568',
  },
});
