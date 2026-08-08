import { memo } from 'react';
import { View } from 'react-native';
import Svg, { Ellipse, Path } from 'react-native-svg';
import type { CloudLayerConfig } from '../types';

export const CloudLayer = memo(({config,kind,color,shadow}:{config:CloudLayerConfig;kind:'high'|'middle'|'low';color:string;shadow:string}) => {
  if(!config.enabled) return null;
  const top=kind==='high'?'6%':kind==='middle'?'24%':'42%';
  const height=kind==='high'?48:kind==='middle'?66:78;
  return <View style={{position:'absolute',left:'-8%',right:'-8%',top,height,opacity:config.opacity,transform:[{scale:config.scale},{rotate:`${(config.directionDeg-90)*.025}deg`} ]}}>
    <Svg width="100%" height="100%" viewBox="0 0 430 90" preserveAspectRatio="none">
      {kind==='high'?<Path d="M-20 50 C50 9 103 54 165 26 S285 46 455 18 L455 68 C330 57 260 74 150 61 S45 78-20 68Z" fill={color}/>:null}
      {kind==='middle'?<><Ellipse cx="90" cy="48" rx="92" ry="27" fill={color}/><Ellipse cx="218" cy="36" rx="112" ry="34" fill={color}/><Ellipse cx="360" cy="54" rx="104" ry="25" fill={color}/></>:null}
      {kind==='low'?<><Path d="M-15 52 Q55 18 122 51 T264 47 T450 45 V90 H-15Z" fill={shadow}/><Ellipse cx="148" cy="40" rx="95" ry="31" fill={color}/><Ellipse cx="333" cy="45" rx="122" ry="35" fill={color}/></>:null}
    </Svg>
  </View>;
});

