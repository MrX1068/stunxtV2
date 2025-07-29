import { useState } from "react";
import { View, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { Link, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
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
  InputSlot,
  InputIcon,
} from "@/components/ui";
import { useAuth } from "@/providers/AuthProvider";

export default function RegisterScreen() {
  const [formData, setFormData] = useState({
    fullName: "",
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const { register } = useAuth();

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    if (!formData.fullName || !formData.username || !formData.email || !formData.password) {
      setError("Please fill in all fields");
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return false;
    }

    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters long");
      return false;
    }

    if (!formData.email.includes("@")) {
      setError("Please enter a valid email address");
      return false;
    }

    if (formData.username.length < 3) {
      setError("Username must be at least 3 characters long");
      return false;
    }

    return true;
  };

  const handleRegister = async () => {
    if (!validateForm()) return;

    setLoading(true);
    setError("");

    try {
      await register({
        fullName: formData.fullName,
        username: formData.username,
        email: formData.email,
        password: formData.password,
      });
      router.replace("/(tabs)/home");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
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
        <VStack className="flex-1 justify-center px-6 py-12 gap-8">
          {/* Header */}
          <Box className="items-center gap-4">
            <Heading size="3xl" className="font-bold text-primary text-center">
              Create Account
            </Heading>
            <Text size="lg" className="text-typography-600 text-center max-w-sm">
              Join our community and start connecting
            </Text>
          </Box>

          {/* Registration Form */}
          <VStack className="gap-6">
            {/* Full Name Input */}
            <VStack className="gap-2">
              <Text className="text-typography-700 font-medium">Full Name</Text>
              <Input variant="outline" size="lg" className="bg-background">
                <InputField
                  placeholder="Enter your full name"
                  value={formData.fullName}
                  onChangeText={(value) => updateField("fullName", value)}
                  autoComplete="name"
                  editable={!loading}
                />
              </Input>
            </VStack>

            {/* Username Input */}
            <VStack className="gap-2">
              <Text className="text-typography-700 font-medium">Username</Text>
              <Input variant="outline" size="lg" className="bg-background">
                <InputField
                  placeholder="Choose a username"
                  value={formData.username}
                  onChangeText={(value) => updateField("username", value.toLowerCase())}
                  autoCapitalize="none"
                  autoComplete="username"
                  editable={!loading}
                />
              </Input>
            </VStack>

            {/* Email Input */}
            <VStack className="gap-2">
              <Text className="text-typography-700 font-medium">Email</Text>
              <Input variant="outline" size="lg" className="bg-background">
                <InputField
                  placeholder="Enter your email"
                  value={formData.email}
                  onChangeText={(value) => updateField("email", value)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  editable={!loading}
                />
              </Input>
            </VStack>

            {/* Password Input */}
            <VStack className="gap-2">
              <Text className="text-typography-700 font-medium">Password</Text>
              <Input variant="outline" size="lg" className="bg-background">
                <InputField
                  placeholder="Create a password"
                  value={formData.password}
                  onChangeText={(value) => updateField("password", value)}
                  secureTextEntry={!showPassword}
                  autoComplete="new-password"
                  editable={!loading}
                />
                <InputSlot className="pr-3" onPress={() => setShowPassword(!showPassword)}>
                  <InputIcon>
                    <Text className="text-typography-500">
                      {showPassword ? "👁️" : "👁️‍🗨️"}
                    </Text>
                  </InputIcon>
                </InputSlot>
              </Input>
            </VStack>

            {/* Confirm Password Input */}
            <VStack className="gap-2">
              <Text className="text-typography-700 font-medium">Confirm Password</Text>
              <Input variant="outline" size="lg" className="bg-background">
                <InputField
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChangeText={(value) => updateField("confirmPassword", value)}
                  secureTextEntry={!showConfirmPassword}
                  autoComplete="new-password"
                  editable={!loading}
                />
                <InputSlot className="pr-3" onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                  <InputIcon>
                    <Text className="text-typography-500">
                      {showConfirmPassword ? "👁️" : "👁️‍🗨️"}
                    </Text>
                  </InputIcon>
                </InputSlot>
              </Input>
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
              onPress={handleRegister}
              disabled={loading}
            >
              <ButtonText className="font-semibold">
                {loading ? "Creating Account..." : "Create Account"}
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
