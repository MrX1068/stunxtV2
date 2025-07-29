import { useState } from "react";
import { View, ScrollView, KeyboardAvoidingView, Platform, Pressable, Alert } from "react-native";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as ImagePicker from 'expo-image-picker';
import {
  VStack,
  HStack,
  Box,
  Heading,
  Text,
  Button,
  ButtonText,
  Input,
  InputField,
} from "@/components/ui";

export default function ProfileSetupScreen() {
  const [formData, setFormData] = useState({
    profilePicture: null as string | null,
    displayName: "",
    username: "",
    bio: "",
    location: "",
    website: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleImagePicker = async () => {
    try {
      // Request permission
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert("Permission Required", "Permission to access camera roll is required!");
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setFormData(prev => ({ ...prev, profilePicture: result.assets[0].uri }));
      }
    } catch (error) {
      console.error('Error picking image:', error);
    }
  };

  const validateForm = () => {
    if (!formData.displayName.trim()) {
      setError("Display name is required");
      return false;
    }

    if (!formData.username.trim()) {
      setError("Username is required");
      return false;
    }

    if (formData.username.length < 3) {
      setError("Username must be at least 3 characters long");
      return false;
    }

    // Check username format (alphanumeric and underscores only)
    if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      setError("Username can only contain letters, numbers, and underscores");
      return false;
    }

    return true;
  };

  const handleSaveProfile = async () => {
    if (!validateForm()) return;

    setLoading(true);
    setError("");

    try {
      // TODO: Implement profile setup API call
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate API call
      
      // Navigate to interests selection
      router.replace("/auth/interests");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save profile");
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    router.replace("/auth/interests");
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1"
    >
      <StatusBar style="dark" />
      <ScrollView
        className="flex-1 bg-background"
        contentContainerClassName="flex-grow"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <VStack className="flex-1 px-6 py-12 gap-8">
          {/* Header */}
          <VStack className="items-center gap-4">
            <Heading size="3xl" className="font-bold text-typography-900 text-center">
              Set Up Your Profile
            </Heading>
            <Text size="lg" className="text-typography-600 text-center max-w-sm">
              Tell us a bit about yourself to personalize your experience
            </Text>
          </VStack>

          {/* Profile Picture */}
          <VStack className="items-center gap-4">
            <Pressable onPress={handleImagePicker}>
              <Box className="w-32 h-32 bg-primary-100 rounded-full items-center justify-center border-4 border-background-200">
                {formData.profilePicture ? (
                  <View className="w-full h-full rounded-full overflow-hidden">
                    {/* TODO: Add Image component */}
                    <Box className="w-full h-full bg-primary-200 items-center justify-center">
                      <Text className="text-white">📷</Text>
                    </Box>
                  </View>
                ) : (
                  <VStack className="items-center gap-2">
                    <Text className="text-4xl">👤</Text>
                    <Text className="text-primary-600 font-medium text-sm">Add Photo</Text>
                  </VStack>
                )}
              </Box>
            </Pressable>
            
            <Button variant="outline" onPress={handleImagePicker}>
              <ButtonText>Choose Photo</ButtonText>
            </Button>
          </VStack>

          {/* Form Fields */}
          <VStack className="gap-6">
            {/* Display Name */}
            <VStack className="gap-2">
              <Text className="text-typography-700 font-medium">
                Display Name *
              </Text>
              <Input variant="outline" size="lg" className="bg-background">
                <InputField
                  placeholder="Your full name"
                  value={formData.displayName}
                  onChangeText={(value) => updateField("displayName", value)}
                  autoCapitalize="words"
                  editable={!loading}
                />
              </Input>
            </VStack>

            {/* Username */}
            <VStack className="gap-2">
              <Text className="text-typography-700 font-medium">
                Username *
              </Text>
              <Input variant="outline" size="lg" className="bg-background">
                <InputField
                  placeholder="@username"
                  value={formData.username}
                  onChangeText={(value) => updateField("username", value.toLowerCase())}
                  autoCapitalize="none"
                  autoComplete="username"
                  editable={!loading}
                />
              </Input>
              <Text className="text-typography-500 text-sm">
                This is how others will find you on StunxtV2
              </Text>
            </VStack>

            {/* Bio */}
            <VStack className="gap-2">
              <Text className="text-typography-700 font-medium">
                Bio (Optional)
              </Text>
              <Input variant="outline" size="lg" className="bg-background">
                <InputField
                  placeholder="Tell us about yourself..."
                  value={formData.bio}
                  onChangeText={(value) => updateField("bio", value)}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  editable={!loading}
                />
              </Input>
            </VStack>

            {/* Location */}
            <VStack className="gap-2">
              <Text className="text-typography-700 font-medium">
                Location (Optional)
              </Text>
              <Input variant="outline" size="lg" className="bg-background">
                <InputField
                  placeholder="City, Country"
                  value={formData.location}
                  onChangeText={(value) => updateField("location", value)}
                  autoCapitalize="words"
                  editable={!loading}
                />
              </Input>
            </VStack>

            {/* Website */}
            <VStack className="gap-2">
              <Text className="text-typography-700 font-medium">
                Website (Optional)
              </Text>
              <Input variant="outline" size="lg" className="bg-background">
                <InputField
                  placeholder="https://yourwebsite.com"
                  value={formData.website}
                  onChangeText={(value) => updateField("website", value)}
                  autoCapitalize="none"
                  keyboardType="url"
                  editable={!loading}
                />
              </Input>
            </VStack>
          </VStack>

          {/* Error Message */}
          {error ? (
            <Box className="bg-error-50 border border-error-200 rounded-lg p-3">
              <Text className="text-error-600 text-center">{error}</Text>
            </Box>
          ) : null}

          {/* Action Buttons */}
          <VStack className="gap-4">
            <Button
              size="lg"
              className="w-full"
              onPress={handleSaveProfile}
              disabled={loading}
            >
              <ButtonText className="font-semibold text-white">
                {loading ? "Saving..." : "Continue"}
              </ButtonText>
            </Button>

            <Button variant="link" onPress={handleSkip}>
              <ButtonText className="text-typography-600">
                Skip for now
              </ButtonText>
            </Button>
          </VStack>
        </VStack>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
