import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: 'none' }, // Oculta a tab bar para simular tela única
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Principal',
        }}
      />
    </Tabs>
  );
}