"use client";

/**
 * Folder Tree Hook
 * 
 * Manages the folder tree UI state including expansion,
 * selection, and navigation.
 */

import { useState, useCallback, useMemo } from "react";
import type { FolderNode } from "@/lib/project/types";

// =============================================================================
// Types
// =============================================================================

export interface FolderTreeState {
	/** Currently selected file path */
	selectedPath: string | null;
	/** Set of expanded folder paths */
	expandedPaths: Set<string>;
	/** Search/filter query */
	searchQuery: string;
	/** Filtered tree (based on search) */
	filteredTree: FolderNode[];
}

export interface FolderTreeActions {
	/** Select a file or folder */
	select: (path: string | null) => void;
	/** Toggle a folder's expanded state */
	toggleExpanded: (path: string) => void;
	/** Expand a folder */
	expand: (path: string) => void;
	/** Collapse a folder */
	collapse: (path: string) => void;
	/** Expand all folders */
	expandAll: () => void;
	/** Collapse all folders */
	collapseAll: () => void;
	/** Expand to reveal a specific path */
	revealPath: (path: string) => void;
	/** Set search query */
	setSearchQuery: (query: string) => void;
}

// =============================================================================
// Hook
// =============================================================================

export function useFolderTree(tree: FolderNode[]): FolderTreeState & FolderTreeActions {
	const [selectedPath, setSelectedPath] = useState<string | null>(null);
	const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
	const [searchQuery, setSearchQuery] = useState("");

	// ==========================================================================
	// Filter tree based on search
	// ==========================================================================

	const filteredTree = useMemo(() => {
		if (!searchQuery.trim()) return tree;

		const query = searchQuery.toLowerCase();

		function filterNode(node: FolderNode): FolderNode | null {
			// Check if this node matches
			const nameMatches = node.name.toLowerCase().includes(query);

			if (node.type === "file") {
				return nameMatches ? node : null;
			}

			// For folders, filter children
			const filteredChildren = node.children
				?.map(filterNode)
				.filter((n): n is FolderNode => n !== null);

			// Include folder if it matches or has matching children
			if (nameMatches || (filteredChildren && filteredChildren.length > 0)) {
				return {
					...node,
					children: filteredChildren,
				};
			}

			return null;
		}

		return tree.map(filterNode).filter((n): n is FolderNode => n !== null);
	}, [tree, searchQuery]);

	// ==========================================================================
	// Get all folder paths in the tree
	// ==========================================================================

	const allFolderPaths = useMemo(() => {
		const paths: string[] = [];

		function traverse(nodes: FolderNode[]) {
			for (const node of nodes) {
				if (node.type === "folder") {
					paths.push(node.path);
					if (node.children) {
						traverse(node.children);
					}
				}
			}
		}

		traverse(tree);
		return paths;
	}, [tree]);

	// ==========================================================================
	// Actions
	// ==========================================================================

	const select = useCallback((path: string | null) => {
		setSelectedPath(path);
	}, []);

	const toggleExpanded = useCallback((path: string) => {
		setExpandedPaths((prev) => {
			const next = new Set(prev);
			if (next.has(path)) {
				next.delete(path);
			} else {
				next.add(path);
			}
			return next;
		});
	}, []);

	const expand = useCallback((path: string) => {
		setExpandedPaths((prev) => new Set([...prev, path]));
	}, []);

	const collapse = useCallback((path: string) => {
		setExpandedPaths((prev) => {
			const next = new Set(prev);
			next.delete(path);
			return next;
		});
	}, []);

	const expandAll = useCallback(() => {
		setExpandedPaths(new Set(allFolderPaths));
	}, [allFolderPaths]);

	const collapseAll = useCallback(() => {
		setExpandedPaths(new Set());
	}, []);

	const revealPath = useCallback((path: string) => {
		// Expand all parent folders
		const parts = path.split("/");
		const parentPaths: string[] = [];
		
		for (let i = 1; i < parts.length; i++) {
			parentPaths.push(parts.slice(0, i).join("/"));
		}

		setExpandedPaths((prev) => new Set([...prev, ...parentPaths]));
		setSelectedPath(path);
	}, []);

	const doSetSearchQuery = useCallback((query: string) => {
		setSearchQuery(query);
		
		// Auto-expand folders when searching
		if (query.trim()) {
			setExpandedPaths(new Set(allFolderPaths));
		}
	}, [allFolderPaths]);

	return {
		selectedPath,
		expandedPaths,
		searchQuery,
		filteredTree,
		select,
		toggleExpanded,
		expand,
		collapse,
		expandAll,
		collapseAll,
		revealPath,
		setSearchQuery: doSetSearchQuery,
	};
}

// =============================================================================
// Utility: Get stats for the tree
// =============================================================================

export interface TreeStats {
	totalFiles: number;
	totalFolders: number;
	totalWords: number;
}

export function getTreeStats(tree: FolderNode[]): TreeStats {
	let totalFiles = 0;
	let totalFolders = 0;
	let totalWords = 0;

	function traverse(nodes: FolderNode[]) {
		for (const node of nodes) {
			if (node.type === "file") {
				totalFiles++;
				totalWords += node.wordCount ?? 0;
			} else {
				totalFolders++;
				if (node.children) {
					traverse(node.children);
				}
			}
		}
	}

	traverse(tree);

	return { totalFiles, totalFolders, totalWords };
}

