import {
  Activity,
  AlertTriangle,
  Bike,
  Car,
  Cloud,
  CloudRain,
  CupSoda,
  Dog,
  Droplets,
  Eye,
  Fish,
  Heart,
  Leaf,
  Locate,
  Map,
  Megaphone,
  Menu,
  Moon,
  Search,
  Settings,
  Shield,
  Shirt,
  Soup,
  Sprout,
  Store,
  Sun,
  Thermometer,
  Umbrella,
  User,
  Wind,
  X,
  type LucideProps,
} from 'lucide-react-native';
import { Image } from 'expo-image';
import { makinWeatherIconSources } from '@/data/weather-icon-mapping';
import type { AppWeatherIconName, WeatherIconName } from '@/types/weather';

const icons = {
  activity: Activity,
  'alert-triangle': AlertTriangle,
  bike: Bike,
  car: Car,
  cloud: Cloud,
  'cloud-rain': CloudRain,
  'cup-soda': CupSoda,
  dog: Dog,
  droplets: Droplets,
  eye: Eye,
  fish: Fish,
  heart: Heart,
  leaf: Leaf,
  locate: Locate,
  map: Map,
  megaphone: Megaphone,
  menu: Menu,
  moon: Moon,
  search: Search,
  settings: Settings,
  shield: Shield,
  shirt: Shirt,
  soup: Soup,
  sprout: Sprout,
  store: Store,
  sun: Sun,
  thermometer: Thermometer,
  umbrella: Umbrella,
  user: User,
  wind: Wind,
  x: X,
} satisfies Record<WeatherIconName, React.ComponentType<LucideProps>>;

export function WeatherIcon({ name, ...props }: LucideProps & { name: AppWeatherIconName }) {
  if (name in makinWeatherIconSources) {
    const { size = 24, style } = props;
    const iconSize = typeof size === 'number' ? size : 24;
    return <Image source={makinWeatherIconSources[name as keyof typeof makinWeatherIconSources]} contentFit="contain" accessibilityLabel={name} style={[{ width: iconSize, height: iconSize }, style as never]} />;
  }

  const Icon = icons[name as WeatherIconName];
  return <Icon {...props} />;
}
