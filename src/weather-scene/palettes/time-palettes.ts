import type { ScenePalette, TimePhase } from '../types';

export const timePalettes: Record<TimePhase, ScenePalette> = {
  'pre-dawn': { skyTop:'#17243b', skyMid:'#33465e', horizon:'#667184', ambientLight:'#66758b', cloudLight:'#697789', cloudShadow:'#273548', mountainNear:'#263645', mountainFar:'#485766', cityTint:'#34404e', fogTint:'#aeb8c0' },
  dawn: { skyTop:'#7e9eb8', skyMid:'#b8c8d1', horizon:'#e6d8ca', ambientLight:'#d8d4ce', cloudLight:'#e7e4df', cloudShadow:'#8797a4', mountainNear:'#657a83', mountainFar:'#a5afb0', cityTint:'#6c777b', fogTint:'#e5e7e5' },
  morning: { skyTop:'#86bee1', skyMid:'#b9d9e9', horizon:'#edf1ee', ambientLight:'#eaf2f4', cloudLight:'#f8faf9', cloudShadow:'#a9bec9', mountainNear:'#668894', mountainFar:'#a5bdc3', cityTint:'#70878d', fogTint:'#edf2f1' },
  noon: { skyTop:'#72b9e4', skyMid:'#add6ea', horizon:'#eff4f2', ambientLight:'#f2f7f5', cloudLight:'#ffffff', cloudShadow:'#a5bbc6', mountainNear:'#5d8490', mountainFar:'#a2bcc3', cityTint:'#6c858c', fogTint:'#f0f4f2' },
  afternoon: { skyTop:'#79b8dc', skyMid:'#b7d4df', horizon:'#eee9df', ambientLight:'#f0eee8', cloudLight:'#faf8f2', cloudShadow:'#a9b6bb', mountainNear:'#66848a', mountainFar:'#a9b7b6', cityTint:'#758486', fogTint:'#eeece7' },
  sunset: { skyTop:'#7896b0', skyMid:'#c2b8aa', horizon:'#ead0ad', ambientLight:'#e6d6c2', cloudLight:'#ecdcc8', cloudShadow:'#8d8684', mountainNear:'#5e6670', mountainFar:'#9d9995', cityTint:'#6e6d70', fogTint:'#ddd5ca' },
  twilight: { skyTop:'#44546e', skyMid:'#74788a', horizon:'#b59e91', ambientLight:'#98949a', cloudLight:'#aaa4a5', cloudShadow:'#4b5362', mountainNear:'#394451', mountainFar:'#686d78', cityTint:'#4a505a', fogTint:'#a8a5a7' },
  night: { skyTop:'#17243a', skyMid:'#26364d', horizon:'#485260', ambientLight:'#465367', cloudLight:'#566579', cloudShadow:'#202c3d', mountainNear:'#202b35', mountainFar:'#38434d', cityTint:'#303841', fogTint:'#78828a' },
  'late-night': { skyTop:'#101a2b', skyMid:'#202e42', horizon:'#3c4654', ambientLight:'#3b475a', cloudLight:'#48576a', cloudShadow:'#182333', mountainNear:'#19242d', mountainFar:'#303b45', cityTint:'#283039', fogTint:'#69737c' },
};

