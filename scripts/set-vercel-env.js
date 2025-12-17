#!/usr/bin/env node

/**
 * Script to set Vercel environment variables via CLI
 * Usage: node scripts/set-vercel-env.js VARIABLE_NAME value [environment]
 *   environment: production, preview, or development (default: all)
 */

import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const colors = {
	reset: "\x1b[0m",
	red: "\x1b[31m",
	green: "\x1b[32m",
	yellow: "\x1b[33m",
};

function log(message, color = "reset") {
	console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkVercelCLI() {
	try {
		execSync("vercel --version", { stdio: "ignore" });
		return true;
	} catch {
		return false;
	}
}

function isLinked() {
	return fs.existsSync(path.join(process.cwd(), ".vercel"));
}

function linkProject() {
	log("Linking to existing Vercel project...", "yellow");
	try {
		execSync("vercel link --yes", { stdio: "inherit" });
		return true;
	} catch {
		log("Error: Failed to link to Vercel project.", "red");
		log("Please run 'vercel link' manually first.", "yellow");
		return false;
	}
}

function setEnvVar(name, value, environment) {
	const environments = environment === "all" 
		? ["production", "preview", "development"]
		: [environment];

	for (const env of environments) {
		log(`Setting ${name} for ${env} environment...`, "green");
		try {
			execSync(`echo "${value}" | vercel env add "${name}" ${env}`, {
				stdio: "inherit",
			});
		} catch (error) {
			log(`Failed to set ${name} for ${env}: ${error.message}`, "red");
			process.exit(1);
		}
	}
}

// Main execution
const [,, varName, varValue, envType = "all"] = process.argv;

if (!varName || !varValue) {
	log("Usage: node scripts/set-vercel-env.js VARIABLE_NAME value [environment]", "red");
	log("  environment: production, preview, development, or 'all' (default)", "yellow");
	process.exit(1);
}

if (!checkVercelCLI()) {
	log("Error: Vercel CLI is not installed.", "red");
	log("Install it with: npm i -g vercel", "yellow");
	process.exit(1);
}

if (!isLinked()) {
	if (!linkProject()) {
		process.exit(1);
	}
}

setEnvVar(varName, varValue, envType);
log(`✓ Environment variable ${varName} set successfully`, "green");

