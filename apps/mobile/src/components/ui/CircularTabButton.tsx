import React from 'react';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import { IconSymbol } from '../../../components/ui/IconSymbol';

interface CircularTabButtonProps {
  onPress: () => void;
  focused: boolean;
}

export function CircularTabButton({ onPress, focused }: CircularTabButtonProps) {
  return (
    <TouchableOpacity
      style={styles.circularTabButton}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={[
        styles.circularIcon, 
        { backgroundColor: focused ? '#008080' : '#20C997' }
      ]}>
        <IconSymbol name="brain.head.profile" size={24} color="#FFFFFF" />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  circularTabButton: {
    position: 'absolute',
    bottom: 20, // Protrude from tab bar
    alignSelf: 'center',
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
  },
  circularIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
