import { Modal, Pressable, Text, View } from 'react-native';
import type { SceneQualityPreference } from '@/src/weather-scene/types';

const options:{id:SceneQualityPreference;label:string;description:string}[]=[
  {id:'auto',label:'自動',description:'依系統的減少動態效果設定調整'},
  {id:'power-saver',label:'省電',description:'單層雲與最低動畫負載'},
  {id:'standard',label:'標準',description:'多層大氣與簡化地景'},
  {id:'high',label:'高畫質',description:'完整雲層、山景與霧層'},
];

export function SceneQualityModal({open,value,onChange,onClose}:{open:boolean;value:SceneQualityPreference;onChange:(value:SceneQualityPreference)=>void;onClose:()=>void}){
  return <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
    <Pressable onPress={onClose} style={{flex:1,justifyContent:'center',padding:24,backgroundColor:'rgba(15,23,42,.42)'}}>
      <Pressable onPress={()=>{}} style={{backgroundColor:'#FFFFFF',borderRadius:28,padding:22,boxShadow:'0 16px 40px rgba(0,0,0,.18)'}}>
        <Text style={{fontSize:18,fontWeight:'700',color:'#1E293B',marginBottom:4}}>天氣場景畫質</Text>
        <Text style={{fontSize:12,color:'#94A3B8',marginBottom:18}}>IWESR 台灣大氣色系模組</Text>
        <View style={{gap:10}}>{options.map(option=><Pressable key={option.id} onPress={()=>onChange(option.id)} style={{padding:14,borderRadius:16,borderWidth:1,borderColor:value===option.id?'#60A5FA':'#E2E8F0',backgroundColor:value===option.id?'#EFF6FF':'#FFFFFF'}}>
          <Text style={{fontSize:15,fontWeight:'600',color:value===option.id?'#2563EB':'#334155'}}>{option.label}</Text>
          <Text style={{fontSize:11,color:'#94A3B8',marginTop:3}}>{option.description}</Text>
        </Pressable>)}</View>
        <Pressable onPress={onClose} style={{marginTop:18,paddingVertical:12,borderRadius:12,alignItems:'center',backgroundColor:'#F1F5F9'}}><Text style={{fontSize:14,fontWeight:'600',color:'#475569'}}>完成</Text></Pressable>
      </Pressable>
    </Pressable>
  </Modal>;
}
