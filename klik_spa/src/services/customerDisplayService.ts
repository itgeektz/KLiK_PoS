const CHANNEL_NAME = "klik-pos-customer-display-v1";
const STORAGE_KEY = "klik-pos-customer-display-state-v1";

export type CustomerDisplayMode = "idle" | "cart" | "checkout" | "success";

export interface CustomerDisplayItem {
  id: string;
  name: string;
  quantity: number;
  uom?: string;
  unitPrice: number;
  lineTotal: number;
}

export interface CustomerDisplaySnapshot {
  mode: CustomerDisplayMode;
  items: CustomerDisplayItem[];
  customerName?: string;
  currency: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  payableTotal: number;
  paid: number;
  outstanding: number;
  change: number;
  invoiceName?: string;
  updatedAt: number;
}

type SnapshotListener = (snapshot: CustomerDisplaySnapshot) => void;

const idleSnapshot = (): CustomerDisplaySnapshot => ({
  mode: "idle",
  items: [],
  currency: "KES",
  subtotal: 0,
  discount: 0,
  tax: 0,
  total: 0,
  payableTotal: 0,
  paid: 0,
  outstanding: 0,
  change: 0,
  updatedAt: Date.now(),
});

function readStoredSnapshot(): CustomerDisplaySnapshot {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value ? JSON.parse(value) as CustomerDisplaySnapshot : idleSnapshot();
  } catch {
    return idleSnapshot();
  }
}

class CustomerDisplayService {
  private channel: BroadcastChannel | null = null;
  private snapshot = readStoredSnapshot();
  private listeners = new Set<SnapshotListener>();
  private successHoldUntil = 0;

  constructor() {
    if (typeof BroadcastChannel !== "undefined") {
      this.channel = new BroadcastChannel(CHANNEL_NAME);
      this.channel.onmessage = (event: MessageEvent<CustomerDisplaySnapshot>) => {
        if (!event.data || typeof event.data !== "object") return;
        this.accept(event.data);
      };
    }

    window.addEventListener("storage", (event) => {
      if (event.key !== STORAGE_KEY || !event.newValue) return;
      try {
        this.accept(JSON.parse(event.newValue) as CustomerDisplaySnapshot);
      } catch {
        // Ignore malformed data written by unrelated or older code.
      }
    });
  }

  getSnapshot() {
    return this.snapshot;
  }

  subscribe(listener: SnapshotListener) {
    this.listeners.add(listener);
    listener(this.snapshot);
    return () => {
      this.listeners.delete(listener);
    };
  }

  publish(snapshot: Omit<CustomerDisplaySnapshot, "updatedAt">, force = false) {
    if (!force && Date.now() < this.successHoldUntil) return;
    const next = { ...snapshot, updatedAt: Date.now() };
    this.accept(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (error) {
      console.warn("Unable to persist customer display state", error);
    }
    this.channel?.postMessage(next);
  }

  showSuccess(snapshot: Omit<CustomerDisplaySnapshot, "mode" | "updatedAt">) {
    this.successHoldUntil = Date.now() + 5000;
    this.publish({ ...snapshot, mode: "success" }, true);
  }

  openWindow() {
    return window.open("/klik_pos/customer-display", "klik-customer-display", "popup=yes,width=1024,height=768");
  }

  private accept(snapshot: CustomerDisplaySnapshot) {
    if (snapshot.updatedAt < this.snapshot.updatedAt) return;
    this.snapshot = snapshot;
    this.listeners.forEach((listener) => listener(snapshot));
  }
}

export const customerDisplayService = new CustomerDisplayService();