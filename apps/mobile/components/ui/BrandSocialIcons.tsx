import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';

interface BrandSocialIconProps {
  platform: 'facebook' | 'twitter' | 'instagram' | 'linkedin' | 'tiktok' | 'x';
  size?: number;
  color: string;
}

export function BrandSocialIcon({ platform, size = 24, color }: BrandSocialIconProps) {
  // Use the most appropriate icon set for each platform
  const getIconComponent = () => {
    switch (platform) {
      case 'facebook':
        return <FontAwesome5 name="facebook-f" size={size} color={color} />;
      case 'twitter':
      case 'x':
        return <FontAwesome5 name="twitter" size={size} color={color} />;
      case 'instagram':
        return <FontAwesome5 name="instagram" size={size} color={color} />;
      case 'linkedin':
        return <FontAwesome5 name="linkedin-in" size={size} color={color} />;
      case 'tiktok':
        return <FontAwesome5 name="tiktok" size={size} color={color} />;
      default:
        return <MaterialIcons name="help" size={size} color={color} />;
    }
  };

  console.log(`BrandSocialIcon: ${platform} using FontAwesome5`);
  
  try {
    return getIconComponent();
  } catch (error) {
    console.log(`BrandSocialIcon Error for ${platform}: ${error}`);
    // Fallback to text with platform name
    return <Text style={{ color, fontSize: size * 0.6, fontWeight: 'bold' }}>{platform.charAt(0).toUpperCase()}</Text>;
  }
}
