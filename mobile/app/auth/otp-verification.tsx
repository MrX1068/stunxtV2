import { useState, useEffect, useRef } from "react";
import { View, TextInput, KeyboardAvoidingView, Platform } from "react-native";
import { router } from "expo-router";
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

export default function OTPVerificationScreen() {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resendTimer, setResendTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  
  const inputRefs = useRef<Array<TextInput | null>>([]);

  useEffect(() => {
    const timer = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) {
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleOtpChange = (value: string, index: number) => {
    if (value.length > 1) return; // Prevent multiple characters
    
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all fields are filled
    if (index === 5 && value && newOtp.every(digit => digit)) {
      handleVerifyOTP();
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOTP = async () => {
    const otpString = otp.join('');
    if (otpString.length !== 6) {
      setError("Please enter the complete 6-digit code");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // TODO: Implement OTP verification API call
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate API call
      
      // Navigate to profile setup
      router.replace("/auth/profile-setup");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid verification code");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (!canResend) return;

    try {
      // TODO: Implement resend OTP API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setResendTimer(60);
      setCanResend(false);
      setError("");
      
      // Show success message (you could use toast here)
    } catch (err) {
      setError("Failed to resend code. Please try again.");
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1"
    >
      <StatusBar style="dark" />
      <View className="flex-1 bg-background px-6 py-12">
        <VStack className="flex-1 justify-center gap-8">
          {/* Header */}
          <VStack className="items-center gap-4">
            <Box className="w-20 h-20 bg-primary-100 rounded-full items-center justify-center">
              <Text className="text-3xl">📱</Text>
            </Box>
            
            <VStack className="items-center gap-2">
              <Heading size="3xl" className="font-bold text-typography-900 text-center">
                Verify Your Email
              </Heading>
              <Text size="lg" className="text-typography-600 text-center max-w-sm">
                We've sent a 6-digit code to your email address
              </Text>
            </VStack>
          </VStack>

          {/* OTP Input */}
          <VStack className="gap-6">
            <HStack className="justify-center gap-3">
              {otp.map((digit, index) => (
                <Box
                  key={index}
                  className="w-14 h-14 border-2 border-border-300 rounded-lg bg-background-50 items-center justify-center"
                >
                  <TextInput
                    ref={(ref) => {
                      inputRefs.current[index] = ref;
                    }}
                    value={digit}
                    onChangeText={(value) => handleOtpChange(value, index)}
                    onKeyPress={({ nativeEvent: { key } }) => handleKeyPress(key, index)}
                    keyboardType="numeric"
                    maxLength={1}
                    selectTextOnFocus
                    className="text-xl font-bold text-typography-900 text-center w-full h-full"
                    style={{ outline: 'none' }}
                  />
                </Box>
              ))}
            </HStack>

            {/* Error Message */}
            {error ? (
              <Box className="bg-error-50 border border-error-200 rounded-lg p-3">
                <Text className="text-error-600 text-center">{error}</Text>
              </Box>
            ) : null}

            {/* Verify Button */}
            <Button
              size="lg"
              className="w-full"
              onPress={handleVerifyOTP}
              disabled={loading || otp.some(digit => !digit)}
            >
              <ButtonText className="font-semibold text-white">
                {loading ? "Verifying..." : "Verify Email"}
              </ButtonText>
            </Button>
          </VStack>

          {/* Resend Section */}
          <VStack className="items-center gap-3">
            <Text className="text-typography-600 text-center">
              Didn't receive the code?
            </Text>
            
            {canResend ? (
              <Button variant="link" onPress={handleResendOTP}>
                <ButtonText className="text-primary font-semibold">
                  Resend Code
                </ButtonText>
              </Button>
            ) : (
              <Text className="text-typography-500">
                Resend in {resendTimer}s
              </Text>
            )}
          </VStack>

          {/* Back Button */}
          <Button variant="outline" onPress={() => router.back()}>
            <ButtonText>Go Back</ButtonText>
          </Button>
        </VStack>
      </View>
    </KeyboardAvoidingView>
  );
}
