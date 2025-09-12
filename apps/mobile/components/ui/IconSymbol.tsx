// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SymbolWeight, SymbolViewProps } from 'expo-symbols';
import { ComponentProps } from 'react';
import { OpaqueColorValue, type StyleProp, type TextStyle, Text } from 'react-native';

type IconMapping = Record<string, ComponentProps<typeof MaterialIcons>['name']>;
type IconSymbolName = keyof typeof MAPPING;

/**
 * Add your SF Symbols to Material Icons mappings here.
 * - see Material Icons in the [Icons Directory](https://icons.expo.fyi).
 * - see SF Symbols in the [SF Symbols](https://developer.apple.com/sf-symbols/) app.
 */
const MAPPING = {
  'house.fill': 'home',
  'person.2.fill': 'people',
  'book.fill': 'book',
  'doc.text.fill': 'description',
  'gearshape.fill': 'settings',
  'message.square.fill': 'chat',
  'brain.head.profile': 'psychology',
  'plus.circle.fill': 'add-circle',
  'paperplane.fill': 'send',
  'chevron.left.forwardslash.chevron.right': 'code',
  'chevron.right': 'chevron-right',
  'mic.fill': 'mic',
  'heart.fill': 'favorite',
  'thermometer': 'thermostat',
  'pills': 'medication',
  'camera.fill': 'camera-alt',
  'note.text': 'note',
  'stethoscope': 'healing',
  'checkmark.circle.fill': 'check-circle',
  'person.fill': 'person',
  'globe': 'public',
  'clock': 'access-time',
  'questionmark.circle': 'help',
  'creditcard.fill': 'credit-card',
  'lock.fill': 'lock',
  'arrow.down.circle': 'download',
  'arrow.clockwise': 'refresh',
  'trash': 'delete',
  'rectangle.portrait.and.arrow.right': 'logout',
  'person.3.fill': 'group',
  'pencil': 'edit',
  'xmark.circle.fill': 'cancel',
  'play.circle': 'play-circle',
  'play.circle.fill': 'play-circle-filled',
  'chevron.left': 'chevron-left',
  'clock.arrow.circlepath': 'refresh',
  'plus': 'add',
  'doc.text': 'description',
  'eye': 'visibility',
  'people.fill': 'people',
  'calendar': 'calendar-today',
  'location': 'location-on',
  'message.circle.fill': 'message',
  // Social media icons - using Material Icons that definitely exist
  'facebook': 'group',               // ✅ Using group icon for Facebook (social network)
  'twitter': 'chat',                 // ✅ Using chat icon for Twitter (messaging platform)
  'instagram': 'camera-alt',         // ✅ Using camera-alt for Instagram (photo sharing)
  'linkedin': 'work',                // ✅ Using work icon for LinkedIn (professional network)
  'tiktok': 'music-note',            // ✅ Using music-note for TikTok (music/video platform)
  'newspaper.fill': 'description',   // ✅ Using description for newspaper
  'arrow.right': 'chevron-right',    // ✅ Using chevron-right for arrow
  'questionmark.circle.fill': 'help',
} as IconMapping;

/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android and web.
 * This ensures a consistent look across platforms, and optimal resource usage.
 * Icon `name`s are based on SF Symbols and require manual mapping to Material Icons.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  const iconName = MAPPING[name];
  
  // Fallback to a known working icon if the mapped icon doesn't exist
  const finalIconName = iconName || 'help';
  
  // Debug logging for social media icons
  if (['facebook', 'twitter', 'instagram', 'linkedin', 'tiktok'].includes(name)) {
    console.log(`Social Media Icon Debug: ${name} -> ${iconName} -> ${finalIconName}`);
  }
  
  try {
    return <MaterialIcons color={color} size={size} name={finalIconName} style={style} />;
  } catch (error) {
    console.log(`IconSymbol Error for ${name}: ${error}`);
    // Fallback to a simple text if MaterialIcons fails
    return <Text style={{ color, fontSize: size, fontWeight: 'bold' }}>?</Text>;
  }
}
