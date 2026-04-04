import { Stack } from 'expo-router';
import { Text, View } from 'react-native';

import { Colors, FontFamily, FontSize, Spacing } from '@/constants/theme';

export default function ProfileScreen() {
  return (
    <>
      <Stack.Screen
        options={{
          title: 'Profile',
          headerStyle: { backgroundColor: Colors.white },
          headerShadowVisible: false,
          headerTitleStyle: {
            fontFamily: FontFamily.bold,
            fontSize: FontSize.md,
            color: Colors.black,
          },
        }}
      />
      <View style={{ flex: 1, backgroundColor: Colors.white, alignItems: 'center', justifyContent: 'center', gap: Spacing.sm }}>
        <Text style={{ fontFamily: FontFamily.extraBold, fontSize: FontSize.xl, color: Colors.black }}>
          Profile
        </Text>
        <Text style={{ fontFamily: FontFamily.medium, fontSize: FontSize.md, color: Colors.gray40 }}>
          Coming soon
        </Text>
      </View>
    </>
  );
}
