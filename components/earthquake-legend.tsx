import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { X } from 'lucide-react-native';

const EARTHQUAKE_LEVELS = [
  { level: '7級', color: '#B51E68' },
  { level: '6強', color: '#8F2925' },
  { level: '6弱', color: '#D9413A' },
  { level: '5強', color: '#ED762F' },
  { level: '5弱', color: '#F4B942' },
  { level: '4級', color: '#F3DE68' },
  { level: '3級', color: '#82C98B' },
  { level: '2級', color: '#4C9BC1' },
  { level: '1級', color: '#315F7D' },
  { level: '0級', color: '#374151' },
];

export const EarthquakeLegend = () => {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <X size={22} strokeWidth={6} color="#51596A" style={styles.absoluteIcon} />
          <X size={22} strokeWidth={4} color="#C65551" style={styles.absoluteIcon} />
        </View>
        <Text style={styles.headerText}>震央</Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.list}>
        {EARTHQUAKE_LEVELS.map((item) => (
          <View key={item.level} style={styles.listItem}>
            <View style={[styles.colorBox, { backgroundColor: item.color }]} />
            <View style={styles.textRow}>
              <Text style={styles.numberText}>{item.level.charAt(0)}</Text>
              <Text style={styles.unitText}>{item.level.slice(1)}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    width: 110,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingTop: 14,
    paddingBottom: 16,
    paddingHorizontal: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  iconContainer: {
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  absoluteIcon: {
    position: 'absolute',
  },
  headerText: {
    color: '#51596A',
    fontWeight: 'bold',
    fontSize: 15,
    letterSpacing: 0.5,
  },
  divider: {
    width: '90%',
    height: 1,
    backgroundColor: '#E2E8F0',
    marginBottom: 10,
  },
  list: {
    width: '100%',
    gap: 6,
    alignItems: 'center',
  },
  listItem: {
    width: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    justifyContent: 'center',
  },
  colorBox: {
    width: 14,
    height: 14,
    borderRadius: 4,
  },
  textRow: {
    flexDirection: 'row',
  },
  numberText: {
    width: 9,
    textAlign: 'center',
    color: '#51596A',
    fontWeight: '500',
    fontSize: 13,
  },
  unitText: {
    color: '#51596A',
    fontWeight: '500',
    fontSize: 13,
  },
});
