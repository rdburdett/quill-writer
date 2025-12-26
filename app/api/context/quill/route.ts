import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Serve Quill context capsule
export async function GET() {
	try {
		const dataDir = path.join(process.cwd(), 'quill-mcp-server', 'data');
		const quillContext = fs.readFileSync(
			path.join(dataDir, 'quill_context.md'),
			'utf-8'
		);

		return NextResponse.json({ context: quillContext });
	} catch (error) {
		console.error('Error loading Quill context:', error);
		return NextResponse.json(
			{ error: 'Failed to load Quill context' },
			{ status: 500 }
		);
	}
}

