import type { PropsWithChildren } from 'react';
import { Pressable, Text, View, type PressableProps } from 'react-native';
import type { WeatherIconName } from '@/types/weather';
import { WeatherIcon } from '@/components/weather-icon';

export const cardShadow = '0 4px 20px rgba(0, 0, 0, 0.02)';
export const subtleShadow = '0 1px 3px rgba(0, 0, 0, 0.06)';

export function SectionCard({ children, paddingBottom = 24 }: PropsWithChildren<{ paddingBottom?: number }>) {
  return (
    <View style={{ backgroundColor: '#FFFFFF', padding: 20, paddingBottom, borderRadius: 28, borderCurve: 'continuous', boxShadow: cardShadow }}>
      {children}
    </View>
  );
}

export function SectionHeading({ children }: PropsWithChildren) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
      <View style={{ width: 6, height: 14, backgroundColor: '#3B82F6', borderRadius: 999 }} />
      <Text style={{ color: '#1E293B', fontSize: 15, fontWeight: '600' }}>{children}</Text>
    </View>
  );
}

interface StatCardProps extends PressableProps {
  icon: WeatherIconName;
  label: string;
  value: string;
  status: string;
  iconColor: string;
  badgeBg: string;
  badgeText: string;
}

export function StatCard({ icon, label, value, status, iconColor, badgeBg, badgeText, ...props }: StatCardProps) {
  return (
    <Pressable
      {...props}
      style={({ pressed }) => ({
        flex: 1,
        alignItems: 'center',
        marginHorizontal: 4,
        padding: 10,
        borderRadius: 18,
        borderCurve: 'continuous',
        borderWidth: 1,
        borderColor: '#F8FAFC',
        backgroundColor: '#FFFFFF',
        boxShadow: pressed ? '0 4px 8px rgba(0,0,0,0.08)' : subtleShadow,
        transform: [{ translateY: pressed ? -4 : 0 }],
      })}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <WeatherIcon name={icon} size={12} color={iconColor} />
        <Text style={{ color: '#9CA3AF', fontSize: 10, fontWeight: '500' }}>{label}</Text>
      </View>
      <Text style={{ color: '#374151', fontSize: 15, fontWeight: '600', marginBottom: 4, fontVariant: ['tabular-nums'] }}>{value}</Text>
      <View style={{ paddingHorizontal: 10, paddingVertical: 2, borderRadius: 999, backgroundColor: badgeBg }}>
        <Text style={{ color: badgeText, fontSize: 9, fontWeight: '500' }}>{status}</Text>
      </View>
    </Pressable>
  );
}
