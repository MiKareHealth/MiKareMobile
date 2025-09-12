import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity, TextInput, Image } from 'react-native';
import { Link } from 'expo-router';
import { Button } from '../src/components/ui/Button';
import { Card } from '../src/components/ui/Card';
import { ProtectedRoute } from '../src/components/ProtectedRoute';
import { useAuth } from '../src/contexts/AuthContext';
import { RegionSelector } from '../src/components/ui/RegionSelector';
import { Switch } from '../src/components/ui/Switch';
import { getCurrentRegion, switchToRegion, storage } from '../src/lib/supabaseClient';

export default function SignInScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('USA');
  const [loading, setLoading] = useState(false);
  const [regionLoading, setRegionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { signIn, resetPassword, refreshAuthState } = useAuth();

  useEffect(() => {
    loadInitialRegion();
  }, []);

  const loadInitialRegion = async () => {
    try {
      const region = await getCurrentRegion();
      setSelectedRegion(region);
    } catch (error) {
      console.error('Error loading region:', error);
      // Default to USA if there's an error
      setSelectedRegion('USA');
    }
  };

  const handleRegionChange = async (region: string) => {
    setRegionLoading(true);
    try {
      console.log('Region change requested:', region);
      // Only update the selected region variable, don't switch Supabase client yet
      setSelectedRegion(region);
      // Store the region preference for later use
      await storage.setItem('mikare_selected_region', region);
      console.log('Region preference stored successfully');
    } catch (error) {
      console.error('Error updating region preference:', error);
      Alert.alert('Error', 'Failed to update region preference. Please try again.');
    } finally {
      setRegionLoading(false);
    }
  };

  const handleSignIn = async () => {
    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Switch to the selected region before attempting sign in
      console.log('Switching to region for sign in:', selectedRegion);
      const supabaseClient = await switchToRegion(selectedRegion);
      console.log('Successfully switched to region:', selectedRegion);
      
      // Now attempt sign in with the correct region's Supabase client
      console.log('Attempting sign in with region:', selectedRegion);
      const { error: signInError } = await signIn(email, password, rememberMe);
      
      if (signInError) {
        console.error('Sign in failed:', signInError);
        setError(signInError.message || 'Invalid email or password. Please try again.');
      } else {
        // Refresh auth state to ensure the user state is updated
        console.log('Sign in successful, refreshing auth state...');
        await refreshAuthState();
      }
      // If successful, the AuthContext will handle the redirect
    } catch (err) {
      console.error('Sign in error:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      Alert.alert(
        'Email Required',
        'Please enter your email address first.',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      const { error } = await resetPassword(email);
      
      if (error) {
        Alert.alert(
          'Error',
          error.message || 'Failed to send reset email. Please try again.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Reset Email Sent',
          'Check your email for password reset instructions.',
          [{ text: 'OK' }]
        );
      }
    } catch (err) {
      Alert.alert(
        'Error',
        'Failed to send reset email. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  return (
    <ProtectedRoute requireAuth={false}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Image 
              source={require('../assets/images/MiKareLogo.png')} 
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.title}>Welcome to MiKare</Text>
          <Text style={styles.subtitle}>
            Your data will be securely stored in the {selectedRegion === 'AU' ? 'Australia' : 
            selectedRegion === 'UK' ? 'United Kingdom' : 
            selectedRegion === 'USA' ? 'United States' : 'Australia'} region
          </Text>
        </View>

        <Card style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Email address</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="Enter your email"
              placeholderTextColor="#6b7280"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              editable={!loading}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Password</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password"
                placeholderTextColor="#6b7280"
                secureTextEntry={!showPassword}
                autoComplete="password"
                editable={!loading}
              />
              <TouchableOpacity 
                style={styles.eyeIcon}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Text style={styles.eyeIconText}>
                  {showPassword ? '🙈' : '👁️'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <RegionSelector
            selectedRegion={selectedRegion}
            onRegionChange={handleRegionChange}
            disabled={loading}
            loading={regionLoading}
          />

          <View style={styles.rememberForgotContainer}>
            <View style={styles.rememberContainer}>
              <Switch
                value={rememberMe}
                onValueChange={setRememberMe}
                disabled={loading}
              />
              <Text style={styles.rememberText}>Remember me</Text>
            </View>
            <TouchableOpacity onPress={handleForgotPassword}>
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>
          </View>

          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <Button
            title={loading ? 'Signing in...' : 'Sign in'}
            onPress={handleSignIn}
            disabled={loading}
            style={styles.signInButton}
          />

          <View style={styles.signUpContainer}>
            <Text style={styles.signUpText}>Don't have an account? </Text>
            <Link href="/signup" asChild>
              <Text style={styles.signUpLink}>Sign up</Text>
            </Link>
          </View>
        </Card>

        <Text style={styles.versionText}>version 1.0.02</Text>
      </ScrollView>
    </ProtectedRoute>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  logoImage: {
    width: 200,
    height: 100,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  form: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#ffffff',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    backgroundColor: '#ffffff',
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
  },
  eyeIcon: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  eyeIconText: {
    fontSize: 16,
    color: '#6b7280',
  },
  rememberForgotContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  rememberContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rememberText: {
    fontSize: 14,
    color: '#374151',
    marginLeft: 8,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: '#008080',
    fontWeight: '500',
  },
  signInButton: {
    marginBottom: 16,
  },
  errorContainer: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
  },
  signUpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
  },
  signUpText: {
    color: '#6b7280',
    fontSize: 14,
  },
  signUpLink: {
    color: '#008080',
    fontSize: 14,
    fontWeight: '600',
  },
  versionText: {
    textAlign: 'center',
    color: '#9ca3af',
    fontSize: 12,
    marginTop: 20,
  },
});
