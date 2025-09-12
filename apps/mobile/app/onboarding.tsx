import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { Button } from '../src/ui/Button';
import { Input } from '../src/ui/Input';
import { Card } from '../src/ui/Card';

export default function OnboardingScreen() {
  const [step, setStep] = useState(1);
  const [fullName, setFullName] = useState('');
  const [timezone, setTimezone] = useState('');
  const [loading, setLoading] = useState(false);

  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleComplete = async () => {
    setLoading(true);
    
    try {
      // TODO: Implement onboarding completion logic using @core
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Navigate to dashboard
              router.replace('/(tabs)/home');
    } catch (error) {
      console.error('Onboarding error:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <Card style={styles.stepCard}>
            <Text style={styles.stepTitle}>Welcome to MiKare</Text>
            <Text style={styles.stepDescription}>
              Let's get you set up with your health journey. We'll help you create your profile and configure your preferences.
            </Text>
            <Text style={styles.stepNumber}>Step 1 of 3</Text>
          </Card>
        );
      
      case 2:
        return (
          <Card style={styles.stepCard}>
            <Text style={styles.stepTitle}>Your Profile</Text>
            <Input
              label="Full Name"
              value={fullName}
              onChangeText={setFullName}
              placeholder="Enter your full name"
            />
            <Text style={styles.stepNumber}>Step 2 of 3</Text>
          </Card>
        );
      
      case 3:
        return (
          <Card style={styles.stepCard}>
            <Text style={styles.stepTitle}>Preferences</Text>
            <Input
              label="Timezone"
              value={timezone}
              onChangeText={setTimezone}
              placeholder="e.g., America/New_York"
            />
            <Text style={styles.stepDescription}>
              This helps us display dates and times in your local timezone.
            </Text>
            <Text style={styles.stepNumber}>Step 3 of 3</Text>
          </Card>
        );
      
      default:
        return null;
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>MiKare</Text>
        <Text style={styles.subtitle}>Setup your account</Text>
      </View>

      {renderStep()}

      <View style={styles.buttonContainer}>
        {step > 1 && (
          <Button
            title="Back"
            onPress={handleBack}
            variant="outline"
            style={styles.backButton}
          />
        )}
        
        <Button
          title={step === 3 ? (loading ? 'Completing...' : 'Complete') : 'Next'}
          onPress={handleNext}
          disabled={loading}
          style={styles.nextButton}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
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
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1a202c',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#4a5568',
  },
  stepCard: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
    marginBottom: 32,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1a202c',
    marginBottom: 16,
  },
  stepDescription: {
    fontSize: 16,
    color: '#4a5568',
    lineHeight: 24,
    marginBottom: 16,
  },
  stepNumber: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  backButton: {
    flex: 1,
    marginRight: 8,
  },
  nextButton: {
    flex: 1,
    marginLeft: 8,
  },
});
