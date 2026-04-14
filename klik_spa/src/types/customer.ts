export interface Customer {
  id: string
  type: 'individual' | 'company' | 'walk-in'
  name: string
  customer_name?: string
  email: string
  phone: string
  address: {
    addressType?: string
    street: string
    buildingNumber?: string
    city: string
    state: string
    zipCode: string
    country: string
  }
  dateOfBirth?: string
  gender?: 'male' | 'female' | 'other'
  companyName?: string
  contactPerson?: string
  taxId?: string
  is_walkin?: number
  industry?: string
  employeeCount?: string
  registrationScheme?: string
  registrationNumber?: string
  loyaltyPoints: number
  totalSpent: number
  totalOrders: number
  preferredPaymentMethod: 'Cash' | 'Bank Card' | 'Bank Payment' | 'Credit'
  notes?: string
  tags: string[]
  status: 'active' | 'inactive' | 'vip'
  createdAt: string
  lastVisit?: string
  avatar?: string
  defaultCurrency?: string
  companyCurrency?: string
  customer_group?: string
  territory?: string
}