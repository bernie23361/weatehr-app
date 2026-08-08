import { useEffect, useRef, useState } from 'react';
import { BlurView } from 'expo-blur';
import { Animated, Pressable, ScrollView, Text, View } from 'react-native';
import type { AppData } from '@/types/weather';
import { WeatherIcon } from '@/components/weather-icon';

export function AlarmModal({ open, alert, onClose }: { open: boolean; alert: AppData['alerts']; onClose: () => void }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const [rendered, setRendered] = useState(open);
  useEffect(() => {
    if (open) setRendered(true);
    const animation = Animated.timing(opacity, { toValue: open ? 1 : 0, duration: 180, useNativeDriver: true });
    animation.start(({ finished }) => { if (finished && !open) setRendered(false); });
    return () => animation.stop();
  }, [open, opacity]);
  if (!rendered) return null;

  return (
    <Animated.View pointerEvents={open ? 'auto' : 'none'} style={{ position: 'absolute', inset: 0, zIndex: 60, alignItems: 'center', justifyContent: 'center', padding: 24, opacity }}>
      <BlurView intensity={10} tint="dark" style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(15,23,42,0.40)' }}>
        <Pressable onPress={onClose} style={{ flex: 1 }} />
      </BlurView>
      <View style={{ width: '100%', maxWidth: 340, maxHeight: '80%', borderRadius: 28, borderCurve: 'continuous', overflow: 'hidden', backgroundColor: '#FFFFFF', boxShadow: '0 20px 40px rgba(0,0,0,0.22)' }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#FEF2F2', backgroundColor: 'rgba(254,242,242,0.50)' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 }}><WeatherIcon name="alert-triangle" size={20} strokeWidth={2.5} color="#DC2626" /><Text style={{ color: '#DC2626', fontSize: 16, fontWeight: '700', letterSpacing: 0.4, flexShrink: 1 }}>{alert.title}</Text></View>
          <Pressable onPress={onClose} style={({ pressed }) => ({ padding: 6, marginLeft: 8, borderRadius: 999, backgroundColor: '#FFFFFF', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', transform: [{ scale: pressed ? 0.95 : 1 }] })}><WeatherIcon name="x" size={16} color="#94A3B8" /></Pressable>
        </View>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20 }}><Text style={{ color: '#334155', fontSize: 14, lineHeight: 23 }}>{alert.content}</Text></ScrollView>
        <View style={{ padding: 20, paddingTop: 8 }}><Pressable onPress={onClose} style={({ pressed }) => ({ width: '100%', alignItems: 'center', paddingVertical: 14, borderRadius: 12, backgroundColor: '#EF4444', boxShadow: '0 4px 12px rgba(239,68,68,0.30)', transform: [{ scale: pressed ? 0.95 : 1 }] })}><Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '600' }}>我知道了</Text></Pressable></View>
      </View>
    </Animated.View>
  );
}
