const STORAGE_KEY = "klik-pos-pole-display-v1";
const DISPLAY_WIDTH = 20;
const DEFAULT_BAUD_RATE = 9600;
const AGENT_URL = "http://127.0.0.1:17321";

export type PoleDisplayStatus = "unsupported" | "disabled" | "connecting" | "connected" | "error";

export interface PoleDisplayState {
  status: PoleDisplayStatus;
  message: string;
  transport?: "agent" | "web-serial";
  portName?: string;
}

interface StoredPoleDisplayConfig {
  enabled: boolean;
  baudRate: number;
}

interface AgentHealth {
  ok?: boolean;
  port?: string;
  service?: string;
  error?: string;
}

type StatusListener = (state: PoleDisplayState) => void;

function loadConfig(): StoredPoleDisplayConfig {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") as Partial<StoredPoleDisplayConfig>;
    return {
      enabled: parsed.enabled === true,
      baudRate: Number(parsed.baudRate) || DEFAULT_BAUD_RATE,
    };
  } catch {
    return { enabled: false, baudRate: DEFAULT_BAUD_RATE };
  }
}

function saveConfig(config: StoredPoleDisplayConfig) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

function asciiText(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[^\x20-\x7E]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function fitLine(value: string): string {
  return asciiText(value).slice(0, DISPLAY_WIDTH).padEnd(DISPLAY_WIDTH, " ");
}

function money(value: number): string {
  const safeValue = Number.isFinite(value) ? value : 0;
  return safeValue.toLocaleString("en-KE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function amountLine(label: string, value: number): string {
  const amount = `KES ${money(value)}`;
  const cleanLabel = asciiText(label).slice(0, Math.max(0, DISPLAY_WIDTH - amount.length - 1));
  return fitLine(`${cleanLabel}${" ".repeat(Math.max(1, DISPLAY_WIDTH - cleanLabel.length - amount.length))}${amount}`);
}

class PoleDisplayService {
  private port: SerialPort | null = null;
  private config = loadConfig();
  private state: PoleDisplayState;
  private listeners = new Set<StatusListener>();
  private writeQueue: Promise<void> = Promise.resolve();
  private holdUntil = 0;
  private reconnectTimer: number | null = null;
  private agentConnected = false;
  private agentPortName: string | null = null;

  constructor() {
    this.state = { status: "disabled", message: "Checking Windows pole display agent" };

    navigator.serial?.addEventListener("connect", () => {
      if (this.config.enabled) void this.tryReconnect();
    });

    navigator.serial?.addEventListener("disconnect", (event) => {
      if (event.target !== this.port) return;
      this.port = null;
      this.setState({ status: "error", message: "Pole display disconnected; reconnecting automatically" });
      this.scheduleReconnect();
    });

    void this.probeAgent();
  }

  isSupported() {
    return true;
  }

  isEnabled() {
    return this.config.enabled;
  }

  getState() {
    return this.state;
  }

async probeAgent() {
  if (this.agentConnected) return true;
  if (await this.connectAgent(true)) return true;

  if (navigator.serial) {
    this.setState({ status: "disabled", message: "Windows agent not found. Web Serial fallback is available in Chrome or Edge." });
    return false;
  }

  this.setState({ status: "unsupported", message: "Windows agent not found. Web Serial fallback requires Chrome or Edge." });
  return false;
}


  subscribe(listener: StatusListener) {
    this.listeners.add(listener);
    listener(this.state);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private setState(state: PoleDisplayState) {
    this.state = state;
    this.listeners.forEach((listener) => listener(state));
  }

  async connect() {
        if (await this.connectAgent(true)) {
      this.config = { ...this.config, enabled: true };
      saveConfig(this.config);
      await this.showIdle(true);
      return true;
    }
    
    if (!navigator.serial) {
      this.setState({ status: "unsupported", message: "Web Serial requires Chrome or Edge on Windows" });
      return false;
    }

    this.setState({ status: "connecting", message: "Select the USB-SERIAL CH340 device" });
    try {
      const port = await navigator.serial.requestPort({
        filters: [{ usbVendorId: 0x1a86, usbProductId: 0x7523 }],
      });
      await this.openPort(port);
      this.config = { ...this.config, enabled: true };
      saveConfig(this.config);
      await this.showIdle(true);
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to connect to the pole display";
      this.setState({ status: "error", message });
      return false;
    }
  }

    async tryReconnect() {
    if (this.agentConnected || this.port) return true;

    if (await this.connectAgent(true)) {
      this.config = { ...this.config, enabled: true };
      saveConfig(this.config);
      this.clearReconnectTimer();
      await this.showIdle(true);
      return true;
    }

    if (!this.config.enabled || !navigator.serial) return false;

    this.setState({ status: "connecting", message: "Reconnecting to the pole display" });

    try {
      const ports = await navigator.serial.getPorts();
      const selected = ports.find((port) => {
        const info = port.getInfo();
        return info.usbVendorId === 0x1a86 && info.usbProductId === 0x7523;
      }) || ports[0];

      if (!selected) {
        this.setState({ status: "disabled", message: "Open Settings and select the COM device" });
        return false;
      }

      await this.openPort(selected);
      this.clearReconnectTimer();
      await this.showIdle(true);
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Automatic reconnect failed";
      this.setState({ status: "error", message });
      this.scheduleReconnect();
      return false;
    }
  }

  private async openPort(port: SerialPort) {
    if (this.port === port && this.state.status === "connected") return;
    await port.open({
      baudRate: this.config.baudRate,
      dataBits: 8,
      stopBits: 1,
      parity: "none",
      flowControl: "none",
    });
    this.port = port;
        this.setState({
      status: "connected",
      message: `Connected at ${this.config.baudRate} baud`,
      transport: "web-serial",
    });
  }

  async disconnect() {
    this.config = { ...this.config, enabled: false };
    saveConfig(this.config);
    const port = this.port;
    this.port = null;
    this.agentConnected = false;
    this.agentPortName = null;
    this.clearReconnectTimer();
    try {
      await this.writeQueue.catch(() => undefined);
      await port?.close();
    } catch (error) {
      console.warn("Unable to close pole display port cleanly", error);
    }
    this.setState({ status: "disabled", message: "Pole display is disconnected" });
  }

  private queueFrame(line1: string, line2: string, force = false) {
    if (!force && Date.now() < this.holdUntil) return;
    if (!this.config.enabled || (!this.agentConnected && !this.port?.writable)) return;

    const frame = new Uint8Array([
      0x0c,
      ...new TextEncoder().encode(fitLine(line1) + fitLine(line2)),
    ]);

    this.writeQueue = this.writeQueue
      .then(async () => {
        if (this.agentConnected) {
          const response = await fetch(`${AGENT_URL}/display`, {
            method: "POST",
            mode: "cors",
            cache: "no-store",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ line1: fitLine(line1), line2: fitLine(line2) }),
          });
          if (!response.ok) throw new Error(`Windows agent returned HTTP ${response.status}`);
          return;
        }
        const writer = this.port?.writable?.getWriter();
        if (!writer) return;
        try {
          await writer.write(frame);
        } finally {
          writer.releaseLock();
        }
      })
      .catch((error) => {
        console.warn("Pole display write failed; checkout will continue", error);
        this.setState({ status: "error", message: error instanceof Error ? error.message : "Display write failed" });
        this.agentConnected = false;
        const failedPort = this.port;
        this.port = null;
        void failedPort?.close().catch(() => undefined).finally(() => this.scheduleReconnect());
      });
  }
  private async connectAgent(markEnabled = false) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 800);

    try {
      const response = await fetch(`${AGENT_URL}/health`, {
        mode: "cors",
        cache: "no-store",
        signal: controller.signal,
      });

      if (!response.ok) return false;

      const health = (await response.json()) as AgentHealth;
      if (health.ok === false) return false;

      this.agentConnected = true;
      this.agentPortName = health.port || null;

      if (markEnabled) {
        this.config = { ...this.config, enabled: true };
        saveConfig(this.config);
      }

      this.setState({
        status: "connected",
        message: `Connected through Windows agent${this.agentPortName ? ` on ${this.agentPortName}` : ""}`,
        transport: "agent",
        portName: this.agentPortName || undefined,
      });

      return true;
    } catch {
      this.agentConnected = false;
      this.agentPortName = null;
      return false;
    } finally {
      window.clearTimeout(timeout);
    }
  }

  private scheduleReconnect() {
    if (!this.config.enabled || this.reconnectTimer !== null) return;

    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      void this.tryReconnect();
    }, 3000);
  }

  private clearReconnectTimer() {
    if (this.reconnectTimer === null) return;

    window.clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
  }
  showIdle(force = false) {
    this.queueFrame("VIRDI PHARMACY", "WELCOME", force);
    return this.writeQueue;
  }

  showCart(itemName: string, quantity: number, unitRate: number, total: number) {
    const qtyRate = `${quantity}X${money(unitRate)}`;
    this.queueFrame(itemName, `${qtyRate} T:${money(total)}`);
  }

  showCheckout(total: number, due: number, paid: number, change: number) {
    if (paid > 0 || change > 0) {
      this.queueFrame(amountLine("PAID", paid), amountLine("CHANGE", change));
      return;
    }
    this.queueFrame(amountLine("TOTAL", total), amountLine("DUE", due));
  }

  showSuccess(invoiceName?: string) {
    this.holdUntil = Date.now() + 5000;
    this.queueFrame("THANK YOU", invoiceName || "VIRDI PHARMACY", true);
  }

  showTest() {
    this.queueFrame("VIRDI PHARMACY", "DISPLAY TEST OK", true);
    return this.writeQueue;
  }
}

export const poleDisplayService = new PoleDisplayService();
