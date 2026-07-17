// =============================================================================
// Confirmation Handler
// =============================================================================
// 处理危险操作的二次确认

import type { ConfirmationRequest, ConfirmationResponse } from "./types.js";

/**
 * 确认管理器
 */
export class ConfirmationManager {
  private pendingConfirmations = new Map<string, {
    request: ConfirmationRequest;
    resolve: (response: ConfirmationResponse) => void;
    timeout: NodeJS.Timeout;
  }>();

  /**
   * 创建确认请求
   */
  createConfirmation(request: ConfirmationRequest): Promise<ConfirmationResponse> {
    const { promise, resolve } = Promise.withResolvers<ConfirmationResponse>();

    const timeout = setTimeout(() => {
      this.pendingConfirmations.delete(request.id);
      resolve({ type: "reject", requestId: request.id, reason: "超时" });
    }, request.timeout);

    this.pendingConfirmations.set(request.id, {
      request,
      resolve,
      timeout,
    });

    return promise;
  }

  /**
   * 处理确认响应
   */
  handleConfirmation(requestId: string, action: "confirm" | "reject", reason?: string): void {
    const pending = this.pendingConfirmations.get(requestId);
    if (!pending) {
      console.warn(`Unknown confirmation request: ${requestId}`);
      return;
    }

    // 清除超时
    clearTimeout(pending.timeout);
    this.pendingConfirmations.delete(requestId);

    // 解析 Promise
    pending.resolve({
      type: action,
      requestId,
      reason,
    });
  }

  /**
   * 获取待确认数量
   */
  getPendingCount(): number {
    return this.pendingConfirmations.size;
  }

  /**
   * 取消所有待确认
   */
  cancelAll(): void {
    for (const [id, pending] of this.pendingConfirmations) {
      clearTimeout(pending.timeout);
      pending.resolve({ type: "reject", requestId: id, reason: "插件停止" });
    }
    this.pendingConfirmations.clear();
  }
}