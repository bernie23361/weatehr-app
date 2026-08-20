import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { TaiwanMap } from '@/components/taiwan-map';
import { EarthquakeLegend } from '@/components/earthquake-legend';

const alertLayerOptions = ['地震預警', '海嘯預警'] as const;
type AlertLayer = (typeof alertLayerOptions)[number];

const alertLayerConfig = {
  地震預警: {
    title: '即時地震預警',
    status: { text: '接收正常', color: '#16A34A' },
  },
  海嘯預警: {
    title: '即時海嘯預警',
    status: { text: '接收正常', color: '#16A34A' },
  },
} satisfies Record<AlertLayer, { title: string; status: { text: string; color: string } }>;

const pad = (n: number) => String(n).padStart(2, '0');

export function DisasterMapScreen({ bottomInset }: { bottomInset: number }) {
  const [selectedAlertLayer, setSelectedAlertLayer] = useState<AlertLayer>('地震預警');
  const [isAlertLayerMenuOpen, setIsAlertLayerMenuOpen] = useState(false);
  const layerConfig = alertLayerConfig[selectedAlertLayer];

  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const dateText = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const timeText = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

  return (
    <View style={{ flex: 1, overflow: 'hidden', backgroundColor: '#E8F0F8' }}>
      <TaiwanMap />

      <View pointerEvents="none" style={{ position: 'absolute', top: 14, left: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Text style={{ color: '#1E293B', fontSize: 16, lineHeight: 20, fontWeight: '700', letterSpacing: 0.2 }}>
            {layerConfig.title}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <View style={{ width: 7, height: 7, borderRadius: 999, backgroundColor: layerConfig.status.color }} />
            <Text style={{ color: layerConfig.status.color, fontSize: 11, fontWeight: '700', letterSpacing: 0.2 }}>
              {layerConfig.status.text}
            </Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 12, marginTop: 2 }}>
          <Text style={{ color: '#1E293B', fontSize: 16, lineHeight: 20, fontWeight: '700', fontVariant: ['tabular-nums'], letterSpacing: 0.2 }}>
            {dateText}
          </Text>
          <Text style={{ color: '#1E293B', fontSize: 16, lineHeight: 20, fontWeight: '700', fontVariant: ['tabular-nums'], letterSpacing: 0.2 }}>
            {timeText}
          </Text>
        </View>
      </View>

      <View style={{ position: 'absolute', top: 14, right: 16, zIndex: 10, alignItems: 'flex-end' }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="選擇預警類型"
          accessibilityState={{ expanded: isAlertLayerMenuOpen }}
          onPress={() => setIsAlertLayerMenuOpen((open) => !open)}
          style={({ pressed }) => ({
            minWidth: 104,
            height: 32,
            paddingHorizontal: 11,
            borderRadius: 11,
            borderWidth: 1,
            borderColor: '#D9E3ED',
            backgroundColor: pressed ? 'rgba(241,245,249,0.96)' : 'rgba(255,255,255,0.9)',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
          })}
        >
          <Text style={{ color: '#475569', fontSize: 11, fontWeight: '700' }}>{selectedAlertLayer}</Text>
          <Svg width={10} height={6} viewBox="0 0 10 6">
            <Path
              d={isAlertLayerMenuOpen ? 'M1 5L5 1L9 5' : 'M1 1L5 5L9 1'}
              fill="none"
              stroke="#94A3B8"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </Pressable>

        {isAlertLayerMenuOpen ? (
          <View style={{ width: 104, marginTop: 5, padding: 4, borderRadius: 12, borderWidth: 1, borderColor: '#D9E3ED', backgroundColor: 'rgba(255,255,255,0.96)' }}>
            {alertLayerOptions.map((option) => {
              const selected = option === selectedAlertLayer;
              return (
                <Pressable
                  key={option}
                  accessibilityRole="menuitem"
                  accessibilityState={{ selected }}
                  onPress={() => {
                    setSelectedAlertLayer(option);
                    setIsAlertLayerMenuOpen(false);
                  }}
                  style={({ pressed }) => ({
                    height: 30,
                    paddingHorizontal: 8,
                    borderRadius: 8,
                    justifyContent: 'center',
                    backgroundColor: selected ? '#EAF4FF' : pressed ? '#F8FAFC' : 'transparent',
                  })}
                >
                  <Text style={{ color: selected ? '#1677D2' : '#64748B', fontSize: 11, fontWeight: selected ? '700' : '600' }}>
                    {option}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}
      </View>

      <View
        style={{
          position: 'absolute',
          right: 12,
          bottom: 96 + bottomInset,
          zIndex: 10,
          transform: [{ scale: 0.78 }],
          transformOrigin: 'bottom right',
        }}
      >
        <EarthquakeLegend />
      </View>
    </View>
  );
}
