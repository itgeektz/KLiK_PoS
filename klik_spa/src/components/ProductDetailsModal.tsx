"use client"

import { useEffect, useMemo, useState } from "react"
import type { MenuItem } from "../../types"
import { usePOSDetails } from "../hooks/usePOSProfile"

interface Batch {
  batch_id: string
  qty: number
  val_rate: number
  expiry_date?: string
  manufacturing_date?: string
  warehouse: string
}

interface SerialEntry {
  serial_no: string
  warehouse: string
  val_rate: number
}

interface WarehouseStock {
  warehouse: string
  bal_qty: number
  val_rate: number
}

interface PriceListEntry {
  price_list: string
  rate: number
  currency: string
  uom?: string
  customer?: string
  note?: string
  cost: number
  margin: number
  margin_pct: number
}

interface ItemFullData {
  item_name: string
  item_code: string
  standard_rate: number
  valuation_rate: number
  price_lists: PriceListEntry[]
  batches: Batch[]
  serials: SerialEntry[]
  warehouse_stock: WarehouseStock[]
  uom: string
  brand?: string
  has_batch_no: number
  has_serial_no: number
  total_bal_qty: number
}

interface ProductDetailsModalProps {
  item: MenuItem
  warehouse?: string
  onClose: () => void
}

const fmt = (n: number, sym = "") => `${sym}${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—"
const isExpired = (d?: string) => !!d && new Date(d) < new Date()
const isSoonExpiry = (d?: string) => {
  if (!d) return false
  const diff = (new Date(d).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  return diff >= 0 && diff <= 90
}

function MarginChip({ pct }: { pct: number }) {
  const cls = pct >= 30
    ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
    : pct >= 10
    ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300"
    : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}>
      {pct >= 0 ? "+" : ""}{pct.toFixed(1)}%
    </span>
  )
}

function StatCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: "green" | "red" | "blue" }) {
  const accentCls = accent === "green"
    ? "border-l-4 border-l-green-500"
    : accent === "red"
    ? "border-l-4 border-l-red-500"
    : accent === "blue"
    ? "border-l-4 border-l-beveren-500"
    : ""
  return (
    <div className={`bg-gray-50 dark:bg-gray-700/40 rounded-xl p-4 border border-gray-200 dark:border-gray-600 ${accentCls}`}>
      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold tracking-wide mb-1">{label}</p>
      <p className="text-xl font-bold text-gray-900 dark:text-white leading-tight">{value}</p>
      {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{sub}</p>}
    </div>
  )
}

export default function ProductDetailsModal({ item, onClose }: ProductDetailsModalProps) {
  const [data, setData] = useState<ItemFullData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"pricing" | "stock" | "details">("pricing")
  const [expandedBatch, setExpandedBatch] = useState<string | null>(null)
  const { posDetails, loading } = usePOSDetails()

  const warehouse = useMemo(() => {
    if (loading) return null
    return posDetails?.warehouse
  }, [posDetails, loading])

  useEffect(() => {
    const fetchFullData = async () => {
      setIsLoading(true)
      try {
        if (!warehouse) return
        const response = await fetch(
          `/api/method/klik_pos.api.item.get_full_pricing_and_batch_details?item_code=${encodeURIComponent(item.id)}&warehouse=${encodeURIComponent(warehouse)}`
        )
        const res = await response.json()
        if (res?.message) setData(res.message)
      } catch (error) {
        console.error("Failed to fetch product details:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchFullData()
  }, [item.id, warehouse])

  const costPrice = data?.valuation_rate || data?.standard_rate || item.cost_price || 0
  const profit = item.price - costPrice
  const profitMargin = costPrice > 0 ? (profit / costPrice) * 100 : 0

  const formatCurrency = (amount: number) => {
    return `${item.currency_symbol}${amount.toFixed(2)}`
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A"
    return new Date(dateString).toLocaleDateString()
  }
  

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-in slide-in-from-bottom-4 duration-300">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-beveren-50 to-white dark:from-gray-800 dark:to-gray-800">
          <div className="flex items-center gap-4">
            {item.image && (
              <img
                src={item.image}
                alt={item.name}
                className="w-12 h-12 rounded-lg object-cover border border-gray-200 dark:border-gray-600"
                crossOrigin="anonymous"
              />
            )}
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">{item.name}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">{item.id}</p>
              {data?.brand && (
                <p className="text-xs text-beveren-600 dark:text-beveren-400 mt-0.5">Brand: {data.brand}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-beveren-500 border-t-transparent"></div>
            <p className="mt-4 text-gray-500 dark:text-gray-400">Loading product details...</p>
          </div>
        ) : (
          <>
            <div className="flex border-b border-gray-200 dark:border-gray-700 px-6">
              <button
                onClick={() => setActiveTab("pricing")}
                className={`px-4 py-3 font-medium text-sm transition-colors relative ${
                  activeTab === "pricing"
                    ? "text-beveren-600 dark:text-beveren-400"
                    : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                }`}
              >
                Pricing
                {activeTab === "pricing" && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-beveren-500 rounded-full"></div>
                )}
              </button>
              <button
                onClick={() => setActiveTab("batches")}
                className={`px-4 py-3 font-medium text-sm transition-colors relative ${
                  activeTab === "batches"
                    ? "text-beveren-600 dark:text-beveren-400"
                    : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                }`}
              >
                Batches & Stock
                {activeTab === "batches" && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-beveren-500 rounded-full"></div>
                )}
              </button>
              <button
                onClick={() => setActiveTab("details")}
                className={`px-4 py-3 font-medium text-sm transition-colors relative ${
                  activeTab === "details"
                    ? "text-beveren-600 dark:text-beveren-400"
                    : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                }`}
              >
                Product Details
                {activeTab === "details" && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-beveren-500 rounded-full"></div>
                )}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {activeTab === "pricing" && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 border border-gray-200 dark:border-gray-600">
                      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold mb-1">Cost Price</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(costPrice)}</p>
                      <p className="text-xs text-gray-400 mt-1">Valuation / Standard Rate</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 border border-gray-200 dark:border-gray-600">
                      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold mb-1">Selling Price</p>
                      <p className="text-2xl font-bold text-beveren-600 dark:text-beveren-400">{formatCurrency(item.price)}</p>
                      <p className="text-xs text-gray-400 mt-1">Retail Price</p>
                    </div>
                    <div className={`rounded-xl p-4 border ${profit >= 0 ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700'}`}>
                      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold mb-1">Profit Margin</p>
                      <p className={`text-2xl font-bold ${profit >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                        {formatCurrency(profit)} ({profitMargin.toFixed(1)}%)
                      </p>
                      <p className="text-xs text-gray-400 mt-1">Gross Profit</p>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M6 4h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2z" />
                      </svg>
                      Price Lists
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                          <tr className="border-b border-gray-200 dark:border-gray-600">
                            <th className="text-left p-3 font-semibold text-gray-600 dark:text-gray-400">Price List</th>
                            <th className="text-right p-3 font-semibold text-gray-600 dark:text-gray-400">Rate</th>
                            <th className="text-left p-3 font-semibold text-gray-600 dark:text-gray-400">Currency</th>
                            <th className="text-left p-3 font-semibold text-gray-600 dark:text-gray-400">UOM</th>
                            <th className="text-left p-3 font-semibold text-gray-600 dark:text-gray-400">Customer</th>
                            <th className="text-left p-3 font-semibold text-gray-600 dark:text-gray-400">Note</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data?.price_lists && data.price_lists.length > 0 ? (
                            data.price_lists.map((pl, idx) => (
                              <tr key={idx} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                                <td className="p-3 font-medium text-gray-900 dark:text-white">{pl.price_list}</td>
                                <td className="p-3 text-right font-bold text-beveren-600 dark:text-beveren-400">
                                  {pl.currency} {pl.rate.toFixed(2)}
                                </td>
                                <td className="p-3 text-gray-600 dark:text-gray-400">{pl.currency}</td>
                                <td className="p-3 text-gray-600 dark:text-gray-400">{pl.uom || data?.uom || "Nos"}</td>
                                <td className="p-3 text-gray-600 dark:text-gray-400">{pl.customer || "All Customers"}</td>
                                <td className="p-3 text-gray-500 dark:text-gray-500 max-w-xs truncate">{pl.note || "-"}</td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={6} className="p-8 text-center text-gray-500 dark:text-gray-400">
                                No price lists configured for this item
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "batches" && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 border border-gray-200 dark:border-gray-600">
                      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold mb-1">Total Available Stock</p>
                      <p className="text-3xl font-bold text-gray-900 dark:text-white">
                        {item.available} {data?.uom || "Nos"}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">Across all batches</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 border border-gray-200 dark:border-gray-600">
                      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold mb-1">Active Batches</p>
                      <p className="text-3xl font-bold text-gray-900 dark:text-white">{data?.batches?.length || 0}</p>
                      <p className="text-xs text-gray-400 mt-1">With positive stock</p>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                      Batch Details
                    </h3>
                    <div className="space-y-2">
                      {data?.batches && data.batches.length > 0 ? (
                        data.batches.map((batch, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-gray-200 dark:border-gray-600 hover:border-beveren-300 dark:hover:border-beveren-600 transition-colors"
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-1">
                                <span className="font-mono text-sm font-semibold text-gray-900 dark:text-white">
                                  {batch.batch_id}
                                </span>
                                {batch.expiry_date && (
                                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                                    new Date(batch.expiry_date) < new Date()
                                      ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                      : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                  }`}>
                                    Expires: {formatDate(batch.expiry_date)}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                                <span>UOM: {data?.uom || "Nos"}</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-bold text-beveren-600 dark:text-beveren-400">{batch.qty}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">units available</p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-12 bg-gray-50 dark:bg-gray-700/30 rounded-xl">
                          <svg className="w-16 h-16 mx-auto text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                          </svg>
                          <p className="text-gray-500 dark:text-gray-400">No batches available</p>
                          <p className="text-sm text-gray-400 mt-1">This item may not be batch-tracked or all batches are empty</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "details" && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 border border-gray-200 dark:border-gray-600">
                        <label className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold">Item Code</label>
                        <p className="text-base font-mono text-gray-900 dark:text-white mt-1">{item.id}</p>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 border border-gray-200 dark:border-gray-600">
                        <label className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold">Item Name</label>
                        <p className="text-base font-medium text-gray-900 dark:text-white mt-1">{item.name}</p>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 border border-gray-200 dark:border-gray-600">
                        <label className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold">Category</label>
                        <p className="text-base text-gray-900 dark:text-white mt-1 capitalize">{item.category}</p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 border border-gray-200 dark:border-gray-600">
                        <label className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold">Unit of Measure</label>
                        <p className="text-base text-gray-900 dark:text-white mt-1">{data?.uom || "Nos"}</p>
                      </div>
                      {data?.brand && (
                        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 border border-gray-200 dark:border-gray-600">
                          <label className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold">Brand</label>
                          <p className="text-base text-gray-900 dark:text-white mt-1">{data.brand}</p>
                        </div>
                      )}
                      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 border border-gray-200 dark:border-gray-600">
                        <label className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold">Valuation Method</label>
                        <p className="text-base text-gray-900 dark:text-white mt-1">FIFO / Standard</p>
                      </div>
                    </div>
                  </div>

                  {item.description && (
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 border border-gray-200 dark:border-gray-600">
                      <label className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold">Description</label>
                      <p className="text-sm text-gray-700 dark:text-gray-300 mt-2 leading-relaxed">{item.description}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 p-6 bg-gray-50 dark:bg-gray-800/50">
              <button
                onClick={onClose}
                className="w-full px-6 py-3 bg-beveren-600 hover:bg-beveren-700 text-white font-semibold rounded-xl transition-colors shadow-lg hover:shadow-xl"
              >
                Close
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}