import { memo } from 'react';
import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { WeatherSceneOutput } from '../types';

export const SkyLayer = memo(({scene}:{scene:WeatherSceneOutput}) => <>
  <LinearGradient colors={[scene.palette.skyTop,scene.palette.skyMid,scene.palette.horizon]} locations={[0,.48,1]} style={{position:'absolute',inset:0}} />
  <LinearGradient colors={['rgba(255,255,255,0)',scene.palette.horizon,'rgba(255,255,255,0)']} start={{x:0,y:0}} end={{x:1,y:0}} style={{position:'absolute',left:0,right:0,bottom:'8%',height:'22%',opacity:scene.atmosphere.horizonGlowOpacity}} />
  <View style={{position:'absolute',inset:0,backgroundColor:scene.palette.ambientLight,opacity:Math.max(0,(1-scene.lighting.contrast)*.28)}} />
</>);

