export type UserRole = "admin" | "manager" | "staff" | "accountant" | "viewer";
export type SubscriptionStatus = "pending_approval" | "trial" | "active" | "expired";

export type BusinessType = "Sole Proprietor" | "Partnership" | "LLP" | "Private Limited" | "Public Limited" | "Other";
export type OnboardingStatus = "pending" | "in_progress" | "completed";
export type AccountStatus = "active" | "suspended" | "pending_verification";

export interface Organization {
  id?: string;
  name: string; // business_name
  businessType: BusinessType;
  primaryContactName: string;
  email: string;
  phoneNumber: string;
  termsAccepted: boolean;
  privacyPolicyAccepted: boolean;
  ownerUid: string;
  createdAt: string;
  subscriptionStatus: SubscriptionStatus;
  
  // Optional Business Information
  legalBusinessName?: string;
  industryCategory?: string;
  subIndustry?: string;
  businessDescription?: string;
  yearEstablished?: number;
  companySize?: string;

  // Business Registration Details
  gstNumber?: string;
  panNumber?: string;
  cinNumber?: string;
  msmeRegistration?: string;
  tradeLicenseNumber?: string;
  registrationCertificateUrl?: string;

  // Contact Information
  designation?: string;
  alternatePhone?: string;
  supportEmail?: string;
  websiteUrl?: string;

  // Address Details
  registeredAddress?: string;
  operationalAddress?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  serviceLocations?: string[];

  // Financial & Billing Information
  billingContact?: string;
  billingEmail?: string;
  paymentMethod?: string;
  bankAccountName?: string;
  bankAccountNumber?: string;
  ifscCode?: string;
  subscriptionPlan?: string;

  // Document Verification (URLs)
  gstCertificateUrl?: string;
  panCardUrl?: string;
  incorporationCertificateUrl?: string;
  addressProofUrl?: string;
  authorizedSignatoryIdUrl?: string;

  // User Access & Roles
  adminUserEmail?: string;
  managerUsers?: string[];
  employeeCount?: number;
  rolePermissions?: any; // JSON or complex object

  // Service / Product Details
  servicesOffered?: string[];
  serviceRegions?: string[];
  pricingModel?: string;
  minimumContractValue?: number;

  // Compliance & Tracking
  kycVerified?: boolean;
  complianceStatus?: string;
  signupSource?: string;
  referralCode?: string;
  utmSource?: string;
  onboardingStatus: OnboardingStatus;
  accountStatus: AccountStatus;

  // App Specific
  razorpayKeyId?: string;
  razorpayKeySecret?: string;
  razorpaySkipped?: boolean;
  twoFactorEnabled?: boolean;
  twoFactorPin?: string;
  emailOtpEnabled?: boolean;
}

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  organizationId: string;
  onboardingCompleted?: boolean;
  accountStatus?: string;
  createdAt?: string;
}

export interface Otp {
  id?: string;
  email: string;
  otp: string;
  expiresAt: string;
  type: "login" | "password_reset" | "email_verification";
}

export type CustomerSegmentation = "Retail" | "Wholesale" | "Corporate";
export type PaymentTerms = "Net 15" | "Net 30" | "Net 60";

export interface ContactPerson {
  name: string;
  email: string;
  phone: string;
  designation: string;
}

export interface ActivityLog {
  action: string;
  date: string;
  userId: string;
}

export interface Customer {
  id?: string;
  name: string;
  companyName?: string;
  email?: string;
  phone?: string;
  gstNumber?: string;
  billingAddress?: string;
  shippingAddress?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  organizationId: string;
  
  // Advanced Features
  segmentation: CustomerSegmentation;
  creditLimit: number;
  paymentTerms: PaymentTerms;
  lifetimeValue: number;
  outstandingBalance: number;
  contactPersons: ContactPerson[];
  activityLog: ActivityLog[];
  notes?: string;
  createdAt: string;
}

export interface ProductVariant {
  name: string;
  value: string;
}

export interface BulkPricing {
  minQuantity: number;
  price: number;
}

export interface Product {
  id?: string;
  name: string;
  sku: string;
  barcode?: string;
  category: string;
  subcategory?: string;
  description?: string;
  uom: string; // Unit of Measure
  
  // Pricing
  costPrice: number;
  sellingPrice: number;
  wholesalePrice: number;
  taxRate: number;
  discountAllowed: number;
  
  // Advanced Features
  variants: ProductVariant[];
  bulkPricing: BulkPricing[];
  supplierId?: string;
  images: string[];
  tags: string[];
  status: "active" | "inactive";
  organizationId: string;
  createdAt: string;
}

export interface Inventory {
  id?: string;
  productId: string;
  warehouseLocation: string;
  stockQuantity: number;
  minimumStockLevel: number;
  reorderLevel: number;
  reorderQuantity: number;
  batchNumber?: string;
  expiryDate?: string;
  organizationId: string;
}

export interface InventoryLog {
  id?: string;
  productId: string;
  inventoryId?: string;
  type: "in" | "out" | "adjustment";
  change: number;
  reason: string;
  warehouseLocation?: string;
  userId: string;
  date: string;
  organizationId: string;
}

export interface InvoiceItem {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  taxAmount: number;
  discount: number;
  subtotal: number;
}

export type InvoiceStatus = "paid" | "unpaid" | "partially_paid" | "overdue" | "draft";

export interface Invoice {
  id?: string;
  invoiceNumber: string;
  customerId: string;
  date: string;
  dueDate: string;
  status: InvoiceStatus;
  
  // Totals
  totalAmount: number;
  totalTax: number;
  totalDiscount: number;
  grandTotal: number;
  
  items: InvoiceItem[];
  paymentMethod?: string;
  isRecurring: boolean;
  recurringInterval?: "monthly" | "quarterly" | "yearly";
  organizationId: string;
  createdAt: string;
}

export interface Expense {
  id?: string;
  category: string;
  amount: number;
  date: string;
  description?: string;
  organizationId: string;
}

export interface Payment {
  id?: string;
  invoiceId: string;
  amount: number;
  paymentMethod: string;
  paymentDate: string;
  status: string;
  organizationId: string;
}
