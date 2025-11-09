import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { getCaregiverColor } from '../theme/colors';

interface CaregiverAvatarProps {
  caregiverId: string;
  caregiverName: string;
  size?: number;
  onPress?: () => void;
}

export function CaregiverAvatar({
  caregiverId,
  caregiverName,
  size = 36,
  onPress,
}: CaregiverAvatarProps) {
  const color = getCaregiverColor(caregiverId);
  const initials = caregiverName
    .split(' ')
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const avatarStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    backgroundColor: color.bg,
  };

  const textStyle = {
    fontSize: size * 0.4,
    color: color.text,
  };

  const content = (
    <View style={[styles.avatar, avatarStyle]}>
      <Text style={[styles.initials, textStyle]}>{initials}</Text>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  avatar: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  initials: {
    fontWeight: '600' as const,
  },
});
