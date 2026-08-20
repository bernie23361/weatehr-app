import { Linking, Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { Check, Gauge, MapPin, Moon, RefreshCw, Settings, Sun } from 'lucide-react-native';
import type { ReactNode } from 'react';
import type { AppearanceMode, AppSettings, WeatherRefreshIntervalMinutes } from '@/services/app-settings';

const refreshIntervals: WeatherRefreshIntervalMinutes[] = [15, 30, 60];

function ThemePreview({ mode, selected, onPress }: { mode: AppearanceMode; selected: boolean; onPress: () => void }) {
  const dark = mode === 'dark';
  const label = dark ? '深色' : '淺色';
  return <Pressable accessibilityRole="radio" accessibilityState={{ checked: selected }} accessibilityLabel={`${label}模式`} onPress={onPress} style={({ pressed }) => ({ flex: 1, gap: 10, padding: 10, borderRadius: 18, borderCurve: 'continuous', borderWidth: 2, borderColor: selected ? '#3B82F6' : dark ? '#334155' : '#E2E8F0', backgroundColor: dark ? '#172033' : '#F8FAFC', transform: [{ scale: pressed ? 0.98 : 1 }] })}>
    <View style={{ height: 86, overflow: 'hidden', borderRadius: 13, borderCurve: 'continuous', backgroundColor: dark ? '#0F172A' : '#FFFFFF', borderWidth: 1, borderColor: dark ? '#334155' : '#E2E8F0' }}>
      <View style={{ height: 22, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 7, backgroundColor: dark ? '#1E293B' : '#FFFFFF', borderBottomWidth: 1, borderBottomColor: dark ? '#334155' : '#F1F5F9' }}><View style={{ width: 20, height: 5, borderRadius: 99, backgroundColor: '#60A5FA' }} /><View style={{ width: 10, height: 5, borderRadius: 99, backgroundColor: dark ? '#475569' : '#CBD5E1' }} /></View>
      <View style={{ gap: 5, padding: 8 }}><View style={{ width: '45%', height: 6, borderRadius: 99, backgroundColor: dark ? '#E2E8F0' : '#334155' }} /><View style={{ width: '82%', height: 5, borderRadius: 99, backgroundColor: dark ? '#475569' : '#CBD5E1' }} /><View style={{ width: '70%', height: 5, borderRadius: 99, backgroundColor: dark ? '#334155' : '#E2E8F0' }} /><View style={{ height: 20, borderRadius: 7, backgroundColor: dark ? '#1E293B' : '#EFF6FF' }} /></View>
    </View>
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 2 }}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>{dark ? <Moon size={15} color={selected ? '#60A5FA' : '#94A3B8'} /> : <Sun size={16} color={selected ? '#2563EB' : '#64748B'} />}<Text style={{ color: selected ? (dark ? '#BFDBFE' : '#1D4ED8') : dark ? '#CBD5E1' : '#475569', fontSize: 13, fontWeight: '700' }}>{label}</Text></View><View style={{ width: 20, height: 20, alignItems: 'center', justifyContent: 'center', borderRadius: 99, borderWidth: selected ? 0 : 1.5, borderColor: dark ? '#64748B' : '#CBD5E1', backgroundColor: selected ? '#2563EB' : 'transparent' }}>{selected ? <Check size={13} color="#FFFFFF" strokeWidth={3} /> : null}</View></View>
  </Pressable>;
}

function SettingRow({ icon, title, description, children, dark }: { icon: ReactNode; title: string; description: string; children: ReactNode; dark: boolean }) {
  return <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13 }}><View style={{ width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: dark ? '#1E3A5F' : '#EFF6FF' }}>{icon}</View><View style={{ flex: 1, gap: 2 }}><Text style={{ color: dark ? '#E2E8F0' : '#334155', fontSize: 14, fontWeight: '700' }}>{title}</Text><Text style={{ color: '#94A3B8', fontSize: 11, lineHeight: 16 }}>{description}</Text></View>{children}</View>;
}

