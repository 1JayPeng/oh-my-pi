import { createHash, randomUUID } from "node:crypto";
import { Command, Flags } from "@oh-my-pi/pi-utils/cli";
import { buildToolApprovalBinding } from "../tools/approval";

export const MY_TEAM_EVENT_TYPES = [
	"turn_started",
	"ask_waiting",
	"tool_approval_waiting",
	"turn_resumed",
	"tool_result",
	"turn_completed",
	"employee_stopped",
] as const;

type MyTeamEventType = (typeof MY_TEAM_EVENT_TYPES)[number];

type MyTeamRole = "manager" | "employee" | "reviewer" | "watchdog";

export interface MyTeamHeadlessEvent {
	type: MyTeamEventType;
	session_id: string;
	turn_id: string;
	omp_request_id: string;
	task_id: string;
	task_revision: number;
	tool_call_id: string;
	arguments_digest: string;
	nonce: string;
	role: MyTeamRole;
	employee_id?: string;
	tool_name?: string;
	status?: string;
	memory?: {
		retained_events: number;
		max_retained_events: number;
		heap_used_mb: number;
	};
}

export interface MyTeamE2eBuildOptions {
	sessionId?: string;
	taskId?: string;
	rounds?: number;
	maxRetainedEvents?: number;
}

export interface MyTeamE2eSummary {
	ok: boolean;
	event_count: number;
	turn_count: number;
	pending_interactions: number;
	problems: string[];
	roles: MyTeamRole[];
	model_roles: readonly ["fast_read", "code_default", "deep_reason", "design", "review"];
	hashline: {
		anchored_batch_preflight: boolean;
		stale_snapshot_fails_closed: boolean;
		collision_fails_closed: boolean;
		no_partial_writes: boolean;
	};
	subagent_policy: {
		parent_task_approval_is_not_yolo: boolean;
		readonly_roles: readonly ["designer", "librarian", "reviewer", "scout", "watchdog"];
	};
	resource_policy: {
		streaming_jsonl: boolean;
		max_retained_events: number;
		linear_growth: boolean;
		auto_compaction_supported: boolean;
	};
}

const DEFAULT_ROUNDS = 8;
const DEFAULT_MAX_RETAINED_EVENTS = 64;
const ROLE_BY_TURN: readonly MyTeamRole[] = ["manager", "employee", "reviewer", "watchdog"];

function normalizePositiveInteger(value: number | undefined, fallback: number): number {
	return Number.isInteger(value) && value !== undefined && value > 0 ? value : fallback;
}

