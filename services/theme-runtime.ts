import { processColor, StyleSheet } from 'react-native';

let darkMode = false;
let installed = false;

const darkBackgrounds: Record<string, string> = {
  '#FFFFFF': '#172033',
  '#F8FAFC': '#111827',
  '#F4F7F9': '#0B1120',
  '#F1F5F9': '#0F172A',
  '#F9FAFB': '#111827',
  '#EFF6FF': '#162B47',
  '#EEF6FF': '#162B47',
  '#EAF4FF': '#162B47',
  '#F0F7FF': '#162B47',
  '#ECFDF5': '#102A25',
  '#F0FDF4': '#102A25',
  '#FFFBEB': '#2A2414',
  '#FFF7ED': '#2C2117',
  '#FEF2F2': '#2D1B22',
  '#FDF2F8': '#2D1A28',
  '#FAF5FF': '#261D33',
};

const darkText: Record<string, string> = {
  '#0F172A': '#F8FAFC',
  '#111827': '#F8FAFC',
  '#1E293B': '#F1F5F9',
  '#1F2937': '#F1F5F9',
  '#334155': '#E2E8F0',
  '#374151': '#E2E8F0',
  '#475569': '#CBD5E1',
  '#4B5563': '#CBD5E1',
  '#64748B': '#94A3B8',
  '#6B7280': '#94A3B8',
};

const darkBorders: Record<string, string> = {
  '#FFFFFF': '#172033',
  '#F8FAFC': '#1E293B',
  '#F1F5F9': '#263449',
  '#E2E8F0': '#334155',
  '#E5E7EB': '#334155',
  '#CBD5E1': '#475569',
  '#DBEAFE': '#25466E',
};

function remap(value: unknown, palette: Record<string, string>) {
  const resolved = darkMode && typeof value === 'string'
    ? palette[value.toUpperCase()] ?? value
    : value;
  return processColor(resolved as string);
}

export function installThemeRuntime() {
  if (installed) return;
  installed = true;
  StyleSheet.setStyleAttributePreprocessor('backgroundColor', (value) => remap(value, darkBackgrounds));
  StyleSheet.setStyleAttributePreprocessor('color', (value) => remap(value, darkText));
  StyleSheet.setStyleAttributePreprocessor('borderColor', (value) => remap(value, darkBorders));
  StyleSheet.setStyleAttributePreprocessor('borderTopColor', (value) => remap(value, darkBorders));
  StyleSheet.setStyleAttributePreprocessor('borderBottomColor', (value) => remap(value, darkBorders));
  StyleSheet.setStyleAttributePreprocessor('borderLeftColor', (value) => remap(value, darkBorders));
  StyleSheet.setStyleAttributePreprocessor('borderRightColor', (value) => remap(value, darkBorders));
}

export function setThemeRuntimeDark(enabled: boolean) {
  darkMode = enabled;
}
