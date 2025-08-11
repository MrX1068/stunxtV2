import { Text } from "react-native";
import { Tabs } from "expo-router";
import { useTheme } from "@/providers/ThemeContext";

export default function TabLayout() {
  const { isDark } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: isDark ? "#171717" : "#ffffff", // bg-background-0 colors
          borderTopColor: isDark ? "#404040" : "#e5e7eb",  // border-outline-200 colors
          height: 85,
          paddingBottom: 10,
          paddingTop: 10,
        },
        tabBarActiveTintColor: "#6366f1", // primary color
        tabBarInactiveTintColor: isDark ? "#9ca3af" : "#6b7280", // typography-500 colors
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
          name="my-communities"
          options={{
            title: "My Communities",
            tabBarIcon: ({ color, size }) => (
              <TabIcon name="⭐" color={color} size={size} />
            ),
          }}
        />
        {/* <Tabs.Screen
          name="messages"
          options={{
            title: "Messages",
            tabBarIcon: ({ color, size }) => (
              <TabIcon name="�" color={color} size={size} />
            ),
          }}
        /> */}
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
  );
}

function TabIcon({ name, color, size }: { name: string; color: string; size: number }) {
  return (
    <Text style={{ fontSize: size * 0.8, color }}>
      {name}
    </Text>
  );
}
