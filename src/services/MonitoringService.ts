
interface Stats {
  cpu: number;
  ram: number;
}

type NotificationHandler = (message: string) => void;

class MonitoringService {
  private threshold = 85;
  private durationThreshold = 5 * 60 * 1000; // 5 minutes in ms
  private cpuViolationStart: number | null = null;
  private ramViolationStart: number | null = null;
  private onNotify: NotificationHandler | null = null;

  setNotificationHandler(handler: NotificationHandler) {
    this.onNotify = handler;
  }

  init() {
    console.log("[MonitoringService] Initialized");
  }

  updateStats(stats: Stats) {
    const now = Date.now();

    // CPU Check
    if (stats.cpu > this.threshold) {
      if (!this.cpuViolationStart) {
        this.cpuViolationStart = now;
      } else if (now - this.cpuViolationStart > this.durationThreshold) {
        this.triggerNotification('CPU usage exceeded 85% for more than 5 minutes.');
        this.cpuViolationStart = now; // Reset to avoid spamming every second after 5 mins, or keep it null? 
        // User didn't specify frequency of notifications, I'll reset the start to "now" to wait another 5 mins or stay silent.
      }
    } else {
      this.cpuViolationStart = null;
    }

    // RAM Check
    if (stats.ram > this.threshold) {
      if (!this.ramViolationStart) {
        this.ramViolationStart = now;
      } else if (now - this.ramViolationStart > this.durationThreshold) {
        this.triggerNotification('RAM usage exceeded 85% for more than 5 minutes.');
        this.ramViolationStart = now;
      }
    } else {
      this.ramViolationStart = null;
    }
  }

  private triggerNotification(message: string) {
    if (this.onNotify) {
      this.onNotify(message);
    }
    console.warn(`[MonitoringService] ${message}`);
  }
}

export const monitoringService = new MonitoringService();
