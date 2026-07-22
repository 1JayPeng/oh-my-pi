import { describe, expect, test } from "bun:test";
import { commands, resolveCliArgv } from "@oh-my-pi/pi-coding-agent/cli-commands";
import {
	MY_TEAM_EVENT_TYPES,
	buildMyTeamE2eEvents,
	summarizeMyTeamE2eEvents,
} from "@oh-my-pi/pi-coding-agent/commands/my-team-e2e";

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
});
