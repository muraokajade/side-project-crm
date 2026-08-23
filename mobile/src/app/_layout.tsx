import { Tabs } from 'expo-router';

import { colors } from '@/constants/colors';

export default function RootLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.textPrimary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'ホーム' }} />
      <Tabs.Screen name="career" options={{ title: '転職' }} />
      <Tabs.Screen name="side-job" options={{ title: '副業' }} />
      <Tabs.Screen name="settings" options={{ title: '設定' }} />
    </Tabs>
  );
}
