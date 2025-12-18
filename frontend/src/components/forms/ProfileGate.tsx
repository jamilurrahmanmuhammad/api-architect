/**
 * ProfileGate Component
 * Conditionally renders children based on the current user profile level.
 * Used to show/hide form fields based on complexity profile (Basic/Advanced/Technical/Expert)
 */

import React, { ReactNode, createElement } from "react";
import { cn } from "@/lib/utils";
import { useFormMetadata } from "@/providers/FormStateProvider";
import { FormState } from "@/types/formState";

/** Profile levels in order of increasing complexity */
export type ProfileLevel = FormState["profile"];

/** Profile level hierarchy (index = level, higher = more features) */
const PROFILE_ORDER: ProfileLevel[] = ["Basic", "Advanced", "Technical", "Expert"];

/**
 * Get the numeric level of a profile for comparison
 */
function getProfileLevel(profile: ProfileLevel): number {
  return PROFILE_ORDER.indexOf(profile);
}

/**
 * Check if the current profile meets or exceeds the minimum required profile
 */
export function meetsProfileRequirement(
  currentProfile: ProfileLevel,
  minProfile: ProfileLevel
): boolean {
  return getProfileLevel(currentProfile) >= getProfileLevel(minProfile);
}

export interface ProfileGateProps {
  /** Children to conditionally render */
  children: ReactNode;
  /** Minimum profile level required to show content */
  minProfile?: ProfileLevel;
  /** Override the profile from context (useful for previews/demos) */
  overrideProfile?: ProfileLevel;
  /** Fallback content to show when profile requirement not met */
  fallback?: ReactNode;
  /** How to hide content: 'unmount' removes from DOM, 'visual' keeps in DOM but hides */
  hideMode?: "unmount" | "visual";
  /** Optional wrapper element type (e.g., 'div', 'section', 'fieldset') */
  wrapper?: keyof JSX.IntrinsicElements;
  /** Class name for the wrapper element */
  wrapperClassName?: string;
}

/**
 * ProfileGate component for conditional rendering based on profile level.
 *
 * Profile hierarchy (lowest to highest):
 * - Basic: Essential fields only
 * - Advanced: Basic + additional detail fields
 * - Technical: Advanced + composition/schema features
 * - Expert: All fields including raw editing
 *
 * @example
 * ```tsx
 * // Show field only for Advanced+ users
 * <ProfileGate minProfile="Advanced">
 *   <FormField name="parameters" ... />
 * </ProfileGate>
 *
 * // Show with fallback for lower profiles
 * <ProfileGate minProfile="Expert" fallback={<UpgradePrompt />}>
 *   <SchemaEditor />
 * </ProfileGate>
 * ```
 */
export function ProfileGate({
  children,
  minProfile = "Basic",
  overrideProfile,
  fallback = null,
  hideMode = "unmount",
  wrapper,
  wrapperClassName,
}: ProfileGateProps) {
  // Get current profile from context
  const { profile: contextProfile } = useFormMetadata();

  // Use override if provided, otherwise use context
  const currentProfile = overrideProfile ?? contextProfile;

  // Check if current profile meets the minimum requirement
  const shouldShow = meetsProfileRequirement(currentProfile, minProfile);

  // Handle visual hide mode (keep in DOM but hide)
  if (hideMode === "visual" && !shouldShow) {
    const hiddenContent = (
      <div className="hidden" aria-hidden="true">
        {children}
      </div>
    );
    return hiddenContent;
  }

  // Handle unmount mode (remove from DOM)
  if (!shouldShow) {
    return <>{fallback}</>;
  }

  // Show content - optionally wrap in specified element
  if (wrapper) {
    return createElement(
      wrapper,
      { className: wrapperClassName },
      children
    );
  }

  // Return children directly (fragment for multiple children)
  return <>{children}</>;
}

/**
 * Hook for programmatic profile checks.
 * Useful when you need to conditionally render outside of JSX
 * or make decisions based on profile level.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { canAccess, currentProfile } = useProfileGate("Advanced");
 *
 *   if (canAccess) {
 *     // Do advanced stuff
 *   }
 * }
 * ```
 */
export function useProfileGate(minProfile: ProfileLevel = "Basic") {
  const { profile } = useFormMetadata();

  return {
    /** Whether the current profile meets the minimum requirement */
    canAccess: meetsProfileRequirement(profile, minProfile),
    /** The current profile from context */
    currentProfile: profile,
    /** Check if a specific profile level is accessible */
    hasAccess: (level: ProfileLevel) => meetsProfileRequirement(profile, level),
    /** The profile hierarchy for reference */
    profileOrder: PROFILE_ORDER,
  };
}

/**
 * Utility to get profile display info
 */
export const PROFILE_INFO: Record<ProfileLevel, { label: string; description: string }> = {
  Basic: {
    label: "Basic",
    description: "Essential fields for simple API definitions",
  },
  Advanced: {
    label: "Advanced",
    description: "Additional detail fields like parameters and examples",
  },
  Technical: {
    label: "Technical",
    description: "Schema composition, allOf/oneOf, and advanced constraints",
  },
  Expert: {
    label: "Expert",
    description: "Full access including raw OAS editing and extensions",
  },
};

export default ProfileGate;
