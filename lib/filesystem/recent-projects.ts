/**
 * Recent Projects Management
 * 
 * Stores and retrieves a list of recently opened projects using IndexedDB.
 * FileSystemDirectoryHandle objects can be stored directly in IndexedDB.
 */

const DB_NAME = "quill-recent-projects";
const DB_VERSION = 1;
const STORE_NAME = "projects";
const MAX_RECENT_PROJECTS = 10;

export interface RecentProject {
	/** Directory handle (stored in IndexedDB) */
	handle: FileSystemDirectoryHandle;
	/** Project name */
	name: string;
	/** Last opened timestamp */
	lastOpened: number;
}

/**
 * Open the IndexedDB database
 */
function openDB(): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		const request = indexedDB.open(DB_NAME, DB_VERSION);

		request.onerror = () => reject(request.error);
		request.onsuccess = () => resolve(request.result);

		request.onupgradeneeded = (event) => {
			const db = (event.target as IDBOpenDBRequest).result;
			if (!db.objectStoreNames.contains(STORE_NAME)) {
				db.createObjectStore(STORE_NAME, { keyPath: "name" });
			}
		};
	});
}

/**
 * Add or update a project in the recent projects list
 */
export async function addRecentProject(
	handle: FileSystemDirectoryHandle,
	name: string
): Promise<void> {
	const db = await openDB();
	
	return new Promise((resolve, reject) => {
		const tx = db.transaction(STORE_NAME, "readwrite");
		const store = tx.objectStore(STORE_NAME);
		
		// Check if project already exists
		const getRequest = store.get(name);
		getRequest.onsuccess = () => {
			const project: RecentProject = {
				handle,
				name,
				lastOpened: Date.now(),
			};
			
			const putRequest = store.put(project);
			putRequest.onsuccess = () => resolve();
			putRequest.onerror = () => reject(putRequest.error);
		};
		getRequest.onerror = () => reject(getRequest.error);
	});
}

/**
 * Get all recent projects, sorted by last opened (most recent first)
 */
export async function getRecentProjects(): Promise<RecentProject[]> {
	const db = await openDB();
	
	return new Promise((resolve, reject) => {
		const tx = db.transaction(STORE_NAME, "readonly");
		const store = tx.objectStore(STORE_NAME);
		const request = store.getAll();
		
		request.onsuccess = () => {
			const projects = request.result as RecentProject[];
			// Sort by lastOpened (most recent first) and limit
			const sorted = projects
				.sort((a, b) => b.lastOpened - a.lastOpened)
				.slice(0, MAX_RECENT_PROJECTS);
			resolve(sorted);
		};
		request.onerror = () => reject(request.error);
	});
}

/**
 * Remove a project from recent projects
 */
export async function removeRecentProject(name: string): Promise<void> {
	const db = await openDB();
	
	return new Promise((resolve, reject) => {
		const tx = db.transaction(STORE_NAME, "readwrite");
		const store = tx.objectStore(STORE_NAME);
		const request = store.delete(name);
		
		request.onsuccess = () => resolve();
		request.onerror = () => reject(request.error);
	});
}

/**
 * Clear all recent projects
 */
export async function clearRecentProjects(): Promise<void> {
	const db = await openDB();
	
	return new Promise((resolve, reject) => {
		const tx = db.transaction(STORE_NAME, "readwrite");
		const store = tx.objectStore(STORE_NAME);
		const request = store.clear();
		
		request.onsuccess = () => resolve();
		request.onerror = () => reject(request.error);
	});
}

/**
 * Check if a project handle is still valid (exists and can potentially be accessed)
 * Note: This does NOT check if permission is granted - just if the handle is usable.
 * Permission will be requested when the user actually tries to open the project.
 */
export async function validateProjectHandle(
	handle: FileSystemDirectoryHandle
): Promise<boolean> {
	try {
		// Check if the handle is valid by querying permission
		// Returns "granted", "prompt", or "denied"
		// "prompt" means the handle is valid but needs permission re-grant
		// Only return false if the handle itself is broken/invalid
		const permission = await handle.queryPermission({ mode: "read" });
		// Handle is valid as long as it's not explicitly denied and the query succeeded
		return permission !== "denied";
	} catch {
		// Handle is invalid (e.g., folder was deleted, handle corrupted)
		return false;
	}
}

