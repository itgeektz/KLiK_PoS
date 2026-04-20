"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { 
  Search, 
  ChevronDown, 
  X, 
  Loader2, 
  Check, 
  Building, 
  User, 
  UserPlus,
  Mail,
  Phone,
} from "lucide-react";
import type { Customer } from "../../types/customer";
import { useCustomers } from "../../hooks/useCustomers";
import { useCustomerPermission } from "../../hooks/useCustomerPermission";
import { usePOSProfileStore } from "../../stores/posProfileStore";
import countryList from "react-select-country-list";
import { parsePhoneNumber } from "react-phone-number-input";
import AddCustomerModal from "../AddCustomerModal";

interface CustomerSearchSectionProps {
  selectedCustomer: Customer | null;
  onCustomerSelect: (customer: Customer) => void;
  onCustomerClear: () => void;
  isMobile?: boolean;
}

export const CustomerSearchSection = ({
  selectedCustomer,
  onCustomerSelect,
  onCustomerClear,
  isMobile = false,
}: CustomerSearchSectionProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState<"top" | "bottom">("bottom");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [prefilledCustomerName, setPrefilledCustomerName] = useState("");
  const [prefilledData, setPrefilledData] = useState<{
    name?: string;
    email?: string;
    phone?: string;
  }>({});
  const [userRemovedDefaultCustomer, setUserRemovedDefaultCustomer] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const buttonRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { customers, isLoading: isLoadingCustomers, refetch: refetchCustomers } = useCustomers(search);
  const { posDetails } = usePOSProfileStore();
  const { checkCustomerPermission } = useCustomerPermission();

  const canCreateCustomer = posDetails?.can_create_and_edit_customers === 1;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
          setIsOpen(false);
          setSearch("");
          setHighlightedIndex(-1);
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      calculateDropdownPosition();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && search.length >= 2) {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      setIsLoading(true);
      searchTimeoutRef.current = setTimeout(async () => {
        setIsLoading(false);
      }, 300);
    }
  }, [search]);

  useEffect(() => {
    if (posDetails?.default_customer && !selectedCustomer && !userRemovedDefaultCustomer) {
      const defaultCustomer = posDetails.default_customer as any;
      checkCustomerPermission(defaultCustomer.id).then((result) => {
        if (result.success && result.has_permission) {
          const transformedCustomer: Customer = {
            id: defaultCustomer.id,
            name: defaultCustomer.name,
            customer_name: defaultCustomer.name,
            email: defaultCustomer.email || "",
            phone: defaultCustomer.phone || "",
            type: (defaultCustomer.customer_type === "Company" ? "company" : "individual") as "individual" | "company",
            address: { street: "", city: "", state: "", zipCode: "", country: posDetails.company?.country || "" },
            loyaltyPoints: 0,
            totalSpent: 0,
            totalOrders: 0,
            preferredPaymentMethod: "Cash" as const,
            notes: "",
            tags: [],
            status: "active",
            is_walkin: defaultCustomer.is_walkin,
            taxId: defaultCustomer.tax_id,
            createdAt: new Date().toISOString(),
            defaultCurrency: defaultCustomer.default_currency || undefined,
          };
          onCustomerSelect(transformedCustomer);
        }
      });
    }
  }, [posDetails, selectedCustomer, userRemovedDefaultCustomer, checkCustomerPermission]);

  const calculateDropdownPosition = () => {
    if (!buttonRef.current) return;

    const rect = buttonRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;

    setDropdownPosition(spaceBelow < 360 && spaceAbove > spaceBelow ? "top" : "bottom");
  };

  const handleSelect = (customer: Customer) => {
    onCustomerSelect(customer);
    setIsOpen(false);
    setSearch("");
    setHighlightedIndex(-1);
    setUserRemovedDefaultCustomer(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onCustomerClear();
    setUserRemovedDefaultCustomer(true);
    setSearch("");
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const handleOpenDropdown = () => {
    setIsOpen(true);
    setSearch("");
    setHighlightedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "Enter") {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < customers.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case "Enter":
        e.preventDefault();
        if (highlightedIndex >= 0 && customers[highlightedIndex]) {
          handleSelect(customers[highlightedIndex]);
        }
        break;
      case "Escape":
        setIsOpen(false);
        setSearch("");
        setHighlightedIndex(-1);
        break;
    }
  };

  const handleAddCustomerClick = () => {
    setIsOpen(false);
    const trimmedValue = search.trim();
    let prefilledData = {};

    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedValue)) {
      prefilledData = { email: trimmedValue };
    } else if (
      /^[\d\s+()-]+$/.test(trimmedValue) &&
      trimmedValue.replace(/[\s+()-]/g, "").length >= 7
    ) {
      const companyCountryCode = (
        countryList().getData() as { value: string; label: string }[]
      ).find((c) => c.label === (posDetails?.company?.country || ""))?.value || "";

      let formattedPhone = trimmedValue;
      try {
        const parsed = parsePhoneNumber(trimmedValue, companyCountryCode as any);
        if (parsed) {
          formattedPhone = parsed.format("E.164");
        }
      } catch {
      }
      prefilledData = { phone: formattedPhone };
    } else {
      prefilledData = { name: trimmedValue };
    }

    setPrefilledData(prefilledData);
    setPrefilledCustomerName(trimmedValue);
    setShowAddCustomerModal(true);
  };

  const handleSaveCustomer = async (newCustomer: Partial<Customer> & { customer_name?: string }) => {
    if (newCustomer && newCustomer.customer_name) {
      try {
        const response = await fetch(
          `/api/method/klik_pos.api.customer.get_customer_info?customer_name=${encodeURIComponent(newCustomer.customer_name)}`
        );
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const resData = await response.json();
        if (resData.message) {
          const erpCustomer = resData.message;
          const customerToSelect: Customer = {
            id: erpCustomer.name,
            name: erpCustomer.customer_name || erpCustomer.name,
            customer_name: erpCustomer.customer_name || erpCustomer.name,
            email: erpCustomer.email_id || "",
            phone: erpCustomer.mobile_no || "",
            type: erpCustomer.customer_type === "Company" ? "company" : "individual",
            address: {
              street: "",
              city: "",
              state: "",
              zipCode: "",
              country: erpCustomer.address_data?.country || posDetails?.company?.country || "",
            },
            loyaltyPoints: erpCustomer.custom_loyalty_points || 0,
            totalSpent: erpCustomer.custom_total_spent || 0,
            totalOrders: erpCustomer.custom_total_orders || 0,
            preferredPaymentMethod: "Cash",
            tags: erpCustomer.custom_tags?.split(",").filter(Boolean) || [],
            status: erpCustomer.custom_status || "active",
            is_walkin: erpCustomer.is_walkin,
            taxId: erpCustomer.tax_id || "",
            createdAt: erpCustomer.creation || new Date().toISOString(),
          };
          handleSelect(customerToSelect);
          refetchCustomers?.();
        }
      } catch (error) {
        console.error("Error fetching customer details:", error);
        const customerToSelect: Customer = {
          id: newCustomer.customer_name || "",
          name: newCustomer.customer_name || "",
          customer_name: newCustomer.customer_name || "",
          email: "",
          phone: "",
          type: "individual",
          address: { street: "", city: "", state: "", zipCode: "", country: posDetails?.company?.country || "" },
          loyaltyPoints: 0,
          totalSpent: 0,
          totalOrders: 0,
          preferredPaymentMethod: "Cash",
          tags: [],
          status: "active",
          is_walkin: 0,
          taxId: newCustomer.taxId,
          createdAt: new Date().toISOString(),
        };
        handleSelect(customerToSelect);
      }
    }
    setShowAddCustomerModal(false);
    setPrefilledCustomerName("");
    setPrefilledData({});
  };

  const getCustomerIcon = (customer: Customer) => {
    switch (customer.type) {
      case "company":
        return <Building size={18} className="text-purple-500" />;
      case "walk-in":
        return <User size={18} className="text-gray-500" />;
      default:
        return <User size={18} className="text-blue-500" />;
    }
  };

  const getCustomerBadge = (customer: Customer) => {
    if (customer.type === "company") {
      return { label: "Company", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300" };
    }
    if (customer.status === "vip") {
      return { label: "VIP", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" };
    }
    return null;
  };

  const isLoadingState = isLoading || isLoadingCustomers;

  const dropdown = isOpen ? (
    <div
      ref={dropdownRef}
      style={{
        position: "fixed",
        top: dropdownPosition === "bottom" && buttonRef.current
          ? buttonRef.current.getBoundingClientRect().bottom + 8
          : undefined,
        bottom: dropdownPosition === "top" && buttonRef.current
          ? window.innerHeight - buttonRef.current.getBoundingClientRect().top + 8
          : undefined,
        left: buttonRef.current ? buttonRef.current.getBoundingClientRect().left : 0,
        width: buttonRef.current ? buttonRef.current.getBoundingClientRect().width : 360,
        zIndex: 999999,
      }}
      className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl overflow-hidden animate-in fade-in duration-200"
    >
      <div className="p-3 border-b border-gray-100 dark:border-gray-800">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            ref={inputRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full pl-10 pr-10 py-2.5 text-sm bg-gray-50 dark:bg-gray-800 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            placeholder="Search by name, phone, or email..."
            autoFocus
          />
          {isLoadingState && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />
          )}
        </div>
      </div>

      <div className="max-h-96 overflow-y-auto">
        {isLoadingState ? (
          <div className="p-12 text-center">
            <Loader2 className="w-8 h-8 text-gray-400 animate-spin mx-auto mb-3" />
            <div className="text-sm text-gray-400">Searching customers...</div>
          </div>
        ) : customers.length > 0 ? (
          customers.map((customer, idx) => {
            const badge = getCustomerBadge(customer);
            const isSelected = selectedCustomer?.id === customer.id;
            
            return (
              <div
                key={customer.id}
                onClick={() => handleSelect(customer)}
                onMouseEnter={() => setHighlightedIndex(idx)}
                className={`
                  px-4 py-3 cursor-pointer transition-all
                  hover:bg-gray-50 dark:hover:bg-gray-800
                  ${highlightedIndex === idx ? "bg-gray-50 dark:bg-gray-800" : ""}
                  ${isSelected ? "bg-blue-50 dark:bg-blue-900/20" : ""}
                  border-b border-gray-100 dark:border-gray-800 last:border-b-0
                `}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    {getCustomerIcon(customer)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-gray-900 dark:text-white text-sm">
                        {customer.name}
                      </span>
                      {badge && (
                        <span className={`text-xs px-1.5 py-0.5 rounded ${badge.color}`}>
                          {badge.label}
                        </span>
                      )}
                      {isSelected && (
                        <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 ml-auto" />
                      )}
                    </div>
                    
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5">
                      {customer.phone && customer.phone !== "N/A" && (
                        <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                          <Phone className="w-3 h-3" />
                          <span>{customer.phone}</span>
                        </div>
                      )}
                      {customer.email && (
                        <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                          <Mail className="w-3 h-3" />
                          <span className="truncate max-w-[150px]">{customer.email}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="p-8 text-center">
            <div className="text-sm text-gray-400">No customers found</div>
            {canCreateCustomer && (
              <button
                onClick={handleAddCustomerClick}
                className="mt-3 text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                Create "{search}" as new customer?
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  ) : null;

  const containerClass = !isMobile ? "relative" : "flex-shrink-0 p-4 border-b border-gray-100 dark:border-gray-700";

  return (
    <div className={containerClass}>
      <div className="flex items-center gap-2">
        <div ref={containerRef} className="flex-1 relative">
          <div
            ref={buttonRef}
            onClick={handleOpenDropdown}
            className={`
              flex items-center justify-between w-full min-h-[52px] px-4 gap-2
              border rounded-xl cursor-pointer transition-all
              bg-white dark:bg-gray-900
              ${isOpen 
                ? "border-blue-500 ring-2 ring-blue-500/20" 
                : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
              }
            `}
          >
            {selectedCustomer ? (
              <div className="flex-1 flex items-center gap-3 py-2">
                <div className="flex-shrink-0">
                  {getCustomerIcon(selectedCustomer)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-gray-900 dark:text-white text-sm truncate">
                      {selectedCustomer.name}
                    </span>
                    {getCustomerBadge(selectedCustomer) && (
                      <span className={`text-xs px-1.5 py-0.5 rounded ${getCustomerBadge(selectedCustomer)?.color}`}>
                        {getCustomerBadge(selectedCustomer)?.label}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                    {selectedCustomer.phone && selectedCustomer.phone !== "N/A" && (
                      <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                        <Phone className="w-3 h-3" />
                        <span>{selectedCustomer.phone}</span>
                      </div>
                    )}
                    {selectedCustomer.email && (
                      <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                        <Mail className="w-3 h-3" />
                        <span className="truncate max-w-[200px]">{selectedCustomer.email}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <span className="flex-1 text-sm text-gray-400 dark:text-gray-500 py-3">
                Search or select customer...
              </span>
            )}
            
            <div className="flex items-center gap-1">
              {selectedCustomer && (
                <button
                  onClick={handleClear}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              )}
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
            </div>
          </div>

          {typeof window !== "undefined" && createPortal(dropdown, document.body)}
        </div>

        {canCreateCustomer && (
          <button
            onClick={handleAddCustomerClick}
            className="flex-shrink-0 w-[52px] h-[52px] bg-beveren-600 text-white rounded-xl hover:bg-beveren-700 transition-all flex items-center justify-center shadow-sm hover:shadow-md"
            title="Add New Customer"
          >
            <UserPlus size={20} />
          </button>
        )}
      </div>

      {showAddCustomerModal && (
        <AddCustomerModal
          customer={null}
          onClose={() => {
            setShowAddCustomerModal(false);
            setPrefilledCustomerName("");
            setPrefilledData({});
          }}
          onSave={handleSaveCustomer}
          prefilledName={prefilledCustomerName}
          prefilledData={prefilledData}
        />
      )}
    </div>
  );
};