import {
  Utensils, ShoppingCart, Coffee, Bike, Car, CarTaxiFront, Bus, SquareParking,
  Receipt, Zap, Droplets, Wifi, Smartphone, Home, ShoppingBag, Shirt,
  MonitorSmartphone, Sofa, HeartPulse, Pill, Stethoscope, ShieldCheck,
  Clapperboard, Popcorn, Tv, Gamepad2, TrendingUp, CandlestickChart, PieChart,
  Landmark, Coins, CircleEllipsis, Wallet, CalendarCheck, Briefcase,
  BriefcaseBusiness, Banknote, Percent, Gift, Plane, GraduationCap, Dumbbell,
  Baby, PawPrint,
} from "lucide-react";

const MAP: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  Utensils, ShoppingCart, Coffee, Bike, Car, CarTaxiFront, Bus, SquareParking,
  Receipt, Zap, Droplets, Wifi, Smartphone, Home, ShoppingBag, Shirt,
  MonitorSmartphone, Sofa, HeartPulse, Pill, Stethoscope, ShieldCheck,
  Clapperboard, Popcorn, Tv, Gamepad2, TrendingUp, CandlestickChart, PieChart,
  Landmark, Coins, CircleEllipsis, Wallet, CalendarCheck, Briefcase,
  BriefcaseBusiness, Banknote, Percent, Gift, Plane, GraduationCap, Dumbbell,
  Baby, PawPrint,
};

export function CatIcon({
  name,
  size = 16,
  className = "",
}: {
  name?: string;
  size?: number;
  className?: string;
}) {
  const Icon = (name && MAP[name]) || CircleEllipsis;
  return <Icon size={size} className={className} />;
}
