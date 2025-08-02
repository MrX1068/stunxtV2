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

interface FieldStatus {
  checking: boolean;
  available: boolean | null;
  message: string;
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
  const [duplicateCheckTimeout, setDuplicateCheckTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);
  
  // Field status tracking for better UX
  const [fieldStatus, setFieldStatus] = useState<{
    email: FieldStatus;
    username: FieldStatus;
  }>({
    email: { checking: false, available: null, message: '' },
    username: { checking: false, available: null, message: '' }
  });
  
  // Professional duplicate check function
  const checkForDuplicates = async (field: 'email' | 'username', value: string) => {
    if (!value || value.length < 3) {
      // Reset status if value is too short
      setFieldStatus(prev => ({
        ...prev,
        [field]: { checking: false, available: null, message: '' }
      }));
      return;
    }

    // Additional validation for email format
    if (field === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        setFieldStatus(prev => ({
          ...prev,
          [field]: { 
            checking: false, 
            available: false, 
            message: 'Please enter a valid email address' 
          }
        }));
        return;
      }
    }

    // Additional validation for username format
    if (field === 'username') {
      const usernameRegex = /^[a-zA-Z0-9_-]+$/;
      if (!usernameRegex.test(value)) {
        setFieldStatus(prev => ({
          ...prev,
          [field]: { 
            checking: false, 
            available: false, 
            message: 'Username can only contain letters, numbers, underscores, and hyphens' 
          }
        }));
        return;
      }
    }
    
    try {
      // Set checking status
      setFieldStatus(prev => ({
        ...prev,
        [field]: { checking: true, available: null, message: 'Checking availability...' }
      }));
      
      const endpoint = field === 'email' ? 'check-email' : 'check-username';
      const requestData = field === 'email' ? { email: value } : { username: value };
      const result = await apiStore.post(`/auth/${endpoint}`, requestData);
      
      if (result.success) {
        const exists = result?.data?.exists;
        const message = result?.data?.message || (exists 
          ? `${field === 'email' ? 'Email' : 'Username'} is already taken`
          : `${field === 'email' ? 'Email' : 'Username'} is available`);
        
        setFieldStatus(prev => ({
          ...prev,
          [field]: { 
            checking: false, 
            available: !exists, 
            message 
          }
        }));
        
        // Update validation errors only for taken fields or validation errors
        if (exists || (!exists && message.includes('must be') || message.includes('can only') || message.includes('valid'))) {
          setValidationErrors(prev => ({
            ...prev,
            [field]: message
          }));
        } else {
          setValidationErrors(prev => {
            const newErrors = { ...prev };
            delete newErrors[field];
            return newErrors;
          });
        }
      } else {
        // Handle API response error
        const errorMessage = result?.data?.message || 'Unable to check availability';
        setFieldStatus(prev => ({
          ...prev,
          [field]: { 
            checking: false, 
            available: null, 
            message: errorMessage
          }
        }));
      }
    } catch (error) {
      console.warn(`${field} duplicate check failed:`, error);
      // Don't show confusing error messages to user
      setFieldStatus(prev => ({
        ...prev,
        [field]: { 
          checking: false, 
          available: null, 
          message: 'Unable to check availability at this time'
        }
      }));
    }
  };

  const validateForm = (): boolean => {
    const errors: Partial<FormData> = {};

    if (!formData.fullName.trim()) {
      errors.fullName = 'Full name is required';
    }
    if (!formData.username.trim()) {
      errors.username = 'Username is required';
    } else if (formData.username.length < 3) {
      errors.username = 'Username must be at least 3 characters long';
    } else if (formData.username.length > 50) {
      errors.username = 'Username cannot exceed 50 characters';
    } else if (!/^[a-zA-Z0-9_-]+$/.test(formData.username)) {
      errors.username = 'Username can only contain letters, numbers, underscores, and hyphens';
    }
    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        errors.email = 'Please enter a valid email address';
      }
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
    
    // Clear general error
    if (error) clearError();
    
    // Reset field status when user starts typing
    if (field === 'email' || field === 'username') {
      setFieldStatus(prev => ({
        ...prev,
        [field]: { checking: false, available: null, message: '' }
      }));
    }
    
    // Debounced duplicate check for email and username
    if ((field === 'email' || field === 'username') && value.length >= 3) {
      if (duplicateCheckTimeout) {
        clearTimeout(duplicateCheckTimeout);
      }
      
      const timeout = setTimeout(() => {
        checkForDuplicates(field as 'email' | 'username', value);
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

  // Helper function to render field status
  const renderFieldStatus = (field: 'email' | 'username') => {
    const status = fieldStatus[field];
    
    if (status.checking) {
      return (
        <HStack className="items-center gap-2 mt-1">
          <Box className="w-3 h-3 bg-primary-500 rounded-full animate-pulse" />
          <Text className="text-typography-500 text-xs">{status.message}</Text>
        </HStack>
      );
    }
    
    if (status.available === true) {
      return (
        <HStack className="items-center gap-2 mt-1">
          <MaterialIcons name="check-circle" size={16} color="#10B981" />
          <Text className="text-success-600 text-xs">{status.message}</Text>
        </HStack>
      );
    }
    
    if (status.available === false) {
      return (
        <HStack className="items-center gap-2 mt-1">
          <MaterialIcons name="error" size={16} color="#EF4444" />
          <Text className="text-error-600 text-xs">{status.message}</Text>
        </HStack>
      );
    }
    
    return null;
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
                <InputSlot className="pr-3">
                  <InputIcon>
                    {fieldStatus.username.checking ? (
                      <Box className="w-4 h-4 bg-primary-500 rounded-full animate-pulse" />
                    ) : fieldStatus.username.available === true ? (
                      <MaterialIcons name="check-circle" size={20} color="#10B981" />
                    ) : fieldStatus.username.available === false ? (
                      <MaterialIcons name="error" size={20} color="#EF4444" />
                    ) : null}
                  </InputIcon>
                </InputSlot>
              </Input>
              {renderFieldStatus('username')}
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
                <InputSlot className="pr-3">
                  <InputIcon>
                    {fieldStatus.email.checking ? (
                      <Box className="w-4 h-4 bg-primary-500 rounded-full animate-pulse" />
                    ) : fieldStatus.email.available === true ? (
                      <MaterialIcons name="check-circle" size={20} color="#10B981" />
                    ) : fieldStatus.email.available === false ? (
                      <MaterialIcons name="error" size={20} color="#EF4444" />
                    ) : null}
                  </InputIcon>
                </InputSlot>
              </Input>
              {renderFieldStatus('email')}
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
