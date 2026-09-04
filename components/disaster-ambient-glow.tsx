import { memo, useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

const GlowOrb = ({ id }: { id: string }) => (
  <Svg width="100%" height="100%" viewBox="0 0 400 400">
    <Defs>
      <RadialGradient id={id} cx="50%" cy="50%" rx="50%" ry="50%">
        <Stop offset="0" stopColor="#BB2233" stopOpacity="0.34" />
        <Stop offset="0.32" stopColor="#BB2233" stopOpacity="0.22" />
        <Stop offset="0.68" stopColor="#BB2233" stopOpacity="0.08" />
        <Stop offset="1" stopColor="#BB2233" stopOpacity="0" />
      </RadialGradient>
    </Defs>
    <Circle cx="200" cy="200" r="200" fill={`url(#${id})`} />
  </Svg>
);

export const DisasterAmbientGlow = memo(function DisasterAmbientGlow({ reducedMotion }: { reducedMotion: boolean }) {
  const firstPulse = useRef(new Animated.Value(0)).current;
  const secondPulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reducedMotion) {
      firstPulse.setValue(0.35);
      secondPulse.setValue(0.65);
      return;
    }

    const firstAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(firstPulse, { toValue: 1, duration: 5200, useNativeDriver: true }),
        Animated.timing(firstPulse, { toValue: 0, duration: 5200, useNativeDriver: true }),
      ]),
    );
    const secondAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(secondPulse, { toValue: 1, duration: 6400, useNativeDriver: true }),
        Animated.timing(secondPulse, { toValue: 0, duration: 6400, useNativeDriver: true }),
      ]),
    );

    firstAnimation.start();
    secondAnimation.start();
    return () => {
      firstAnimation.stop();
      secondAnimation.stop();
    };
  }, [firstPulse, reducedMotion, secondPulse]);

  return (
    <View pointerEvents="none" style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      <Animated.View style={{ position: 'absolute', width: 440, height: 440, top: -56, left: -188, opacity: firstPulse.interpolate({ inputRange: [0, 1], outputRange: [0.52, 0.82] }), transform: [{ scale: firstPulse.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1.08] }) }], mixBlendMode: 'multiply' }}>
        <GlowOrb id="disaster-glow-one" />
      </Animated.View>
      <Animated.View style={{ position: 'absolute', width: 480, height: 480, top: 330, right: -222, opacity: secondPulse.interpolate({ inputRange: [0, 1], outputRange: [0.44, 0.74] }), transform: [{ scale: secondPulse.interpolate({ inputRange: [0, 1], outputRange: [1.06, 0.92] }) }], mixBlendMode: 'multiply' }}>
        <GlowOrb id="disaster-glow-two" />
      </Animated.View>
    </View>
  );
});
