import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const Logo: React.FC<LogoProps> = ({ size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12', 
    lg: 'w-16 h-16',
    xl: 'w-20 h-20'
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8', 
    xl: 'w-10 h-10'
  };

  return (
    <div className={`relative ${sizeClasses[size]} ${className}`}>
      {/* Glowing background effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-xl blur-lg opacity-30 animate-pulse"></div>
      
      {/* Main logo container */}
      <div className="relative flex items-center justify-center w-full h-full bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-2xl border border-indigo-400/20">
        {/* MCP Logo - stylized M with circuit pattern */}
        <svg className={iconSizes[size]} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* M letter with modern geometric design */}
          <path 
            d="M3 20V4h3l3 8.5L12 4h3v16h-3v-9l-2.5 7h-1L6 11v9H3z" 
            fill="white" 
            className="drop-shadow-sm"
          />
          {/* Circuit elements */}
          <circle cx="18" cy="6" r="1" fill="white" opacity="0.8" />
          <circle cx="18" cy="18" r="1" fill="white" opacity="0.8" />
          <path d="M18 7v4M18 13v4" stroke="white" strokeWidth="0.5" opacity="0.6" />
          <path d="M16 8h4M16 16h4" stroke="white" strokeWidth="0.5" opacity="0.6" />
        </svg>
      </div>
    </div>
  );
};

export default Logo;
