import { useState, useEffect } from "react";
import { View, ScrollView, KeyboardAvoidingView, Platform, Pressable, Alert, Image } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
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
import { useAuth, useProfile } from "@/stores/auth";
import { useApiStore } from "@/stores/api";
import { Avatar } from "@/components/Avatar";

interface UploadStatus {
  uploading: boolean;
  progress: number;
  error: string | null;
}

export default function ProfileSetupScreen() {
  const { user, isLoading, error: authError, clearError } = useAuth();
  const { refreshUserData } = useProfile();
  const apiStore = useApiStore();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  
  // Check if user came from edit profile (not onboarding)
  const isEditMode = params.mode === 'edit' || params.from === 'profile';
  
  const [formData, setFormData] = useState({
    avatarUrl: null as string | null,
    bio: "",
    location: "",
    websiteUrl: "",
  });
  const [error, setError] = useState("");
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>({
    uploading: false,
    progress: 0,
    error: null,
  });

  // Load existing user data when component mounts
  useEffect(() => {
    if (user) {
      setFormData({
        avatarUrl: user.avatarUrl || null,
        bio: user.profile?.bio || "",
        location: user.profile?.location || "",
        websiteUrl: user.profile?.website || "",
      });
    }
  }, [user]);

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError("");
    clearError();
  };

  const uploadAvatar = async (imageUri: string) => {
    setUploadStatus({ uploading: true, progress: 0, error: null });
    
    try {
      const uploadFormData = new FormData();
      uploadFormData.append('avatar', {
        uri: imageUri,
        type: 'image/jpeg',
        name: 'avatar.jpg',
      } as any);
      uploadFormData.append('category', 'avatar');
      uploadFormData.append('privacy', 'public');

      // Show uploading progress
      setUploadStatus(prev => ({ ...prev, progress: 25 }));

      const uploadResponse = await apiStore.post('/users/me/avatar', uploadFormData, {
        // Don't set Content-Type for FormData - React Native will set it automatically with boundary
      });

      // Show processing progress
      setUploadStatus(prev => ({ ...prev, progress: 75 }));

      console.log("uploadResponse", uploadResponse);
      console.log("uploadResponse.success", uploadResponse.success);
      console.log("uploadResponse.data", uploadResponse.data);
      console.log("uploadResponse.data?.avatarUrl", uploadResponse.data?.data?.avatarUrl);

      // Check for success response - backend returns { success: true, data: { avatarUrl: "..." } }
      if (uploadResponse.success && uploadResponse.data?.data?.avatarUrl) {
        console.log("✅ Upload successful, setting avatar URL:", uploadResponse.data?.data?.avatarUrl);
        setUploadStatus({ uploading: false, progress: 100, error: null });
        setFormData(prev => ({ ...prev, avatarUrl: uploadResponse.data?.data?.avatarUrl }));
        return uploadResponse.data?.data?.avatarUrl;
      } else {
        console.log("❌ Upload response validation failed");
        console.log("Success check:", uploadResponse.success);
        console.log("Data check:", uploadResponse.data);
        console.log("Avatar URL check:", uploadResponse.data?.data?.avatarUrl);
        throw new Error('Upload failed - no URL returned');
      }
    } catch (uploadError) {
      console.error('Avatar upload failed:', uploadError);
      setUploadStatus({ 
        uploading: false, 
        progress: 0, 
        error: 'Failed to upload avatar image' 
      });
      throw uploadError;
    }
  };

  const handleImagePicker = async () => {
    try {
      // Request permission
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert("Permission Required", "Permission to access camera roll is required!");
        return;
      }

      // Launch image picker with updated options (removed deprecated mediaTypes)
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        
        // Show selected image immediately for better UX
        setFormData(prev => ({ ...prev, avatarUrl: imageUri }));
        
        // Upload the image immediately
        try {
          await uploadAvatar(imageUri);
        } catch (error) {
          // Keep the local image but show error
          Alert.alert(
            "Upload Failed", 
            "Image selected but upload failed. You can try again or continue without uploading.",
            [
              { text: "Try Again", onPress: () => handleImagePicker() },
              { text: "Continue", style: "cancel" }
            ]
          );
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      setUploadStatus({ uploading: false, progress: 0, error: 'Failed to pick image' });
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
      
      // Refresh user data in auth store to get updated profile
      await refreshUserData();
      
      // Navigate based on context
      if (isEditMode) {
        // User came from edit profile - go back to profile page
        router.back();
      } else {
        // User is in onboarding flow - continue to interests
        router.replace("/auth/interests");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to save profile";
      setError(errorMessage);
    }
  };
  

  const handleSkip = () => {
    if (isEditMode) {
      // User came from edit profile - go back to profile page
      router.back();
    } else {
      // User is in onboarding flow - continue to interests
      router.replace("/auth/interests");
    }
  };

  const renderAvatarSection = () => {
    const isUploading = uploadStatus.uploading;
    const hasError = uploadStatus.error;
    const isLocalImage = formData.avatarUrl && formData.avatarUrl.startsWith('file://');

    return (
      <VStack className="items-center gap-4">
        <Pressable onPress={handleImagePicker} disabled={isUploading}>
          <Box className="w-32 h-32 bg-primary-100 rounded-full items-center justify-center border-4 border-background-200 overflow-hidden">
            {formData.avatarUrl ? (
              <Avatar 
                src={formData.avatarUrl}
                size={128}
                fallbackText="📷"
                style={{ borderRadius: 64 }}
              />
            ) : (
              <VStack className="items-center gap-2">
                <Text className="text-4xl">👤</Text>
                <Text className="text-primary-600 font-medium text-sm">Add Photo</Text>
              </VStack>
            )}
          </Box>
        </Pressable>
        
        {/* Upload Status */}
        {isUploading && (
          <VStack className="items-center gap-2">
            <Box className="w-full bg-gray-200 rounded-full h-2">
              <Box 
                className="bg-primary-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadStatus.progress}%` }}
              />
            </Box>
            <Text className="text-typography-600 text-sm">
              {uploadStatus.progress < 30 ? 'Uploading...' : 
               uploadStatus.progress < 80 ? 'Processing...' : 
               'Finishing up...'} {uploadStatus.progress}%
            </Text>
          </VStack>
        )}

        {hasError && (
          <Text className="text-error-600 text-sm text-center">
            {uploadStatus.error}
          </Text>
        )}

        {isLocalImage && !isUploading && !hasError && (
          <Text className="text-warning-600 text-sm text-center">
            Image selected but not uploaded yet
          </Text>
        )}
        
        <Button 
          variant="outline" 
          onPress={handleImagePicker}
          disabled={isUploading}
        >
          <ButtonText>
            {isUploading ? "Uploading..." : "Choose Photo"}
          </ButtonText>
        </Button>
      </VStack>
    );
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
              {isEditMode ? "Edit Your Profile" : "Set Up Your Profile"}
            </Heading>
            <Text size="lg" className="text-typography-600 text-center max-w-sm">
              {isEditMode 
                ? "Update your profile information" 
                : "Tell us a bit about yourself to personalize your experience"
              }
            </Text>
          </VStack>

          {/* Profile Picture */}
          {renderAvatarSection()}

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
              disabled={isLoading || uploadStatus.uploading}
            >
              <ButtonText className="font-semibold text-white">
                {isLoading ? "Saving..." : isEditMode ? "Save Changes" : "Continue"}
              </ButtonText>
            </Button>

            {!isEditMode && (
              <Button variant="link" onPress={handleSkip}>
                <ButtonText className="text-typography-600">
                  Skip for now
                </ButtonText>
              </Button>
            )}
          </VStack>
        </VStack>
      </ScrollView>
    </KeyboardAvoidingView>
  </View>
  );
}
