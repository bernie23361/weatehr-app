import { LinearGradient } from 'expo-linear-gradient';
import {
  Activity,
  CloudRain,
  Crosshair,
  Flame,
  Map,
  Mountain,
  Navigation,
  Radiation,
  ShieldAlert,
  Tornado,
  Waves,
} from 'lucide-react-native';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';

const responseItems = [
  { id: 'typhoon', label: '颱風準備', icon: Tornado, color: '#3182F6', background: '#EAF4FF' },
  { id: 'earthquake', label: '地震應變', icon: Activity, color: '#F59E0B', background: '#FFF8E6' },
  { id: 'tsunami', label: '海嘯應變', icon: Waves, color: '#0891B2', background: '#E6FAFC' },
  { id: 'fire', label: '火災應變', icon: Flame, color: '#F43F5E', background: '#FFF0F3' },
  { id: 'flood', label: '水災應變', icon: CloudRain, color: '#3B82F6', background: '#EEF6FF' },
  { id: 'landslide', label: '土災應變', icon: Mountain, color: '#A16207', background: '#FFF7E8' },
  { id: 'volcano', label: '火山應變', icon: Flame, color: '#EA580C', background: '#FFF1E8' },
  { id: 'nuclear', label: '核災應變', icon: Radiation, color: '#84A112', background: '#F5F9E8' },
  { id: 'war', label: '戰爭應變', icon: Crosshair, color: '#64748B', background: '#F1F5F9' },
  { id: 'terrorism', label: '恐攻應變', icon: ShieldAlert, color: '#7C3AED', background: '#F5F0FF' },
] as const;

const showComingSoon = (title: string) => Alert.alert(title, '應變資訊內容建置中。');

export function DisasterPreparednessScreen({ bottomInset }: { bottomInset: number }) {
  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentInsetAdjustmentBehavior="never"
      contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 18, paddingBottom: 112 + bottomInset, gap: 18 }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="開啟防災地圖"
        onPress={() => showComingSoon('防災地圖')}
        style={({ pressed }) => ({
          height: 166,
          overflow: 'hidden',
          borderRadius: 28,
          borderCurve: 'continuous',
          backgroundColor: '#FFFFFF',
          boxShadow: pressed ? '0 3px 10px rgba(15,23,42,0.08)' : '0 8px 24px rgba(15,23,42,0.06)',
          transform: [{ scale: pressed ? 0.985 : 1 }],
        })}
      >
        <LinearGradient
          colors={['#FFFFFF', '#FFFCF1', '#FDECC3']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ position: 'absolute', inset: 0 }}
        />
        <View style={{ position: 'absolute', right: -20, top: 22, width: 230, height: 1, backgroundColor: 'rgba(245,158,11,0.16)', transform: [{ rotate: '-18deg' }] }} />
        <View style={{ position: 'absolute', right: -28, top: 75, width: 250, height: 1, backgroundColor: 'rgba(59,130,246,0.12)', transform: [{ rotate: '12deg' }] }} />
        <View style={{ position: 'absolute', right: 68, top: -20, width: 1, height: 220, backgroundColor: 'rgba(148,163,184,0.13)', transform: [{ rotate: '24deg' }] }} />
        <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 24 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 12 }}>
            <Map size={21} color="#F59E0B" strokeWidth={2.4} />
            <Text style={{ color: '#D98B08', fontSize: 11, fontWeight: '700', letterSpacing: 1.5 }}>INTERACTIVE MAP</Text>
          </View>
          <Text style={{ color: '#172033', fontSize: 30, lineHeight: 36, fontWeight: '700', marginBottom: 8 }}>防災地圖</Text>
          <Text style={{ color: '#768399', fontSize: 14 }}>查看避難所、AED 與災害潛勢</Text>
        </View>
        <View style={{ position: 'absolute', right: 24, top: 48, width: 66, height: 66, borderRadius: 20, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.90)', boxShadow: '0 6px 18px rgba(180,120,0,0.14)' }}>
          <Navigation size={31} color="#F59E0B" strokeWidth={2.4} />
        </View>
      </Pressable>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>
        {responseItems.map((item) => {
          const Icon = item.icon;
          return (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              accessibilityLabel={item.label}
              onPress={() => showComingSoon(item.label)}
              style={({ pressed }) => ({
                width: '48%',
                minHeight: 156,
                flexGrow: 1,
                alignItems: 'center',
                justifyContent: 'center',
                gap: 18,
                borderRadius: 26,
                borderCurve: 'continuous',
                borderWidth: 1,
                borderColor: '#F1F5F9',
                backgroundColor: '#FFFFFF',
                boxShadow: pressed ? '0 2px 8px rgba(15,23,42,0.06)' : '0 5px 16px rgba(15,23,42,0.04)',
                transform: [{ scale: pressed ? 0.97 : 1 }],
              })}
            >
              <View style={{ width: 72, height: 72, alignItems: 'center', justifyContent: 'center', borderRadius: 22, borderCurve: 'continuous', backgroundColor: item.background }}>
                <Icon size={34} color={item.color} strokeWidth={2.3} />
              </View>
              <Text style={{ color: '#263247', fontSize: 16, fontWeight: '700' }}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}
