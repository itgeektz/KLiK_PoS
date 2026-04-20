import type { CartItem, GiftCoupon } from "../../../types";
import type { Customer } from "../../types/customer";

export interface PaymentDialogProps {
  isOpen: boolean;
  onClose: (paymentCompleted?: boolean) => void;
  cartItems: CartItem[];
  appliedCoupons: GiftCoupon[];
  selectedCustomer: Customer | null;
  onCompletePayment: (paymentData: any) => void;
  onHoldOrder: (orderData: any) => void;
  isMobile?: boolean;
  isFullPage?: boolean;
  initialSharingMode?: string | null;
  externalInvoiceData?: any;
  itemDiscounts?: any;
  totalItemDiscount?: number;
}

export interface PaymentMethod {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  enabled: boolean;
  amount: number;
}

export interface PaymentAmount {
  [key: string]: number;
}

export interface Calculations {
  subtotal: number;
  couponDiscount: number;
  taxableAmount: number;
  taxAmount: number;
  grandTotal: number;
  selectedTax: any;
  isInclusive: boolean;
}