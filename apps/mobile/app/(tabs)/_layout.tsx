import { Tabs } from 'expo-router';
import React, { useState } from 'react';
import { Platform, Modal, TouchableOpacity, View, Text, StyleSheet } from 'react-native';

import { HapticTab } from '@/components/HapticTab';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { CircularTabButton } from '../../src/components/ui/CircularTabButton';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const [menuVisible, setMenuVisible] = useState(false);

  const handleCircularButtonPress = () => {
    setMenuVisible(true);
  };

  const handleMenuOption = (option: string) => {
    setMenuVisible(false);
    // TODO: Handle menu options
    console.log('Selected:', option);
  };

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
          name="ask-meeka"
          options={{
            title: 'Ask Meeka',
            tabBarIcon: ({ focused }) => (
              <CircularTabButton focused={focused} onPress={handleCircularButtonPress} />
            ),
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

      {/* Menu Modal */}
      <Modal
        visible={menuVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setMenuVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setMenuVisible(false)}
        >
          <View style={styles.menuContainer}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleMenuOption('Ask Meeka')}
            >
              <View style={styles.menuIcon}>
                <IconSymbol name="brain.head.profile" size={20} color="#008080" />
              </View>
              <Text style={styles.menuText}>Ask Meeka</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleMenuOption('Add Diary')}
            >
              <View style={styles.menuIcon}>
                <IconSymbol name="plus.circle.fill" size={20} color="#008080" />
              </View>
              <Text style={styles.menuText}>Add Diary</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleMenuOption('Add Symptom')}
            >
              <View style={styles.menuIcon}>
                <IconSymbol name="plus.circle.fill" size={20} color="#008080" />
              </View>
              <Text style={styles.menuText}>Add Symptom</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  menuContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    minWidth: 200,
    marginBottom: 100, // Position above the circular button
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  menuIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F0FDFA',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
  },
});
