export const DEFAULT_CATEGORIES: Array<{
  name: string;
  type: "expense" | "income";
  icon?: string;
  subcategories: Array<{ name: string; icon?: string }>;
}> = [
  {
    name: "Food & Dining",
    type: "expense",
    icon: "utensils",
    subcategories: [
      { name: "Groceries", icon: "ShoppingCart" },
      { name: "Restaurants", icon: "Utensils" },
      { name: "Coffee", icon: "Coffee" },
      { name: "Delivery", icon: "Bike" },
    ],
  },
  {
    name: "Transport",
    type: "expense",
    icon: "Car",
    subcategories: [
      { name: "Fuel", icon: "Fuel" },
      { name: "Cab / Auto", icon: "CarTaxiFront" },
      { name: "Public Transit", icon: "Bus" },
      { name: "Parking & Tolls", icon: "SquareParking" },
    ],
  },
  {
    name: "Bills & Utilities",
    type: "expense",
    icon: "Receipt",
    subcategories: [
      { name: "Electricity", icon: "Zap" },
      { name: "Water", icon: "Droplets" },
      { name: "Internet", icon: "Wifi" },
      { name: "Mobile", icon: "Smartphone" },
      { name: "Rent", icon: "Home" },
    ],
  },
  {
    name: "Shopping",
    type: "expense",
    icon: "ShoppingBag",
    subcategories: [
      { name: "Clothing", icon: "Shirt" },
      { name: "Electronics", icon: "MonitorSmartphone" },
      { name: "Home & Kitchen", icon: "Sofa" },
    ],
  },
  {
    name: "Health",
    type: "expense",
    icon: "HeartPulse",
    subcategories: [
      { name: "Pharmacy", icon: "Pill" },
      { name: "Doctor", icon: "Stethoscope" },
      { name: "Insurance", icon: "ShieldCheck" },
    ],
  },
  {
    name: "Entertainment",
    type: "expense",
    icon: "Clapperboard",
    subcategories: [
      { name: "Movies", icon: "Popcorn" },
      { name: "Subscriptions", icon: "Tv" },
      { name: "Games", icon: "Gamepad2" },
    ],
  },
  {
    name: "Investments",
    type: "expense",
    icon: "TrendingUp",
    subcategories: [
      { name: "Stocks", icon: "CandlestickChart" },
      { name: "Mutual Funds", icon: "PieChart" },
      { name: "Fixed Deposit", icon: "Landmark" },
      { name: "Gold", icon: "Coins" },
    ],
  },
  {
    name: "Other Expense",
    type: "expense",
    icon: "CircleEllipsis",
    subcategories: [{ name: "Miscellaneous", icon: "CircleEllipsis" }],
  },
  {
    name: "Salary",
    type: "income",
    icon: "Wallet",
    subcategories: [{ name: "Monthly Salary", icon: "CalendarCheck" }],
  },
  {
    name: "Business",
    type: "income",
    icon: "Briefcase",
    subcategories: [{ name: "Consulting", icon: "BriefcaseBusiness" }],
  },
  {
    name: "Investment Returns",
    type: "income",
    icon: "TrendingUp",
    subcategories: [
      { name: "Dividends", icon: "Banknote" },
      { name: "Capital Gains", icon: "TrendingUp" },
      { name: "Interest", icon: "Percent" },
    ],
  },
  {
    name: "Other Income",
    type: "income",
    icon: "CircleEllipsis",
    subcategories: [{ name: "Gift / Refund", icon: "Gift" }],
  },
];
