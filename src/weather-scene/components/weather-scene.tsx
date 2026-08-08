import { memo } from 'react';
import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CloudLayer } from './cloud-layer';
import { FogLayer } from './fog-layer';
import { SkyLayer } from './sky-layer';
import { TerrainLayer } from './terrain-layer';
import type { WeatherSceneOutput } from '../types';

export const WeatherScene = memo(({scene}:{scene:WeatherSceneOutput}) => {
  const transparentTint=`${scene.surface.cardTint}00`;
  const middleTint=`${scene.surface.cardTint}${Math.round(scene.surface.cardOpacity*70).toString(16).padStart(2,'0')}`;
  const bottomTint=`${scene.surface.cardTint}${Math.round(scene.surface.cardOpacity*132).toString(16).padStart(2,'0')}`;
  return <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{position:'absolute',inset:0,overflow:'hidden'}}>
    <SkyLayer scene={scene}/>
    {scene.qualityTier!=='low'?<CloudLayer kind="high" config={scene.clouds.high} color={scene.palette.cloudLight} shadow={scene.palette.cloudShadow}/>:null}
    <CloudLayer kind="middle" config={scene.clouds.middle} color={scene.palette.cloudLight} shadow={scene.palette.cloudShadow}/>
    {scene.qualityTier==='high'?<CloudLayer kind="low" config={scene.clouds.low} color={scene.palette.cloudLight} shadow={scene.palette.cloudShadow}/>:null}
    <TerrainLayer scene={scene}/>
    <FogLayer scene={scene}/>
    <View style={{position:'absolute',inset:0,backgroundColor:scene.surface.cardTint,opacity:.1}}/>
    <LinearGradient
      colors={[transparentTint,middleTint,bottomTint]}
      locations={[0, .54, 1]}
      style={{position:'absolute',inset:0}}
    />
  </View>;
});
