import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Serve project context from the quill-mcp-server data directory
export async function GET() {
	try {
		const dataDir = path.join(process.cwd(), 'quill-mcp-server', 'data');
		
		// Read context files
		const quillContext = fs.readFileSync(
			path.join(dataDir, 'quill_context.md'),
			'utf-8'
		);
		
		const decisions = JSON.parse(
			fs.readFileSync(path.join(dataDir, 'decisions.json'), 'utf-8')
		);
		
		const roadmap = JSON.parse(
			fs.readFileSync(path.join(dataDir, 'roadmap.json'), 'utf-8')
		);

		// Optionally add Linear issues if API key is available
		let linearIssues = [];
		if (process.env.LINEAR_API_KEY) {
			try {
				const response = await fetch('https://api.linear.app/graphql', {
					method: 'POST',
					headers: {
						'Authorization': process.env.LINEAR_API_KEY,
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({
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
					}),
				});
				
				const data = await response.json();
				linearIssues = data?.data?.issues?.nodes || [];
			} catch (error) {
				// Silently fail if Linear API is unavailable
				console.error('Failed to fetch Linear issues:', error);
			}
		}

		return NextResponse.json({
			quill: quillContext,
			decisions,
			roadmap,
			linearIssues,
		});
	} catch (error) {
		console.error('Error loading context:', error);
		return NextResponse.json(
			{ error: 'Failed to load project context' },
			{ status: 500 }
		);
	}
}

