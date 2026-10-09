import React from "react";

export interface IconProps {
  size?: number;
  className?: string;
}

// 1. Food & Dining / Utensils: A savory warm rice bowl with steam and chopsticks
export function RiceBowlIcon({ size = 18, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={`inline-block shrink-0 ${className}`}>
      <defs>
        <linearGradient id="rb-bowl" x1="4" y1="10" x2="20" y2="21" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FF7A00" />
          <stop offset="1" stopColor="#E63946" />
        </linearGradient>
        <linearGradient id="rb-rice" x1="6" y1="8" x2="18" y2="13" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFFDF7" />
          <stop offset="1" stopColor="#FFE8B2" />
        </linearGradient>
      </defs>
      <line x1="5" y1="4" x2="19" y2="10" stroke="#8D5B4C" strokeWidth="1.6" strokeLinecap="round" />
      <line x1="5" y1="2" x2="19" y2="7.5" stroke="#C47A53" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M9 4.5C8.5 5.5 9.5 6 9 7" stroke="#FFA726" strokeWidth="1.2" strokeLinecap="round" opacity="0.85" />
      <path d="M12 3.5C11.5 4.5 12.5 5 12 6" stroke="#FFA726" strokeWidth="1.2" strokeLinecap="round" opacity="0.85" />
      <path d="M15 4C14.5 5 15.5 5.5 15 6.5" stroke="#FFA726" strokeWidth="1.2" strokeLinecap="round" opacity="0.85" />
      <path d="M5.5 11.5C5.8 8.5 9.2 8 12 8C14.8 8 18.2 8.5 18.5 11.5Z" fill="url(#rb-rice)" />
      <circle cx="11.5" cy="9.2" r="1.1" fill="#10B981" />
      <circle cx="13.2" cy="9.8" r="0.9" fill="#059669" />
      <circle cx="10.2" cy="10" r="0.8" fill="#34D399" />
      <path d="M4 11C4 16.5 7.5 19.5 12 19.5C16.5 19.5 20 16.5 20 11H4Z" fill="url(#rb-bowl)" />
      <path d="M8.5 19.5H15.5V21C15.5 21.3 15.2 21.5 14.8 21.5H9.2C8.8 21.5 8.5 21.3 8.5 21V19.5Z" fill="#C1272D" />
      <path d="M4.5 11.8C8 12.8 16 12.8 19.5 11.8" stroke="#FFE0B2" strokeWidth="1" strokeLinecap="round" opacity="0.6" />
    </svg>
  );
}

// 2. Transport / Car: Sleek aerodynamic modern automobile
export function ModernCarIcon({ size = 18, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={`inline-block shrink-0 ${className}`}>
      <defs>
        <linearGradient id="mc-body" x1="2" y1="6" x2="22" y2="18" gradientUnits="userSpaceOnUse">
          <stop stopColor="#38BDF8" />
          <stop offset="0.6" stopColor="#0284C7" />
          <stop offset="1" stopColor="#0369A1" />
        </linearGradient>
        <linearGradient id="mc-glass" x1="6" y1="7" x2="18" y2="12" gradientUnits="userSpaceOnUse">
          <stop stopColor="#E0F2FE" />
          <stop offset="1" stopColor="#7DD3FC" />
        </linearGradient>
      </defs>
      <path d="M5.5 11.5L7.8 6.5C8.1 5.8 8.8 5.4 9.6 5.4H15.4C16.2 5.4 16.9 5.8 17.2 6.5L19.5 11.5H5.5Z" fill="url(#mc-glass)" />
      <rect x="12" y="6" width="1.2" height="5.5" fill="#0284C7" />
      <path d="M2 13C2 11.8 3 11 4.5 11H20.5C21.8 11 22.8 11.8 22.8 13L22.2 16.5C22.1 17.3 21.4 17.8 20.6 17.8H4.2C3.4 17.8 2.7 17.2 2.6 16.4L2 13Z" fill="url(#mc-body)" />
      <path d="M2.2 13.5C2.5 13 3.5 13 4 13.5L3.8 14.8C3.2 15 2.4 14.5 2.2 13.5Z" fill="#FDE047" />
      <path d="M22.6 13.5C22.3 13 21.3 13 20.8 13.5L21 14.8C21.6 15 22.4 14.5 22.6 13.5Z" fill="#EF4444" />
      <circle cx="6.5" cy="17.5" r="3.2" fill="#1E293B" />
      <circle cx="6.5" cy="17.5" r="1.5" fill="#94A3B8" />
      <circle cx="17.5" cy="17.5" r="3.2" fill="#1E293B" />
      <circle cx="17.5" cy="17.5" r="1.5" fill="#94A3B8" />
      <ellipse cx="12" cy="21" rx="9" ry="1.2" fill="#000000" opacity="0.3" />
    </svg>
  );
}

