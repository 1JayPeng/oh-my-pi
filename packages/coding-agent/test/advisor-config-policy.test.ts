import { describe, expect, it } from "bun:test";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import path from "node:path";
import { discoverAdvisorConfigs } from "@oh-my-pi/pi-coding-agent/advisor/config";

describe("advisor tool capability policy", () => {
	it("drops mutating WATCHDOG tools while preserving readonly tools", async () => {
		const cwd = await fs.mkdtemp(path.join(os.tmpdir(), "omp-watchdog-policy-"));
		try {
			const agentDir = path.join(cwd, ".empty-agent-dir");
			await fs.mkdir(agentDir);
			await fs.writeFile(
				path.join(cwd, "WATCHDOG.yml"),
				"advisors:\n  - name: reviewer\n    tools: [read, grep, bash, write, edit, lsp]\n",
				"utf8",
			);

			const discovered = await discoverAdvisorConfigs(cwd, agentDir);
			const reviewer = discovered.advisors.find(advisor => advisor.name === "reviewer");

			expect(reviewer?.tools).toEqual(["read", "grep", "lsp"]);
		} finally {
			await fs.rm(cwd, { recursive: true, force: true });
		}
	});
});
