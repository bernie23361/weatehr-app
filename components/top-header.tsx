import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

interface TopHeaderProps {
  title: string;
  onOpenMap: () => void;
  onOpenSidebar: () => void;
  dark?: boolean;
}

function DisasterMapIcon({ size = 22, color = '#94A3B8' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M2 5L9 2L15 5L21.303 2.2987C21.5569 2.18992 21.8508 2.30749 21.9596 2.56131C21.9862 2.62355 22 2.69056 22 2.75827V19L15 22L9 19L2.69696 21.7013C2.44314 21.8101 2.14921 21.6925 2.04043 21.4387C2.01375 21.3765 2 21.3094 2 21.2417V5ZM16 19.3955L20 17.6812V5.03308L16 6.74736V19.3955ZM14 19.2639V6.73607L10 4.73607V17.2639L14 19.2639ZM8 17.2526V4.60451L4 6.31879V18.9669L8 17.2526Z" />
    </Svg>
  );
}

function MenuIcon({ size = 22, color = '#94A3B8' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M12 3V5H3V3H12ZM16 19V21H3V19H16ZM22 11V13H3V11H22Z" />
    </Svg>
  );
}

export function TopHeader({ title, onOpenMap, onOpenSidebar, dark = false }: TopHeaderProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: Math.max(insets.top, 12), paddingBottom: 12, backgroundColor: dark ? '#111827' : '#FFFFFF', zIndex: 10 }}>
      <Pressable accessibilityRole="button" accessibilityLabel="開啟防災指南" onPress={onOpenMap} hitSlop={8} style={({ pressed }) => ({ padding: 8, marginLeft: -8, borderRadius: 999, backgroundColor: pressed ? (dark ? '#1E293B' : '#F8FAFC') : 'transparent', transform: [{ scale: pressed ? 0.95 : 1 }] })}>
        <DisasterMapIcon size={22} color={dark ? '#94A3B8' : '#94A3B8'} />
      </Pressable>
      <Text style={{ color: dark ? '#F8FAFC' : '#1E293B', fontSize: 16, fontWeight: '600' }}>{title}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="開啟縣市收藏" onPress={onOpenSidebar} hitSlop={8} style={({ pressed }) => ({ padding: 8, marginRight: -8, borderRadius: 999, backgroundColor: pressed ? (dark ? '#1E293B' : '#F8FAFC') : 'transparent', transform: [{ scale: pressed ? 0.95 : 1 }] })}>
        <MenuIcon size={22} color="#94A3B8" />
      </Pressable>
    </View>
  );
}
