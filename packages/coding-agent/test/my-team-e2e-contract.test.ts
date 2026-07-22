import { describe, expect, test } from "bun:test";
import { commands, resolveCliArgv } from "@oh-my-pi/pi-coding-agent/cli-commands";
import {
	buildMyTeamE2eEvents,
	buildMyTeamE2eRpcFrames,
	MY_TEAM_EVENT_TYPES,
	summarizeMyTeamE2eEvents,
} from "@oh-my-pi/pi-coding-agent/commands/my-team-e2e";
import { buildToolApprovalBinding } from "@oh-my-pi/pi-coding-agent/tools/approval";

const REQUIRED_FIELDS = [
	"session_id",
	"turn_id",
	"omp_request_id",
	"task_id",
	"task_revision",
	"tool_call_id",
	"arguments_digest",
	"nonce",
] as const;

describe("my-team OMP headless E2E contract", () => {
	test("CLI exposes the contract command without routing through launch", () => {
		expect(commands.some(command => command.name === "my-team-e2e")).toBe(true);
		expect(resolveCliArgv(["my-team-e2e", "--rounds", "8"])).toEqual({
			argv: ["my-team-e2e", "--rounds", "8"],
		});
	});

	test("events cover every required type and tuple field with linear growth", () => {
		const events = [...buildMyTeamE2eEvents({ sessionId: "session-1", taskId: "task-1", rounds: 8 })];
		const summary = summarizeMyTeamE2eEvents(events);

		expect(new Set(events.map(event => event.type))).toEqual(new Set(MY_TEAM_EVENT_TYPES));
		expect(summary.turn_count).toBe(8);
		expect(summary.pending_interactions).toBe(0);
		expect(summary.problems).toEqual([]);
		expect(summary.resource_policy.max_retained_events).toBeLessThanOrEqual(64);
		expect(events.length).toBeLessThanOrEqual(8 * 4 + 8);
		expect(summary.roles).toEqual(expect.arrayContaining(["manager", "employee", "reviewer", "watchdog"]));
		for (const event of events) {
			for (const field of REQUIRED_FIELDS) expect(event[field]).not.toBe("");
		}
	});

	test("summary covers OMP architecture contracts beyond event presence", () => {
		const events = [...buildMyTeamE2eEvents({ sessionId: "session-1", taskId: "task-1", rounds: 8 })];
		const summary = summarizeMyTeamE2eEvents(events);

		expect(summary.model_roles).toEqual(["fast_read", "code_default", "deep_reason", "design", "review"]);
		expect(summary.hashline).toMatchObject({
			anchored_batch_preflight: true,
			stale_snapshot_fails_closed: true,
			collision_fails_closed: true,
			no_partial_writes: true,
		});
		expect(summary.subagent_policy.parent_task_approval_is_not_yolo).toBe(true);
		expect(summary.subagent_policy.readonly_roles).toEqual(["designer", "librarian", "reviewer", "scout", "watchdog"]);
	});

	test("structured ask and tool approval RPC frames preserve the turn", () => {
		const sessionId = "session-1";
		const taskId = "task-1";
		const frames = buildMyTeamE2eRpcFrames({ sessionId, taskId });
		const events = [...buildMyTeamE2eEvents({ sessionId, taskId, rounds: 3 })];
		const approvalBinding = buildToolApprovalBinding("tool-approval-bash", "bash", { command: "bun test" }, 1);

		expect(
			new Set([...events.map(event => event.session_id), frames.ask.session_id, frames.tool_approval.session_id]),
		).toEqual(new Set([sessionId]));
		expect(
			new Set([...events.map(event => event.task_id), frames.ask.task_id, frames.tool_approval.task_id]),
		).toEqual(new Set([taskId]));
		expect(frames.ask).toMatchObject({
			type: "extension_ui_request",
			method: "ask",
			session_id: sessionId,
			task_id: taskId,
		});
		expect(frames.ask.questions.map(question => question.type)).toEqual(["single", "multi", "other", "note"]);
		expect(frames.tool_approval).toMatchObject({
			type: "extension_ui_request",
			method: "tool_approval",
			tool_name: approvalBinding.toolName,
			tool_call_id: approvalBinding.toolCallId,
			arguments_digest: approvalBinding.argumentsDigest,
			task_revision: approvalBinding.taskRevision,
			default_timeout_action: "deny_safe_pause",
		});
	});
});