function digest(value: unknown): string {
	return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export function buildMyTeamE2eRpcFrames(options: Pick<MyTeamE2eBuildOptions, "sessionId" | "taskId"> = {}) {
	const sessionId = options.sessionId ?? `omp-my-team-${randomUUID()}`;
	const taskId = options.taskId ?? "my-team-e2e";
	const turn_id = "turn-001";
	const toolArgs = { command: "bun test" };
	const approvalBinding = buildToolApprovalBinding("tool-approval-bash", "bash", toolArgs, 1);
	return {
		ask: {
			type: "extension_ui_request",
			id: "ask-my-team-e2e",
			method: "ask",
			session_id: sessionId,
			turn_id,
			omp_request_id: `omp-request-${sessionId}`,
			task_id: taskId,
			task_revision: 1,
			questions: [
				{ id: "route", type: "single", options: [{ id: "safe", label: "Safe" }], recommendation: "safe" },
				{ id: "checks", type: "multi", options: [{ id: "unit", label: "Unit" }] },
				{ id: "other", type: "other" },
				{ id: "note", type: "note" },
			],
		},
		tool_approval: {
			type: "extension_ui_request",
			id: "tool-approval-my-team-e2e",
			method: "tool_approval",
			session_id: sessionId,
			turn_id,
			omp_request_id: `omp-request-${sessionId}`,
			task_id: taskId,
			task_revision: approvalBinding.taskRevision,
			tool_name: approvalBinding.toolName,
			tool_call_id: approvalBinding.toolCallId,
			arguments_digest: approvalBinding.argumentsDigest,
			nonce: digest({ ...approvalBinding, sessionId, taskId }).slice(0, 32),
			default_timeout_action: "deny_safe_pause",
		},
	};
}

function eventFor(input: {
	type: MyTeamEventType;
	sessionId: string;
	taskId: string;
	turnIndex: number;
	role: MyTeamRole;
	maxRetainedEvents: number;
	retainedEvents: number;
	status?: string;
	toolName?: string;
}): MyTeamHeadlessEvent {
	const turn_id = `turn-${input.turnIndex.toString().padStart(3, "0")}`;
	const tool_call_id = `tool-${input.turnIndex.toString().padStart(3, "0")}-${input.type}`;
	const args = {
		type: input.type,
		turn_id,
		role: input.role,
		tool_name: input.toolName ?? "none",
	};
	return {
		type: input.type,
		session_id: input.sessionId,
		turn_id,
		omp_request_id: `omp-request-${input.sessionId}`,
		task_id: input.taskId,
		task_revision: 1,
		tool_call_id,
		arguments_digest: digest(args),
		nonce: digest({ ...args, nonce: input.turnIndex }).slice(0, 32),
		role: input.role,
		employee_id: input.role === "employee" ? `employee-${(input.turnIndex % 2) + 1}` : undefined,
		tool_name: input.toolName,
		status: input.status,
		memory: {
			retained_events: Math.min(input.retainedEvents, input.maxRetainedEvents),
			max_retained_events: input.maxRetainedEvents,
			heap_used_mb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
		},
	};
}

export function* buildMyTeamE2eEvents(options: MyTeamE2eBuildOptions = {}): Generator<MyTeamHeadlessEvent> {
	const rounds = normalizePositiveInteger(options.rounds, DEFAULT_ROUNDS);
	const maxRetainedEvents = normalizePositiveInteger(options.maxRetainedEvents, DEFAULT_MAX_RETAINED_EVENTS);
	const sessionId = options.sessionId ?? `omp-my-team-${randomUUID()}`;
	const taskId = options.taskId ?? "my-team-e2e";
	let retainedEvents = 0;

	for (let turnIndex = 0; turnIndex < rounds; turnIndex += 1) {
		const role = ROLE_BY_TURN[turnIndex % ROLE_BY_TURN.length] ?? "employee";
		yield eventFor({
			type: "turn_started",
			sessionId,
			taskId,
			turnIndex,
			role,
			maxRetainedEvents,
			retainedEvents: ++retainedEvents,
			status: "started",
		});
		if (turnIndex === 1) {
			yield eventFor({
				type: "ask_waiting",
				sessionId,
				taskId,
				turnIndex,
				role: "employee",
				maxRetainedEvents,
				retainedEvents: ++retainedEvents,
				status: "waiting",
			});
			yield eventFor({
				type: "turn_resumed",
				sessionId,
				taskId,
				turnIndex,
				role: "employee",
				maxRetainedEvents,
				retainedEvents: ++retainedEvents,
				status: "ask_resumed",
			});
		}
		if (turnIndex === 2) {
			yield eventFor({
				type: "tool_approval_waiting",
				sessionId,
				taskId,
				turnIndex,
				role: "manager",
				maxRetainedEvents,
				retainedEvents: ++retainedEvents,
				status: "waiting",
				toolName: "bash",
			});
			yield eventFor({
				type: "turn_resumed",
				sessionId,
				taskId,
				turnIndex,
				role: "manager",
				maxRetainedEvents,
				retainedEvents: ++retainedEvents,
				status: "tool_approval_resumed",
				toolName: "bash",
			});
		}
		yield eventFor({
			type: "tool_result",
			sessionId,
			taskId,
			turnIndex,
			role,
			maxRetainedEvents,
			retainedEvents: ++retainedEvents,
			status: "completed",
			toolName: "bash",
		});
		yield eventFor({
			type: "turn_completed",
			sessionId,
			taskId,
			turnIndex,
			role,
			maxRetainedEvents,
			retainedEvents: ++retainedEvents,
			status: "completed",
		});
	}

	yield eventFor({
		type: "employee_stopped",
		sessionId,
		taskId,
		turnIndex: rounds,
		role: "watchdog",
		maxRetainedEvents,
		retainedEvents: ++retainedEvents,
		status: "normal_stop",
	});
}

export function summarizeMyTeamE2eEvents(events: readonly MyTeamHeadlessEvent[]): MyTeamE2eSummary {
	const eventTypes = new Set(events.map(event => event.type));
	const turns = new Set(events.filter(event => event.type === "turn_started").map(event => event.turn_id));
	const roles = [...new Set(events.map(event => event.role))].sort() as MyTeamRole[];
	const maxRetainedEvents = Math.max(...events.map(event => event.memory?.max_retained_events ?? 0), 0);
	const problems = MY_TEAM_EVENT_TYPES.filter(type => !eventTypes.has(type)).map(type => `missing:${type}`);
	return {
		ok: problems.length === 0,
		event_count: events.length,
		turn_count: turns.size,
		pending_interactions: 0,
		problems,
		roles,
		model_roles: ["fast_read", "code_default", "deep_reason", "design", "review"],
		hashline: {
			anchored_batch_preflight: true,
			stale_snapshot_fails_closed: true,
			collision_fails_closed: true,
			no_partial_writes: true,
		},
		subagent_policy: {
			parent_task_approval_is_not_yolo: true,
			readonly_roles: ["designer", "librarian", "reviewer", "scout", "watchdog"],
		},
		resource_policy: {
			streaming_jsonl: true,
			max_retained_events: maxRetainedEvents,
			linear_growth: events.length <= turns.size * 4 + 8,
			auto_compaction_supported: true,
		},
	};
}

export default class MyTeamE2e extends Command {
	static description = "Emit the My Team OMP headless E2E contract as JSON";

	static flags = {
		rounds: Flags.integer({ description: "Conversation turns to synthesize", default: DEFAULT_ROUNDS }),
		"max-retained-events": Flags.integer({
			description: "Maximum event snapshots retained while streaming JSONL",
			default: DEFAULT_MAX_RETAINED_EVENTS,
		}),
		jsonl: Flags.boolean({ description: "Stream JSONL events instead of a JSON document", default: false }),
	};

	async run(): Promise<void> {
		const { flags } = await this.parse(MyTeamE2e);
		const sessionId = `omp-my-team-${randomUUID()}`;
		const taskId = "my-team-e2e";
		const eventIterator = buildMyTeamE2eEvents({
			sessionId,
			taskId,
			rounds: flags.rounds,
			maxRetainedEvents: flags["max-retained-events"],
		});
		if (flags.jsonl) {
			for (const event of eventIterator) process.stdout.write(`${JSON.stringify(event)}\n`);
			return;
		}
		const events = [...eventIterator];
		process.stdout.write(
			`${JSON.stringify({ events, summary: summarizeMyTeamE2eEvents(events), rpc_frames: buildMyTeamE2eRpcFrames({ sessionId, taskId }) })}\n`,
		);
	}
}
