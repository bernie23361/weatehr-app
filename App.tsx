import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { WeatherHomeScreen } from '@/screens/weather-home-screen';

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <WeatherHomeScreen />
    </SafeAreaProvider>
  );
}