// 3. Coffee: Rich steaming espresso cup
export function CoffeeCupIcon({ size = 18, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={`inline-block shrink-0 ${className}`}>
      <defs>
        <linearGradient id="cf-cup" x1="4" y1="9" x2="18" y2="20" gradientUnits="userSpaceOnUse">
          <stop stopColor="#D97706" />
          <stop offset="1" stopColor="#B45309" />
        </linearGradient>
      </defs>
      <path d="M8 3.5C7.5 4.5 8.5 5 8 6" stroke="#F59E0B" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M12 2.5C11.5 3.5 12.5 4 12 5" stroke="#FBBF24" strokeWidth="1.3" strokeLinecap="round" />
      <ellipse cx="11.5" cy="20" rx="9" ry="1.8" fill="#78350F" opacity="0.8" />
      <ellipse cx="11.5" cy="19.5" rx="7.5" ry="1.3" fill="#FDE68A" />
      <path d="M16 10.5C18.5 10.5 19.5 12 19.5 13.5C19.5 15.5 18 16.5 16 16.5" stroke="#D97706" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M5 9H17V15C17 17.5 14.5 19 11 19C7.5 19 5 17.5 5 15V9Z" fill="url(#cf-cup)" />
      <ellipse cx="11" cy="9.2" rx="5.8" ry="1.8" fill="#451A03" />
      <ellipse cx="10.5" cy="9.2" rx="4.5" ry="1.2" fill="#78350F" />
      <circle cx="12" cy="9.2" r="0.7" fill="#FDE68A" />
    </svg>
  );
}

// 4. Shopping Cart / Groceries
export function GroceryCartIcon({ size = 18, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={`inline-block shrink-0 ${className}`}>
      <path d="M3 4H5.5L8 15H17.5L20 7H6.5" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="9.5" cy="8.5" r="2.2" fill="#EF4444" />
      <circle cx="13" cy="7.5" r="2.2" fill="#F59E0B" />
      <circle cx="15.8" cy="8.8" r="2" fill="#84CC16" />
      <line x1="8" y1="11" x2="18.5" y2="11" stroke="#34D399" strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="9" cy="19" r="1.8" fill="#F1F5F9" />
      <circle cx="9" cy="19" r="0.8" fill="#0F172A" />
      <circle cx="17" cy="19" r="1.8" fill="#F1F5F9" />
      <circle cx="17" cy="19" r="0.8" fill="#0F172A" />
    </svg>
  );
}

// 5. Delivery / Bike: Speedy delivery scooter
export function DeliveryBikeIcon({ size = 18, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={`inline-block shrink-0 ${className}`}>
      <circle cx="6" cy="17" r="3" fill="#1E293B" />
      <circle cx="6" cy="17" r="1.2" fill="#94A3B8" />
      <circle cx="18" cy="17" r="3" fill="#1E293B" />
      <circle cx="18" cy="17" r="1.2" fill="#94A3B8" />
      <path d="M6 17L10 16L12 11H15L17.5 17" stroke="#10B981" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15 8L14 11" stroke="#34D399" strokeWidth="2" strokeLinecap="round" />
      <line x1="13" y1="8" x2="16.5" y2="8" stroke="#F1F5F9" strokeWidth="1.8" strokeLinecap="round" />
      <rect x="5.5" y="9" width="4.5" height="5" rx="1" fill="#F97316" />
      <line x1="5.5" y1="11.5" x2="10" y2="11.5" stroke="#FFFFFF" strokeWidth="0.8" />
    </svg>
  );
}

// 6. Bills & Utilities / Electricity: Radiant golden energy bolt
export function LightningBoltIcon({ size = 18, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={`inline-block shrink-0 ${className}`}>
      <defs>
        <linearGradient id="lb-grad" x1="13" y1="2" x2="7" y2="22" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FDE047" />
          <stop offset="0.5" stopColor="#F59E0B" />
          <stop offset="1" stopColor="#D97706" />
        </linearGradient>
      </defs>
      <path
        d="M13.5 2L5.5 12.5H12L10.5 22L18.5 11.5H12L13.5 2Z"
        fill="url(#lb-grad)"
        stroke="#FEF08A"
        strokeWidth="0.8"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="1.2" fill="#FFFFFF" opacity="0.8" />
    </svg>
  );
}

// 7. Water / Droplet: Sparkling crystal aqua drop
export function WaterDropletIcon({ size = 18, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={`inline-block shrink-0 ${className}`}>
      <defs>
        <linearGradient id="wd-grad" x1="12" y1="3" x2="12" y2="21" gradientUnits="userSpaceOnUse">
          <stop stopColor="#38BDF8" />
          <stop offset="1" stopColor="#0284C7" />
        </linearGradient>
      </defs>
      <path
        d="M12 2.5C12 2.5 5 11 5 15.5C5 19.1 8.1 22 12 22C15.9 22 19 19.1 19 15.5C19 11 12 2.5 12 2.5Z"
        fill="url(#wd-grad)"
      />
      <path
        d="M9 13.5C9 11.5 11 8.5 12 7.5"
        stroke="#BAE6FD"
        strokeWidth="1.6"
        strokeLinecap="round"
        opacity="0.8"
      />
      <circle cx="15" cy="17" r="1.5" fill="#E0F2FE" opacity="0.6" />
    </svg>
  );
}

// 8. Internet / Wifi: Radiant cyan-emerald signal
export function WifiSignalIcon({ size = 18, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={`inline-block shrink-0 ${className}`}>
      <path d="M3 8.5C7.9 4.8 16.1 4.8 21 8.5" stroke="#06B6D4" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M6 12C9.5 9.3 14.5 9.3 18 12" stroke="#22D3EE" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M9.5 15.5C11 14.3 13 14.3 14.5 15.5" stroke="#67E8F9" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="12" cy="19.5" r="1.8" fill="#22D3EE" />
    </svg>
  );
}

// 9. Mobile / Smartphone
export function SmartphoneModernIcon({ size = 18, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={`inline-block shrink-0 ${className}`}>
      <rect x="6" y="2.5" width="12" height="19" rx="2.5" fill="#1E293B" stroke="#64748B" strokeWidth="1" />
      <rect x="7" y="4" width="10" height="15" rx="1.5" fill="#0F172A" />
      <circle cx="9" cy="7" r="1" fill="#38BDF8" />
      <circle cx="12" cy="7" r="1" fill="#10B981" />
      <circle cx="15" cy="7" r="1" fill="#F59E0B" />
      <circle cx="9" cy="10.5" r="1" fill="#EC4899" />
      <circle cx="12" cy="10.5" r="1" fill="#8B5CF6" />
      <circle cx="15" cy="10.5" r="1" fill="#06B6D4" />
      <line x1="10.5" y1="3.3" x2="13.5" y2="3.3" stroke="#94A3B8" strokeWidth="0.8" strokeLinecap="round" />
      <line x1="10" y1="20.2" x2="14" y2="20.2" stroke="#94A3B8" strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
}

// 10. Home / Rent: Cozy warm house
export function HomeWarmIcon({ size = 18, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={`inline-block shrink-0 ${className}`}>
      <defs>
        <linearGradient id="hw-roof" x1="4" y1="3" x2="20" y2="11" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F97316" />
          <stop offset="1" stopColor="#EA580C" />
        </linearGradient>
      </defs>
      <rect x="16" y="4" width="2.5" height="5" fill="#C2410C" />
      <path d="M2.5 11.5L12 3.5L21.5 11.5H2.5Z" fill="url(#hw-roof)" />
      <rect x="5" y="11" width="14" height="10" rx="1" fill="#FDBA74" />
      <rect x="10" y="14" width="4" height="7" rx="0.8" fill="#7C2D12" />
      <circle cx="13" cy="17.5" r="0.6" fill="#FDE047" />
      <rect x="6.5" y="13" width="2.5" height="2.5" rx="0.5" fill="#FEF08A" />
      <rect x="15" y="13" width="2.5" height="2.5" rx="0.5" fill="#FEF08A" />
    </svg>
  );
}

// 11. Shopping Bag: Vivid magenta-pink retail tote
export function ShoppingBagVividIcon({ size = 18, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={`inline-block shrink-0 ${className}`}>
      <defs>
        <linearGradient id="sb-grad" x1="4" y1="6" x2="20" y2="22" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F43F5E" />
          <stop offset="1" stopColor="#E11D48" />
        </linearGradient>
      </defs>
      <path d="M8.5 7V5.5C8.5 3.5 10 2 12 2C14 2 15.5 3.5 15.5 5.5V7" stroke="#FDA4AF" strokeWidth="2" strokeLinecap="round" />
      <path d="M4.5 7L3.5 21C3.5 21.6 4 22 4.6 22H19.4C20 22 20.5 21.6 20.5 21L19.5 7H4.5Z" fill="url(#sb-grad)" />
      <circle cx="12" cy="14" r="2.8" fill="#FFE4E6" />
      <path d="M12 12.2L12.6 13.5L14 13.7L12.9 14.7L13.2 16L12 15.3L10.8 16L11.1 14.7L10 13.7L11.4 13.5L12 12.2Z" fill="#E11D48" />
    </svg>
  );
}

// 12. Clothing / Shirt: Crisp stylish polo
export function ShirtPoloIcon({ size = 18, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={`inline-block shrink-0 ${className}`}>
      <defs>
        <linearGradient id="sp-grad" x1="3" y1="4" x2="21" y2="20" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6366F1" />
          <stop offset="1" stopColor="#4338CA" />
        </linearGradient>
      </defs>
      <path d="M8 3.5L12 6.5L16 3.5L20.5 6L18 10L16 8.5V20.5H8V8.5L6 10L3.5 6L8 3.5Z" fill="url(#sp-grad)" />
      <path d="M8 3.5L12 7.5L16 3.5" stroke="#A5B4FC" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="12" cy="10.5" r="0.7" fill="#FFFFFF" />
      <circle cx="12" cy="13.5" r="0.7" fill="#FFFFFF" />
    </svg>
  );
}

// 13. Electronics / Gadgets: Laptop & Tablet
export function ElectronicsIcon({ size = 18, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={`inline-block shrink-0 ${className}`}>
      <rect x="4" y="5" width="16" height="11" rx="1.5" fill="#0EA5E9" stroke="#38BDF8" strokeWidth="1" />
      <rect x="5.5" y="6.5" width="13" height="8" rx="0.8" fill="#0F172A" />
      <path d="M2 17.5C2 16.7 2.7 16 3.5 16H20.5C21.3 16 22 16.7 22 17.5V18.5C22 18.8 21.8 19 21.5 19H2.5C2.2 19 2 18.8 2 18.5V17.5Z" fill="#94A3B8" />
      <rect x="10" y="16.5" width="4" height="1" rx="0.5" fill="#475569" />
    </svg>
  );
}

// 14. Health / Pharmacy / Pill: Dual-color medicine capsule
export function CapsulePillIcon({ size = 18, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={`inline-block shrink-0 ${className}`}>
      <g transform="rotate(-45 12 12)">
        <path d="M7 6C7 3.8 8.8 2 11 2H13C15.2 2 17 3.8 17 6V11H7V6Z" fill="#EF4444" />
        <path d="M7 11H17V18C17 20.2 15.2 22 13 22H11C8.8 22 7 20.2 7 18V11Z" fill="#E2E8F0" />
        <rect x="11.2" y="5.5" width="1.6" height="4.5" rx="0.4" fill="#FFFFFF" />
        <rect x="9.8" y="7" width="4.4" height="1.6" rx="0.4" fill="#FFFFFF" />
        <line x1="8.5" y1="4" x2="8.5" y2="19" stroke="#FFFFFF" strokeWidth="1" strokeLinecap="round" opacity="0.6" />
      </g>
    </svg>
  );
}

// 15. Stethoscope / Doctor
export function StethoscopeIcon({ size = 18, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={`inline-block shrink-0 ${className}`}>
      <path d="M6 3V9C6 12.3 8.7 15 12 15C15.3 15 18 12.3 18 9V3" stroke="#10B981" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M12 15V18C12 19.5 13.5 21 15 21H17" stroke="#10B981" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="18.5" cy="21" r="2.2" fill="#047857" stroke="#34D399" strokeWidth="1" />
      <circle cx="5" cy="3" r="1.5" fill="#F1F5F9" />
      <circle cx="19" cy="3" r="1.5" fill="#F1F5F9" />
    </svg>
  );
}

// 16. Insurance / Shield
export function ShieldGoldIcon({ size = 18, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={`inline-block shrink-0 ${className}`}>
      <defs>
        <linearGradient id="sh-grad" x1="4" y1="3" x2="20" y2="21" gradientUnits="userSpaceOnUse">
          <stop stopColor="#10B981" />
          <stop offset="1" stopColor="#047857" />
        </linearGradient>
      </defs>
      <path
        d="M12 2.5L4 6V12.5C4 17.5 7.5 21.2 12 22.5C16.5 21.2 20 17.5 20 12.5V6L12 2.5Z"
        fill="url(#sh-grad)"
        stroke="#34D399"
        strokeWidth="1"
      />
      <path d="M8.5 12.5L11 15L15.5 10" stroke="#FDE047" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// 17. Entertainment / Movies / Clapperboard
export function ClapperboardMovieIcon({ size = 18, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={`inline-block shrink-0 ${className}`}>
      <rect x="3" y="8" width="18" height="13" rx="2" fill="#BE123C" />
      <circle cx="8" cy="14.5" r="1.8" fill="#FDE047" />
      <circle cx="16" cy="14.5" r="1.8" fill="#FDE047" />
      <path d="M11 13L13.5 14.5L11 16V13Z" fill="#FFFFFF" />
      <rect x="3" y="3.5" width="18" height="4.5" rx="1" fill="#1E293B" />
      <line x1="6" y1="3.5" x2="8" y2="8" stroke="#FFFFFF" strokeWidth="1.8" />
      <line x1="11" y1="3.5" x2="13" y2="8" stroke="#FFFFFF" strokeWidth="1.8" />
      <line x1="16" y1="3.5" x2="18" y2="8" stroke="#FFFFFF" strokeWidth="1.8" />
    </svg>
  );
}

// 18. Television / Subscriptions
export function TelevisionSmartIcon({ size = 18, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={`inline-block shrink-0 ${className}`}>
      <rect x="3" y="4" width="18" height="13" rx="2" fill="#1E1B4B" stroke="#8B5CF6" strokeWidth="1.2" />
      <rect x="4.5" y="5.5" width="15" height="10" rx="1" fill="#4C1D95" />
      <circle cx="9" cy="10.5" r="2" fill="#EC4899" />
      <circle cx="14" cy="10.5" r="2.5" fill="#38BDF8" opacity="0.8" />
      <path d="M9 17L8 20.5M15 17L16 20.5" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

// 19. Gaming / Gamepad
export function GamepadIcon({ size = 18, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={`inline-block shrink-0 ${className}`}>
      <path
        d="M6 7H18C20.5 7 22 9.5 21.5 13L20 18C19.5 19.5 18 19.5 17 18.5L14 15.5H10L7 18.5C6 19.5 4.5 19.5 4 18L2.5 13C2 9.5 3.5 7 6 7Z"
        fill="#4F46E5"
        stroke="#818CF8"
        strokeWidth="1.2"
      />
      <path d="M7 11V14M5.5 12.5H8.5" stroke="#FFFFFF" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="16.5" cy="11.5" r="0.9" fill="#F43F5E" />
      <circle cx="18" cy="13" r="0.9" fill="#10B981" />
      <circle cx="15" cy="13" r="0.9" fill="#F59E0B" />
      <circle cx="16.5" cy="14.5" r="0.9" fill="#06B6D4" />
    </svg>
  );
}

// 20. Investments / Stocks: Growth chart & candlesticks
export function StocksGrowthIcon({ size = 18, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={`inline-block shrink-0 ${className}`}>
      <rect x="5" y="9" width="3" height="8" rx="0.8" fill="#10B981" />
      <line x1="6.5" y1="6" x2="6.5" y2="9" stroke="#34D399" strokeWidth="1.2" />
      <line x1="6.5" y1="17" x2="6.5" y2="19" stroke="#34D399" strokeWidth="1.2" />
      <rect x="11" y="6" width="3" height="10" rx="0.8" fill="#10B981" />
      <line x1="12.5" y1="3.5" x2="12.5" y2="6" stroke="#34D399" strokeWidth="1.2" />
      <line x1="12.5" y1="16" x2="12.5" y2="19.5" stroke="#34D399" strokeWidth="1.2" />
      <path d="M4 16L10 10L14 13L20 5" stroke="#FDE047" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 5H20V9" stroke="#FDE047" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// 21. Mutual Funds / PieChart
export function MutualFundsPieIcon({ size = 18, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={`inline-block shrink-0 ${className}`}>
      <path d="M12 12L12 3C16.97 3 21 7.03 21 12H12Z" fill="#10B981" />
      <path d="M12 12L21 12C21 16.97 16.97 21 12 21V12Z" fill="#06B6D4" />
      <path d="M12 12V21C7.03 21 3 16.97 3 12C3 7.03 7.03 3 12 3V12Z" fill="#F59E0B" />
      <circle cx="12" cy="12" r="3" fill="#0F172A" />
    </svg>
  );
}

// 22. Bank / Fixed Deposit: Classical neo-classical bank columns
export function BankVaultIcon({ size = 18, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={`inline-block shrink-0 ${className}`}>
      <defs>
        <linearGradient id="bv-grad" x1="3" y1="3" x2="21" y2="21" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FBBF24" />
          <stop offset="1" stopColor="#D97706" />
        </linearGradient>
      </defs>
      <path d="M12 3L3 7.5H21L12 3Z" fill="url(#bv-grad)" />
      <rect x="3" y="7.5" width="18" height="2" fill="#B45309" />
      <rect x="5" y="9.5" width="2.5" height="8.5" rx="0.5" fill="#FDE68A" />
      <rect x="10.8" y="9.5" width="2.5" height="8.5" rx="0.5" fill="#FDE68A" />
      <rect x="16.5" y="9.5" width="2.5" height="8.5" rx="0.5" fill="#FDE68A" />
      <rect x="2" y="18" width="20" height="3" rx="0.8" fill="url(#bv-grad)" />
    </svg>
  );
}

// 23. Gold Coins
export function GoldCoinsIcon({ size = 18, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={`inline-block shrink-0 ${className}`}>
      <defs>
        <linearGradient id="gc-coin" x1="6" y1="6" x2="18" y2="18" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FDE047" />
          <stop offset="1" stopColor="#EAB308" />
        </linearGradient>
      </defs>
      <ellipse cx="9" cy="11" rx="5.5" ry="3.5" fill="#CA8A04" />
      <ellipse cx="9" cy="9.5" rx="5.5" ry="3.5" fill="url(#gc-coin)" stroke="#FEF08A" strokeWidth="0.8" />
      <ellipse cx="14" cy="17" rx="6.5" ry="4" fill="#A16207" />
      <ellipse cx="14" cy="14.5" rx="6.5" ry="4" fill="url(#gc-coin)" stroke="#FEF08A" strokeWidth="0.8" />
      <text x="14" y="16" textAnchor="middle" fontSize="5" fontWeight="bold" fill="#713F12">₹</text>
      <polygon points="19,5 20,7 22,8 20,9 19,11 18,9 16,8 18,7" fill="#FEF08A" />
    </svg>
  );
}

// 24. Salary / Wallet with Cash: Emerald wallet overflowing with currency
export function SalaryWalletIcon({ size = 18, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={`inline-block shrink-0 ${className}`}>
      <defs>
        <linearGradient id="sw-wallet" x1="3" y1="8" x2="21" y2="21" gradientUnits="userSpaceOnUse">
          <stop stopColor="#10B981" />
          <stop offset="1" stopColor="#047857" />
        </linearGradient>
      </defs>
      <rect x="6" y="4" width="12" height="6" rx="1" fill="#86EFAC" stroke="#22C55E" strokeWidth="0.8" />
      <circle cx="12" cy="7" r="1.2" fill="#15803D" />
      <rect x="3" y="7.5" width="18" height="13" rx="2.5" fill="url(#sw-wallet)" stroke="#34D399" strokeWidth="0.8" />
      <path d="M16 11.5H21V16.5H16C14.6 16.5 13.5 15.4 13.5 14C13.5 12.6 14.6 11.5 16 11.5Z" fill="#065F46" />
      <circle cx="16.5" cy="14" r="1.2" fill="#FDE047" />
    </svg>
  );
}

// 25. Business / Briefcase
export function BriefcaseExecutiveIcon({ size = 18, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={`inline-block shrink-0 ${className}`}>
      <defs>
        <linearGradient id="be-grad" x1="3" y1="7" x2="21" y2="21" gradientUnits="userSpaceOnUse">
          <stop stopColor="#3B82F6" />
          <stop offset="1" stopColor="#1D4ED8" />
        </linearGradient>
      </defs>
      <path d="M9 7V5C9 4 10 3 11 3H13C14 3 15 4 15 5V7" stroke="#93C5FD" strokeWidth="2" strokeLinecap="round" />
      <rect x="3" y="7" width="18" height="13.5" rx="2" fill="url(#be-grad)" />
      <line x1="3" y1="12" x2="21" y2="12" stroke="#60A5FA" strokeWidth="1" />
      <rect x="10.5" y="11" width="3" height="3" rx="0.6" fill="#FDE047" />
    </svg>
  );
}

// 26. Dividends / Investment Returns / Banknote
export function BanknoteMoneyIcon({ size = 18, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={`inline-block shrink-0 ${className}`}>
      <rect x="2.5" y="6" width="19" height="12" rx="2" fill="#059669" stroke="#34D399" strokeWidth="1" />
      <circle cx="12" cy="12" r="3" fill="#10B981" stroke="#6EE7B7" strokeWidth="0.8" />
      <text x="12" y="13.8" textAnchor="middle" fontSize="5.5" fontWeight="bold" fill="#ECFDF5">₹</text>
      <circle cx="5.5" cy="9" r="1" fill="#6EE7B7" opacity="0.7" />
      <circle cx="18.5" cy="15" r="1" fill="#6EE7B7" opacity="0.7" />
    </svg>
  );
}

// 27. Gift Box
export function GiftBoxIcon({ size = 18, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={`inline-block shrink-0 ${className}`}>
      <path d="M12 4.5C10 2 7 2 7 4C7 6 12 7 12 7Z" fill="#FDE047" />
      <path d="M12 4.5C14 2 17 2 17 4C17 6 12 7 12 7Z" fill="#FDE047" />
      <rect x="3" y="7" width="18" height="3.5" rx="1" fill="#EC4899" />
      <rect x="10.8" y="7" width="2.4" height="3.5" fill="#FDE047" />
      <rect x="4" y="10.5" width="16" height="10" rx="1" fill="#DB2777" />
      <rect x="10.8" y="10.5" width="2.4" height="10" fill="#FDE047" />
    </svg>
  );
}

// 28. Travel / Flight / Airplane
export function AirplaneTravelIcon({ size = 18, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={`inline-block shrink-0 ${className}`}>
      <defs>
        <linearGradient id="ap-grad" x1="3" y1="3" x2="21" y2="21" gradientUnits="userSpaceOnUse">
          <stop stopColor="#38BDF8" />
          <stop offset="1" stopColor="#0284C7" />
        </linearGradient>
      </defs>
      <path
        d="M21 3L14.5 10L6.5 7.5L4.5 9.5L10 13.5L7 16.5L4 16L3 17.5L6.5 19L8 22.5L9.5 21.5L9 18.5L12 15.5L16 21L18 19L15.5 11L22.5 4.5C23 4 22 2 21 3Z"
        fill="url(#ap-grad)"
      />
      <circle cx="18" cy="6" r="1" fill="#FFFFFF" />
    </svg>
  );
}

// 29. Graduation Cap / Education
export function GraduationCapIcon({ size = 18, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={`inline-block shrink-0 ${className}`}>
      <polygon points="12,3 2,8 12,13 22,8" fill="#6366F1" stroke="#A5B4FC" strokeWidth="0.8" />
      <path d="M6 10.5V16C6 18.5 8.7 20.5 12 20.5C15.3 20.5 18 18.5 18 16V10.5" fill="#4F46E5" />
      <path d="M20 9V15.5L21.5 17" stroke="#FDE047" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

// 30. Fitness / Dumbbell
export function DumbbellFitnessIcon({ size = 18, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={`inline-block shrink-0 ${className}`}>
      <g transform="rotate(-45 12 12)">
        <rect x="10.5" y="4" width="3" height="16" rx="1.5" fill="#94A3B8" />
        <rect x="8" y="5" width="8" height="2.5" rx="1" fill="#F97316" />
        <rect x="9.5" y="2.5" width="5" height="2.5" rx="0.8" fill="#EA580C" />
        <rect x="8" y="16.5" width="8" height="2.5" rx="1" fill="#F97316" />
        <rect x="9.5" y="19" width="5" height="2.5" rx="0.8" fill="#EA580C" />
      </g>
    </svg>
  );
}

// 31. Baby / Kids
export function BabyCareIcon({ size = 18, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={`inline-block shrink-0 ${className}`}>
      <circle cx="12" cy="10" r="6" fill="#F472B6" />
      <circle cx="10" cy="9.5" r="1" fill="#1E293B" />
      <circle cx="14" cy="9.5" r="1" fill="#1E293B" />
      <path d="M10.5 12.5C11 13.5 13 13.5 13.5 12.5" stroke="#FFFFFF" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M12 4C11.5 2.5 12.5 2 12 1" stroke="#FBCFE8" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="12" cy="18" r="3" fill="#FB7185" />
    </svg>
  );
}

// 32. Pet / Paw Print
export function PawPrintPetIcon({ size = 18, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={`inline-block shrink-0 ${className}`}>
      <ellipse cx="12" cy="15.5" rx="5" ry="4" fill="#FB923C" />
      <ellipse cx="6.5" cy="10" rx="2" ry="2.8" fill="#F97316" />
      <ellipse cx="10" cy="6.5" rx="2" ry="2.8" fill="#F97316" />
      <ellipse cx="14" cy="6.5" rx="2" ry="2.8" fill="#F97316" />
      <ellipse cx="17.5" cy="10" rx="2" ry="2.8" fill="#F97316" />
    </svg>
  );
}

// 33. Transfer / Arrow
export function TransferArrowIcon({ size = 18, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={`inline-block shrink-0 ${className}`}>
      <path d="M4 8H17M17 8L13 4M17 8L13 12" stroke="#38BDF8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20 16H7M7 16L11 12M7 16L11 20" stroke="#34D399" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// 34. Other / Miscellaneous Diamond
export function OtherMiscIcon({ size = 18, className = "" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={`inline-block shrink-0 ${className}`}>
      <rect x="5.5" y="5.5" width="13" height="13" rx="3.5" transform="rotate(45 12 12)" fill="#10B981" opacity="0.25" />
      <rect x="7" y="7" width="10" height="10" rx="2.5" transform="rotate(45 12 12)" fill="#34D399" />
      <circle cx="12" cy="12" r="2" fill="#003823" />
    </svg>
  );
}

const REGISTRY: Record<string, React.ComponentType<IconProps>> = {
  utensils: RiceBowlIcon,
  food: RiceBowlIcon,
  dining: RiceBowlIcon,
  restaurant: RiceBowlIcon,
  restaurants: RiceBowlIcon,
  rice: RiceBowlIcon,
  meal: RiceBowlIcon,
  shoppingcart: GroceryCartIcon,
  groceries: GroceryCartIcon,
  grocery: GroceryCartIcon,
  market: GroceryCartIcon,
  coffee: CoffeeCupIcon,
  cafe: CoffeeCupIcon,
  chai: CoffeeCupIcon,
  tea: CoffeeCupIcon,
  bike: DeliveryBikeIcon,
  delivery: DeliveryBikeIcon,
  scooter: DeliveryBikeIcon,
  swiggy: DeliveryBikeIcon,
  zomato: DeliveryBikeIcon,
  car: ModernCarIcon,
  transport: ModernCarIcon,
  travel: ModernCarIcon,
  fuel: ModernCarIcon,
  cartaxifront: ModernCarIcon,
  taxi: ModernCarIcon,
  auto: ModernCarIcon,
  cab: ModernCarIcon,
  bus: ModernCarIcon,
  squareparking: ModernCarIcon,
  receipt: LightningBoltIcon,
  zap: LightningBoltIcon,
  electricity: LightningBoltIcon,
  power: LightningBoltIcon,
  bills: LightningBoltIcon,
  utilities: LightningBoltIcon,
  droplets: WaterDropletIcon,
  water: WaterDropletIcon,
  wifi: WifiSignalIcon,
  internet: WifiSignalIcon,
  broadband: WifiSignalIcon,
  smartphone: SmartphoneModernIcon,
  mobile: SmartphoneModernIcon,
  phone: SmartphoneModernIcon,
  home: HomeWarmIcon,
  rent: HomeWarmIcon,
  house: HomeWarmIcon,
  housing: HomeWarmIcon,
  shoppingbag: ShoppingBagVividIcon,
  shopping: ShoppingBagVividIcon,
  shirt: ShirtPoloIcon,
  clothing: ShirtPoloIcon,
  apparel: ShirtPoloIcon,
  monitorsmartphone: ElectronicsIcon,
  electronics: ElectronicsIcon,
  gadgets: ElectronicsIcon,
  laptop: ElectronicsIcon,
  sofa: HomeWarmIcon,
  kitchen: HomeWarmIcon,
  heartpulse: StethoscopeIcon,
  pill: CapsulePillIcon,
  pharmacy: CapsulePillIcon,
  medicine: CapsulePillIcon,
  stethoscope: StethoscopeIcon,
  doctor: StethoscopeIcon,
  health: CapsulePillIcon,
  shieldcheck: ShieldGoldIcon,
  shield: ShieldGoldIcon,
  insurance: ShieldGoldIcon,
  clapperboard: ClapperboardMovieIcon,
  popcorn: ClapperboardMovieIcon,
  movies: ClapperboardMovieIcon,
  cinema: ClapperboardMovieIcon,
  entertainment: ClapperboardMovieIcon,
  tv: TelevisionSmartIcon,
  subscriptions: TelevisionSmartIcon,
  netflix: TelevisionSmartIcon,
  gamepad2: GamepadIcon,
  gamepad: GamepadIcon,
  games: GamepadIcon,
  gaming: GamepadIcon,
  trendingup: StocksGrowthIcon,
  stocks: StocksGrowthIcon,
  candlestickchart: StocksGrowthIcon,
  investments: StocksGrowthIcon,
  investment: StocksGrowthIcon,
  piechart: MutualFundsPieIcon,
  mutualfunds: MutualFundsPieIcon,
  funds: MutualFundsPieIcon,
  landmark: BankVaultIcon,
  fixeddeposit: BankVaultIcon,
  bank: BankVaultIcon,
  fd: BankVaultIcon,
  coins: GoldCoinsIcon,
  gold: GoldCoinsIcon,
  wallet: SalaryWalletIcon,
  salary: SalaryWalletIcon,
  income: SalaryWalletIcon,
  calendarcheck: SalaryWalletIcon,
  briefcase: BriefcaseExecutiveIcon,
  briefcasebusiness: BriefcaseExecutiveIcon,
  business: BriefcaseExecutiveIcon,
  consulting: BriefcaseExecutiveIcon,
  banknote: BanknoteMoneyIcon,
  dividends: BanknoteMoneyIcon,
  returns: BanknoteMoneyIcon,
  percent: BanknoteMoneyIcon,
  interest: BanknoteMoneyIcon,
  gift: GiftBoxIcon,
  plane: AirplaneTravelIcon,
  flight: AirplaneTravelIcon,
  graduationcap: GraduationCapIcon,
  education: GraduationCapIcon,
  dumbbell: DumbbellFitnessIcon,
  fitness: DumbbellFitnessIcon,
  gym: DumbbellFitnessIcon,
  baby: BabyCareIcon,
  kids: BabyCareIcon,
  pawprint: PawPrintPetIcon,
  pet: PawPrintPetIcon,
  circleellipsis: OtherMiscIcon,
  transfer: TransferArrowIcon,
  arrowleftright: TransferArrowIcon,
};

export function CatIcon({
  name,
  categoryName,
  size = 18,
  className = "",
}: {
  name?: string;
  categoryName?: string;
  size?: number;
  className?: string;
}) {
  const cleanKey = (name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const catKey = (categoryName || "").toLowerCase().replace(/[^a-z0-9]/g, "");

  const Component =
    REGISTRY[cleanKey] ||
    REGISTRY[catKey] ||
    (catKey.includes("food") || catKey.includes("dine")
      ? RiceBowlIcon
      : catKey.includes("travel") || catKey.includes("car") || catKey.includes("transport")
      ? ModernCarIcon
      : catKey.includes("coffee")
      ? CoffeeCupIcon
      : catKey.includes("shop")
      ? ShoppingBagVividIcon
      : catKey.includes("bill") || catKey.includes("util")
      ? LightningBoltIcon
      : catKey.includes("health") || catKey.includes("med")
      ? CapsulePillIcon
      : catKey.includes("entertain") || catKey.includes("movie")
      ? ClapperboardMovieIcon
      : catKey.includes("invest") || catKey.includes("stock")
      ? StocksGrowthIcon
      : catKey.includes("sal") || catKey.includes("earn")
      ? SalaryWalletIcon
      : OtherMiscIcon);

  return <Component size={size} className={className} />;
}
