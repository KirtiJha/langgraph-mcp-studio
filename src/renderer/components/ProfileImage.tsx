import React, { useState, useEffect } from "react";
import { UserIcon } from "@heroicons/react/24/outline";

interface ProfileImageProps {
  src?: string;
  alt?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  fallbackIcon?: React.ReactNode;
}

const ProfileImage: React.FC<ProfileImageProps> = ({
  src,
  alt = "",
  size = "md",
  className = "",
  fallbackIcon,
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(src);
  const [retryCount, setRetryCount] = useState(0);

  // Size mappings
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-10 h-10",
    lg: "w-12 h-12",
  };

  const iconSizes = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6",
  };

  useEffect(() => {
    if (src) {
      setCurrentSrc(src);
      setImageLoaded(false);
      setImageError(false);
    }
  }, [src]);

  const handleImageLoad = () => {
    console.log("Profile image loaded successfully:", currentSrc);
    setImageLoaded(true);
    setImageError(false);
  };

  const handleImageError = () => {
    console.log("Profile image failed to load:", currentSrc);
    setImageError(true);
    setImageLoaded(false);

    // Try different fallback approaches for Google images
    if (currentSrc && !currentSrc.includes("proxy") && !currentSrc.includes("weserv")) {
      // First try: Convert Google photos URL to a more reliable format
      if (currentSrc.includes("googleusercontent.com")) {
        const googleFallback = currentSrc.replace(/=s\d+-c/, "=s128-c");
        console.log("Trying Google fallback URL:", googleFallback);
        setCurrentSrc(googleFallback);
        return;
      }
      
      // Second try: Use a proxy service as last resort
      const proxyUrl = `https://images.weserv.nl/?url=${encodeURIComponent(
        currentSrc
      )}&w=128&h=128&fit=cover&mask=circle`;
      console.log("Trying proxy URL:", proxyUrl);
      setCurrentSrc(proxyUrl);
    }
  };

  const shouldShowFallback = !currentSrc || imageError;

  return (
    <div
      className={`${sizeClasses[size]} bg-gradient-to-r from-blue-600 to-blue-800 rounded-full flex items-center justify-center overflow-hidden relative ${className}`}
    >
      {currentSrc && !imageError && (
        <img
          src={currentSrc}
          alt={alt}
          className={`${
            sizeClasses[size]
          } object-cover transition-opacity duration-200 ${
            imageLoaded ? "opacity-100" : "opacity-0"
          }`}
          onLoad={handleImageLoad}
          onError={handleImageError}
          referrerPolicy="no-referrer"
        />
      )}

      {/* Fallback icon */}
      <div
        className={`absolute inset-0 flex items-center justify-center transition-opacity duration-200 ${
          shouldShowFallback ? "opacity-100" : "opacity-0"
        }`}
      >
        {fallbackIcon || (
          <UserIcon className={`${iconSizes[size]} text-white`} />
        )}
      </div>

      {/* Loading indicator */}
      {currentSrc && !imageLoaded && !imageError && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
    </div>
  );
};

export default ProfileImage;