export function SettingsScreen({ value, onChange }: { value: AppSettings; onChange: (settings: AppSettings) => void }) {
  const dark = value.appearanceMode === 'dark';
  const update = <K extends keyof AppSettings>(key: K, nextValue: AppSettings[K]) => onChange({ ...value, [key]: nextValue });
  const card = dark ? '#172033' : '#FFFFFF';
  const primaryText = dark ? '#F8FAFC' : '#1E293B';
  const secondaryText = dark ? '#CBD5E1' : '#64748B';
  return <ScrollView showsVerticalScrollIndicator={false} contentInsetAdjustmentBehavior="never" style={{ backgroundColor: dark ? '#0B1120' : '#F4F7F9' }} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 120, gap: 16 }}><View style={{ padding: 20, borderRadius: 28, borderCurve: 'continuous', backgroundColor: card, boxShadow: dark ? '0 8px 24px rgba(0,0,0,0.24)' : '0 4px 20px rgba(0,0,0,0.02)' }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}><Settings size={19} color="#3B82F6" /><Text style={{ color: primaryText, fontSize: 18, fontWeight: '700' }}>設定</Text></View>
    <Text style={{ color: secondaryText, fontSize: 12, fontWeight: '700', paddingTop: 2 }}>外觀</Text><Text style={{ color: '#94A3B8', fontSize: 11, lineHeight: 16, paddingTop: 5, paddingBottom: 12 }}>選擇最適合目前環境的顯示模式</Text>
    <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', gap: 10, paddingBottom: 20 }}><ThemePreview mode="light" selected={!dark} onPress={() => update('appearanceMode', 'light')} /><ThemePreview mode="dark" selected={dark} onPress={() => update('appearanceMode', 'dark')} /></View>
    <Text style={{ color: secondaryText, fontSize: 12, fontWeight: '700' }}>天氣資料</Text>
    <SettingRow dark={dark} icon={<RefreshCw size={18} color="#3B82F6" />} title="自動更新" description="App 開啟時定期取得最新天氣資料"><Switch value={value.autoRefreshWeather} onValueChange={(v) => update('autoRefreshWeather', v)} trackColor={{ false: '#475569', true: '#60A5FA' }} thumbColor={value.autoRefreshWeather ? '#2563EB' : '#FFFFFF'} /></SettingRow>
    <View style={{ gap: 9, paddingBottom: 12, opacity: value.autoRefreshWeather ? 1 : 0.45 }}><Text style={{ color: dark ? '#E2E8F0' : '#334155', fontSize: 13, fontWeight: '700' }}>更新頻率</Text><View style={{ flexDirection: 'row', gap: 8 }}>{refreshIntervals.map((minutes) => { const selected = value.refreshIntervalMinutes === minutes; return <Pressable key={minutes} disabled={!value.autoRefreshWeather} onPress={() => update('refreshIntervalMinutes', minutes)} style={({ pressed }) => ({ flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: 11, borderWidth: 1, borderColor: selected ? '#60A5FA' : dark ? '#334155' : '#E2E8F0', backgroundColor: selected ? (dark ? '#1E3A5F' : '#EFF6FF') : pressed ? (dark ? '#1E293B' : '#F8FAFC') : card })}><Text style={{ color: selected ? (dark ? '#93C5FD' : '#2563EB') : '#64748B', fontSize: 12, fontWeight: '700' }}>{minutes} 分鐘</Text></Pressable>; })}</View></View>
    <Text style={{ color: secondaryText, fontSize: 12, fontWeight: '700', paddingTop: 4 }}>顯示與權限</Text>
    <SettingRow dark={dark} icon={<Gauge size={18} color="#3B82F6" />} title="減少動態效果" description="降低場景與介面動畫，減少耗電"><Switch value={value.reduceMotion} onValueChange={(v) => update('reduceMotion', v)} trackColor={{ false: '#475569', true: '#60A5FA' }} thumbColor={value.reduceMotion ? '#2563EB' : '#FFFFFF'} /></SettingRow>
    <SettingRow dark={dark} icon={<MapPin size={18} color="#3B82F6" />} title="定位權限" description="前往系統設定管理 App 的定位權限"><Pressable accessibilityRole="button" onPress={() => void Linking.openSettings()} style={({ pressed }) => ({ paddingHorizontal: 11, paddingVertical: 7, borderRadius: 10, backgroundColor: pressed ? (dark ? '#25466E' : '#DBEAFE') : dark ? '#1E3A5F' : '#EFF6FF' })}><Text style={{ color: dark ? '#93C5FD' : '#2563EB', fontSize: 12, fontWeight: '700' }}>開啟</Text></Pressable></SettingRow>
    <View style={{ marginTop: 6, paddingTop: 14, borderTopWidth: 1, borderTopColor: dark ? '#273449' : '#F1F5F9', gap: 4 }}><Text style={{ color: dark ? '#CBD5E1' : '#475569', fontSize: 12, fontWeight: '700' }}>天氣概況 Weather APP</Text><Text style={{ color: '#94A3B8', fontSize: 10, lineHeight: 15 }}>天氣資料來源：交通部中央氣象署開放資料</Text></View>
  </View></ScrollView>;
}
