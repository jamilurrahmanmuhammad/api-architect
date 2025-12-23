/**
 * ProfileSelector Component
 * Dropdown selector for choosing profile level (Basic/Advanced/Technical/Expert)
 * Controls form field visibility through FormStateProvider
 */

import React, { useCallback } from "react";
import { User, Users, Wrench, Code } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFormMetadata } from "@/providers/FormStateProvider";
import { FormState } from "@/types/formState";
import { PROFILE_INFO } from "./ProfileGate";

/** Profile level type */
type ProfileLevel = FormState["profile"];

/** Profile configuration with icons */
const PROFILES: { value: ProfileLevel; icon: React.ReactNode }[] = [
  { value: "Basic", icon: <User className="h-4 w-4" /> },
  { value: "Advanced", icon: <Users className="h-4 w-4" /> },
  { value: "Technical", icon: <Wrench className="h-4 w-4" /> },
  { value: "Expert", icon: <Code className="h-4 w-4" /> },
];

export interface ProfileSelectorProps {
  /** Callback when profile changes */
  onChange?: (profile: ProfileLevel) => void;
  /** Whether the selector is disabled */
  disabled?: boolean;
  /** Use compact styling */
  compact?: boolean;
  /** Use full width */
  fullWidth?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * ProfileSelector component for changing form visibility profile.
 *
 * The profile controls which form fields are visible:
 * - Basic: Essential fields only
 * - Advanced: Basic + additional detail fields
 * - Technical: Advanced + composition/schema features
 * - Expert: All fields including raw editing
 *
 * @example
 * ```tsx
 * <ProfileSelector onChange={(profile) => console.log(profile)} />
 * ```
 */
export function ProfileSelector({
  onChange,
  disabled = false,
  compact = false,
  fullWidth = false,
  className,
}: ProfileSelectorProps) {
  const { profile, setProfile } = useFormMetadata();

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newProfile = e.target.value as ProfileLevel;
      setProfile(newProfile);
      onChange?.(newProfile);
    },
    [setProfile, onChange]
  );

  // Get current profile info
  const currentInfo = PROFILE_INFO[profile];

  // Get current profile icon
  const currentProfileConfig = PROFILES.find((p) => p.value === profile);

  return (
    <div
      data-testid="profile-selector"
      className={cn(
        "profile-selector inline-flex items-center gap-2",
        fullWidth && "w-full",
        compact && "compact",
        className
      )}
    >
      {/* Profile Icon */}
      <span
        data-testid="profile-icon"
        className={cn(
          "flex items-center justify-center text-muted-foreground",
          profile === "Basic" && "text-gray-500",
          profile === "Advanced" && "text-blue-500",
          profile === "Technical" && "text-orange-500",
          profile === "Expert" && "text-purple-500"
        )}
      >
        {currentProfileConfig?.icon}
      </span>

      {/* Profile Select */}
      <div className={cn("flex flex-col", fullWidth && "flex-1")}>
        <select
          value={profile}
          onChange={handleChange}
          disabled={disabled}
          aria-label="Select profile level"
          className={cn(
            "px-3 py-1.5 rounded-md border border-input bg-background text-sm",
            "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-50",
            compact ? "py-1 px-2 text-xs" : "py-1.5 px-3",
            fullWidth && "w-full"
          )}
        >
          {PROFILES.map(({ value }) => (
            <option key={value} value={value}>
              {PROFILE_INFO[value].label}
            </option>
          ))}
        </select>

        {/* Profile Description (not in compact mode) */}
        {!compact && (
          <span className="text-xs text-muted-foreground mt-1">
            {currentInfo.description}
          </span>
        )}
      </div>
    </div>
  );
}

export default ProfileSelector;
