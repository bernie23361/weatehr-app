import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

const DISASTER_MAP_ICON_PATH = 'M2 5L9 2L15 5L21.303 2.2987C21.5569 2.18992 21.8508 2.30749 21.9596 2.56131C21.9862 2.62355 22 2.69056 22 2.75827V19L15 22L9 19L2.69696 21.7013C2.44314 21.8101 2.14921 21.6925 2.04043 21.4387C2.01375 21.3765 2 21.3094 2 21.2417V5ZM16 19.3955L20 17.6812V5.03308L16 6.74736V19.3955ZM14 19.2639V6.73607L10 4.73607V17.2639L14 19.2639ZM8 17.2526V4.60451L4 6.31879V18.9669L8 17.2526Z';

const GPS_LOCATION_PATH = 'M2.89945 2.29983L21.7052 8.56842C21.9672 8.65574 22.1088 8.93891 22.0215 9.20088C21.975 9.3404 21.8694 9.45238 21.7328 9.507L13.0002 13.0001L8.57501 21.8504C8.45151 22.0974 8.15118 22.1975 7.90419 22.074C7.77883 22.0113 7.68553 21.8989 7.64703 21.7641L2.26058 2.91153C2.18472 2.64601 2.33846 2.36927 2.60398 2.29341C2.70087 2.26573 2.80386 2.26796 2.89945 2.29983Z';

const TYPHOON_PATH = 'M17.6544 1.70001L14.8716 4.23315C16.147 4.62331 17.3453 5.28102 18.3612 6.20626C21.8744 9.40606 21.8744 14.594 18.3612 17.7938C15.7696 20.1542 11.7644 21.6563 6.3456 22.3L9.12838 19.7669C7.85304 19.3767 6.65466 18.719 5.6388 17.7938C2.1256 14.594 2.1048 9.42501 5.6388 6.20626C8.2304 3.84585 12.2356 2.34376 17.6544 1.70001ZM12 8.00001C9.51472 8.00001 7.5 9.79087 7.5 12C7.5 14.2092 9.51472 16 12 16C14.4853 16 16.5 14.2092 16.5 12C16.5 9.79087 14.4853 8.00001 12 8.00001Z';

const EARTHQUAKE_PATH = 'M11.3273 1.6115C11.677 1.29365 12.1956 1.26716 12.5734 1.53204L12.6727 1.6115L23 11H20V20C20 20.5128 19.614 20.9355 19.1166 20.9933L19 21H12.5L15 17L11.5 14L15.5 11L13 8.99998L13.5 5.99998L10.5 8.99998L13 11L8 14L11.75 17.5L8.5 21H5C4.48716 21 4.06449 20.6139 4.00673 20.1166L4 20V11H1L11.3273 1.6115Z';

const FLOOD_PATH = 'M16.0001 17.4723C17.0616 18.4223 18.4634 19 20 19H22V21H20C18.5428 21 17.1766 20.6104 15.9998 19.9296C14.8242 20.6101 13.4576 21 12 21C10.5428 21 9.17657 20.6104 7.99984 19.9296C6.8242 20.6101 5.45763 21 4 21H2V19H4C5.53713 19 6.93925 18.422 8.00013 17.4723C9.06163 18.4223 10.4634 19 12 19C13.5371 19 14.9393 18.422 16.0001 17.4723ZM12.5734 1.53204L12.6727 1.6115L23 11H20V17C18.3643 17 16.912 16.2145 15.9998 15.0002C15.088 16.2145 13.6357 17 12 17C10.3643 17 8.91199 16.2145 7.99978 15.0002C7.08801 16.2145 5.63573 17 4 17L3.999 10.9994L1 11L11.3273 1.6115C11.6452 1.32254 12.1027 1.27439 12.4671 1.46702L12.5734 1.53204Z';

