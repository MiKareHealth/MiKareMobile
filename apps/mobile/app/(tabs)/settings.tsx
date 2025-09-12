import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
  Animated,
  Modal,
  TextInput,
  ActivityIndicator,
  Linking,
  Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';
import { Card } from '../../src/components/ui/Card';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconSymbol } from '../../components/ui/IconSymbol';
import { getSupabaseClient } from '../../src/lib/supabaseClient';

interface UserPreferences {
  timezone: string;
  timeFormat: '12h' | '24h';
}

interface AccountData {
  fullName: string;
  phoneNumber: string;
  address: string;
}

interface TimezoneOption {
  value: string;
  label: string;
  offset: string;
}

const timezoneOptions: TimezoneOption[] = [
  { value: 'AET', label: 'Australian Eastern Time (AET) - Sydney', offset: '+10:00' },
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)', offset: '+00:00' },
  { value: 'ET', label: 'Eastern Time (ET) - New York', offset: '-05:00' },
  { value: 'CT', label: 'Central Time (CT) - Chicago', offset: '-06:00' },
  { value: 'MT', label: 'Mountain Time (MT) - Denver', offset: '-07:00' },
  { value: 'PT', label: 'Pacific Time (PT) - Los Angeles', offset: '-08:00' },
  { value: 'GMT', label: 'Greenwich Mean Time (GMT) - London', offset: '+00:00' },
  { value: 'CET', label: 'Central European Time (CET) - Paris', offset: '+01:00' },
  { value: 'JST', label: 'Japan Standard Time (JST) - Tokyo', offset: '+09:00' },
  { value: 'CST', label: 'China Standard Time (CST) - Shanghai', offset: '+08:00' },
  { value: 'AEST', label: 'Australian Eastern Standard Time (AEST) - Brisbane', offset: '+10:00' },
];

