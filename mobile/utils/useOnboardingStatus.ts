import { useMemo } from 'react';
import { useAuth } from '@/stores/auth';

export interface OnboardingStatus {
  isComplete: boolean;
  missingSteps: string[];
  nextStep: string | null;
  completionPercentage: number;
}

/**
 * Hook to check onboarding completion status
 * Determines what profile steps are missing
 */
export function useOnboardingStatus(): OnboardingStatus {
  const { user } = useAuth();

  return useMemo(() => {
    if (!user) {
      return {
        isComplete: false,
        missingSteps: ['login'],
        nextStep: 'login',
        completionPercentage: 0
      };
    }

    const missingSteps: string[] = [];
    let completedSteps = 0;
    const totalSteps = 4; // Email verification, profile setup, interests, avatar

    // Step 1: Email verification (usually done during registration)
    if (user.emailVerified) {
      completedSteps++;
    } else {
      missingSteps.push('email-verification');
    }

    // Step 2: Basic profile info (bio, location, website) OR Avatar
    const hasBasicProfile = user.profile?.bio || user.profile?.location || user.profile?.website;
    const hasAvatar = !!user.avatarUrl;
    const hasProfileOrAvatar = hasBasicProfile || hasAvatar;
    
    if (hasProfileOrAvatar) {
      completedSteps++;
    } else {
      missingSteps.push('profile-setup');
    }

    // Step 3: Interests selection
    const hasInterests = user.interests && user.interests.length > 0;
    if (hasInterests) {
      completedSteps++;
    } else {
      missingSteps.push('interests-selection');
    }

    // Based on backend entity logic: hasBasicInfo && (hasProfileOrAvatar || hasInterests)
    // More flexible completion logic to match backend
    const hasBasicInfo = user.fullName && user.username && user.emailVerified;
    const backendIsComplete = hasBasicInfo && (hasProfileOrAvatar || hasInterests);
    
    const completionPercentage = Math.round((completedSteps / 3) * 100); // Changed to 3 steps
    const isComplete = !!backendIsComplete; // Ensure boolean type

    // Determine next logical step
    const getNextStep = (): string | null => {
      if (missingSteps.includes('email-verification')) return 'email-verification';
      if (!hasProfileOrAvatar && !hasInterests) return 'profile-setup';
      if (missingSteps.includes('interests-selection') && !hasProfileOrAvatar) return 'interests-selection';
      return null;
    };

    return {
      isComplete,
      missingSteps,
      nextStep: getNextStep(),
      completionPercentage
    };
  }, [user]);
}

/**
 * Hook to get user-friendly step descriptions
 */
export function useOnboardingStepInfo(step: string) {
  const stepInfo = {
    'email-verification': {
      title: 'Verify Your Email',
      description: 'Check your inbox and click the verification link',
      icon: '📧',
      action: 'Verify Email'
    },
    'profile-setup': {
      title: 'Complete Your Profile',
      description: 'Add your bio, location, and website',
      icon: '👤',
      action: 'Update Profile'
    },
    'avatar-upload': {
      title: 'Add Profile Picture',
      description: 'Upload a photo so others can recognize you',
      icon: '📸',
      action: 'Upload Photo'
    },
    'interests-selection': {
      title: 'Choose Your Interests',
      description: 'Help us personalize your experience',
      icon: '⭐',
      action: 'Select Interests'
    }
  };

  return stepInfo[step as keyof typeof stepInfo] || {
    title: 'Complete Setup',
    description: 'Finish setting up your profile',
    icon: '✨',
    action: 'Continue'
  };
}