const FIRE_PATH = 'M12 23C7.85786 23 4.5 19.6421 4.5 15.5C4.5 13.3462 5.40786 11.4045 6.86179 10.0366C8.20403 8.77375 11.5 6.49951 11 1.5C17 5.5 20 9.5 14 15.5C15 15.5 16.5 15.5 19 13.0296C19.2697 13.8032 19.5 14.6345 19.5 15.5C19.5 19.6421 16.1421 23 12 23Z';

const MOUNTAIN_PATH = 'M8.701 5.75c.577-1 2.02-1 2.598 0l3.5 6.062.902-1.562c.577-1 2.02-1 2.598 0l4.33 7.5A1.5 1.5 0 0 1 21.33 20H17v-.002l-.072.002H3.072a1.5 1.5 0 0 1-1.3-2.25zm-.91 5.576.709.472.945-.63a1 1 0 0 1 1.11 0l.945.63.709-.472L10 7.5z';

const TSUNAMI_PATH = 'M18.67 17.63c-3.8 2.8-6.12.4-6.67 0-.66.49-2.92 2.76-6.67 0C3.43 19.03 2.65 19 2 19v2c1.16 0 2.3-.32 3.33-.93a6.54 6.54 0 0 0 6.67 0 6.54 6.54 0 0 0 6.67 0c1.03.61 2.17.93 3.33.93v-2c-.66 0-1.5-.02-3.33-1.37M19.33 12H22v-2h-2.67C17.5 10 16 8.5 16 6.67c0-1.02.38-1.74 1.09-3.34-1.37-.21-2-.33-3.09-.33C7.36 3 2.15 8.03 2.01 14.5l-.01 2c1.16 0 2.3-.32 3.33-.93a6.54 6.54 0 0 0 6.67 0 6.54 6.54 0 0 0 6.67 0c1.03.61 2.17.93 3.33.93v-2c-.66 0-1.5-.02-3.33-1.37-3.8 2.8-6.12.4-6.67 0-.9.67-.54.41-.91.63-.7-.94-1.09-2.06-1.09-3.26 0-2.58 1.77-4.74 4.21-5.33-.13.51-.21 1.02-.21 1.5C14 9.61 16.39 12 19.33 12';

const VOLCANO_PATH = 'M27.149 3.2a1.6 1.6 0 0 0-1.2.602l-5.309 6.636-5.14-4.876c-1.394-1.28-3.468.496-2.412 2.07l5.331 7.68a1.6 1.6 0 0 0 2.57.083c.531-.672 1.411-2.17 3.011-2.17s2.538 1.569 3.011 2.17a1.6 1.6 0 0 0 2.282.23l5.337-4.48c1.412-1.2 0-3.436-1.686-2.681L28.8 10.326V4.8a1.6 1.6 0 0 0-1.651-1.6M16 19.2 6.643 38.157c-.243.246-.243.739-.243 1.232 0 1.721 1.229 2.211 2.211 2.211H39.39c1.229 0 2.211-.49 2.211-2.211 0-.493 0-.74-.243-1.232L32 19.2c-1.6 0-3.2 1.6-3.2 3.2V24a1.6 1.6 0 1 1-3.2 0v-1.6a1.6 1.6 0 1 0-3.2 0v6.4a1.6 1.6 0 1 1-3.2 0v-6.4c0-1.6-1.6-3.2-3.2-3.2';

const NUCLEAR_PATH = 'M256 31c-26.498 0-79.5 26.92-79.5 53.844S203.003 165.62 256 219.47c52.997-53.85 79.5-107.702 79.5-134.626S282.498 31 256 31m1.53 215.406A52.997 53.847 0 0 0 203 300.25a52.997 53.847 0 0 0 106 0 52.997 53.847 0 0 0-51.47-53.844m-166.155 80.47c-26.704.12-47.245 4.393-58.72 11.124-22.947 13.462-19.373 73.558-6.124 96.875s62.678 56.493 85.626 43.03c22.95-13.46 55.602-63.722 75-137.28-36.197-9.855-69.077-13.87-95.78-13.75zm329.25 0c-26.704-.122-59.584 3.894-95.78 13.75 19.397 73.557 52.05 123.818 75 137.28 22.947 13.462 72.375-19.714 85.624-43.03 13.248-23.318 16.822-83.414-6.126-96.876-11.474-6.73-32.015-11.004-58.72-11.125z';