export default function SettingsScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [preferences, setPreferences] = useState<UserPreferences>({
    timezone: 'AET',
    timeFormat: '12h',
  });
  const [accountData, setAccountData] = useState<AccountData>({
    fullName: user?.user_metadata?.full_name || '',
    phoneNumber: '0412 345 678',
    address: '18 Test st',
  });
  const [loading, setLoading] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  
  // Modal states
  const [editAccountModal, setEditAccountModal] = useState(false);
  const [timezoneModal, setTimezoneModal] = useState(false);
  const [tutorialModal, setTutorialModal] = useState(false);
  const [currentTutorialStep, setCurrentTutorialStep] = useState(0);
  const [recentLoginsModal, setRecentLoginsModal] = useState(false);
  const [recentLogins, setRecentLogins] = useState<any[]>([]);
  const [loginsLoading, setLoginsLoading] = useState(false);
  const [feedbackModal, setFeedbackModal] = useState(false);
  const [feedbackTopic, setFeedbackTopic] = useState('General');
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [signOutModal, setSignOutModal] = useState(false);

  useEffect(() => {
    // Fade up animation on load
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, []);

  // Debug user state
  useEffect(() => {
    console.log('Settings screen - user state changed:', {
      hasUser: !!user,
      userId: user?.id,
      userEmail: user?.email,
    });
  }, [user]);

  // Reload preferences when screen comes into focus or when user changes
  useFocusEffect(
    React.useCallback(() => {
      if (user?.id) {
        loadUserPreferences();
      }
    }, [user?.id])
  );

  const loadUserPreferences = async () => {
    if (!user?.id) {
      console.log('No user ID available, skipping preferences load');
      return;
    }

    try {
      const supabase = await getSupabaseClient();
      const { data, error } = await supabase
        .from('profiles')
        .select('timezone, time_format, full_name, phone_number, address')
        .eq('id', user.id)
        .single();

      if (data && !error) {
        setPreferences({
          timezone: data.timezone || 'AET',
          timeFormat: data.time_format || '12h',
        });
        setAccountData({
          fullName: data.full_name || user?.user_metadata?.full_name || '',
          phoneNumber: data.phone_number || '0412 345 678',
          address: data.address || '18 Test st',
        });
      } else if (error && error.code === 'PGRST116') {
        // Profile doesn't exist, use defaults
        console.log('No profile found, using default values');
        setPreferences({
          timezone: 'AET',
          timeFormat: '12h',
        });
        setAccountData({
          fullName: user?.user_metadata?.full_name || '',
          phoneNumber: '0412 345 678',
          address: '18 Test st',
        });
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    }
  };

  const savePreferences = async () => {
    console.log('savePreferences called, user:', user);
    console.log('user?.id:', user?.id);
    
    if (!user?.id) {
      Alert.alert('Error', 'User not authenticated. Please sign in again.');
      return;
    }

    setLoading(true);
    try {
      const supabase = await getSupabaseClient();
      
      const { error } = await supabase
        .from('profiles')
        .update({
          timezone: preferences.timezone,
          time_format: preferences.timeFormat,
        })
        .eq('id', user.id);
      
      if (error) throw error;
      Alert.alert('Success', 'Preferences saved successfully!');
    } catch (error) {
      console.error('Error saving preferences:', error);
      Alert.alert('Error', 'Failed to save preferences. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const saveAccountData = async () => {
    if (!user?.id) {
      Alert.alert('Error', 'User not authenticated. Please sign in again.');
      return;
    }

    setLoading(true);
    try {
      const supabase = await getSupabaseClient();
      
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: accountData.fullName,
          phone_number: accountData.phoneNumber,
          address: accountData.address,
        })
        .eq('id', user.id);
      
      if (error) throw error;
      Alert.alert('Success', 'Account information updated successfully!');
      setEditAccountModal(false);
    } catch (error) {
      console.error('Error saving account data:', error);
      Alert.alert('Error', 'Failed to save account information. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    setSignOutModal(true);
  };

  const confirmSignOut = async () => {
    setSignOutModal(false);
    setSigningOut(true);
    try {
      // Show loading for at least 0.5 seconds
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Sign out - AuthContext will handle state clearing
      await signOut();
      
      // Navigate directly to signin page using push to avoid conflicts
      console.log('Settings: Navigating to signin page after sign out');
      router.push('/signin');
    } catch (error) {
      console.error('Sign out error:', error);
      setSigningOut(false);
    }
  };

  const cancelSignOut = () => {
    setSignOutModal(false);
  };

  const handleDownloadData = () => {
    Alert.alert('Download Data', 'Data download functionality coming soon!');
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This action cannot be undone. Are you sure you want to delete your account?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => Alert.alert('Delete Account', 'Account deletion functionality coming soon!') },
      ]
    );
  };

  const loadRecentLogins = async () => {
    setLoginsLoading(true);
    try {
      const supabase = await getSupabaseClient();
      // This would typically fetch from an audit_logs or login_history table
      // For now, we'll use mock data similar to the web app
      const mockLogins = [
        {
          id: 1,
          date_time: 'Aug 26, 2025, 10:11',
          device: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64...',
          ip_address: '139.216.17.xxx',
          region: 'AU'
        },
        {
          id: 2,
          date_time: 'Aug 25, 2025, 12:29',
          device: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64...',
          ip_address: '139.216.17.xxx',
          region: 'AU'
        },
        {
          id: 3,
          date_time: 'Aug 25, 2025, 09:09',
          device: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64...',
          ip_address: '139.216.17.xxx',
          region: 'AU'
        },
        {
          id: 4,
          date_time: 'Aug 24, 2025, 11:18',
          device: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64...',
          ip_address: '139.216.17.xxx',
          region: 'AU'
        },
        {
          id: 5,
          date_time: 'Aug 23, 2025, 14:29',
          device: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_3...',
          ip_address: '1.146.94.xxx',
          region: 'AU'
        }
      ];
      setRecentLogins(mockLogins);
    } catch (error) {
      console.error('Error loading recent logins:', error);
      Alert.alert('Error', 'Failed to load recent logins. Please try again.');
    } finally {
      setLoginsLoading(false);
    }
  };

  const handleRecentLogins = () => {
    setRecentLoginsModal(true);
    loadRecentLogins();
  };

  const handleStripePortal = async () => {
    try {
      // This should open the Stripe customer portal with user's email
      const baseStripePortalUrl = process.env.EXPO_PUBLIC_STRIPE_PORTAL_URL;
      if (!baseStripePortalUrl) {
        Alert.alert('Error', 'Stripe portal URL not configured. Please contact support.');
        return;
      }
      
      const stripePortalUrl = `${baseStripePortalUrl}?prefilled_email=${encodeURIComponent(user?.email || '')}`;
      
      const supported = await Linking.canOpenURL(stripePortalUrl);
      if (supported) {
        await Linking.openURL(stripePortalUrl);
      } else {
        Alert.alert('Error', 'Cannot open Stripe portal. Please contact support.');
      }
    } catch (error) {
      console.error('Error opening Stripe portal:', error);
      Alert.alert('Error', 'Failed to open billing portal. Please try again.');
    }
  };

  const sendFeedback = async ({ name, feedback }: { name: string; feedback: string }) => {
    try {
      const supabase = await getSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('No access token available');
      }

      const res = await fetch(`${supabase.supabaseUrl}/functions/v1/feedback-email`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ name, feedback }),
      });
      
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    } catch (error) {
      console.error('Error sending feedback:', error);
      throw error;
    }
  };

  const handleSubmitFeedback = async () => {
    if (!feedbackText.trim()) {
      Alert.alert('Error', 'Please enter your feedback before submitting.');
      return;
    }

    setFeedbackLoading(true);
    try {
      const name = accountData.fullName || user?.email || 'Anonymous';
      await sendFeedback({ 
        name, 
        feedback: `Topic: ${feedbackTopic}\n\n${feedbackText}` 
      });
      
      Alert.alert('Success', 'Thank you for your feedback! We\'ll review it shortly.');
      setFeedbackModal(false);
      setFeedbackText('');
      setFeedbackTopic('General');
    } catch (error) {
      console.error('Error submitting feedback:', error);
      Alert.alert('Error', 'Failed to send feedback. Please try again.');
    } finally {
      setFeedbackLoading(false);
    }
  };

  const tutorialSteps = [
    {
      title: 'Welcome to MiKare',
      description: 'Your personal health companion',
      videoUrl: 'https://example.com/tutorial1.mp4', // Replace with actual video URLs
    },
    {
      title: 'Recording Appointments',
      description: 'Learn how to record and transcribe your medical consultations',
      videoUrl: 'https://example.com/tutorial2.mp4',
    },
    {
      title: 'Tracking Symptoms',
      description: 'Monitor your health with easy symptom tracking',
      videoUrl: 'https://example.com/tutorial3.mp4',
    },
    {
      title: 'AI Insights',
      description: 'Get personalized health insights and suggestions',
      videoUrl: 'https://example.com/tutorial4.mp4',
    },
    {
      title: 'Data Export',
      description: 'Share your health data with healthcare providers',
      videoUrl: 'https://example.com/tutorial5.mp4',
    },
  ];

  const getSelectedTimezone = () => {
    return timezoneOptions.find(option => option.value === preferences.timezone) || timezoneOptions[0];
  };

  if (signingOut) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#008080" />
          <Text style={styles.loadingText}>Logging out...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Settings</Text>
            <Text style={styles.subtitle}>Manage your account and preferences</Text>
          </View>

                     {/* Account Information */}
           <Card style={styles.section}>
             <View style={styles.sectionHeader}>
               <Text style={styles.sectionTitle}>Account Information</Text>
               <TouchableOpacity 
                 style={styles.editButton}
                 onPress={() => setEditAccountModal(true)}
                 activeOpacity={0.7}
               >
                 <IconSymbol name="pencil" size={16} color="#FFFFFF" />
               </TouchableOpacity>
             </View>
             
             <View style={styles.accountItem}>
               <Text style={styles.accountLabel}>Email Address</Text>
               <Text style={styles.accountValue}>{user?.email}</Text>
               <Text style={styles.accountNote}>Email cannot be changed</Text>
             </View>
             
             <View style={styles.accountItem}>
               <Text style={styles.accountLabel}>Full Name</Text>
               <Text style={styles.accountValue}>{accountData.fullName || 'Not set'}</Text>
             </View>
             
             <View style={styles.accountItem}>
               <Text style={styles.accountLabel}>Phone Number</Text>
               <Text style={styles.accountValue}>{accountData.phoneNumber}</Text>
             </View>
             
             <View style={styles.accountItem}>
               <Text style={styles.accountLabel}>Address</Text>
               <Text style={styles.accountValue}>{accountData.address}</Text>
             </View>

             {/* Preferences Section */}
             <View style={styles.preferencesDivider}>
               <Text style={styles.preferencesTitle}>Preferences</Text>
             </View>
             
             <View style={styles.preferenceItem}>
               <Text style={styles.preferenceLabel}>Your Timezone</Text>
               <TouchableOpacity style={styles.dropdownButton} onPress={() => setTimezoneModal(true)}>
                 <Text style={styles.dropdownText}>{getSelectedTimezone().label}</Text>
                 <Text style={styles.dropdownArrow}>▼</Text>
               </TouchableOpacity>
             </View>
             
             <View style={styles.preferenceItem}>
               <Text style={styles.preferenceLabel}>Time Format</Text>
               <View style={styles.toggleGroup}>
                 <TouchableOpacity 
                   style={[
                     styles.toggleButton, 
                     preferences.timeFormat === '12h' && styles.toggleButtonActive
                   ]}
                   onPress={() => setPreferences(prev => ({ ...prev, timeFormat: '12h' }))}
                 >
                   <IconSymbol name="clock" size={16} color={preferences.timeFormat === '12h' ? '#FFFFFF' : '#6B7280'} />
                   <Text style={[
                     styles.toggleText,
                     preferences.timeFormat === '12h' && styles.toggleTextActive
                   ]}>12-hour (AM/PM)</Text>
                 </TouchableOpacity>
                 
                 <TouchableOpacity 
                   style={[
                     styles.toggleButton, 
                     preferences.timeFormat === '24h' && styles.toggleButtonActive
                   ]}
                   onPress={() => setPreferences(prev => ({ ...prev, timeFormat: '24h' }))}
                 >
                   <IconSymbol name="clock" size={16} color={preferences.timeFormat === '24h' ? '#FFFFFF' : '#6B7280'} />
                   <Text style={[
                     styles.toggleText,
                     preferences.timeFormat === '24h' && styles.toggleTextActive
                   ]}>24-hour</Text>
                 </TouchableOpacity>
               </View>
             </View>

                           {/* Save Changes Button */}
              <TouchableOpacity 
                style={[styles.saveButton, !user?.id && styles.saveButtonDisabled]}
                onPress={savePreferences}
                disabled={loading || !user?.id}
              >
                <View style={styles.saveButtonContent}>
                  <IconSymbol name="checkmark.circle.fill" size={24} color="#FFFFFF" />
                  <Text style={styles.saveButtonText}>
                    {loading ? 'Saving...' : !user?.id ? 'Not Signed In' : 'Save Changes'}
                  </Text>
                </View>
              </TouchableOpacity>
           </Card>

          {/* Tutorial Section */}
          <Card style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Application Guide</Text>
              <IconSymbol name="questionmark.circle" size={20} color="#008080" />
            </View>
            
            <TouchableOpacity style={styles.tutorialButton} onPress={() => setTutorialModal(true)}>
              <IconSymbol name="play.circle" size={20} color="#008080" />
              <Text style={styles.tutorialButtonText}>Watch Tutorial Videos</Text>
            </TouchableOpacity>
            <Text style={styles.tutorialDescription}>
              Learn how to use MiKare's features with our step-by-step video guides
            </Text>
          </Card>

          

                     {/* Subscription Plan */}
           <Card style={styles.section}>
             <View style={styles.sectionHeader}>
               <Text style={styles.sectionTitle}>Subscription Plan</Text>
               <IconSymbol name="creditcard.fill" size={20} color="#008080" />
             </View>
             
             <Text style={styles.subscriptionSubtitle}>Manage Subscription</Text>
             <Text style={styles.subscriptionDescription}>
               View or update your billing details, payment method, or cancel your subscription.
             </Text>
             
             <TouchableOpacity style={styles.stripeButton} onPress={handleStripePortal}>
               <Text style={styles.stripeButtonText}>Open Stripe Portal</Text>
             </TouchableOpacity>
           </Card>

           {/* Feedback Section */}
           <Card style={styles.section}>
             <View style={styles.sectionHeader}>
               <Text style={styles.sectionTitle}>Feedback</Text>
               <IconSymbol name="message.circle" size={20} color="#008080" />
             </View>
             
             <Text style={styles.subscriptionSubtitle}>Help Us Improve</Text>
             <Text style={styles.subscriptionDescription}>
               Share your thoughts, suggestions, or report issues to help us make MiKare better.
             </Text>
             
             <TouchableOpacity style={styles.stripeButton} onPress={() => setFeedbackModal(true)}>
               <Text style={styles.stripeButtonText}>Send Feedback</Text>
             </TouchableOpacity>
           </Card>

           {/* Privacy & Data Control */}
          <Card style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Privacy & Data Control</Text>
              <IconSymbol name="lock.fill" size={20} color="#008080" />
            </View>
            
            <TouchableOpacity style={styles.privacyButton} onPress={handleDownloadData}>
              <IconSymbol name="arrow.down.circle" size={20} color="#374151" />
              <Text style={styles.privacyButtonText}>Download My Data</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.privacyButton} onPress={handleRecentLogins}>
              <IconSymbol name="clock.arrow.circlepath" size={20} color="#374151" />
              <Text style={styles.privacyButtonText}>Recent Logins</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.privacyButton} onPress={handleDeleteAccount}>
              <IconSymbol name="trash" size={20} color="#EF4444" />
              <Text style={[styles.privacyButtonText, { color: '#EF4444' }]}>Delete My Account</Text>
            </TouchableOpacity>
          </Card>

                     {/* Action Buttons */}
           <TouchableOpacity 
             style={styles.signOutButton}
             onPress={handleSignOut}
           >
             <View style={styles.signOutButtonContent}>
               <IconSymbol name="rectangle.portrait.and.arrow.right" size={24} color="#FFFFFF" />
               <Text style={styles.signOutButtonText}>Sign Out</Text>
             </View>
           </TouchableOpacity>
        </Animated.View>
      </ScrollView>

      {/* Edit Account Modal */}
      <Modal
        visible={editAccountModal}
        transparent
        animationType="slide"
        onRequestClose={() => setEditAccountModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setEditAccountModal(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Account Information</Text>
              <TouchableOpacity onPress={() => setEditAccountModal(false)}>
                <IconSymbol name="xmark.circle.fill" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalBody}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Full Name</Text>
                <TextInput
                  style={styles.textInput}
                  value={accountData.fullName}
                  onChangeText={(text) => setAccountData(prev => ({ ...prev, fullName: text }))}
                  placeholder="Enter your full name"
                />
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Phone Number</Text>
                <TextInput
                  style={styles.textInput}
                  value={accountData.phoneNumber}
                  onChangeText={(text) => setAccountData(prev => ({ ...prev, phoneNumber: text }))}
                  placeholder="Enter your phone number"
                  keyboardType="phone-pad"
                />
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Address</Text>
                <TextInput
                  style={styles.textInput}
                  value={accountData.address}
                  onChangeText={(text) => setAccountData(prev => ({ ...prev, address: text }))}
                  placeholder="Enter your address"
                  multiline
                />
              </View>
            </View>
            
            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => setEditAccountModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.saveModalButton}
                onPress={saveAccountData}
                disabled={loading}
              >
                <Text style={styles.saveModalButtonText}>
                  {loading ? 'Saving...' : 'Save'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Timezone Modal */}
      <Modal
        visible={timezoneModal}
        transparent
        animationType="slide"
        onRequestClose={() => setTimezoneModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setTimezoneModal(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Timezone</Text>
              <TouchableOpacity onPress={() => setTimezoneModal(false)}>
                <IconSymbol name="xmark.circle.fill" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.timezoneList}>
              {timezoneOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.timezoneOption,
                    preferences.timezone === option.value && styles.timezoneOptionSelected
                  ]}
                  onPress={() => {
                    setPreferences(prev => ({ ...prev, timezone: option.value }));
                    setTimezoneModal(false);
                  }}
                >
                  <Text style={[
                    styles.timezoneOptionText,
                    preferences.timezone === option.value && styles.timezoneOptionTextSelected
                  ]}>
                    {option.label}
                  </Text>
                  {preferences.timezone === option.value && (
                    <IconSymbol name="checkmark.circle.fill" size={20} color="#008080" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Tutorial Modal */}
      <Modal
        visible={tutorialModal}
        transparent
        animationType="slide"
        onRequestClose={() => setTutorialModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setTutorialModal(false)}
        >
          <View style={styles.tutorialModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>MiKare Tutorial</Text>
              <TouchableOpacity onPress={() => setTutorialModal(false)}>
                <IconSymbol name="xmark.circle.fill" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.tutorialContent}>
              <View style={styles.tutorialVideoContainer}>
                <View style={styles.tutorialVideoPlaceholder}>
                  <IconSymbol name="play.circle.fill" size={48} color="#008080" />
                  <Text style={styles.tutorialVideoText}>Video {currentTutorialStep + 1}</Text>
                  <Text style={styles.tutorialVideoNote}>
                    For better performance, videos are recommended to be uploaded to your CDN
                  </Text>
                </View>
              </View>
              
              <View style={styles.tutorialInfo}>
                <Text style={styles.tutorialStepTitle}>{tutorialSteps[currentTutorialStep].title}</Text>
                <Text style={styles.tutorialStepDescription}>{tutorialSteps[currentTutorialStep].description}</Text>
              </View>
              
              <View style={styles.tutorialNavigation}>
                <TouchableOpacity
                  style={[
                    styles.tutorialNavButton,
                    currentTutorialStep === 0 && styles.tutorialNavButtonDisabled
                  ]}
                  onPress={() => setCurrentTutorialStep(prev => Math.max(0, prev - 1))}
                  disabled={currentTutorialStep === 0}
                >
                  <IconSymbol name="chevron.left" size={20} color="#FFFFFF" />
                  <Text style={styles.tutorialNavButtonText}>Previous</Text>
                </TouchableOpacity>
                
                <View style={styles.tutorialDots}>
                  {tutorialSteps.map((_, index) => (
                    <View
                      key={index}
                      style={[
                        styles.tutorialDot,
                        index === currentTutorialStep && styles.tutorialDotActive
                      ]}
                    />
                  ))}
                </View>
                
                <TouchableOpacity
                  style={[
                    styles.tutorialNavButton,
                    currentTutorialStep === tutorialSteps.length - 1 && styles.tutorialNavButtonDisabled
                  ]}
                  onPress={() => setCurrentTutorialStep(prev => Math.min(tutorialSteps.length - 1, prev + 1))}
                  disabled={currentTutorialStep === tutorialSteps.length - 1}
                >
                  <Text style={styles.tutorialNavButtonText}>Next</Text>
                  <IconSymbol name="chevron.right" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Recent Logins Modal */}
      <Modal
        visible={recentLoginsModal}
        transparent
        animationType="slide"
        onRequestClose={() => setRecentLoginsModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setRecentLoginsModal(false)}
        >
          <View style={styles.recentLoginsModalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleContainer}>
                <IconSymbol name="clock.arrow.circlepath" size={24} color="#008080" />
                <Text style={styles.modalTitle}>Recent Logins</Text>
              </View>
              <TouchableOpacity onPress={() => setRecentLoginsModal(false)}>
                <IconSymbol name="xmark.circle.fill" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.loginsTableContainer}>
              {loginsLoading ? (
                <View style={styles.loginsLoadingContainer}>
                  <ActivityIndicator size="large" color="#008080" />
                  <Text style={styles.loginsLoadingText}>Loading recent logins...</Text>
                </View>
              ) : (
                <>
                  <View style={styles.loginsTableHeader}>
                    <Text style={styles.loginsHeaderText}>Date & Time</Text>
                    <Text style={styles.loginsHeaderText}>Device</Text>
                    <Text style={styles.loginsHeaderText}>IP Address</Text>
                    <Text style={styles.loginsHeaderText}>Region</Text>
                  </View>
                  
                  {recentLogins.map((login, index) => (
                    <View key={login.id} style={styles.loginsTableRow}>
                      <Text style={styles.loginsCellText}>{login.date_time}</Text>
                      <Text style={styles.loginsCellText} numberOfLines={2}>{login.device}</Text>
                      <Text style={styles.loginsCellText}>{login.ip_address}</Text>
                      <Text style={styles.loginsCellText}>{login.region}</Text>
                    </View>
                  ))}
                </>
              )}
            </ScrollView>
          </View>
                 </TouchableOpacity>
       </Modal>

       {/* Feedback Modal */}
                        <Modal
           visible={feedbackModal}
           transparent
           animationType="slide"
           onRequestClose={() => setFeedbackModal(false)}
           statusBarTranslucent={true}
         >
           <TouchableOpacity
             style={styles.feedbackModalOverlay}
             activeOpacity={1}
             onPress={() => setFeedbackModal(false)}
             disabled={feedbackLoading}
           >
            <View style={styles.feedbackModalContent}>
             <View style={styles.modalHeader}>
               <Text style={styles.modalTitle}>Send Feedback</Text>
               <TouchableOpacity onPress={() => setFeedbackModal(false)}>
                 <IconSymbol name="xmark.circle.fill" size={24} color="#6B7280" />
               </TouchableOpacity>
             </View>
             
             <View style={styles.modalBody}>
               <View style={styles.inputGroup}>
                 <Text style={styles.inputLabel}>Topic</Text>
                 <View style={styles.topicSelector}>
                   {['General', 'Bug Report', 'Feature Request', 'UI/UX', 'Performance'].map((topic) => (
                     <TouchableOpacity
                       key={topic}
                       style={[
                         styles.topicButton,
                         feedbackTopic === topic && styles.topicButtonActive
                       ]}
                       onPress={() => setFeedbackTopic(topic)}
                     >
                       <Text style={[
                         styles.topicButtonText,
                         feedbackTopic === topic && styles.topicButtonTextActive
                       ]}>
                         {topic}
                       </Text>
                     </TouchableOpacity>
                   ))}
                 </View>
               </View>
               
                                <View style={styles.inputGroup}>
                   <Text style={styles.inputLabel}>Your Feedback</Text>
                   <TextInput
                     style={[styles.textInput, styles.feedbackTextInput]}
                     value={feedbackText}
                     onChangeText={setFeedbackText}
                     placeholder="Tell us what you think, what we can improve, or any issues you've encountered..."
                     multiline
                     numberOfLines={6}
                     textAlignVertical="top"
                     blurOnSubmit={false}
                     returnKeyType="default"
                     onSubmitEditing={() => {
                       // Prevent modal from closing when return is pressed
                       // Just blur the input to dismiss keyboard
                     }}
                   />
                 </View>
             </View>
             
             <View style={styles.modalFooter}>
               <TouchableOpacity 
                 style={styles.cancelButton}
                 onPress={() => setFeedbackModal(false)}
               >
                 <Text style={styles.cancelButtonText}>Cancel</Text>
               </TouchableOpacity>
               <TouchableOpacity 
                 style={styles.saveModalButton}
                 onPress={handleSubmitFeedback}
                 disabled={feedbackLoading}
               >
                 <Text style={styles.saveModalButtonText}>
                   {feedbackLoading ? 'Sending...' : 'Send Feedback'}
                 </Text>
               </TouchableOpacity>
             </View>
           </View>
         </TouchableOpacity>
               </Modal>

        {/* Sign Out Confirmation Modal */}
        <Modal
          visible={signOutModal}
          transparent
          animationType="fade"
          onRequestClose={cancelSignOut}
        >
          <TouchableOpacity
            style={styles.signOutModalOverlay}
            activeOpacity={1}
            onPress={cancelSignOut}
          >
            <View style={styles.signOutModalContent}>
              <View style={styles.signOutModalHeader}>
                <IconSymbol name="rectangle.portrait.and.arrow.right" size={24} color="#EF4444" />
                <Text style={styles.signOutModalTitle}>Sign Out</Text>
              </View>
              
              <Text style={styles.signOutModalMessage}>
                Are you sure you want to sign out? You will need to sign in again to access your account.
              </Text>
              
              <View style={styles.signOutModalButtons}>
                <TouchableOpacity 
                  style={styles.signOutCancelButton}
                  onPress={cancelSignOut}
                >
                  <Text style={styles.signOutCancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.signOutConfirmButton}
                  onPress={confirmSignOut}
                >
                  <Text style={styles.signOutConfirmButtonText}>Sign Out</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </Modal>
      </SafeAreaView>
    );
  }

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#139FA0',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#E5F2F2',
  },
  section: {
    marginBottom: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  accountItem: {
    marginBottom: 16,
  },
  accountLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 4,
  },
  accountValue: {
    fontSize: 16,
    color: '#1F2937',
    marginBottom: 2,
  },
     accountNote: {
     fontSize: 12,
     color: '#6B7280',
   },
   preferencesDivider: {
     marginTop: 24,
     marginBottom: 16,
     borderTopWidth: 1,
     borderTopColor: '#E5E7EB',
     paddingTop: 16,
   },
   preferencesTitle: {
     fontSize: 18,
     fontWeight: '600',
     color: '#1F2937',
     marginBottom: 8,
   },
   preferenceItem: {
     marginBottom: 20,
   },
  preferenceLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  preferenceDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
    lineHeight: 20,
  },
  dropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
  },
  dropdownText: {
    fontSize: 16,
    color: '#1F2937',
  },
  dropdownArrow: {
    fontSize: 12,
    color: '#6B7280',
  },
  toggleGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  toggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
  },
  toggleButtonActive: {
    backgroundColor: '#008080',
    borderColor: '#008080',
  },
  toggleText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  toggleTextActive: {
    color: '#FFFFFF',
  },
  securityNote: {
    fontSize: 12,
    color: '#008080',
    fontStyle: 'italic',
  },
  tutorialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#008080',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    marginBottom: 8,
  },
  tutorialButtonText: {
    fontSize: 14,
    color: '#008080',
    fontWeight: '500',
  },
  tutorialDescription: {
    fontSize: 12,
    color: '#6B7280',
  },
  subscriptionSubtitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  subscriptionDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
    lineHeight: 20,
  },
  stripeButton: {
    backgroundColor: '#008080',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  stripeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  privacyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    marginBottom: 8,
  },
  privacyButtonText: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
  },
     saveButton: {
     backgroundColor: '#008080',
     borderRadius: 12,
     padding: 18,
     marginBottom: 16,
     shadowColor: '#000',
     shadowOffset: {
       width: 0,
       height: 4,
     },
     shadowOpacity: 0.2,
     shadowRadius: 6,
     elevation: 5,
   },
   saveButtonDisabled: {
     backgroundColor: '#9CA3AF',
     opacity: 0.6,
   },
  saveButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 12,
  },
  signOutButton: {
    backgroundColor: '#EF4444',
    borderRadius: 12,
    padding: 18,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  signOutButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  signOutButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#139FA0',
  },
  loadingText: {
    marginTop: 10,
    color: '#FFFFFF',
    fontSize: 18,
  },
     modalOverlay: {
     flex: 1,
     justifyContent: 'center',
     alignItems: 'center',
     backgroundColor: 'rgba(0,0,0,0.5)',
   },
   feedbackModalOverlay: {
     flex: 1,
     justifyContent: 'flex-start',
     alignItems: 'center',
     backgroundColor: 'rgba(0,0,0,0.5)',
   },
     modalContent: {
     width: '90%',
     backgroundColor: '#FFFFFF',
     borderRadius: 15,
     padding: 20,
     shadowColor: '#000',
     shadowOffset: { width: 0, height: 2 },
     shadowOpacity: 0.25,
     shadowRadius: 4,
     elevation: 5,
   },
   feedbackModalContent: {
     width: '90%',
     backgroundColor: '#FFFFFF',
     borderRadius: 15,
     padding: 20,
     shadowColor: '#000',
     shadowOffset: { width: 0, height: 2 },
     shadowOpacity: 0.25,
     shadowRadius: 4,
     elevation: 5,
     marginTop: 60,
   },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  modalBody: {
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 5,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#1F2937',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
  },
  cancelButton: {
    backgroundColor: '#EF4444',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  saveModalButton: {
    backgroundColor: '#008080',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  saveModalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  timezoneList: {
    maxHeight: 250,
  },
  timezoneOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  timezoneOptionSelected: {
    backgroundColor: '#E0F2F7',
    borderColor: '#008080',
    borderWidth: 1,
  },
  timezoneOptionText: {
    fontSize: 16,
    color: '#374151',
  },
  timezoneOptionTextSelected: {
    color: '#008080',
    fontWeight: '600',
  },
  tutorialContent: {
    alignItems: 'center',
  },
  tutorialVideoContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#000',
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 15,
  },
  tutorialVideoPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  tutorialVideoText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 10,
  },
  tutorialInfo: {
    alignItems: 'center',
    marginBottom: 20,
  },
  tutorialStepTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 5,
  },
  tutorialStepDescription: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 22,
  },
  tutorialNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginTop: 15,
  },
  tutorialNavButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#008080',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  tutorialNavButtonDisabled: {
    opacity: 0.5,
    backgroundColor: '#9CA3AF',
  },
  tutorialNavButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  tutorialDots: {
    flexDirection: 'row',
    gap: 8,
  },
  tutorialDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D1D5DB',
  },
  tutorialDotActive: {
    backgroundColor: '#008080',
  },
  editButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#008080',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  tutorialModalContent: {
    width: '95%',
    maxHeight: '90%',
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  tutorialVideoNote: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
  recentLoginsModalContent: {
    width: '95%',
    maxHeight: '90%',
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loginsTableContainer: {
    maxHeight: 400,
  },
  loginsLoadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loginsLoadingText: {
    marginTop: 10,
    color: '#6B7280',
    fontSize: 16,
  },
  loginsTableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  loginsHeaderText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
  },
  loginsTableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
     loginsCellText: {
     flex: 1,
     fontSize: 12,
     color: '#374151',
     textAlign: 'center',
   },
   topicSelector: {
     flexDirection: 'row',
     flexWrap: 'wrap',
     gap: 8,
     marginTop: 8,
   },
   topicButton: {
     borderWidth: 1,
     borderColor: '#D1D5DB',
     borderRadius: 20,
     paddingHorizontal: 12,
     paddingVertical: 6,
     backgroundColor: '#FFFFFF',
   },
   topicButtonActive: {
     backgroundColor: '#008080',
     borderColor: '#008080',
   },
   topicButtonText: {
     fontSize: 14,
     color: '#6B7280',
     fontWeight: '500',
   },
   topicButtonTextActive: {
     color: '#FFFFFF',
   },
       feedbackTextInput: {
      height: 120,
      paddingTop: 12,
    },
    signOutModalOverlay: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0,0,0,0.6)',
    },
    signOutModalContent: {
      width: '85%',
      backgroundColor: '#FFFFFF',
      borderRadius: 16,
      padding: 24,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    },
    signOutModalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    signOutModalTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: '#1F2937',
      marginLeft: 8,
    },
    signOutModalMessage: {
      fontSize: 16,
      color: '#6B7280',
      textAlign: 'center',
      lineHeight: 24,
      marginBottom: 24,
    },
    signOutModalButtons: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 12,
    },
    signOutCancelButton: {
      flex: 1,
      backgroundColor: '#F3F4F6',
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: '#D1D5DB',
    },
    signOutCancelButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#374151',
    },
    signOutConfirmButton: {
      flex: 1,
      backgroundColor: '#EF4444',
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
      shadowColor: '#EF4444',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 4,
    },
    signOutConfirmButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#FFFFFF',
    },
  });
