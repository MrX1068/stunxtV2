import React, { useState } from "react";
import { View, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { Link, router } from "expo-router";
import {
  VStack,
  HStack,
  Box,
  Heading,
  Text,
  Button,
  ButtonText,
  ButtonSpinner,
  Input,
  InputField,
  InputSlot,
  InputIcon,
} from "@/components/ui";
import { useAuth } from "@/stores";
import { useApiStore } from "@/stores/api";
import { MaterialIcons } from '@expo/vector-icons';

interface FormData {
  fullName: string;
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  bio?: string;
  location?: string;
  websiteUrl?: string;
}

export default function RegisterScreen() {
  const { register, isLoading, error, clearError } = useAuth();
  const apiStore = useApiStore();
  const [formData, setFormData] = useState<FormData>({
    fullName: "",
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    // bio: "",
    // location: "",
    // websiteUrl: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Partial<FormData>>({});
  const [checkingDuplicate, setCheckingDuplicate] = useState(false);
  const [duplicateCheckTimeout, setDuplicateCheckTimeout] = useState<NodeJS.Timeout | null>(null);
  
  // Debounced duplicate check function
  const checkForDuplicates = async (field: 'email' | 'username', value: string) => {
    if (!value || value.length < 3) return;
    console.log("starteig ", field, value)
    
    try {
      console.log("check duplivate")
      const endpoint = field === 'email' ? 'check-email' : 'check-username';
      const result = await apiStore.get(`/auth/${endpoint}?${field}=${encodeURIComponent(value)}`);
      console.log("result", result)
      if (result.success && result?.data?.exists) {
        setValidationErrors(prev => ({
          ...prev,
          [field]: result?.data?.exists.message
        }));
      } else {
        setValidationErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[field];
          return newErrors;
        });
      }
    } catch (error) {
      console.warn(`${field} duplicate check failed:`, error);
    }
  };

  const validateForm = (): boolean => {
    const errors: Partial<FormData> = {};

    if (!formData.fullName.trim()) {
      errors.fullName = 'Full name is required';
    }
    if (!formData.username.trim()) {
      errors.username = 'Username is required';
    }
    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Invalid email format';
    }
    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    }
    if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: undefined }));
    }
    if (error) clearError();
    
    // Debounced duplicate check for email and username
    if ((field === 'email' || field === 'username') && value.length >= 3) {
      if (duplicateCheckTimeout) {
        clearTimeout(duplicateCheckTimeout);
      }
      
      const timeout = setTimeout(() => {
        checkForDuplicates(field, value);
      }, 500); // 500ms delay
      
      setDuplicateCheckTimeout(timeout);
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    try {
      await register(formData);
      // Navigate to OTP verification with email parameter
      router.replace(`/auth/otp?email=${encodeURIComponent(formData.email)}`);
    } catch (err) {
      console.log('Registration error:', err);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1"
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 25}
    >
      <ScrollView
        className="flex-1 bg-background-0"
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <VStack className="flex-1 justify-center  px-6 py-12 gap-8">
          {/* Header */}
          <Box className="items-center gap-4">
            <Heading size="3xl" className="font-bold text-typography-900 text-center">
              Create Account
            </Heading>
            <Text size="lg" className="text-typography-500 text-center max-w-sm">
              Join our community and start connecting
            </Text>
          </Box>

          {/* Registration Form */}
          <VStack className="gap-6">
            {/* Full Name Input */}
            <VStack className="gap-2">
              <Text className="text-typography-700 font-medium">Full Name</Text>
              <Input variant="outline" size="lg">
                <InputField
                  placeholder="Enter your full name"
                  value={formData.fullName}
                  onChangeText={(value) => handleInputChange("fullName", value)}
                  autoComplete="name"
                  editable={!isLoading}
                />
              </Input>
              {validationErrors.fullName && (
                <Text className="text-error-600 text-xs">{validationErrors.fullName}</Text>
              )}
            </VStack>

            {/* Username Input */}
            <VStack className="gap-2">
              <Text className="text-typography-700 font-medium">Username</Text>
              <Input variant="outline" size="lg" className="bg-background">
                <InputField
                  placeholder="Choose a username"
                  value={formData.username}
                  onChangeText={(value) => handleInputChange("username", value)}
                  autoCapitalize="none"
                  autoComplete="username"
                  editable={!isLoading}
                />
              </Input>
              {validationErrors.username && (
                <Text className="text-error-600 text-xs">{validationErrors.username}</Text>
              )}
            </VStack>

            {/* Email Input */}
            <VStack className="gap-2">
              <Text className="text-typography-700 font-medium">Email</Text>
              <Input variant="outline" size="lg" className="bg-background">
                <InputField
                  placeholder="Enter your email"
                  value={formData.email}
                  onChangeText={(value) => handleInputChange("email", value)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  editable={!isLoading}
                />
              </Input>
              {validationErrors.email && (
                <Text className="text-error-600 text-xs">{validationErrors.email}</Text>
              )}
            </VStack>

            {/* Password Input */}
            <VStack className="gap-2">
              <Text className="text-typography-700 font-medium">Password</Text>
              <Input variant="outline" size="lg" className="bg-background">
                <InputField
                  placeholder="Create a password"
                  value={formData.password}
                  onChangeText={(value) => handleInputChange("password", value)}
                  secureTextEntry={!showPassword}
                  autoComplete="new-password"
                  editable={!isLoading}
                />
                <InputSlot className="pr-3" onPress={() => setShowPassword(!showPassword)}>
                  <InputIcon>
                    <MaterialIcons 
                      name={showPassword ? "visibility-off" : "visibility"} 
                      size={20} 
                      color="#666" 
                    />
                  </InputIcon>
                </InputSlot>
              </Input>
              {validationErrors.password && (
                <Text className="text-error-600 text-xs">{validationErrors.password}</Text>
              )}
            </VStack>

            {/* Confirm Password Input */}
            <VStack className="gap-2">
              <Text className="text-typography-700 font-medium">Confirm Password</Text>
              <Input variant="outline" size="lg" className="bg-background">
                <InputField
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChangeText={(value) => handleInputChange("confirmPassword", value)}
                  secureTextEntry={!showConfirmPassword}
                  autoComplete="new-password"
                  editable={!isLoading}
                />
                <InputSlot className="pr-3" onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                  <InputIcon>
                    <MaterialIcons 
                      name={showConfirmPassword ? "visibility-off" : "visibility"} 
                      size={20} 
                      color="#666" 
                    />
                  </InputIcon>
                </InputSlot>
              </Input>
              {validationErrors.confirmPassword && (
                <Text className="text-error-600 text-xs">{validationErrors.confirmPassword}</Text>
              )}
            </VStack>

            {/* Error Message */}
            {error ? (
              <Box className="bg-error-50 border border-error-200 rounded-lg p-3">
                <Text className="text-error-600 text-center">{error}</Text>
              </Box>
            ) : null}

            {/* Terms and Privacy */}
            <Text className="text-sm text-typography-500 text-center">
              By creating an account, you agree to our{" "}
              <Text className="text-primary font-medium">Terms of Service</Text> and{" "}
              <Text className="text-primary font-medium">Privacy Policy</Text>
            </Text>

            {/* Register Button */}
            <Button
              size="lg"
              className="w-full"
              onPress={handleSubmit}
              disabled={isLoading}
            >
              {isLoading && <ButtonSpinner className="mr-2" />}
              <ButtonText className="font-semibold">
                {isLoading ? "Creating Account..." : "Create Account"}
              </ButtonText>
            </Button>
          </VStack>

          {/* Sign In Link */}
          <HStack className="justify-center gap-2">
            <Text className="text-typography-600">Already have an account?</Text>
            <Link href="/auth/login" asChild>
              <Text className="text-primary font-semibold">Sign In</Text>
            </Link>
          </HStack>
        </VStack>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
