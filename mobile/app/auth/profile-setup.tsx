import { useState } from "react";
import { View, ScrollView, KeyboardAvoidingView, Platform, Pressable, Alert } from "react-native";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
import { useAuth } from "@/stores/auth";
import { useApiStore } from "@/stores/api";

export default function ProfileSetupScreen() {
  const { isLoading, error: authError, clearError } = useAuth();
  const apiStore = useApiStore();
  const insets = useSafeAreaInsets();
  const [formData, setFormData] = useState({
    avatarUrl: null as string | null,
    bio: "",
    location: "",
    websiteUrl: "",
  });
  const [error, setError] = useState("");

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError("");
    clearError();
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
        setFormData(prev => ({ ...prev, avatarUrl: result.assets[0].uri }));
      }
    } catch (error) {
      console.error('Error picking image:', error);
    }
  };

  const validateForm = () => {
    // All fields are optional for profile setup since fullName and username were already collected
    // Only validate format if provided
    if (formData.websiteUrl && formData.websiteUrl.trim()) {
      const urlPattern = /^https?:\/\/.+\..+/;
      if (!urlPattern.test(formData.websiteUrl)) {
        setError("Please enter a valid website URL");
        return false;
      }
    }

    return true;
  };

  const handleSaveProfile = async () => {
    if (!validateForm()) return;

    setError("");
    clearError();

    try {
      // Create profile data object matching backend User entity fields
      const profileData: any = {
        bio: formData.bio.trim() || undefined,
        location: formData.location.trim() || undefined,
        websiteUrl: formData.websiteUrl.trim() || undefined,
        avatarUrl: formData.avatarUrl || undefined,
      };

      // Remove undefined values
      Object.keys(profileData).forEach(key => {
        if (profileData[key] === undefined) {
          delete profileData[key];
        }
      });

      // Update user profile via API
      await apiStore.put('/users/me', profileData);
      
      // Navigate to interests selection
      router.replace("/auth/interests");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to save profile";
      setError(errorMessage);
    }
  };
  

  const handleSkip = () => {
    router.replace("/auth/interests");
  };

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 25}
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ 
            flexGrow: 1, 
            paddingBottom: Math.max(insets.bottom, 20) + 50 
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <VStack className="flex-1 px-6 py-8 gap-8">
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
                {formData.avatarUrl ? (
                  <Box className="w-full h-full rounded-full overflow-hidden bg-gray-200">
                    <View style={{ 
                      width: '100%', 
                      height: '100%', 
                      borderRadius: 64,
                      backgroundColor: '#10B981',
                      justifyContent: 'center',
                      alignItems: 'center'
                    }}>
                      <Text className="text-white text-lg font-semibold">✓</Text>
                    </View>
                  </Box>
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
                  editable={!isLoading}
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
                  editable={!isLoading}
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
                  value={formData.websiteUrl}
                  onChangeText={(value) => updateField("websiteUrl", value)}
                  autoCapitalize="none"
                  keyboardType="url"
                  editable={!isLoading}
                />
              </Input>
            </VStack>
          </VStack>

          {/* Error Message */}
          {(error || authError) ? (
            <Box className="bg-error-50 border border-error-200 rounded-lg p-3">
              <Text className="text-error-600 text-center">{error || authError}</Text>
            </Box>
          ) : null}

          {/* Action Buttons */}
          <VStack className="gap-4">
            <Button
              size="lg"
              className="w-full"
              onPress={handleSaveProfile}
              disabled={isLoading}
            >
              <ButtonText className="font-semibold text-white">
                {isLoading ? "Saving..." : "Continue"}
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
  </View>
  );
}
