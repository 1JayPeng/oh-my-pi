// =============================================================================
// Feishu Client Test
// =============================================================================

import { describe, it, expect } from "bun:test";
import { FeishuClient } from "../src/feishu-client.js";
import type { ConfirmationRequest, OmpState } from "../src/types.js";

describe("FeishuClient", () => {
  const testConfig = {
    appId: "test_app_id",
    appSecret: "test_app_secret",
  };

  it("should create a client instance", () => {
    const client = new FeishuClient(testConfig);
    expect(client).toBeDefined();
  });

  it("should create a confirmation card", () => {
    const client = new FeishuClient(testConfig);
    const request: ConfirmationRequest = {
      id: "test-123",
      description: "Test operation",
      risk: "high",
      timeout: 30000,
    };

    const card = client.createConfirmationCard(request);
    expect(card).toBeDefined();
    expect(card.header.title.content).toBe("⚠️ 危险操作确认");
    expect(card.header.template).toBe("red");
    expect(card.elements).toHaveLength(3); // div, hr, action
  });

  it("should create a state card", () => {
    const client = new FeishuClient(testConfig);
    const state: OmpState = {
      branch: "main",
      mainBranch: "main",
      contextUsage: {
        input: 1000,
        output: 500,
        cacheRead: 200,
        cacheWrite: 100,
        total: 1800,
      },
      cost: 0.05,
      model: "gpt-4",
      sessionId: "session-123",
    };

    const card = client.createStateCard(state);
    expect(card).toBeDefined();
    expect(card.header.title.content).toBe("📊 OMP 状态");
    expect(card.header.template).toBe("blue");
    expect(card.elements).toHaveLength(5); // div, hr, div, hr, div
  });

  it("should verify signature when token matches", async () => {
    const timestamp = "1234567890";
    const nonce = "test_nonce";
    const encryption = "";
    const body = '{"test": "data"}';

    // 计算期望的哈希
    const crypto = globalThis.crypto;
    const encoder = new TextEncoder();
    const stringToSign = `${timestamp}${nonce}${encryption}${body}`;
    const data = encoder.encode(stringToSign);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const expectedHash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

    // 使用期望的哈希作为 verificationToken
    const client = new FeishuClient({
      ...testConfig,
      verificationToken: expectedHash,
    });

    const result = await client.verifySignature(timestamp, nonce, encryption, body);
    expect(result).toBe(true);
  });

  it("should skip verification when no token configured", async () => {
    const client = new FeishuClient(testConfig);

    const result = await client.verifySignature("123", "456", undefined, '{"test": "data"}');
    expect(result).toBe(true);
  });
});