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

  const restrictCostVisibility = useMemo(() => {
    if (loading) return true
    return posDetails?.restrict_cost_visibility_in_tooltip ?? true
  }, [posDetails, loading])

  useEffect(() => {
    const fetchFullData = async () => {
      setIsLoading(true)
      try {
        if (!warehouse) return
        const response = await fetch(
          `/api/method/klik_pos.api.item.item_details.get_full_pricing_and_batch_details?item_code=${encodeURIComponent(item.id)}&warehouse=${encodeURIComponent(warehouse)}`
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

  const sym = item.currency_symbol || "KES "
  const valuationRate = data?.valuation_rate ?? 0
  const totalQty = data?.total_bal_qty ?? 0

  const batchesGrouped = (data?.batches ?? []).reduce<Record<string, Batch[]>>((acc, b) => {
    acc[b.batch_id] = acc[b.batch_id] ?? []
    acc[b.batch_id].push(b)
    return acc
  }, {})

  const tabs = [
    { key: "pricing" as const, label: restrictCostVisibility ? "Price Lists" : "Pricing & Margins" },
    { key: "details" as const, label: "Details" },
  ]

  const scrollbarStyles = "scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent"

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[92vh] overflow-hidden flex flex-col animate-in slide-in-from-bottom-4 duration-300">

        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-beveren-50 to-white dark:from-gray-800 dark:to-gray-800 shrink-0">
          <div className="flex items-center gap-4">
            {item.image ? (
              <img src={item.image} alt={item.name} className="w-12 h-12 rounded-xl object-cover border border-gray-200 dark:border-gray-600" crossOrigin="anonymous" />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-beveren-100 dark:bg-beveren-900/30 flex items-center justify-center text-beveren-600 dark:text-beveren-400 font-bold text-lg">
                {item.name?.charAt(0)}
              </div>
            )}
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">{item.name}</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-mono mt-0.5">{item.id}</p>
              {data?.brand && <p className="text-xs text-beveren-600 dark:text-beveren-400 mt-0.5">{data.brand}</p>}
            </div>
          </div>
          <div className="flex items-center gap-6 mr-4">
            <div className="text-right">
              <p className="text-xs text-gray-400 uppercase font-semibold">Total Stock</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">{totalQty.toLocaleString()} <span className="text-sm font-normal text-gray-500">{data?.uom}</span></p>
            </div>
            {!restrictCostVisibility && (
              <div className="text-right">
                <p className="text-xs text-gray-400 uppercase font-semibold">Valuation Rate</p>
                <p className="text-lg font-bold text-beveren-600 dark:text-beveren-400">{fmt(valuationRate, sym)}</p>
              </div>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-beveren-500 border-t-transparent" />
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">Loading product details...</p>
          </div>
        ) : (
          <>
            <div className="flex border-b border-gray-200 dark:border-gray-700 px-6 shrink-0">
              {tabs.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-4 py-3 font-medium text-sm transition-colors relative whitespace-nowrap ${
                    activeTab === tab.key
                      ? "text-beveren-600 dark:text-beveren-400"
                      : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                  }`}
                >
                  {tab.label}
                  {activeTab === tab.key && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-beveren-500 rounded-full" />}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8">

              {activeTab === "pricing" && (
                <>
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                      {restrictCostVisibility ? "Available Price Lists" : "Price List Analysis"}
                    </h3>
                    <div className={`rounded-xl border border-gray-200 dark:border-gray-700 overflow-x-auto ${scrollbarStyles}`}>
                      <table className="w-full text-sm min-w-[600px]">
                        <thead>
                          <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-600">
                            <th className="text-left p-4 font-semibold text-gray-600 dark:text-gray-400 text-xs uppercase sticky left-0 bg-gray-50 dark:bg-gray-700/50 z-10 border-r border-gray-200 dark:border-gray-600">Price List</th>
                            <th className="text-right p-4 font-semibold text-gray-600 dark:text-gray-400 text-xs uppercase">Selling Rate</th>
                            {!restrictCostVisibility && (
                              <>
                                <th className="text-right p-4 font-semibold text-gray-600 dark:text-gray-400 text-xs uppercase">Cost (Val.)</th>
                                <th className="text-right p-4 font-semibold text-gray-600 dark:text-gray-400 text-xs uppercase">Margin</th>
                                <th className="text-center p-4 font-semibold text-gray-600 dark:text-gray-400 text-xs uppercase">Margin %</th>
                              </>
                            )}
                            <th className="text-left p-4 font-semibold text-gray-600 dark:text-gray-400 text-xs uppercase">UOM</th>
                            <th className="text-left p-4 font-semibold text-gray-600 dark:text-gray-400 text-xs uppercase min-w-[150px]">Customer</th>
                            <th className="text-left p-4 font-semibold text-gray-600 dark:text-gray-400 text-xs uppercase min-w-[200px]">Note</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(data?.price_lists ?? []).map((pl, idx) => (
                            <tr key={idx} className="border-b border-gray-100 dark:border-gray-700/60 hover:bg-gray-50 dark:hover:bg-gray-700/20 transition-colors">
                              <td className="p-4 font-medium text-gray-900 dark:text-white sticky left-0 bg-white dark:bg-gray-800 z-10 border-r border-gray-200 dark:border-gray-600 whitespace-nowrap">{pl.price_list}</td>
                              <td className="p-4 text-right font-bold text-beveren-600 dark:text-beveren-400 whitespace-nowrap">{fmt(pl.rate, `${pl.currency} `)}</td>
                              {!restrictCostVisibility && (
                                <>
                                  <td className="p-4 text-right text-gray-500 dark:text-gray-400 whitespace-nowrap">{fmt(pl.cost, `${pl.currency} `)}</td>
                                  <td className={`p-4 text-right font-semibold whitespace-nowrap ${pl.margin >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                                    {pl.margin >= 0 ? "+" : ""}{fmt(pl.margin, `${pl.currency} `)}
                                  </td>
                                  <td className="p-4 text-center whitespace-nowrap"><MarginChip pct={pl.margin_pct} /></td>
                                </>
                              )}
                              <td className="p-4 text-gray-500 dark:text-gray-400 whitespace-nowrap">{pl.uom ?? data?.uom ?? "—"}</td>
                              <td className="p-4 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                {pl.customer ? (
                                  <div className="flex flex-col">
                                    <span className="text-gray-900 dark:text-white font-medium">{pl.customer}</span>
                                    <span className="text-[10px] text-gray-400">Exclusive Pricing</span>
                                  </div>
                                ) : (
                                  <span className="text-gray-400 italic">All Customers</span>
                                )}
                              </td>
                              <td className="p-4 text-gray-500 dark:text-gray-400 text-xs italic max-w-[250px] truncate">
                                {pl.note || "—"}
                              </td>
                             </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {!restrictCostVisibility && (data?.warehouse_stock ?? []).length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Warehouse Valuations</h3>
                      <div className={`rounded-xl border border-gray-200 dark:border-gray-700 overflow-x-auto ${scrollbarStyles}`}>
                        <table className="w-full text-sm min-w-[800px]">
                          <thead>
                            <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-600">
                              <th className="text-left p-4 font-semibold text-gray-600 dark:text-gray-400 text-xs uppercase sticky left-0 bg-gray-50 dark:bg-gray-700/50 z-10 border-r border-gray-200 dark:border-gray-600">Warehouse</th>
                              <th className="text-right p-4 font-semibold text-gray-600 dark:text-gray-400 text-xs uppercase">Qty</th>
                              <th className="text-right p-4 font-semibold text-gray-600 dark:text-gray-400 text-xs uppercase">Val. Rate</th>
                              {(data?.price_lists ?? []).map(pl => (
                                <th key={pl.price_list} className="text-center p-4 font-semibold text-gray-600 dark:text-gray-400 text-xs uppercase whitespace-nowrap border-l border-gray-200/50 dark:border-gray-600/50">
                                  {pl.price_list} {pl.customer ? `(${pl.customer})` : ""} Margin
                                </th>
                              ))}
                             </tr>
                          </thead>
                          <tbody>
                            {(data?.warehouse_stock ?? []).map((ws, idx) => (
                              <tr key={idx} className="border-b border-gray-100 dark:border-gray-700/60 hover:bg-gray-50 dark:hover:bg-gray-700/20 transition-colors">
                                <td className="p-4 font-medium text-gray-900 dark:text-white text-xs sticky left-0 bg-white dark:bg-gray-800 z-10 border-r border-gray-200 dark:border-gray-600">{ws.warehouse}</td>
                                <td className="p-4 text-right text-gray-700 dark:text-gray-300 font-semibold">{ws.bal_qty.toLocaleString()}</td>
                                <td className="p-4 text-right text-gray-700 dark:text-gray-300">{fmt(ws.val_rate, sym)}</td>
                                {(data?.price_lists ?? []).map(pl => {
                                  const m = pl.rate - ws.val_rate
                                  const mp = ws.val_rate > 0 ? (m / ws.val_rate) * 100 : 0
                                  return (
                                    <td key={pl.price_list} className="p-4 text-center border-l border-gray-100 dark:border-gray-700/40">
                                      <MarginChip pct={mp} />
                                    </td>
                                  )
                                })}
                               </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {!restrictCostVisibility && !data?.has_serial_no && Object.keys(batchesGrouped).length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Batch Breakdown</h3>
                      <div className="space-y-3">
                        {Object.entries(batchesGrouped).map(([batchId, rows]) => {
                          const totalBatchQty = rows.reduce((s, r) => s + r.qty, 0)
                          const avgRate = totalBatchQty > 0
                            ? rows.reduce((s, r) => s + r.val_rate * r.qty, 0) / totalBatchQty
                            : 0
                          const exp = rows[0]?.expiry_date
                          const mfg = rows[0]?.manufacturing_date
                          const expired = isExpired(exp)
                          const soonExp = isSoonExpiry(exp)
                          const isOpen = expandedBatch === batchId

                          return (
                            <div key={batchId} className="rounded-xl border border-gray-200 dark:border-gray-600 overflow-hidden bg-white dark:bg-gray-800/20">
                              <button
                                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors text-left"
                                onClick={() => setExpandedBatch(isOpen ? null : batchId)}
                              >
                                <div className="flex items-center gap-4 min-w-0">
                                  <span className="font-mono text-sm font-bold text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">{batchId}</span>
                                  <div className="flex flex-wrap items-center gap-2">
                                    {expired && (
                                      <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 font-bold shrink-0">Expired</span>
                                    )}
                                    {!expired && soonExp && (
                                      <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300 font-bold shrink-0">Expiring Soon</span>
                                    )}
                                    {exp && (
                                      <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">Exp: <span className="font-medium">{fmtDate(exp)}</span></span>
                                    )}
                                    {mfg && (
                                      <span className="text-xs text-gray-400 shrink-0 hidden md:inline">Mfg: {fmtDate(mfg)}</span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-8 shrink-0 ml-4">
                                  <div className="text-right hidden md:block">
                                    <p className="text-[10px] text-gray-400 uppercase font-bold">Avg Cost</p>
                                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{fmt(avgRate, sym)}</p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-[10px] text-gray-400 uppercase font-bold">In Stock</p>
                                    <p className="text-xl font-bold text-gray-900 dark:text-white">{totalBatchQty.toLocaleString()}</p>
                                  </div>
                                  <div className="flex flex-col gap-1 items-end min-w-[80px]">
                                    {(data?.price_lists ?? []).slice(0, 2).map(pl => {
                                      const m = pl.rate - avgRate
                                      const mp = avgRate > 0 ? (m / avgRate) * 100 : 0
                                      return <MarginChip key={pl.price_list} pct={mp} />
                                    })}
                                  </div>
                                  <svg className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                  </svg>
                                </div>
                              </button>

                              {isOpen && (
                                <div className="border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-black/10 overflow-x-auto scrollbar-thin">
                                  <table className="w-full text-xs min-w-[600px]">
                                    <thead>
                                      <tr className="bg-gray-100/50 dark:bg-gray-700/50">
                                        <th className="text-left p-4 font-bold text-gray-500 uppercase tracking-tight">Warehouse Location</th>
                                        <th className="text-right p-4 font-bold text-gray-500 uppercase tracking-tight">Current Qty</th>
                                        <th className="text-right p-4 font-bold text-gray-500 uppercase tracking-tight">Unit Valuation</th>
                                        {(data?.price_lists ?? []).map(pl => (
                                          <th key={pl.price_list} className="text-center p-4 font-bold text-gray-500 uppercase tracking-tight border-l border-gray-200/50">
                                            {pl.price_list} {pl.customer ? `(${pl.customer})` : ""}
                                          </th>
                                        ))}
                                       </tr>
                                    </thead>
                                    <tbody>
                                      {rows.map((r, ri) => (
                                        <tr key={ri} className="border-t border-gray-100 dark:border-gray-700/60">
                                          <td className="p-4 text-gray-700 dark:text-gray-300 font-medium">{r.warehouse}</td>
                                          <td className="p-4 text-right font-bold text-gray-900 dark:text-white">{r.qty.toLocaleString()}</td>
                                          <td className="p-4 text-right text-gray-600 dark:text-gray-400 font-mono">{fmt(r.val_rate, sym)}</td>
                                          {(data?.price_lists ?? []).map(pl => {
                                            const m = pl.rate - r.val_rate
                                            const mp = r.val_rate > 0 ? (m / r.val_rate) * 100 : 0
                                            return (
                                              <td key={pl.price_list} className="p-4 text-center border-l border-gray-100 dark:border-gray-700/40">
                                                <MarginChip pct={mp} />
                                              </td>
                                            )
                                          })}
                                         </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {!restrictCostVisibility && !!data?.has_serial_no && (data?.serials ?? []).length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Serial Number Details</h3>
                      <div className={`rounded-xl border border-gray-200 dark:border-gray-700 overflow-x-auto ${scrollbarStyles}`}>
                        <table className="w-full text-sm min-w-[800px]">
                          <thead>
                            <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-600">
                              <th className="text-left p-4 font-semibold text-gray-600 dark:text-gray-400 text-xs uppercase sticky left-0 bg-gray-50 dark:bg-gray-700/50 z-10 border-r border-gray-200 dark:border-gray-600">Serial No</th>
                              <th className="text-left p-4 font-semibold text-gray-600 dark:text-gray-400 text-xs uppercase">Warehouse</th>
                              <th className="text-right p-4 font-semibold text-gray-600 dark:text-gray-400 text-xs uppercase">Val. Rate</th>
                              {(data?.price_lists ?? []).map(pl => (
                                <th key={pl.price_list} className="text-center p-4 font-semibold text-gray-600 dark:text-gray-400 text-xs uppercase border-l border-gray-200/50">
                                  {pl.price_list} {pl.customer ? `(${pl.customer})` : ""}
                                </th>
                              ))}
                             </tr>
                          </thead>
                          <tbody>
                            {data.serials.map((s, idx) => (
                              <tr key={idx} className="border-b border-gray-100 dark:border-gray-700/60 hover:bg-gray-50 dark:hover:bg-gray-700/20">
                                <td className="p-4 font-mono text-gray-900 dark:text-white sticky left-0 bg-white dark:bg-gray-800 z-10 border-r border-gray-200 dark:border-gray-600">{s.serial_no}</td>
                                <td className="p-4 text-gray-500 dark:text-gray-400 text-xs">{s.warehouse}</td>
                                <td className="p-4 text-right text-gray-700 dark:text-gray-300 font-mono">{fmt(s.val_rate, sym)}</td>
                                {(data?.price_lists ?? []).map(pl => {
                                  const m = pl.rate - s.val_rate
                                  const mp = s.val_rate > 0 ? (m / s.val_rate) * 100 : 0
                                  return <td key={pl.price_list} className="p-4 text-center border-l border-gray-100 dark:border-gray-700/40"><MarginChip pct={mp} /></td>
                                })}
                               </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {restrictCostVisibility && data?.batches && data.batches.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Batch Stock Information</h3>
                      <div className="space-y-2">
                        {Object.entries(batchesGrouped).map(([batchId, rows]) => {
                          const totalBatchQty = rows.reduce((s, r) => s + r.qty, 0)
                          const exp = rows[0]?.expiry_date
                          const mfg = rows[0]?.manufacturing_date
                          const expired = isExpired(exp)
                          const soonExp = isSoonExpiry(exp)
                          return (
                            <div key={batchId} className="bg-gray-50 dark:bg-gray-700/40 rounded-xl p-4 border border-gray-200 dark:border-gray-600">
                              <div className="flex justify-between items-start">
                                <div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-mono text-sm font-bold text-gray-900 dark:text-white">{batchId}</span>
                                    {expired && (
                                      <span className="text-[10px] uppercase px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">Expired</span>
                                    )}
                                    {!expired && soonExp && (
                                      <span className="text-[10px] uppercase px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300">Expiring Soon</span>
                                    )}
                                  </div>
                                  {exp && (
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Expiry: {fmtDate(exp)}</p>
                                  )}
                                  {mfg && (
                                    <p className="text-xs text-gray-400 mt-1">Manufactured: {fmtDate(mfg)}</p>
                                  )}
                                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    Locations: {rows.map(r => r.warehouse).join(", ")}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="text-[10px] text-gray-400 uppercase font-bold">Available Stock</p>
                                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalBatchQty.toLocaleString()} <span className="text-sm font-normal">{data.uom}</span></p>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {restrictCostVisibility && !!data?.has_serial_no && data?.serials && data.serials.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Serial Numbers</h3>
                      <div className="bg-gray-50 dark:bg-gray-700/40 rounded-xl p-4 border border-gray-200 dark:border-gray-600">
                        <div className="flex flex-wrap gap-2">
                          {data.serials.map((s, idx) => (
                            <span key={idx} className="font-mono text-xs bg-white dark:bg-gray-800 px-2 py-1 rounded border border-gray-200 dark:border-gray-600">
                              {s.serial_no}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              {activeTab === "details" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { label: "Item Code", value: item.id, mono: true },
                    { label: "Item Name", value: item.name },
                    { label: "Category", value: item.category },
                    { label: "UOM", value: data?.uom ?? "—" },
                    { label: "Brand", value: data?.brand ?? "—" },
                    { label: "Tracking", value: data?.has_serial_no ? "Serial Number Tracking" : data?.has_batch_no ? "Batch Tracking" : "Basic (No Tracking)" },
                    ...(!restrictCostVisibility ? [
                      { label: "Standard Rate", value: fmt(data?.standard_rate ?? 0, sym) },
                      { label: "Valuation Method", value: "Moving Average" },
                    ] : []),
                    { label: "Warehouse", value: warehouse ?? "—" },
                  ].map(({ label, value, mono }) => (
                    <div key={label} className="bg-gray-50 dark:bg-gray-700/40 rounded-xl p-4 border border-gray-200 dark:border-gray-600">
                      <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-1">{label}</p>
                      <p className={`text-sm text-gray-900 dark:text-white ${mono ? "font-mono" : "font-semibold"}`}>{value}</p>
                    </div>
                  ))}
                  {item.description && (
                    <div className="md:col-span-2 bg-gray-50 dark:bg-gray-700/40 rounded-xl p-4 border border-gray-200 dark:border-gray-600">
                      <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-2">Item Description</p>
                      <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{item.description}</p>
                    </div>
                  )}
                </div>
              )}

            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-4 bg-gray-50 dark:bg-gray-800/50 shrink-0">
              <button onClick={onClose} className="w-full px-6 py-3 bg-beveren-600 hover:bg-beveren-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-beveren-500/20 active:scale-[0.98]">
                Close Product Details
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}