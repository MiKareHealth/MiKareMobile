import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

interface SocialMediaIconProps {
  platform: 'facebook' | 'twitter' | 'instagram' | 'linkedin' | 'tiktok';
  size?: number;
  color: string;
}

export function SocialMediaIcon({ platform, size = 24, color }: SocialMediaIconProps) {
  const getIconName = () => {
    switch (platform) {
      case 'facebook':
        return 'people'; // People icon for social network
      case 'twitter':
        return 'chat'; // Chat bubble for messaging
      case 'instagram':
        return 'camera-alt'; // Camera for photo sharing
      case 'linkedin':
        return 'work'; // Work/briefcase for professional network
      case 'tiktok':
        return 'music-note'; // Music note for video platform
      default:
        return 'help';
    }
  };

  const iconName = getIconName();
  
  console.log(`SocialMediaIcon: ${platform} -> ${iconName}`);
  
  try {
    return <MaterialIcons name={iconName} size={size} color={color} />;
  } catch (error) {
    console.log(`SocialMediaIcon Error for ${platform}: ${error}`);
    // Fallback to text
    return <Text style={{ color, fontSize: size, fontWeight: 'bold' }}>?</Text>;
  }
}
