"use client";

import { Search, X, User, Building, UserPlus } from "lucide-react";
import type { Customer } from "../../types/customer";

interface CustomerSearchSectionProps {
  customerSearchQuery: string;
  setCustomerSearchQuery: (query: string) => void;
  showCustomerDropdown: boolean;
  setShowCustomerDropdown: (show: boolean) => void;
  filteredCustomers: Customer[];
  selectedCustomer: Customer | null;
  onCustomerSelect: (customer: Customer) => void;
  onRemoveCustomer: () => void;
  onAddCustomer: () => void;
  customerStats?: { total_orders?: number };
  canCreateCustomer: boolean;
  isMobile?: boolean;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

const getCustomerTypeIcon = (customer: Customer) => {
  switch (customer.type) {
    case "company":
      return <Building size={14} className="text-purple-600" />;
    case "walk-in":
      return <User size={14} className="text-gray-600" />;
    default:
      return <User size={14} className="text-blue-600" />;
  }
};

export const CustomerSearchSection = ({
  customerSearchQuery,
  setCustomerSearchQuery,
  showCustomerDropdown,
  setShowCustomerDropdown,
  filteredCustomers,
  selectedCustomer,
  onCustomerSelect,
  onRemoveCustomer,
  onAddCustomer,
  customerStats,
  canCreateCustomer,
  isMobile,
  onKeyDown,
}: CustomerSearchSectionProps) => {
  if (!isMobile) {
    return (
      <div className="relative">
        <div className="flex items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search customers... (name, email, or phone)"
              value={customerSearchQuery}
              onChange={(e) => {
                setCustomerSearchQuery(e.target.value);
                setShowCustomerDropdown(e.target.value.length > 0);
              }}
              onKeyDown={onKeyDown}
              onFocus={() => setShowCustomerDropdown(true)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-beveren-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />

            {showCustomerDropdown && filteredCustomers.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
                {filteredCustomers.slice(0, 8).map((customer) => (
                  <button
                    key={customer.id}
                    onClick={() => onCustomerSelect(customer)}
                    className="w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                  >
                    <div className="flex items-center space-x-2">
                      {getCustomerTypeIcon(customer)}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 dark:text-white text-sm truncate">
                          {customer.name}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {customer.phone} • {customer.email}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {canCreateCustomer && (
            <button
              onClick={onAddCustomer}
              className="ml-2 p-2 bg-beveren-600 text-white rounded-lg hover:bg-beveren-700 transition-colors"
              title="Add New Customer"
            >
              <UserPlus size={16} />
            </button>
          )}
        </div>

        {selectedCustomer && (
          <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {selectedCustomer && getCustomerTypeIcon(selectedCustomer)}
                <div>
                  <div className="font-medium text-gray-900 dark:text-white text-sm">
                    {selectedCustomer?.name}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {selectedCustomer.phone &&
                      selectedCustomer.phone !== "N/A" &&
                      selectedCustomer.phone.trim() !== "" && (
                        <span>{selectedCustomer.phone}</span>
                      )}
                    {selectedCustomer.phone &&
                      selectedCustomer.phone !== "N/A" &&
                      selectedCustomer.phone.trim() !== "" &&
                      (customerStats?.total_orders || 0) > 0 && (
                        <span className="mx-2">•</span>
                      )}
                    {(customerStats?.total_orders || 0) > 0 && (
                      <span>{customerStats?.total_orders || 0} orders</span>
                    )}
                    {(!selectedCustomer.phone ||
                      selectedCustomer.phone === "N/A" ||
                      selectedCustomer.phone.trim() === "") &&
                      (customerStats?.total_orders || 0) === 0 && (
                        <span className="text-gray-400 italic">
                          No additional info
                        </span>
                      )}
                  </div>
                </div>
              </div>
              <button
                onClick={onRemoveCustomer}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Mobile version
  return (
    <div className="flex-shrink-0 p-4 border-b border-gray-100 dark:border-gray-700">
      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search customers... (name, email, or phone)"
            value={customerSearchQuery}
            onChange={(e) => {
              setCustomerSearchQuery(e.target.value);
              setShowCustomerDropdown(e.target.value.length > 0);
            }}
            onKeyDown={onKeyDown}
            onFocus={() => setShowCustomerDropdown(true)}
            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-beveren-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />

          {showCustomerDropdown && filteredCustomers.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
              {filteredCustomers.slice(0, 8).map((customer) => (
                <button
                  key={customer.id}
                  onClick={() => onCustomerSelect(customer)}
                  className="w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                >
                  <div className="flex items-center space-x-2">
                    {getCustomerTypeIcon(customer)}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 dark:text-white text-sm truncate">
                        {customer.name}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {customer.email} • {customer.phone}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        {canCreateCustomer && (
          <button
            onClick={onAddCustomer}
            className="p-2 bg-beveren-600 text-white rounded-lg hover:bg-beveren-700 transition-colors"
          >
            <UserPlus size={16} />
          </button>
        )}
      </div>

      {selectedCustomer && (
        <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {selectedCustomer && getCustomerTypeIcon(selectedCustomer)}
              <div>
                <div className="font-medium text-gray-900 dark:text-white text-sm">
                  {selectedCustomer?.name}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {selectedCustomer.phone &&
                    selectedCustomer.phone !== "N/A" &&
                    selectedCustomer.phone.trim() !== "" && (
                      <span>{selectedCustomer.phone}</span>
                    )}
                  {selectedCustomer.phone &&
                    selectedCustomer.phone !== "N/A" &&
                    selectedCustomer.phone.trim() !== "" &&
                    (customerStats?.total_orders || 0) > 0 && (
                      <span className="mx-2">•</span>
                    )}
                  {(customerStats?.total_orders || 0) > 0 && (
                    <span>{customerStats?.total_orders || 0} orders</span>
                  )}
                  {(!selectedCustomer.phone ||
                    selectedCustomer.phone === "N/A" ||
                    selectedCustomer.phone.trim() === "") &&
                    (customerStats?.total_orders || 0) === 0 && (
                      <span className="text-gray-400 italic">
                        No additional info
                      </span>
                    )}
                </div>
              </div>
            </div>
            <button
              onClick={onRemoveCustomer}
              className="text-gray-400 hover:text-gray-600"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};