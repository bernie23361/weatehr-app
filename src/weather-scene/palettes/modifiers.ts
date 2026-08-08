import type { Region, Season, TerrainType, WeatherCondition } from '../types';

export interface VisualModifier { lightness: number; saturation: number; warmth: number; haze: number }
export const regionalModifiers: Record<Region, VisualModifier> = {
  north:{lightness:-.01,saturation:-.05,warmth:-.02,haze:.12}, central:{lightness:.025,saturation:.015,warmth:.015,haze:.1}, south:{lightness:.035,saturation:.02,warmth:.055,haze:.08}, east:{lightness:.015,saturation:.045,warmth:0,haze:-.08}, penghu:{lightness:.04,saturation:.035,warmth:.02,haze:-.03}, kinmen:{lightness:0,saturation:-.02,warmth:.02,haze:.08}, matsu:{lightness:-.025,saturation:-.07,warmth:-.05,haze:.12},
};
export const seasonalModifiers: Record<Season, VisualModifier> = {
  spring:{lightness:.01,saturation:-.01,warmth:.01,haze:.06}, summer:{lightness:.045,saturation:.035,warmth:.025,haze:.035}, autumn:{lightness:.01,saturation:.015,warmth:.02,haze:-.015}, winter:{lightness:-.025,saturation:-.075,warmth:-.045,haze:.08},
};
export const terrainModifiers: Record<TerrainType, VisualModifier> = {
  basin:{lightness:-.005,saturation:-.025,warmth:.005,haze:.16}, 'coastal-plain':{lightness:.02,saturation:.005,warmth:.015,haze:.05}, 'mountain-valley':{lightness:-.01,saturation:.035,warmth:-.01,haze:.05}, 'east-coast':{lightness:.02,saturation:.04,warmth:0,haze:-.06}, 'offshore-island':{lightness:.025,saturation:.02,warmth:0,haze:-.025},
};
export const conditionModifiers: Record<WeatherCondition, VisualModifier> = {
  sunny:{lightness:.035,saturation:.045,warmth:.015,haze:-.04}, 'mostly-sunny':{lightness:.02,saturation:.025,warmth:.01,haze:-.015}, 'partly-cloudy':{lightness:.005,saturation:0,warmth:0,haze:.02}, cloudy:{lightness:-.035,saturation:-.07,warmth:-.015,haze:.08}, overcast:{lightness:-.075,saturation:-.13,warmth:-.025,haze:.13}, drizzle:{lightness:-.07,saturation:-.12,warmth:-.03,haze:.18}, rain:{lightness:-.105,saturation:-.15,warmth:-.04,haze:.2}, 'heavy-rain':{lightness:-.16,saturation:-.19,warmth:-.055,haze:.25}, thunderstorm:{lightness:-.2,saturation:-.21,warmth:-.06,haze:.27}, fog:{lightness:.045,saturation:-.22,warmth:0,haze:.35}, haze:{lightness:-.015,saturation:-.18,warmth:.065,haze:.3}, windy:{lightness:.01,saturation:.005,warmth:-.005,haze:-.02},
};
