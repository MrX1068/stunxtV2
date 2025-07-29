import { useState } from "react";
import { View, ScrollView, Pressable } from "react-native";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { VStack, HStack, Box, Heading, Text, Button, ButtonText } from "@/components/ui";

interface Interest {
  id: string;
  name: string;
  icon: string;
  color: string;
}

const interests: Interest[] = [
  { id: "tech", name: "Technology", icon: "💻", color: "bg-blue-100" },
  { id: "gaming", name: "Gaming", icon: "🎮", color: "bg-purple-100" },
  { id: "art", name: "Art & Design", icon: "🎨", color: "bg-pink-100" },
  { id: "music", name: "Music", icon: "🎵", color: "bg-green-100" },
  { id: "sports", name: "Sports", icon: "⚽", color: "bg-orange-100" },
  { id: "food", name: "Food & Cooking", icon: "🍳", color: "bg-yellow-100" },
  { id: "travel", name: "Travel", icon: "✈️", color: "bg-cyan-100" },
  { id: "books", name: "Books & Reading", icon: "📚", color: "bg-indigo-100" },
  { id: "fitness", name: "Fitness", icon: "💪", color: "bg-red-100" },
  { id: "photography", name: "Photography", icon: "📸", color: "bg-gray-100" },
  { id: "business", name: "Business", icon: "💼", color: "bg-slate-100" },
  { id: "science", name: "Science", icon: "🔬", color: "bg-emerald-100" },
  { id: "movies", name: "Movies & TV", icon: "🎬", color: "bg-violet-100" },
  { id: "fashion", name: "Fashion", icon: "👗", color: "bg-rose-100" },
  { id: "pets", name: "Pets & Animals", icon: "🐕", color: "bg-amber-100" },
  { id: "education", name: "Education", icon: "🎓", color: "bg-teal-100" },
];

export default function InterestSelectionScreen() {
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const toggleInterest = (interestId: string) => {
    setSelectedInterests(prev => 
      prev.includes(interestId)
        ? prev.filter(id => id !== interestId)
        : [...prev, interestId]
    );
  };

  const handleContinue = async () => {
    if (selectedInterests.length < 3) {
      return; // Show error or disable button
    }

    setLoading(true);
    try {
      // TODO: Save interests to user profile
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      router.replace("/"); // Navigate to main app
    } catch (error) {
      console.error("Failed to save interests:", error);
    } finally {
      setLoading(false);
    }
  };

  const canContinue = selectedInterests.length >= 3;

  return (
    <View className="flex-1 bg-background">
      <StatusBar style="dark" />
      
      <ScrollView 
        className="flex-1"
        contentContainerClassName="flex-grow"
        showsVerticalScrollIndicator={false}
      >
        <VStack className="flex-1 px-6 py-12 gap-8">
          {/* Header */}
          <VStack className="items-center gap-4">
            <Heading size="3xl" className="font-bold text-typography-900 text-center">
              What interests you?
            </Heading>
            <Text size="lg" className="text-typography-600 text-center max-w-sm">
              Choose at least 3 topics to help us suggest relevant communities
            </Text>
          </VStack>

          {/* Progress Indicator */}
          <Box className="items-center">
            <Text className="text-primary font-medium">
              {selectedInterests.length} of 3+ selected
            </Text>
          </Box>

          {/* Interests Grid */}
          <Box className="flex-1">
            <VStack className="gap-4">
              {Array.from({ length: Math.ceil(interests.length / 2) }, (_, rowIndex) => (
                <HStack key={rowIndex} className="gap-4">
                  {interests.slice(rowIndex * 2, rowIndex * 2 + 2).map((interest) => {
                    const isSelected = selectedInterests.includes(interest.id);
                    return (
                      <Pressable
                        key={interest.id}
                        onPress={() => toggleInterest(interest.id)}
                        className="flex-1"
                      >
                        <Box
                          className={`
                            p-4 rounded-xl border-2 items-center gap-3
                            ${isSelected 
                              ? 'border-primary-500 bg-primary-50' 
                              : 'border-border-200 bg-background-50'
                            }
                          `}
                        >
                          <Box className={`w-12 h-12 rounded-full items-center justify-center ${interest.color}`}>
                            <Text className="text-2xl">{interest.icon}</Text>
                          </Box>
                          <Text 
                            className={`font-medium text-center ${
                              isSelected ? 'text-primary-700' : 'text-typography-700'
                            }`}
                          >
                            {interest.name}
                          </Text>
                        </Box>
                      </Pressable>
                    );
                  })}
                </HStack>
              ))}
            </VStack>
          </Box>

          {/* Continue Button */}
          <VStack className="gap-4">
            <Button
              size="lg"
              className="w-full"
              onPress={handleContinue}
              disabled={!canContinue || loading}
            >
              <ButtonText className="font-semibold text-white">
                {loading ? "Saving..." : "Continue"}
              </ButtonText>
            </Button>

            {!canContinue && (
              <Text className="text-typography-500 text-center">
                Please select at least 3 interests to continue
              </Text>
            )}
          </VStack>
        </VStack>
      </ScrollView>
    </View>
  );
}
