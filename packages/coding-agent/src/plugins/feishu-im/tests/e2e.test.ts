// =============================================================================
// E2E Tests - Feishu IM Plugin Integration
// =============================================================================

import { describe, it, expect, beforeEach, afterEach, vi } from "bun:test";
import { FeishuClient } from "../src/feishu-client.js";
import { CommandRouter } from "../src/command-router.js";
import { StateSync } from "../src/state-sync.js";
import { OutputFormatter } from "../src/output-formatter.js";
import { ConfirmationManager } from "../src/confirmation.js";
import type { FeishuMessageEvent, OmpState, ConfirmationRequest } from "../src/types.js";

describe("E2E: Feishu IM Plugin Integration", () => {
  let client: FeishuClient;
  let commandRouter: CommandRouter;
  let stateSync: StateSync;
  let outputFormatter: OutputFormatter;
  let confirmationManager: ConfirmationManager;
  let stateChangeCallback: (state: OmpState) => void;
  let stateChangeCount: number;

  beforeEach(() => {
    vi.useFakeTimers();

    // 初始化各模块
    client = new FeishuClient({
      appId: "test_app_id",
      appSecret: "test_app_secret",
    });

    commandRouter = new CommandRouter();
    stateChangeCallback = () => {
      stateChangeCount++;
    };
    stateSync = new StateSync(1000, stateChangeCallback); // 1 秒同步一次
    outputFormatter = new OutputFormatter();
    confirmationManager = new ConfirmationManager();
    stateChangeCount = 0;
  });

  afterEach(() => {
    vi.useRealTimers();
    stateSync.stop();
    confirmationManager.cancelAll();
  });

  it("E2E-01: 完整消息处理流程 - 普通 prompt", async () => {
    // 模拟飞书消息
    const event: FeishuMessageEvent = {
      type: "im.message.receive_v1",
      message_id: "msg_123",
      chat_type: "p2p",
      sender_id: "user_123",
      content: "/omp prompt 帮我分析一下这段代码",
      create_time: "1234567890",
      message: {
        chat_id: "chat_123",
        chat_type: "p2p",
        content: "/omp prompt 帮我分析一下这段代码",
        message_id: "msg_123",
        message_type: "text",
        receive_id: "bot_123",
        sender: {
          id: "user_123",
          id_type: "open_id",
          sender_id_type: "open_id",
          sender_type: "user",
          tenant_key: "tenant_123",
        },
        create_time: "1234567890",
        update_time: "1234567890",
        mention: [],
      },
    };

    // 解析命令
    const parsed = commandRouter.parseMessage(event);

    // 验证解析结果
    expect(parsed.isConfirmation ?? false).toBe(false);
    if (!parsed.isConfirmation) {
      expect(parsed.command.type).toBe("prompt");
      expect(parsed.command.content).toBe("帮我分析一下这段代码");
    }
  });

  it("E2E-02: 完整消息处理流程 - 危险操作确认", async () => {
    // 创建确认请求
    const confirmRequest: ConfirmationRequest = {
      id: "confirm_123",
      description: "删除文件 xxx.ts",
      risk: "high",
      timeout: 30000,
    };

    // 创建确认卡片
    const card = client.createConfirmationCard(confirmRequest);

    // 验证卡片结构
    expect(card).toBeDefined();
    expect(card.header.title.content).toBe("⚠️ 危险操作确认");
    expect(card.header.template).toBe("red");
    expect(card.elements).toHaveLength(3);

    // 模拟用户点击"确认执行"
    const confirmEvent: FeishuMessageEvent = {
      type: "im.message.receive_v1",
      message_id: "msg_456",
      chat_type: "p2p",
      sender_id: "user_123",
      content: "!123:confirm",
      create_time: "1234567891",
      message: {
        chat_id: "chat_123",
        chat_type: "p2p",
        content: "!123:confirm",
        message_id: "msg_456",
        message_type: "text",
        receive_id: "bot_123",
        sender: {
          id: "user_123",
          id_type: "open_id",
          sender_id_type: "open_id",
          sender_type: "user",
          tenant_key: "tenant_123",
        },
        create_time: "1234567891",
        update_time: "1234567891",
        mention: [],
      },
    };

    // 解析确认响应
    const parsed = commandRouter.parseMessage(confirmEvent);

    // 验证解析结果
    expect(parsed.isConfirmation).toBe(true);
    if (parsed.isConfirmation) {
      expect(parsed.requestId).toBe("123");
      expect(parsed.action).toBe("confirm");
    }
  });

  it("E2E-03: 状态同步流程", async () => {
    // 启动状态同步
    stateSync.start();

    // 使用 fake timers  advance 1.5 秒
    vi.advanceTimersByTime(1500);

    // 验证状态变化回调被调用
    expect(stateChangeCount).toBeGreaterThanOrEqual(1);
  });

  it("E2E-04: 输出格式化流程", () => {
    // 测试文本输出
    const textCard = outputFormatter.formatTextOutput("测试结果", "测试内容");
    expect(textCard).toBeDefined();
    expect(textCard.header.title.content).toBe("测试结果");
    expect(textCard.header.template).toBe("blue");

    // 测试错误输出
    const errorCard = outputFormatter.formatErrorOutput("错误", "Something went wrong");
    expect(errorCard).toBeDefined();
    expect(errorCard.header.template).toBe("red");

    // 测试成功输出
    const successCard = outputFormatter.formatSuccessOutput("成功", "Operation completed");
    expect(successCard).toBeDefined();
    expect(successCard.header.template).toBe("green");

    // 测试代码输出
    const codeCard = outputFormatter.formatCodeOutput("代码", "typescript", "const x: number = 1;");
    expect(codeCard).toBeDefined();
  });

  it("E2E-05: 确认管理器完整流程", async () => {
    // 创建确认请求
    const confirmRequest: ConfirmationRequest = {
      id: "confirm_456",
      description: "执行危险操作",
      risk: "medium",
      timeout: 5000,
    };

    // 创建确认 Promise
    const confirmPromise = confirmationManager.createConfirmation(confirmRequest);

    // 验证待确认数量
    expect(confirmationManager.getPendingCount()).toBe(1);

    // 模拟确认
    confirmationManager.handleConfirmation("confirm_456", "confirm");

    // 验证 Promise 解析
    const result = await confirmPromise;
    expect(result.type).toBe("confirm");
    expect(result.requestId).toBe("confirm_456");

    // 验证待确认数量已减少
    expect(confirmationManager.getPendingCount()).toBe(0);
  });

  it("E2E-06: 确认超时处理", async () => {
    // 创建确认请求（超时 100ms）
    const confirmRequest: ConfirmationRequest = {
      id: "confirm_timeout",
      description: "超时测试",
      risk: "low",
      timeout: 100,
    };

    // 创建确认 Promise
    const confirmPromise = confirmationManager.createConfirmation(confirmRequest);

    // 使用 fake timers advance 200ms
    vi.advanceTimersByTime(200);

    // 验证 Promise 已解析（超时自动拒绝）
    const result = await confirmPromise;
    expect(result.type).toBe("reject");
    if (result.type === "reject") {
      expect(result.reason).toBe("超时");
    }
  });

  it("E2E-07: 命令路由 - 所有支持的命令", () => {
    const commands = [
      { input: "/omp prompt test", expected: { type: "prompt", content: "test" } },
      { input: "/omp steer test", expected: { type: "steer", content: "test" } },
      { input: "/omp follow-up test", expected: { type: "follow_up", content: "test" } },
      { input: "/omp abort", expected: { type: "abort" } },
      { input: "/omp new-session", expected: { type: "new_session" } },
      { input: "/omp switch-session 123", expected: { type: "switch_session", sessionId: "123" } },
      { input: "/omp branch", expected: { type: "branch" } },
      { input: "/omp state", expected: { type: "get_state" } },
      { input: "/omp set-model gpt-4", expected: { type: "set_model", model: "gpt-4" } },
      { input: "/omp compact", expected: { type: "compact" } },
      { input: "/omp bash git status", expected: { type: "bash", content: "git status" } },
      { input: "/omp handoff test", expected: { type: "handoff", content: "test" } },
      { input: "/omp messages 10", expected: { type: "get_messages", limit: 10 } },
    ];

    for (const cmd of commands) {
      const event: FeishuMessageEvent = {
        type: "im.message.receive_v1",
        message_id: `msg_${cmd.input}`,
        chat_type: "p2p",
        sender_id: "user_123",
        content: cmd.input,
        create_time: "1234567890",
        message: {
          chat_id: "chat_123",
          chat_type: "p2p",
          content: cmd.input,
          message_id: `msg_${cmd.input}`,
          message_type: "text",
          receive_id: "bot_123",
          sender: {
            id: "user_123",
            id_type: "open_id",
            sender_id_type: "open_id",
            sender_type: "user",
            tenant_key: "tenant_123",
          },
          create_time: "1234567890",
          update_time: "1234567890",
          mention: [],
        },
      };

      const parsed = commandRouter.parseMessage(event);
      expect(parsed.isConfirmation ?? false).toBe(false);
      if (!parsed.isConfirmation) {
        expect(parsed.command).toEqual(cmd.expected);
      }
    }
  });

  it("E2E-08: 状态卡片生成", () => {
    const state: OmpState = {
      branch: "main",
      mainBranch: "main",
      contextUsage: {
        input: 50000,
        output: 25000,
        cacheRead: 10000,
        cacheWrite: 5000,
        total: 90000,
      },
      cost: 0.15,
      model: "gpt-4",
      sessionId: "session_123",
      currentTask: "实现飞书集成",
    };

    const card = client.createStateCard(state);

    expect(card).toBeDefined();
    expect(card.header.title.content).toBe("📊 OMP 状态");
    expect(card.header.template).toBe("blue");
    expect(card.elements).toHaveLength(5);

    // 验证卡片内容包含关键信息
    const firstDiv = card.elements[0] as { tag: "div"; text: { tag: "lark_md"; content: string } };
    expect(firstDiv.text.content).toContain("main");
    expect(firstDiv.text.content).toContain("gpt-4");
    expect(firstDiv.text.content).toContain("session_123");
  });

  it("E2E-09: 签名验证流程", async () => {
    // 计算期望的哈希
    const timestamp = "1234567890";
    const nonce = "test_nonce";
    const encryption = "";
    const body = '{"test": "data"}';

    const crypto = globalThis.crypto;
    const encoder = new TextEncoder();
    const stringToSign = `${timestamp}${nonce}${encryption}${body}`;
    const data = encoder.encode(stringToSign);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const expectedHash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

    // 创建带验证 token 的客户端
    const signedClient = new FeishuClient({
      appId: "test_app_id",
      appSecret: "test_app_secret",
      verificationToken: expectedHash,
    });

    // 验证签名
    const result = await signedClient.verifySignature(timestamp, nonce, encryption, body);
    expect(result).toBe(true);

    // 测试无效签名
    const invalidClient = new FeishuClient({
      appId: "test_app_id",
      appSecret: "test_app_secret",
      verificationToken: "invalid_hash",
    });

    const invalidResult = await invalidClient.verifySignature(timestamp, nonce, encryption, body);
    expect(invalidResult).toBe(false);
  });
});