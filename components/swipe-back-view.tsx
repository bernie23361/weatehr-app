import { useRef, type ReactNode } from 'react';
import { Animated, PanResponder, type StyleProp, type ViewStyle } from 'react-native';

const EDGE_WIDTH = 48;
const START_THRESHOLD = 12;
const VELOCITY_RATIO = 1.5;
const RELEASE_THRESHOLD = 100;
const RESISTANCE = 0.55;
const FLING_DISTANCE = 400;
const FLING_DURATION = 180;

export function SwipeBackView({ onBack, children, style }: { onBack: () => void; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const translateX = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) => {
        return (
          gesture.x0 <= EDGE_WIDTH &&
          gesture.dx > START_THRESHOLD &&
          Math.abs(gesture.dx) > Math.abs(gesture.dy) * VELOCITY_RATIO
        );
      },
      onPanResponderMove: (_, gesture) => {
        translateX.setValue(Math.max(0, gesture.dx) * RESISTANCE);
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dx > RELEASE_THRESHOLD) {
          Animated.timing(translateX, {
            toValue: FLING_DISTANCE,
            duration: FLING_DURATION,
            useNativeDriver: true,
          }).start(() => onBack());
        } else {
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 0,
          }).start();
        }
      },
      onPanResponderTerminate: () => {
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
          bounciness: 0,
        }).start();
      },
    }),
  ).current;

  return (
    <Animated.View style={[{ flex: 1 }, style, { transform: [{ translateX }] }]} {...panResponder.panHandlers}>
      {children}
    </Animated.View>
  );
}