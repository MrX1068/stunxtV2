import React, { useState } from "react";
import { View, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { Link, router } from "expo-router";
import {
  Box,
  VStack,
  HStack,
  Text,
  Heading,
  Input,
  InputField,
  InputSlot,
  InputIcon,
  Button,
  ButtonText,
  ButtonSpinner,
} from "@/components/ui";
import { useAuth, useAuthStore } from "@/stores";
import { MaterialIcons,  } from '@expo/vector-icons';

interface FormData {
  email: string;
  password: string;
}

export default function LoginScreen() {
  const { login, isLoading, error, clearError } = useAuth();
  const [formData, setFormData] = useState<FormData>({
    email: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Partial<FormData>>(
    {}
  );

  const validateForm = (): boolean => {
    const errors: Partial<FormData> = {};

    // Email validation
    if (!formData.email.trim()) {
      errors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = "Please enter a valid email address";
    }

    // Password validation
    if (!formData.password) {
      errors.password = "Password is required";
    } else if (formData.password.length < 6) {
      errors.password = "Password must be at least 6 characters";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Clear validation error for this field
    if (validationErrors[field]) {
      setValidationErrors((prev) => ({ ...prev, [field]: undefined }));
    }

    // Clear general error
    if (error) {
      clearError();
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      await login(formData);
      
      // Check the authentication state after login attempt
      const { user, isAuthenticated, error } = useAuthStore.getState();
      
      // If there's an error (like email verification required), don't navigate
      if (error) {
        console.log("Login failed with error:", error);
        return;
      }
      
      // Only navigate if user is actually authenticated
      if (isAuthenticated && user) {
        if (!user.emailVerified) {
          // Navigate to OTP verification if email is not verified
          router.replace(`/auth/otp?email=${encodeURIComponent(formData.email)}`);
        } else {
          // Check if user has completed profile setup
          if (!user.bio && !user.location) {
            // User hasn't completed profile setup, redirect to profile setup
            router.replace("/auth/profile-setup");
          } else {
            // User has completed setup, go to main app
            router.replace("/(tabs)/home");
          }
        }
      }
    } catch (err) {
      // Error is handled by the store and displayed via the error state
      console.log("Login error:", err);
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
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 50 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Box className="flex-1 px-6 py-8">
          <VStack space="xl" className="flex-1 justify-center">
            {/* Header */}
            <VStack space="md" className="items-center">
              <Heading size="2xl" className="text-typography-900 text-center">
                Welcome Back
              </Heading>
              <Text size="md" className="text-typography-500 text-center">
                Sign in to your account to continue
              </Text>
            </VStack>

            {/* Error Display */}
            {error && (
              <Box className="bg-error-50 border border-error-200 rounded-lg p-4">
                <Text size="sm" className="text-error-700 text-center">
                  {error}
                </Text>
              </Box>
            )}

            {/* Form */}
            <VStack space="lg">
              {/* Email Field */}
              <VStack space="xs">
                <Text size="sm" className="text-typography-700 font-medium">
                  Email *
                </Text>
                <Input
                  variant={validationErrors.email ? "outline" : "outline"}
                  className={validationErrors.email ? "border-error-300" : ""}
                >
                  <InputField
                    type="text"
                    placeholder="Enter your email"
                    value={formData.email}
                    onChangeText={(value) => handleInputChange("email", value)}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    autoCorrect={false}
                  />
                </Input>
                {validationErrors.email && (
                  <Text size="xs" className="text-error-600">
                    {validationErrors.email}
                  </Text>
                )}
              </VStack>

              {/* Password Field */}
              <VStack space="xs">
                <Text size="sm" className="text-typography-700 font-medium">
                  Password *
                </Text>
                <Input
                  variant="outline"
                  className={
                    validationErrors.password ? "border-error-300" : ""
                  }
                >
                  <InputField
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={formData.password}
                    onChangeText={(value) =>
                      handleInputChange("password", value)
                    }
                    autoCapitalize="none"
                    autoComplete="current-password"
                    autoCorrect={false}
                  />
                  <InputSlot
                    className="pr-3"
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    <MaterialIcons 
                      name={showPassword ? "visibility-off" : "visibility"} 
                      size={20} 
                      color="#666" 
                    />
                  </InputSlot>
                </Input>
                {validationErrors.password && (
                  <Text size="xs" className="text-error-600">
                    {validationErrors.password}
                  </Text>
                )}
              </VStack>

              {/* Forgot Password Link */}
              <HStack className="justify-end">
                <Link href="/auth/forgot-password">
                  <Text size="sm" className="text-primary-600">
                    Forgot Password?
                  </Text>
                </Link>
              </HStack>

              {/* Submit Button */}
              <Button
                onPress={handleSubmit}
                isDisabled={isLoading}
                className="mt-4"
                size="lg"
              >
                {isLoading && <ButtonSpinner className="mr-2" />}
                <ButtonText>
                  {isLoading ? "Signing In..." : "Sign In"}
                </ButtonText>
              </Button>
            </VStack>

            {/* Register Link */}
            <HStack space="sm" className="items-center justify-center mt-8">
              <Text size="sm" className="text-typography-500">
                Don't have an account?
              </Text>
              <Link href="/auth/register">
                <Text size="sm" className="text-primary-600 font-medium">
                  Sign Up
                </Text>
              </Link>
            </HStack>
          </VStack>
        </Box>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
