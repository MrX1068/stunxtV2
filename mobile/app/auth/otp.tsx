import { useState, useRef, useEffect } from "react";
import { View, TextInput, Alert } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  VStack,
  HStack,
  Box,
  Heading,
  Text,
  Button,
  ButtonText,
} from "@/components/ui";
import { MaterialIcons } from "@expo/vector-icons";
import { useAuth } from "@/stores/auth";

export default function OTPScreen() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const {
    verifyEmail,
    resendEmailVerification,
    isLoading,
    error: authError,
    clearError,
  } = useAuth();
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [resendLoading, setResendLoading] = useState(false);
  const [error, setError] = useState("");
  const [resendTimer, setResendTimer] = useState(60);

  const inputRefs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  const handleOtpChange = (value: string, index: number) => {
    if (value.length > 1) return; // Only allow single digit

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setError("");
    clearError();

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all fields are filled
    if (value && index === 5 && newOtp.every((digit) => digit !== "")) {
      handleVerifyOTP(newOtp.join(""));
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOTP = async (otpCode?: string) => {
    const code = otpCode || otp.join("");

    if (code.length !== 6) {
      setError("Please enter the complete 6-digit code");
      return;
    }

    if (!email) {
      setError("Email address is missing");
      return;
    }

    setError("");
    clearError();

    try {
      await verifyEmail(email, code);

      // Navigate to profile setup after successful verification and auto-login
      router.replace("/auth/profile-setup");
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Invalid verification code";
      setError(errorMessage);
    }
  };

  const handleResendOTP = async () => {
    if (resendTimer > 0) return;

    if (!email) {
      Alert.alert("Error", "Email address is missing");
      return;
    }

    setResendLoading(true);
    setError("");
    clearError();

    try {
      await resendEmailVerification(email);

      setResendTimer(60);
      Alert.alert("Success", "Verification code sent successfully");
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to resend code";
      Alert.alert("Error", errorMessage);
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-background-0">
      <StatusBar style="dark" />

      <VStack className="flex-1 px-6 pt-16 pb-12 gap-8">
        {/* Header - Centered and Professional */}
        <VStack className="items-center gap-6">
          {/* Email Icon */}
          <Box className="w-20 h-20 bg-primary-100 rounded-full items-center justify-center shadow-sm">
            <MaterialIcons name="email" size={36} color="#6366F1" />
          </Box>
          
          <VStack className="items-center gap-2">
            <Heading size="3xl" className="font-bold text-typography-900 text-center">
              Verify Your Email
            </Heading>
            <Text size="lg" className="text-typography-600 text-center max-w-sm">
              We've sent a 6-digit verification code to
            </Text>
            <Text size="lg" className="text-typography-900 font-medium text-center">
              {email}
            </Text>
          </VStack>
        </VStack>

        {/* OTP Input */}
        <VStack className="gap-6">
          <VStack className="gap-4 items-center">
            <Text size="md" className="text-typography-600 text-center">
              Enter the verification code below
            </Text>
          </VStack>

          {/* OTP Inputs */}
          <HStack className="justify-center gap-3">
            {otp.map((digit, index) => (
              <TextInput
                key={index}
                ref={(ref) => { inputRefs.current[index] = ref; }}
                className="w-12 h-14 bg-background-50 border-2 border-outline-200 rounded-lg text-center text-xl font-semibold text-typography-900 focus:border-primary-500"
                value={digit}
                onChangeText={(value) => handleOtpChange(value, index)}
                onKeyPress={({ nativeEvent }) =>
                  handleKeyPress(nativeEvent.key, index)
                }
                keyboardType="number-pad"
                maxLength={1}
                autoFocus={index === 0}
                editable={!isLoading}
              />
            ))}
          </HStack>

          {/* Error Message */}
          {error || authError ? (
            <Box className="bg-error-50 border border-error-200 rounded-lg p-3">
              <Text className="text-error-600 text-center">
                {error || authError}
              </Text>
            </Box>
          ) : null}

          {/* Verify Button */}
          <Button
            size="lg"
            className="w-full mt-4"
            onPress={() => handleVerifyOTP()}
            disabled={isLoading || otp.some((digit) => digit === "")}
          >
            <ButtonText className="font-semibold text-white">
              {isLoading ? "Verifying..." : "Verify Code"}
            </ButtonText>
          </Button>

          {/* Resend Section */}
          <VStack className="items-center gap-3 mt-6">
            <Text className="text-typography-500">
              Didn't receive the code?
            </Text>

            {resendTimer > 0 ? (
              <Text className="text-typography-400">
                Resend in {resendTimer}s
              </Text>
            ) : (
              <Button
                variant="link"
                onPress={handleResendOTP}
                disabled={resendLoading}
              >
                <ButtonText className="text-primary-600 font-medium">
                  {resendLoading ? "Sending..." : "Resend Code"}
                </ButtonText>
              </Button>
            )}
          </VStack>
        </VStack>

        {/* Help Text */}
        <Box className="bg-background-50 rounded-lg p-4 mt-auto">
          <HStack className="items-start gap-3">
            <MaterialIcons name="info" size={20} color="#6B7280" />
            <VStack className="flex-1">
              <Text className="text-typography-600 text-sm leading-5">
                Check your spam folder if you don't see the email. The code
                expires in 10 minutes.
              </Text>
            </VStack>
          </HStack>
        </Box>
      </VStack>
    </View>
  );
}
