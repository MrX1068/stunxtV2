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

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const { login } = useAuth();

  const handleLogin = async () => {
    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await login(email, password);
      router.replace("/(tabs)/home");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
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
              Welcome Back
            </Heading>
            <Text size="lg" className="text-typography-600 text-center max-w-sm">
              Sign in to your account to continue
            </Text>
          </Box>

          {/* Login Form */}
          <VStack className="gap-6">
            {/* Email Input */}
            <VStack className="gap-2">
              <Text className="text-typography-700 font-medium">Email</Text>
              <Input
                variant="outline"
                size="lg"
                className="bg-background"
              >
                <InputField
                  placeholder="Enter your email"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  editable={!loading}
                />
              </Input>
            </VStack>

            {/* Password Input */}
            <VStack className="gap-2">
              <HStack className="justify-between items-center">
                <Text className="text-typography-700 font-medium">Password</Text>
                <Link href="/auth/forgot-password" asChild>
                  <Text className="text-primary font-medium">
                    Forgot Password?
                  </Text>
                </Link>
              </HStack>
              <Input
                variant="outline"
                size="lg"
                className="bg-background"
              >
                <InputField
                  placeholder="Enter your password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoComplete="current-password"
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

            {/* Error Message */}
            {error ? (
              <Box className="bg-error-50 border border-error-200 rounded-lg p-3">
                <Text className="text-error-600 text-center">{error}</Text>
              </Box>
            ) : null}

            {/* Login Button */}
            <Button
              size="lg"
              className="w-full"
              onPress={handleLogin}
              disabled={loading}
            >
              <ButtonText className="font-semibold">
                {loading ? "Signing In..." : "Sign In"}
              </ButtonText>
            </Button>
          </VStack>

          {/* Divider */}
          <HStack className="items-center gap-4">
            <Box className="flex-1 h-px bg-border-300" />
            <Text className="text-typography-500">or</Text>
            <Box className="flex-1 h-px bg-border-300" />
          </HStack>

          {/* Social Login Options */}
          <VStack className="gap-3">
            <Button variant="outline" size="lg" className="w-full">
              <ButtonText className="font-medium text-typography-700">
                Continue with Google
              </ButtonText>
            </Button>
            
            <Button variant="outline" size="lg" className="w-full">
              <ButtonText className="font-medium text-typography-700">
                Continue with Apple
              </ButtonText>
            </Button>
          </VStack>

          {/* Sign Up Link */}
          <HStack className="justify-center gap-2">
            <Text className="text-typography-600">Don't have an account?</Text>
            <Link href="/auth/register" asChild>
              <Text className="text-primary font-semibold">Sign Up</Text>
            </Link>
          </HStack>
        </VStack>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
