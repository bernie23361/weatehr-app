import { SafeAreaProvider } from 'react-native-safe-area-context';
import { WeatherHomeScreen } from '@/screens/weather-home-screen';
import { installThemeRuntime } from '@/services/theme-runtime';

installThemeRuntime();

export default function App() {
  return (
    <SafeAreaProvider>
      <WeatherHomeScreen />
    </SafeAreaProvider>
  );
}
