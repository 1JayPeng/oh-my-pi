// =============================================================================
// State Sync
// =============================================================================
// 定期同步 OMP 状态到飞书

import type { OmpState } from "./types.js";

/**
 * 状态同步器
 * 定期调用提供的状态查询函数，检测状态变化并通知
 */
export class StateSync {
  private interval: NodeJS.Timeout | null = null;
  private syncInterval: number; // 毫秒
  private onStateChange: (state: OmpState) => void;
  private lastState: OmpState | null = null;
  private stateProvider: () => Promise<OmpState>;

  constructor(
    syncIntervalMs: number,
    onStateChange: (state: OmpState) => void,
    stateProvider: () => Promise<OmpState>,
  ) {
    this.syncInterval = syncIntervalMs;
    this.onStateChange = onStateChange;
    this.stateProvider = stateProvider;
  }

  /**
   * 启动同步
   */
  start(): void {
    if (this.interval) return;

    // 立即同步一次
    this.performSync();

    // 设置定期同步
    this.interval = setInterval(() => {
      this.performSync();
    }, this.syncInterval);
  }

  /**
   * 停止同步
   */
  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  /**
   * 执行同步
   */
  private async performSync(): Promise<void> {
    try {
      // 调用状态提供函数获取当前状态
      const state = await this.stateProvider();

      // 只在状态变化时通知
      if (!this.statesEqual(state, this.lastState)) {
        this.lastState = state;
        this.onStateChange(state);
      }
    } catch (error) {
      console.error("State sync failed:", error);
    }
  }

  /**
   * 比较两个状态是否相等
   */
  private statesEqual(a: OmpState | null, b: OmpState | null): boolean {
    if (!a || !b) return a === b;
    return (
      a.branch === b.branch &&
      a.mainBranch === b.mainBranch &&
      a.contextUsage.total === b.contextUsage.total &&
      a.cost === b.cost &&
      a.model === b.model &&
      a.sessionId === b.sessionId
    );
  }
}