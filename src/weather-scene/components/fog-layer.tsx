import { memo } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import type { WeatherSceneOutput } from '../types';

export const FogLayer = memo(({scene}:{scene:WeatherSceneOutput}) => <LinearGradient colors={['rgba(255,255,255,0)',scene.palette.fogTint,scene.palette.fogTint]} locations={[0,.55,1]} style={{position:'absolute',inset:0,opacity:scene.atmosphere.fogOpacity+scene.atmosphere.hazeOpacity*.24}} />);

