import { Text } from "react-native";
import { Tabs } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useTheme } from "@/providers/ThemeProvider";

export default function TabLayout() {
  const { isDark } = useTheme();

  return (
    <>
      <StatusBar style={isDark ? "light" : "dark"} />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: isDark ? "#1f1f1f" : "#ffffff",
            borderTopColor: isDark ? "#374151" : "#e5e7eb",
            height: 85,
            paddingBottom: 10,
            paddingTop: 10,
          },
          tabBarActiveTintColor: "#6366f1",
          tabBarInactiveTintColor: isDark ? "#9ca3af" : "#6b7280",
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: "600",
          },
        }}
      >
        <Tabs.Screen
          name="home"
          options={{
            title: "Home",
            tabBarIcon: ({ color, size }) => (
              <TabIcon name="🏠" color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="communities"
          options={{
            title: "Communities",
            tabBarIcon: ({ color, size }) => (
              <TabIcon name="�" color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="messages"
          options={{
            title: "Messages",
            tabBarIcon: ({ color, size }) => (
              <TabIcon name="�" color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="explore"
          options={{
            title: "Explore",
            tabBarIcon: ({ color, size }) => (
              <TabIcon name="�" color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: "Profile",
            tabBarIcon: ({ color, size }) => (
              <TabIcon name="👤" color={color} size={size} />
            ),
          }}
        />
      </Tabs>
    </>
  );
}

function TabIcon({ name, color, size }: { name: string; color: string; size: number }) {
  return (
    <Text style={{ fontSize: size * 0.8, color }}>
      {name}
    </Text>
  );
}
