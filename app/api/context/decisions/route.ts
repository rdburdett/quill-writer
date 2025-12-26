import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Serve decision log
export async function GET() {
	try {
		const dataDir = path.join(process.cwd(), 'quill-mcp-server', 'data');
		const decisions = JSON.parse(
			fs.readFileSync(path.join(dataDir, 'decisions.json'), 'utf-8')
		);

		return NextResponse.json(decisions);
	} catch (error) {
		console.error('Error loading decisions:', error);
		return NextResponse.json(
			{ error: 'Failed to load decisions' },
			{ status: 500 }
		);
	}
}

