import express from "express";
import fs from "fs";
import path from "path";
import bodyParser from "body-parser";
import cors from "cors";

const app = express();
app.use(cors());
app.use(bodyParser.json());

const DATA_DIR = path.resolve("./data");

// ---- Helpers ----

const readFile = (file) =>
	fs.readFileSync(path.join(DATA_DIR, file), "utf-8");

const writeFile = (file, data) =>
	fs.writeFileSync(path.join(DATA_DIR, file), data);

// ---- Endpoints ----

// Retrieve the Quill Context Capsule (markdown)
app.get("/context/quill", (req, res) => {
	const md = readFile("quill_context.md");
	res.json({ context: md });
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

// ---- Server ----

const PORT = 5051;
app.listen(PORT, () => {
	console.log(`Quill MCP server running on port ${PORT}`);
});