const WAR_PATH = 'M208,40H48A16,16,0,0,0,32,56v56c0,52.72,25.52,84.67,46.93,102.19,23.06,18.86,46,25.27,47,25.53a8,8,0,0,0,4.2,0c1-.26,23.91-6.67,47-25.53C198.48,196.67,224,164.72,224,112V56A16,16,0,0,0,208,40ZM120,96a8,8,0,0,1,16,0v40a8,8,0,0,1-16,0Zm8,88a12,12,0,1,1,12-12A12,12,0,0,1,128,184Z';

const TERRORISM_PATH = 'M248,32h0a8,8,0,0,0-8,8,52.66,52.66,0,0,1-3.57,17.39C232.38,67.22,225.7,72,216,72c-11.06,0-18.85-9.76-29.49-24.65C176,32.66,164.12,16,144,16c-16.39,0-29,8.89-35.43,25a66.07,66.07,0,0,0-3.9,15H88A16,16,0,0,0,72,72v9.59A88,88,0,0,0,112,248h1.59A88,88,0,0,0,152,81.59V72a16,16,0,0,0-16-16H120.88a46.76,46.76,0,0,1,2.69-9.37C127.62,36.78,134.3,32,144,32c11.06,0,18.85,9.76,29.49,24.65C184,71.34,195.88,88,216,88c16.39,0,29-8.89,35.43-25A68.69,68.69,0,0,0,256,40,8,8,0,0,0,248,32ZM111.89,209.32A8,8,0,0,1,104,216a8.52,8.52,0,0,1-1.33-.11,57.5,57.5,0,0,1-46.57-46.57,8,8,0,1,1,15.78-2.64,41.29,41.29,0,0,0,33.43,33.43A8,8,0,0,1,111.89,209.32Z';

function TyphoonIcon({ size = 34, color = '#3182F6' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d={TYPHOON_PATH} />
    </Svg>
  );
}

function EarthquakeIcon({ size = 34, color = '#F59E0B' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d={EARTHQUAKE_PATH} />
    </Svg>
  );
}

function FloodIcon({ size = 34, color = '#3B82F6' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d={FLOOD_PATH} />
    </Svg>
  );
}

function FireIcon({ size = 34, color = '#F43F5E' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d={FIRE_PATH} />
    </Svg>
  );
}

function MountainIcon({ size = 34, color = '#A16207' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d={MOUNTAIN_PATH} />
    </Svg>
  );
}

function TsunamiIcon({ size = 34, color = '#0891B2' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d={TSUNAMI_PATH} />
    </Svg>
  );
}

function VolcanoIcon({ size = 34, color = '#EA580C' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" fill={color}>
      <Path d={VOLCANO_PATH} />
    </Svg>
  );
}

function NuclearIcon({ size = 34, color = '#84A112' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" fill={color}>
      <Path d={NUCLEAR_PATH} transform="scale(0.09375)" />
    </Svg>
  );
}

function WarIcon({ size = 34, color = '#64748B' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 256 256" fill={color}>
      <Path d={WAR_PATH} />
    </Svg>
  );
}

function TerrorismIcon({ size = 34, color = '#7C3AED' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 256 256" fill={color}>
      <Path d={TERRORISM_PATH} />
    </Svg>
  );
}

function DisasterMapIcon({ size = 21, color = '#F59E0B' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d={DISASTER_MAP_ICON_PATH} />
    </Svg>
  );
}

function GpsLocationIcon({ size = 31, color = '#F59E0B' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d={GPS_LOCATION_PATH} />
    </Svg>
  );
}

