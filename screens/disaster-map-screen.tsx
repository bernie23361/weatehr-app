import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, Text, View, useWindowDimensions } from 'react-native';
import Svg, { G, Line, Path } from 'react-native-svg';
import { MAP_VIEWBOX, taiwanCounties } from '@/data/taiwan-map';

const VB_W = MAP_VIEWBOX.w;
const VB_H = MAP_VIEWBOX.h;
const MIN_SCALE = 1;
const MAX_SCALE = 4;

const intensityLegend = [
  { color: '#5f1a50', label: '7級' },
  { color: '#9b0f4a', label: '6強' },
  { color: '#d80d3f', label: '6弱' },
  { color: '#ef123a', label: '5強' },
  { color: '#f15a42', label: '5弱' },
  { color: '#f6aa1c', label: '4級' },
  { color: '#ffff28', label: '3級' },
  { color: '#00e63a', label: '2級' },
  { color: '#24d8d8', label: '1級' },
  { color: '#94a3b8', label: '0級' },
];

const STATUS_NORMAL = { text: '無顯著地震', color: '#16A34A' };

interface Transform {
  s: number;
  x: number;
  y: number;
}

interface GestureState {
  mode: 'none' | 'pan' | 'pinch';
  lastX: number;
  lastY: number;
  pinchStartDist: number;
  startTf: Transform;
}

const pad = (n: number) => String(n).padStart(2, '0');

export function DisasterMapScreen({ bottomInset }: { bottomInset: number }) {
  const { width: screenWidth } = useWindowDimensions();
  const containerWidth = Math.min(screenWidth, 430);
  const cardWidth = containerWidth - 32;
  const cardHeight = (cardWidth * VB_H) / VB_W;
  const userPerPx = VB_W / cardWidth;

  const [tf, setTf] = useState<Transform>({ s: 1, x: 0, y: 0 });
  const tfRef = useRef<Transform>(tf);
  const updateTf = useCallback((next: Transform) => {
    tfRef.current = next;
    setTf(next);
  }, []);

  const clamp = useCallback((v: number, min: number, max: number) => Math.min(Math.max(v, min), max), []);
  const clampTf = useCallback((next: Transform): Transform => {
    const s = clamp(next.s, MIN_SCALE, MAX_SCALE);
    const x = clamp(next.x, VB_W * (1 - s), 0);
    const y = clamp(next.y, VB_H * (1 - s), 0);
    return { s, x, y };
  }, [clamp]);

  const gesture = useRef<GestureState>({ mode: 'none', lastX: 0, lastY: 0, pinchStartDist: 0, startTf: { s: 1, x: 0, y: 0 } });

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (evt) => {
      const touches = evt.nativeEvent.touches;
      const g = gesture.current;
      if (touches.length >= 2) {
        g.mode = 'pinch';
        g.pinchStartDist = Math.hypot(touches[0].pageX - touches[1].pageX, touches[0].pageY - touches[1].pageY);
        g.startTf = { ...tfRef.current };
      } else {
        g.mode = 'pan';
        g.lastX = touches[0].pageX;
        g.lastY = touches[0].pageY;
      }
    },
    onPanResponderMove: (evt) => {
      const touches = evt.nativeEvent.touches;
      const g = gesture.current;
      if (g.mode === 'pan' && touches.length === 1) {
        const dx = touches[0].pageX - g.lastX;
        const dy = touches[0].pageY - g.lastY;
        g.lastX = touches[0].pageX;
        g.lastY = touches[0].pageY;
        const cur = tfRef.current;
        updateTf(clampTf({ ...cur, x: cur.x + dx * userPerPx, y: cur.y + dy * userPerPx }));
      } else if (g.mode === 'pinch' && touches.length >= 2) {
        const dist = Math.hypot(touches[0].pageX - touches[1].pageX, touches[0].pageY - touches[1].pageY);
        const s0 = g.startTf.s;
        const s = clamp(s0 * (dist / g.pinchStartDist), MIN_SCALE, MAX_SCALE);
        const cx = VB_W / 2;
        const cy = VB_H / 2;
        const preX = (cx - g.startTf.x) / s0;
        const preY = (cy - g.startTf.y) / s0;
        updateTf(clampTf({ s, x: cx - s * preX, y: cy - s * preY }));
      }
    },
    onPanResponderRelease: () => { gesture.current.mode = 'none'; },
    onPanResponderTerminate: () => { gesture.current.mode = 'none'; },
  }), [clamp, clampTf, updateTf, userPerPx]);

  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const dateText = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const timeText = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

  return (
    <View style={{ flex: 1, alignItems: 'center', paddingTop: 12, paddingBottom: 12 + bottomInset }}>
      <View style={{ width: cardWidth, height: cardHeight, borderRadius: 28, overflow: 'hidden', backgroundColor: '#E8F0F8' }}>
        <Svg width={cardWidth} height={cardHeight} viewBox={`0 0 ${VB_W} ${VB_H}`} {...panResponder.panHandlers}>
          <G transform={`translate(${tf.x} ${tf.y}) scale(${tf.s})`}>
            {taiwanCounties.map((county) => (
              <Path key={county.id} d={county.d} fill="#e2e8f0" stroke="#94a3b8" strokeWidth={0.7} />
            ))}
          </G>
        </Svg>

        <View style={{ position: 'absolute', top: 14, left: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Text style={{ color: '#475569', fontSize: 11, fontWeight: '600' }}>{dateText}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <View style={{ width: 7, height: 7, borderRadius: 999, backgroundColor: STATUS_NORMAL.color }} />
              <Text style={{ color: STATUS_NORMAL.color, fontSize: 11, fontWeight: '700' }}>{STATUS_NORMAL.text}</Text>
            </View>
          </View>
          <Text style={{ color: '#1E293B', fontSize: 16, fontWeight: '700', marginTop: 2 }}>{timeText}</Text>
        </View>

        <View style={{ position: 'absolute', right: 12, bottom: 12, backgroundColor: 'rgba(255,255,255,0.85)', borderRadius: 14, paddingHorizontal: 10, paddingVertical: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 5 }}>
            <Svg width={10} height={10} viewBox="0 0 12 12">
              <Line x1={2} y1={2} x2={10} y2={10} stroke="#ef4444" strokeWidth={2.4} strokeLinecap="round" />
              <Line x1={10} y1={2} x2={2} y2={10} stroke="#ef4444" strokeWidth={2.4} strokeLinecap="round" />
            </Svg>
            <Text style={{ color: '#334155', fontSize: 10, fontWeight: '700' }}>震央</Text>
          </View>
          <View style={{ height: 1, backgroundColor: 'rgba(100,116,139,0.25)', marginVertical: 5 }} />
          <Text style={{ color: '#64748B', fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 4 }}>震度</Text>
          {intensityLegend.map((item) => (
            <View key={item.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginVertical: 1 }}>
              <View style={{ width: 9, height: 9, borderRadius: 999, backgroundColor: item.color }} />
              <Text style={{ color: '#64748B', fontSize: 9, fontWeight: '600' }}>{item.label}</Text>
            </View>
          ))}
        </View>
      </View>

      <Text style={{ color: '#94A3B8', fontSize: 11, marginTop: 10 }}>拖曳平移 · 雙指縮放</Text>
    </View>
  );
}
