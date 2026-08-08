import { memo } from 'react';
import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import type { WeatherSceneOutput } from '../types';

export const TerrainLayer = memo(({scene}:{scene:WeatherSceneOutput}) => <View style={{position:'absolute',left:0,right:0,bottom:-scene.terrain.verticalOffset,height:'38%'}}>
  <View style={{position:'absolute',inset:0,transform:[{translateY:-5}],filter:[{blur:scene.terrain.blur*1.25}]}}>
    <Svg width="100%" height="100%" viewBox="0 0 430 120" preserveAspectRatio="none">
      <Path d="M-8 86 C18 75 30 60 53 63 C72 66 82 49 102 45 C124 41 139 70 162 64 C184 58 196 39 221 48 C245 57 260 68 281 57 C303 46 315 30 341 42 C367 54 384 47 405 58 C420 66 435 69 443 71 V125 H-8Z" fill={scene.palette.mountainFar} opacity={scene.terrain.farMountainOpacity}/>
    </Svg>
  </View>
  <View style={{position:'absolute',inset:0,transform:[{translateY:9}],filter:[{blur:scene.terrain.blur*.38}]}}>
    <Svg width="100%" height="100%" viewBox="0 0 430 120" preserveAspectRatio="none">
      <Path d="M-8 95 C18 89 39 68 61 70 C80 72 93 84 112 78 C135 70 146 55 169 60 C191 65 204 87 228 82 C251 77 265 61 287 65 C310 69 324 86 347 81 C370 76 386 60 409 67 C423 71 435 79 443 82 V125 H-8Z" fill={scene.palette.mountainNear} opacity={scene.terrain.nearMountainOpacity}/>
    </Svg>
  </View>
  <LinearGradient colors={['rgba(255,255,255,0)',scene.palette.fogTint]} locations={[0,.92]} style={{position:'absolute',left:0,right:0,bottom:0,height:'48%',opacity:Math.min(.78,scene.atmosphere.fogOpacity+(.48-scene.atmosphere.visibilityFactor)*.45)}}/>
</View>);
