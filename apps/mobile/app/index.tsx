import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/contexts/AuthContext';

export default function IndexScreen() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    console.log('Index: Auth state changed - user:', user?.email || 'null', 'loading:', loading);
    if (!loading) {
      if (user) {
        console.log('Index: Navigating to home');
        router.replace('/(tabs)/home');
      } else {
        console.log('Index: Navigating to signin');
        router.replace('/signin');
      }
    }
  }, [user, loading, router]);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>MiKare</Text>
        <Text style={styles.subtitle}>Your Health Journey</Text>
        <ActivityIndicator size="large" color="#008080" style={styles.loader} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1a202c',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#4a5568',
    marginBottom: 32,
  },
  loader: {
    marginTop: 16,
  },
});
