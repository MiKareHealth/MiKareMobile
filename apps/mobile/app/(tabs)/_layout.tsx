import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';

import { IconSymbol } from '@/components/ui/IconSymbol';
import { useColorScheme } from '@/hooks/useColorScheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: '#008080', // Teal active tint
          tabBarInactiveTintColor: '#6B7280', // Cool gray inactive tint
          headerShown: false,
          tabBarStyle: {
            backgroundColor: '#FFFFFF', // White background
            borderTopWidth: 1,
            borderTopColor: '#E5E7EB', // Top hairline divider
            height: Platform.OS === 'ios' ? 88 : 60, // Account for safe area
            paddingBottom: Platform.OS === 'ios' ? 20 : 8,
            paddingTop: 8,
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '500',
            marginTop: 4,
          },
        }}>
        <Tabs.Screen
          name="home"
          options={{
            title: 'Home',
            tabBarIcon: ({ color }) => <IconSymbol size={24} name="house.fill" color={color} />,
          }}
        />
        <Tabs.Screen
          name="profiles"
          options={{
            title: 'Profiles',
            tabBarIcon: ({ color }) => <IconSymbol size={24} name="person.2.fill" color={color} />,
          }}
        />
        <Tabs.Screen
          name="community"
          options={{
            title: 'Community',
            tabBarIcon: ({ color }) => <IconSymbol size={24} name="person.3.fill" color={color} />,
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: 'Settings',
            tabBarIcon: ({ color }) => <IconSymbol size={24} name="gearshape.fill" color={color} />,
          }}
        />
      </Tabs>
    </>
  );
}
