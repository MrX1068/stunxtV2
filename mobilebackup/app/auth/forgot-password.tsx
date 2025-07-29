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
} from "@/components/ui";

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleResetPassword = async () => {
    if (!email) {
      setError("Please enter your email address");
      return;
    }

    if (!email.includes("@")) {
      setError("Please enter a valid email address");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // TODO: Implement password reset API call
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send reset email");
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <View className="flex-1 bg-background">
        <StatusBar style="dark" />
        <VStack className="flex-1 justify-center px-6 gap-8">
          <Box className="items-center gap-4">
            <Text className="text-6xl">📧</Text>
            <Heading size="2xl" className="font-bold text-typography-900 text-center">
              Check Your Email
            </Heading>
            <Text size="lg" className="text-typography-600 text-center max-w-sm">
              We've sent a password reset link to {email}
            </Text>
          </Box>

          <VStack className="gap-4">
            <Button size="lg" className="w-full" onPress={() => router.replace("/auth/login")}>
              <ButtonText className="font-semibold">Back to Sign In</ButtonText>
            </Button>
            
            <Button 
              variant="outline" 
              size="lg" 
              className="w-full"
              onPress={() => {
                setSent(false);
                setEmail("");
              }}
            >
              <ButtonText>Try Different Email</ButtonText>
            </Button>
          </VStack>
        </VStack>
      </View>
    );
  }

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
            <Text className="text-5xl">🔒</Text>
            <Heading size="3xl" className="font-bold text-primary text-center">
              Forgot Password?
            </Heading>
            <Text size="lg" className="text-typography-600 text-center max-w-sm">
              No worries! Enter your email and we'll send you a reset link
            </Text>
          </Box>

          {/* Reset Form */}
          <VStack className="gap-6">
            {/* Email Input */}
            <VStack className="gap-2">
              <Text className="text-typography-700 font-medium">Email Address</Text>
              <Input variant="outline" size="lg" className="bg-background">
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

            {/* Error Message */}
            {error ? (
              <Box className="bg-error-50 border border-error-200 rounded-lg p-3">
                <Text className="text-error-600 text-center">{error}</Text>
              </Box>
            ) : null}

            {/* Reset Button */}
            <Button
              size="lg"
              className="w-full"
              onPress={handleResetPassword}
              disabled={loading}
            >
              <ButtonText className="font-semibold">
                {loading ? "Sending..." : "Send Reset Link"}
              </ButtonText>
            </Button>
          </VStack>

          {/* Back to Login Link */}
          <HStack className="justify-center gap-2">
            <Text className="text-typography-600">Remember your password?</Text>
            <Link href="/auth/login" asChild>
              <Text className="text-primary font-semibold">Sign In</Text>
            </Link>
          </HStack>
        </VStack>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
