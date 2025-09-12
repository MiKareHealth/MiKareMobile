import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Animated,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '../../src/components/ui/Card';
import { IconSymbol } from '../../components/ui/IconSymbol';
import { BrandSocialIcon } from '../../components/ui/BrandSocialIcons';
import { useQuery } from '@tanstack/react-query';

interface BlogPost {
  id: number;
  title: { rendered: string };
  excerpt: { rendered: string };
  link: string;
  date: string;
}

interface SocialMediaAccount {
  name: string;
  url: string;
  icon: string;
  color: string;
}

export default function CommunityScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));

  // Mock data for support group
  const nextSupportGroup = {
    title: "Support Circle",
    date: "Second Tuesday of the Month",
    time: "7:00 PM - 8:30 PM",
    location: "Virtual Meeting",
    attendees: 20,
  };

  // Mock community message
  const communityMessage = {
    title: "Welcome to the MiKare Community!",
    message: "Connect with others on similar health journeys. Share experiences, ask questions, and find support from people who understand.",
    author: "MiKare Team",
    //date: "December 10, 2024",
  };

  // Social media accounts
  const socialAccounts: SocialMediaAccount[] = [
    {
      name: "Facebook",
      url: "https://www.facebook.com/people/MiKare-Health/61577047037934/",
      icon: "facebook",
      color: "#1877F2",
    },
                   {
      name: "TikTok",
      url: "https://www.tiktok.com/@mikarehealth",
      icon: "tiktok",
      color: "#000000",
    },
    {
      name: "Instagram",
      url: "https://www.instagram.com/mikare_health",
      icon: "instagram",
      color: "#E4405F",
    },
    {
      name: "LinkedIn",
      url: "https://www.linkedin.com/company/mikare-health/",
      icon: "linkedin",
      color: "#0A66C2",
    },
  ];

  // WordPress blog integration
  const { data: blogPosts, isLoading: blogLoading, error: blogError } = useQuery({
    queryKey: ['blogPosts'],
    queryFn: async (): Promise<BlogPost[]> => {
      try {
        // Fetch from MiKare Health WordPress site
        const response = await fetch('https://mikare.health/wp-json/wp/v2/posts?per_page=3');
        if (!response.ok) {
          throw new Error('Failed to fetch blog posts');
        }
        return await response.json();
      } catch (error) {
        console.log('Blog fetch error:', error);
        // Return mock data if WordPress is not available
        return [
          {
            id: 1,
            title: { rendered: "Understanding Your Health Data" },
            excerpt: { rendered: "Learn how to interpret your health metrics and make informed decisions about your wellness journey." },
            link: "https://mikare.health/blog/understanding-health-data",
            date: "2024-12-10",
          },
          {
            id: 2,
            title: { rendered: "Tips for Better Sleep Tracking" },
            excerpt: { rendered: "Discover effective strategies for monitoring and improving your sleep quality." },
            link: "https://mikare.health/blog/sleep-tracking-tips",
            date: "2024-12-08",
          },
          {
            id: 3,
            title: { rendered: "Building a Support Network" },
            excerpt: { rendered: "How to create and maintain meaningful connections with others on similar health journeys." },
            link: "https://mikare.health/blog/support-network",
            date: "2024-12-05",
          },
        ];
      }
    },
    staleTime: 1000 * 60 * 30, // 30 minutes
  });

  useEffect(() => {
    // Fade up animation on load
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    // Add any refresh logic here
    setTimeout(() => setRefreshing(false), 1000);
  };

  const handleOpenLink = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch (error) {
      Alert.alert('Error', 'Unable to open link');
    }
  };

  const handleJoinSupportGroup = () => {
    Alert.alert(
      'Join Support Group',
      `Would you like to join the "${nextSupportGroup.title}" on ${nextSupportGroup.date} at ${nextSupportGroup.time}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Join', 
          onPress: () => {
            Alert.alert(
              'Redirecting to Community',
              'You will be redirected to our community page to join the support group.',
              [
                { text: 'Cancel', style: 'cancel' },
                { 
                  text: 'Continue', 
                  onPress: () => handleOpenLink('https://mikare.health/community') 
                },
              ]
            );
          }
        },
      ]
    );
  };

  const handleGetHelp = () => {
    handleOpenLink('https://mikare.health/help');
  };

  const stripHtmlTags = (html: string) => {
    return html.replace(/<[^>]*>/g, '');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#008080"
            colors={["#008080"]}
            progressBackgroundColor="#FFFFFF"
          />
        }
      >
        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Community</Text>
            <Text style={styles.subtitle}>Connect with other MiKare users</Text>
          </View>

          {/* Next Support Group */}
          <Card style={styles.supportGroupCard}>
            <View style={styles.cardHeader}>
              <IconSymbol name={"people.fill" as any} size={24} color="#008080" />
              <Text style={styles.cardTitle}>Next Support Group</Text>
            </View>
            <Text style={styles.supportGroupTitle}>{nextSupportGroup.title}</Text>
            <View style={styles.supportGroupDetails}>
              <View style={styles.detailRow}>
                <IconSymbol name="calendar" size={16} color="#6B7280" />
                <Text style={styles.detailText}>{nextSupportGroup.date}</Text>
              </View>
              <View style={styles.detailRow}>
                <IconSymbol name="clock" size={16} color="#6B7280" />
                <Text style={styles.detailText}>{nextSupportGroup.time}</Text>
              </View>
              <View style={styles.detailRow}>
                <IconSymbol name="location" size={16} color="#6B7280" />
                <Text style={styles.detailText}>{nextSupportGroup.location}</Text>
              </View>
              <View style={styles.detailRow}>
                <IconSymbol name="person.2.fill" size={16} color="#6B7280" />
                <Text style={styles.detailText}>{nextSupportGroup.attendees} attending</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.joinButton} onPress={handleJoinSupportGroup}>
              <Text style={styles.joinButtonText}>Join Group</Text>
            </TouchableOpacity>
          </Card>

          {/* Community Message */}
          <Card style={styles.messageCard}>
            <View style={styles.cardHeader}>
              <IconSymbol name="message.circle.fill" size={24} color="#008080" />
              <Text style={styles.cardTitle}>Community Message</Text>
            </View>
            <Text style={styles.messageTitle}>{communityMessage.title}</Text>
            <Text style={styles.messageText}>{communityMessage.message}</Text>
            <View style={styles.messageFooter}>
              <Text style={styles.messageAuthor}>— {communityMessage.author}</Text>
            </View>
          </Card>

          {/* Latest News */}
          <Card style={styles.newsContainer}>
            <View style={styles.newsHeader}>
              <IconSymbol name="newspaper.fill" size={24} color="#008080" />
              <Text style={styles.newsSectionTitle}>Latest News</Text>
            </View>
            {blogLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#008080" />
                <Text style={styles.loadingText}>Loading latest news...</Text>
              </View>
            ) : blogError ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>Unable to load latest news</Text>
              </View>
            ) : (
              <>
                {blogPosts?.map((post) => (
                  <TouchableOpacity 
                    key={post.id} 
                    style={styles.newsCard}
                    onPress={() => handleOpenLink(post.link)}
                  >
                    <Text style={styles.newsTitle}>{stripHtmlTags(post.title.rendered)}</Text>
                    <Text style={styles.newsExcerpt} numberOfLines={3}>
                      {stripHtmlTags(post.excerpt.rendered)}
                    </Text>
                    <Text style={styles.newsDate}>{formatDate(post.date)}</Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity 
                  style={styles.readMoreButton}
                  onPress={() => handleOpenLink('https://mikare.health/news/')}
                >
                  <Text style={styles.readMoreButtonText}>Read More</Text>
                  <IconSymbol name="arrow.right" size={16} color="#008080" />
                </TouchableOpacity>
              </>
            )}
          </Card>

                     {/* Social Media */}
           <View style={styles.socialSection}>
             <Text style={styles.sectionTitle}>Follow Us</Text>
             <View style={styles.socialGrid}>
               {socialAccounts.map((account) => (
                 <TouchableOpacity
                   key={account.name}
                   style={[styles.socialButton, { backgroundColor: account.color }]}
                   onPress={() => handleOpenLink(account.url)}
                 >
                   <BrandSocialIcon 
                     platform={account.icon as any} 
                     size={24} 
                     color="#FFFFFF" 
                   />
                   <Text style={styles.socialButtonText}>{account.name}</Text>
                 </TouchableOpacity>
               ))}
             </View>
           </View>

          {/* Help Button */}
          <TouchableOpacity style={styles.helpButton} onPress={handleGetHelp}>
            <View style={styles.helpButtonContent}>
              <IconSymbol name="questionmark.circle.fill" size={24} color="#FFFFFF" />
              <Text style={styles.helpButtonText}>Get Help</Text>
            </View>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
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
  supportGroupCard: {
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
  messageCard: {
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
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginLeft: 8,
  },
  supportGroupTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  supportGroupDetails: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  detailText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 8,
  },
  joinButton: {
    backgroundColor: '#008080',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  joinButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  messageTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  messageText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginBottom: 12,
  },
  messageFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  messageAuthor: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  messageDate: {
    fontSize: 12,
    color: '#6B7280',
  },
  newsContainer: {
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
  newsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  newsSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginLeft: 8,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 10,
    marginTop: 12,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 10,
    color: '#6B7280',
    fontSize: 16,
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  errorText: {
    fontSize: 14,
    color: '#6B7280',
  },
  newsCard: {
    marginBottom: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  newsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  newsExcerpt: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 8,
  },
  newsDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  readMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  readMoreButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#008080',
    marginRight: 8,
  },
  socialSection: {
    marginBottom: 20,
  },
  socialGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  socialButton: {
    flex: 1,
    minWidth: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  socialButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 12,
  },

  helpButton: {
    backgroundColor: '#008080',
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
  helpButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  helpButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 12,
  },
});