const responseItems = [
  { id: 'typhoon', label: '颱風準備', icon: TyphoonIcon, color: '#3182F6', background: '#EAF4FF' },
  { id: 'earthquake', label: '地震應變', icon: EarthquakeIcon, color: '#F59E0B', background: '#FFF8E6' },
  { id: 'tsunami', label: '海嘯應變', icon: TsunamiIcon, color: '#0891B2', background: '#E6FAFC' },
  { id: 'fire', label: '火災應變', icon: FireIcon, color: '#F43F5E', background: '#FFF0F3' },
  { id: 'flood', label: '水災應變', icon: FloodIcon, color: '#3B82F6', background: '#EEF6FF' },
  { id: 'landslide', label: '土災應變', icon: MountainIcon, color: '#A16207', background: '#FFF7E8' },
  { id: 'volcano', label: '火山應變', icon: VolcanoIcon, color: '#EA580C', background: '#FFF1E8' },
  { id: 'nuclear', label: '核災應變', icon: NuclearIcon, color: '#84A112', background: '#F5F9E8' },
  { id: 'war', label: '戰爭應變', icon: WarIcon, color: '#64748B', background: '#F1F5F9' },
  { id: 'terrorism', label: '人為災害應變', icon: TerrorismIcon, color: '#7C3AED', background: '#F5F0FF' },
] as const;

const showComingSoon = (title: string) => Alert.alert(title, '應變資訊內容建置中。');

export function DisasterPreparednessScreen({ bottomInset, onOpenHumanDisaster, onOpenEarthquake, onOpenTyphoon }: { bottomInset: number; onOpenHumanDisaster?: () => void; onOpenEarthquake?: () => void; onOpenTyphoon?: () => void }) {
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
        <Image
          source={{ uri: 'https://pub-8a5f0a3f447d4f1abfb165da80249e6b.r2.dev/DP-image/map.JPG' }}
          contentFit="cover"
          style={{ position: 'absolute', inset: 0, opacity: 0.86 }}
        />
        <LinearGradient
          colors={[
            '#FFFFFF',
            'rgba(255,255,255,0.98)',
            'rgba(255,255,255,0.88)',
            'rgba(255,255,255,0.50)',
            'rgba(255,255,255,0)',
          ]}
          locations={[0, 0.32, 0.52, 0.72, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ position: 'absolute', inset: 0 }}
        />
        <LinearGradient
          colors={['rgba(255,255,255,0.34)', 'rgba(255,255,255,0)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={{ position: 'absolute', inset: 0 }}
        />
        <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 24 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 12 }}>
            <DisasterMapIcon size={21} color="#F59E0B" />
            <Text style={{ color: '#D98B08', fontSize: 11, fontWeight: '700', letterSpacing: 1.5 }}>INTERACTIVE MAP</Text>
          </View>
          <Text style={{ color: '#172033', fontSize: 30, lineHeight: 36, fontWeight: '700', marginBottom: 8 }}>防災地圖</Text>
          <Text style={{ color: '#768399', fontSize: 14 }}>查看避難所、AED 與災害潛勢</Text>
        </View>
        <View style={{ position: 'absolute', right: 24, top: 48, width: 66, height: 66, borderRadius: 20, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.90)', boxShadow: '0 6px 18px rgba(180,120,0,0.14)' }}>
          <GpsLocationIcon size={31} color="#F59E0B" />
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
              onPress={() => item.id === 'terrorism' && onOpenHumanDisaster ? onOpenHumanDisaster() : item.id === 'earthquake' && onOpenEarthquake ? onOpenEarthquake() : item.id === 'typhoon' && onOpenTyphoon ? onOpenTyphoon() : showComingSoon(item.label)}
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
                <Icon size={34} color={item.color} />
              </View>
              <Text style={{ color: '#263247', fontSize: 16, fontWeight: '700' }}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}
