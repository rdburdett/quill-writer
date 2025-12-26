import express from "express";
import fs from "fs";
import path from "path";
import bodyParser from "body-parser";
import cors from "cors";
import dotenv from "dotenv";
import simpleGit from "simple-git";
import axios from "axios";

// Load environment variables
dotenv.config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

// ---- Configuration ----

const DATA_DIR = path.resolve("./data");
const CONFIG_PATH = path.resolve("./config.json");
const REPO_ROOT = path.resolve(JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8")).repo.root);
const CONFIG = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8"));
const git = simpleGit(REPO_ROOT);

// Write operation log
const WRITE_LOG_PATH = path.join(DATA_DIR, "write_log.json");

// Initialize write log if it doesn't exist
if (!fs.existsSync(WRITE_LOG_PATH)) {
	fs.writeFileSync(WRITE_LOG_PATH, JSON.stringify([], null, 2));
}

// ---- Helpers ----

const readFile = (file) => fs.readFileSync(path.join(DATA_DIR, file), "utf-8");

const writeFile = (file, data) =>
	fs.writeFileSync(path.join(DATA_DIR, file), data);

const logWrite = (operation) => {
	const log = JSON.parse(fs.readFileSync(WRITE_LOG_PATH, "utf-8"));
	log.push({
		...operation,
		timestamp: new Date().toISOString(),
	});
	fs.writeFileSync(WRITE_LOG_PATH, JSON.stringify(log, null, 2));
};

// Path validation and safety
const validatePath = (filePath) => {
	if (!filePath || typeof filePath !== "string") {
		return { valid: false, error: "Invalid path" };
	}

	// Resolve to absolute path
	const absolutePath = path.resolve(REPO_ROOT, filePath);

	// Ensure path is within repo root
	if (!absolutePath.startsWith(REPO_ROOT)) {
		return { valid: false, error: "Path outside repo root" };
	}

	// Check against protected paths
	for (const pattern of CONFIG.safety.protectedPaths) {
		if (filePath.includes(pattern.replace("*", ""))) {
			return { valid: false, error: `Path matches protected pattern: ${pattern}` };
		}
	}

	return { valid: true, absolutePath };
};

const isProtectedBranch = async () => {
	try {
		const branch = await git.branchLocal();
		return CONFIG.safety.protectedBranches.includes(branch.current);
	} catch {
		return false;
	}
};

const getAllFiles = (dir, basePath = "") => {
	const files = [];
	const entries = fs.readdirSync(dir, { withFileTypes: true });

	for (const entry of entries) {
		const fullPath = path.join(dir, entry.name);
		const relativePath = path.join(basePath, entry.name).replace(/\\/g, "/");

		// Skip protected paths
		let isProtected = false;
		for (const pattern of CONFIG.safety.protectedPaths) {
			if (relativePath.includes(pattern.replace("*", ""))) {
				isProtected = true;
				break;
			}
		}
		if (isProtected) continue;

		if (entry.isDirectory()) {
			files.push(...getAllFiles(fullPath, relativePath));
		} else {
			files.push(relativePath);
		}
	}

	return files;
};

// ---- Safety Middleware ----

const checkWriteSafety = async (req, res, next) => {
	if (CONFIG.safety.mode === "read_only") {
		return res.status(403).json({ error: "Server is in read-only mode" });
	}

	const isProtected = await isProtectedBranch();
	if (isProtected && CONFIG.safety.mode === "ask_before_write") {
		return res.status(403).json({
			error: "Cannot write to protected branch",
			branch: (await git.branchLocal()).current,
			message: "Create a new branch first",
		});
	}

	next();
};

// ---- Context Endpoints ----

// Retrieve the Quill Context Capsule (markdown)
app.get("/context/quill", (req, res) => {
	const md = readFile("quill_context.md");
	res.json({ context: md });
});

// Retrieve full context (quill + decisions + roadmap + Linear issues)
app.get("/context/full", async (req, res) => {
	try {
		const context = {
			quill: readFile("quill_context.md"),
			decisions: JSON.parse(readFile("decisions.json")),
			roadmap: JSON.parse(readFile("roadmap.json")),
		};

		// Add Linear issues if enabled
		if (CONFIG.linear.enabled && process.env.LINEAR_API_KEY) {
			try {
				const linearRes = await axios.post(
					"https://api.linear.app/graphql",
					{
						query: `
							query {
								issues(filter: { state: { name: { neq: "Done" } } }, first: 20) {
									nodes {
										id
										identifier
										title
										description
										state { name }
										labels { nodes { name } }
									}
								}
							}
						`,
					},
					{
						headers: {
							Authorization: process.env.LINEAR_API_KEY,
							"Content-Type": "application/json",
						},
					}
				);
				context.linearIssues = linearRes.data?.data?.issues?.nodes || [];
			} catch (linearError) {
				context.linearError = `Failed to fetch Linear issues: ${linearError.message}`;
			}
		}

		res.json(context);
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
});

// Retrieve the full decision log
app.get("/decisions", (req, res) => {
	const decisions = JSON.parse(readFile("decisions.json"));
	res.json(decisions);
});

// Add a new decision to the log
app.post("/decisions", (req, res) => {
	const { title, rationale } = req.body;

	const decisions = JSON.parse(readFile("decisions.json"));
	const entry = {
		id: Date.now().toString(),
		title,
		rationale,
		timestamp: new Date().toISOString(),
	};

	decisions.push(entry);
	writeFile("decisions.json", JSON.stringify(decisions, null, 2));

	res.json({ added: entry });
});

// Retrieve roadmap items (atomic tasks)
app.get("/roadmap/next", (req, res) => {
	const items = JSON.parse(readFile("roadmap.json"));
	const next = items.find((i) => !i.done);
	res.json(next || { message: "No remaining tasks." });
});

// Update a roadmap step as done
app.post("/roadmap/done", (req, res) => {
	const { id } = req.body;
	const items = JSON.parse(readFile("roadmap.json"));

	const idx = items.findIndex((i) => i.id === id);
	if (idx === -1) return res.status(404).json({ error: "Not found" });

	items[idx].done = true;
	writeFile("roadmap.json", JSON.stringify(items, null, 2));

	res.json({ updated: items[idx] });
});

// ---- File System Endpoints ----

// List files in repo
app.get("/files/list", (req, res) => {
	try {
		const { path: filterPath } = req.query;
		const targetDir = filterPath
			? path.join(REPO_ROOT, filterPath)
			: REPO_ROOT;

		if (!fs.existsSync(targetDir) || !fs.statSync(targetDir).isDirectory()) {
			return res.status(404).json({ error: "Directory not found" });
		}

		const files = getAllFiles(targetDir, filterPath || "");
		res.json({ files, count: files.length });
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
});

// Read file content
app.get("/files/read", (req, res) => {
	try {
		const { path: filePath } = req.query;
		if (!filePath) {
			return res.status(400).json({ error: "Path parameter required" });
		}

		const validation = validatePath(filePath);
		if (!validation.valid) {
			return res.status(400).json({ error: validation.error });
		}

		if (!fs.existsSync(validation.absolutePath)) {
			return res.status(404).json({ error: "File not found" });
		}

		const content = fs.readFileSync(validation.absolutePath, "utf-8");
		res.json({ path: filePath, content });
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
});

// Write file content
app.post("/files/write", checkWriteSafety, async (req, res) => {
	try {
		const { path: filePath, content } = req.body;
		if (!filePath || content === undefined) {
			return res.status(400).json({ error: "Path and content required" });
		}

		const validation = validatePath(filePath);
		if (!validation.valid) {
			return res.status(400).json({ error: validation.error });
		}

		// Ensure directory exists
		const dir = path.dirname(validation.absolutePath);
		if (!fs.existsSync(dir)) {
			fs.mkdirSync(dir, { recursive: true });
		}

		fs.writeFileSync(validation.absolutePath, content, "utf-8");

		const branch = await git.branchLocal();
		logWrite({
			operation: "write",
			path: filePath,
			branch: branch.current,
		});

		res.json({ success: true, path: filePath });
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
});

// Propose a diff without writing
app.post("/files/diff", (req, res) => {
	try {
		const { path: filePath, content } = req.body;
		if (!filePath || content === undefined) {
			return res.status(400).json({ error: "Path and content required" });
		}

		const validation = validatePath(filePath);
		if (!validation.valid) {
			return res.status(400).json({ error: validation.error });
		}

		let oldContent = "";
		if (fs.existsSync(validation.absolutePath)) {
			oldContent = fs.readFileSync(validation.absolutePath, "utf-8");
		}

		res.json({
			path: filePath,
			oldContent,
			newContent: content,
			hasChanges: oldContent !== content,
		});
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
});

// ---- Git Endpoints ----

// Get current branch and list branches
app.get("/git/branch", async (req, res) => {
	try {
		const branches = await git.branchLocal();
		const allBranches = await git.branch(["-a"]);
		res.json({
			current: branches.current,
			branches: branches.all,
			all: allBranches.all,
		});
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
});

// Create or switch branches
app.post("/git/branch", checkWriteSafety, async (req, res) => {
	try {
		const { name, create } = req.body;
		if (!name) {
			return res.status(400).json({ error: "Branch name required" });
		}

		if (CONFIG.safety.protectedBranches.includes(name)) {
			return res.status(403).json({ error: "Cannot create protected branch" });
		}

		if (create) {
			await git.checkoutLocalBranch(name);
		} else {
			await git.checkout(name);
		}

		const branch = await git.branchLocal();
		logWrite({
			operation: "branch",
			branch: name,
			action: create ? "create" : "switch",
		});

		res.json({ success: true, current: branch.current });
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
});

// Get git status
app.get("/git/status", async (req, res) => {
	try {
		const status = await git.status();
		res.json({
			current: status.current,
			tracking: status.tracking,
			ahead: status.ahead,
			behind: status.behind,
			files: status.files,
		});
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
});

// Get git diff
app.get("/git/diff", async (req, res) => {
	try {
		const { path: filePath } = req.query;
		const diff = filePath
			? await git.diff(["--", filePath])
			: await git.diff();
		res.json({ diff });
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
});

// Create commit
app.post("/git/commit", checkWriteSafety, async (req, res) => {
	try {
		const { message, files } = req.body;
		if (!message) {
			return res.status(400).json({ error: "Commit message required" });
		}

		const isProtected = await isProtectedBranch();
		if (isProtected) {
			return res.status(403).json({
				error: "Cannot commit directly to protected branch",
				branch: (await git.branchLocal()).current,
			});
		}

		if (files && Array.isArray(files)) {
			await git.add(files);
		} else {
			await git.add(".");
		}

		const commit = await git.commit(message);
		logWrite({
			operation: "commit",
			message,
			hash: commit.commit,
		});

		res.json({ success: true, commit: commit.commit });
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
});

// ---- Linear Endpoints ----

// Get Linear issues
app.get("/linear/issues", async (req, res) => {
	try {
		if (!CONFIG.linear.enabled || !process.env.LINEAR_API_KEY) {
			return res.status(503).json({ error: "Linear integration not enabled" });
		}

		const { state } = req.query;
		const stateFilter = state ? `state: { name: { eq: "${state}" } }` : `state: { name: { neq: "Done" } }`;

		const response = await axios.post(
			"https://api.linear.app/graphql",
			{
				query: `
					query {
						issues(filter: { ${stateFilter} }, first: 50) {
							nodes {
								id
								identifier
								title
								description
								state { name }
								labels { nodes { name } }
								assignee { name, email }
								createdAt
								updatedAt
							}
						}
					}
				`,
			},
			{
				headers: {
					Authorization: process.env.LINEAR_API_KEY,
					"Content-Type": "application/json",
				},
			}
		);

		const issues = response.data?.data?.issues?.nodes || [];
		res.json({ issues, count: issues.length });
	} catch (error) {
		res.status(500).json({
			error: "Failed to fetch Linear issues",
			details: error.message,
		});
	}
});

// Get next unblocked Linear issue
app.get("/linear/next", async (req, res) => {
	try {
		if (!CONFIG.linear.enabled || !process.env.LINEAR_API_KEY) {
			return res.status(503).json({ error: "Linear integration not enabled" });
		}

		const response = await axios.post(
			"https://api.linear.app/graphql",
			{
				query: `
					query {
						issues(
							filter: {
								state: { name: { nin: ["Done", "Canceled", "Blocked"] } }
							},
							first: 1,
							orderBy: updatedAt
						) {
							nodes {
								id
								identifier
								title
								description
								state { name }
								labels { nodes { name } }
								assignee { name, email }
								createdAt
								updatedAt
							}
						}
					}
				`,
			},
			{
				headers: {
					Authorization: process.env.LINEAR_API_KEY,
					"Content-Type": "application/json",
				},
			}
		);

		const issues = response.data?.data?.issues?.nodes || [];
		const next = issues[0] || null;

		if (!next) {
			return res.json({ message: "No unblocked issues found" });
		}

		res.json(next);
	} catch (error) {
		res.status(500).json({
			error: "Failed to fetch next Linear issue",
			details: error.message,
		});
	}
});

// Get specific Linear issue
app.get("/linear/issue/:id", async (req, res) => {
	try {
		if (!CONFIG.linear.enabled || !process.env.LINEAR_API_KEY) {
			return res.status(503).json({ error: "Linear integration not enabled" });
		}

		const { id } = req.params;

		const response = await axios.post(
			"https://api.linear.app/graphql",
			{
				query: `
					query {
						issue(id: "${id}") {
							id
							identifier
							title
							description
							state { name }
							labels { nodes { name } }
							assignee { name, email }
							createdAt
							updatedAt
							comments {
								nodes {
									body
									createdAt
									user { name }
								}
							}
						}
					}
				`,
			},
			{
				headers: {
					Authorization: process.env.LINEAR_API_KEY,
					"Content-Type": "application/json",
				},
			}
		);

		const issue = response.data?.data?.issue;
		if (!issue) {
			return res.status(404).json({ error: "Issue not found" });
		}

		res.json(issue);
	} catch (error) {
		res.status(500).json({
			error: "Failed to fetch Linear issue",
			details: error.message,
		});
	}
});

// ---- Server ----

const PORT = 5051;
app.listen(PORT, () => {
	console.log(`Quill Project Context Server running on port ${PORT}`);
	console.log(`Repo root: ${REPO_ROOT}`);
	console.log(`Safety mode: ${CONFIG.safety.mode}`);
	console.log(`Linear enabled: ${CONFIG.linear.enabled}`);
});
