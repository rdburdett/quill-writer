import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Serve roadmap
export async function GET() {
	try {
		const dataDir = path.join(process.cwd(), 'quill-mcp-server', 'data');
		const roadmap = JSON.parse(
			fs.readFileSync(path.join(dataDir, 'roadmap.json'), 'utf-8')
		);

		return NextResponse.json(roadmap);
	} catch (error) {
		console.error('Error loading roadmap:', error);
		return NextResponse.json(
			{ error: 'Failed to load roadmap' },
			{ status: 500 }
		);
	}
}

