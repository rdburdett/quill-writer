"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
	EditorRoot,
	EditorContent,
	EditorCommand,
	EditorCommandList,
	EditorCommandItem,
	EditorCommandEmpty,
	Placeholder,
	StarterKit,
	HighlightExtension,
	HorizontalRule,
	GlobalDragHandle,
	Command,
	createSuggestionItems,
	renderItems,
	handleCommandNavigation,
	useEditor,
} from "novel";
import { draggable } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import type { TextDragData } from "@/components/tab-system";

import {
	Heading1,
	Heading2,
	Heading3,
	List,
	ListOrdered,
	Text as TextIcon,
	TextQuote,
	CheckSquare,
	Minus,
} from "lucide-react";

// =============================================================================
// Types
// =============================================================================

export interface NovelEditorProps {
	/** Initial content to load (markdown/text) */
	initialContent?: string;
	/** Called when content changes (debounced) */
	onChange?: (content: string) => void;
	/** Called when content changes (immediate, for tracking dirty state) */
	onContentChange?: () => void;
	/** Placeholder text */
	placeholder?: string;
	/** Whether to show the JSON preview (for debugging) */
	showJsonPreview?: boolean;
	/** Key to force re-mount when switching files */
	editorKey?: string;
	/** Whether the editor is read-only */
	readOnly?: boolean;
	/** Source file path for drag and drop */
	sourceFilePath?: string;
}

// =============================================================================
// Slash Command Configuration
// =============================================================================

const suggestionItems = createSuggestionItems([
	{
		title: "Text",
		description: "Just start typing with plain text.",
		searchTerms: ["p", "paragraph"],
		icon: <TextIcon size={18} />,
		command: ({ editor, range }) => {
			editor
				.chain()
				.focus()
				.deleteRange(range)
				.toggleNode("paragraph", "paragraph")
				.run();
		},
	},
	{
		title: "To-do List",
		description: "Track tasks with a to-do list.",
		searchTerms: ["todo", "task", "list", "check", "checkbox"],
		icon: <CheckSquare size={18} />,
		command: ({ editor, range }) => {
			editor.chain().focus().deleteRange(range).toggleTaskList().run();
		},
	},
	{
		title: "Heading 1",
		description: "Big section heading.",
		searchTerms: ["title", "big", "large"],
		icon: <Heading1 size={18} />,
		command: ({ editor, range }) => {
			editor
				.chain()
				.focus()
				.deleteRange(range)
				.setNode("heading", { level: 1 })
				.run();
		},
	},
	{
		title: "Heading 2",
		description: "Medium section heading.",
		searchTerms: ["subtitle", "medium"],
		icon: <Heading2 size={18} />,
		command: ({ editor, range }) => {
			editor
				.chain()
				.focus()
				.deleteRange(range)
				.setNode("heading", { level: 2 })
				.run();
		},
	},
	{
		title: "Heading 3",
		description: "Small section heading.",
		searchTerms: ["subtitle", "small"],
		icon: <Heading3 size={18} />,
		command: ({ editor, range }) => {
			editor
				.chain()
				.focus()
				.deleteRange(range)
				.setNode("heading", { level: 3 })
				.run();
		},
	},
	{
		title: "Bullet List",
		description: "Create a simple bullet list.",
		searchTerms: ["unordered", "point"],
		icon: <List size={18} />,
		command: ({ editor, range }) => {
			editor.chain().focus().deleteRange(range).toggleBulletList().run();
		},
	},
	{
		title: "Numbered List",
		description: "Create a list with numbering.",
		searchTerms: ["ordered"],
		icon: <ListOrdered size={18} />,
		command: ({ editor, range }) => {
			editor.chain().focus().deleteRange(range).toggleOrderedList().run();
		},
	},
	{
		title: "Quote",
		description: "Capture a quote.",
		searchTerms: ["blockquote"],
		icon: <TextQuote size={18} />,
		command: ({ editor, range }) =>
			editor
				.chain()
				.focus()
				.deleteRange(range)
				.toggleNode("paragraph", "paragraph")
				.toggleBlockquote()
				.run(),
	},
	{
		title: "Divider",
		description: "Insert a horizontal divider.",
		searchTerms: ["hr", "horizontal", "rule", "line", "---"],
		icon: <Minus size={18} />,
		command: ({ editor, range }) =>
			editor.chain().focus().deleteRange(range).setHorizontalRule().run(),
	},
]);

const slashCommand = Command.configure({
	suggestion: {
		items: () => suggestionItems,
		render: renderItems,
	},
});

const extensions = [
	StarterKit.configure({
		heading: {
			levels: [1, 2, 3],
		},
	}),
	Placeholder,
	HighlightExtension,
	HorizontalRule,
	GlobalDragHandle,
	slashCommand,
];

// =============================================================================
// Editor Component
// =============================================================================

export function NovelEditor({
	initialContent = "",
	onChange,
	onContentChange,
	placeholder = "Start writing, or press '/' for commands...",
	showJsonPreview = false,
	editorKey,
	readOnly = false,
	sourceFilePath,
}: NovelEditorProps) {
	const [jsonContent, setJsonContent] = useState<unknown>(null);
	const [editorInstance, setEditorInstance] = useState<any>(null);
	const editorRef = useRef<HTMLDivElement>(null);
	const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const lastContentRef = useRef<string>(initialContent);

	// Convert initial markdown content to a simple structure
	// For now, we treat content as plain text paragraphs
	const initialEditorContent = initialContent
		? parseMarkdownToContent(initialContent)
		: undefined;

	// Handle content updates with debouncing
	const handleUpdate = useCallback(
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		({ editor }: { editor: any }) => {
			setEditorInstance(editor);
			setJsonContent(editor.getJSON());

			// Get text content for saving
			const textContent = serializeContentToMarkdown(editor);

			// Notify about content change immediately (for dirty state)
			if (textContent !== lastContentRef.current) {
				onContentChange?.();
				lastContentRef.current = textContent;
			}

			// Debounce the actual content callback
			if (debounceRef.current) {
				clearTimeout(debounceRef.current);
			}

			debounceRef.current = setTimeout(() => {
				onChange?.(textContent);
			}, 300);
		},
		[onChange, onContentChange]
	);

	// Set up drag and drop for selected text (only when text is selected, not for block dragging)
	// Tiptap's GlobalDragHandle handles block reordering internally using native HTML5 drag
	// We detect Tiptap drag operations and temporarily disable our draggable to avoid conflicts
	useEffect(() => {
		const element = editorRef.current;
		if (!element || !sourceFilePath || !editorInstance) return;

		// Find the ProseMirror editor content element
		const proseMirrorElement = element.querySelector(".ProseMirror");
		if (!proseMirrorElement) return;

		// Track if we're currently in a Tiptap drag operation
		let isTiptapDrag = false;
		let cleanupDraggable: (() => void) | null = null;
		
		// Listen for Tiptap's native drag events to avoid conflicts
		const handleNativeDragStart = (e: Event) => {
			// Check if this is coming from a drag handle
			const target = (e as DragEvent).target as HTMLElement;
			if (target.classList.contains("drag-handle") || target.closest(".drag-handle")) {
				isTiptapDrag = true;
				// Disable our draggable temporarily
				if (cleanupDraggable) {
					cleanupDraggable();
					cleanupDraggable = null;
				}
				return;
			}
		};

		const handleNativeDragEnd = () => {
			// Re-enable draggable after Tiptap drag ends
			setTimeout(() => {
				isTiptapDrag = false;
				// Re-setup draggable if needed
				setupDraggable();
			}, 150);
		};

		const setupDraggable = () => {
			// Clean up existing draggable if any
			if (cleanupDraggable) {
				cleanupDraggable();
				cleanupDraggable = null;
			}

			// Only set up if not in Tiptap drag
			if (isTiptapDrag) return;

			cleanupDraggable = draggable({
				element: proseMirrorElement as HTMLElement,
				canDrag: () => {
					if (!editorInstance || !sourceFilePath || isTiptapDrag) return false;
					
					// Check if clicking on or near a drag handle
					const activeElement = document.activeElement as HTMLElement;
					if (activeElement?.classList.contains("drag-handle") || 
						activeElement?.closest(".drag-handle")) {
						return false;
					}
					
					// Check if there's a text selection
					const selection = editorInstance.state.selection;
					const hasSelection = selection && !selection.empty;
					
					// Also check native selection as fallback
					const nativeSelection = window.getSelection();
					const hasNativeSelection = nativeSelection && nativeSelection.toString().length > 0;
					
					return hasSelection || hasNativeSelection || false;
				},
			getInitialData: () => {
				if (!editorInstance || !sourceFilePath) return {};

				// Try to get selection from editor first
				let selection = editorInstance.state.selection;
				let selectedText = "";
				let from = 0;
				let to = 0;

				if (selection && !selection.empty) {
					from = selection.from;
					to = selection.to;
					selectedText = editorInstance.state.doc.textBetween(from, to);
				} else {
					// Fallback to native selection
					const nativeSelection = window.getSelection();
					if (nativeSelection && nativeSelection.toString().length > 0) {
						selectedText = nativeSelection.toString();
						// For native selection, we can't get exact positions, so we'll search for it
						const fullText = editorInstance.state.doc.textContent;
						const searchIndex = fullText.indexOf(selectedText);
						if (searchIndex !== -1) {
							from = searchIndex;
							to = searchIndex + selectedText.length;
						}
					}
				}

				if (!selectedText) return {};

				// Serialize selected content to markdown if we have editor selection
				let selectedContent = selectedText;
				if (selection && !selection.empty) {
					selectedContent = serializeSelectionToMarkdown(editorInstance, selection) || selectedText;
				}

				const dragData: TextDragData = {
					type: "text-block",
					content: selectedContent,
					sourcePath: sourceFilePath,
					selectionRange: {
						from,
						to,
					},
				};

				console.log("[NovelEditor] Drag started with data:", dragData);
				return dragData as unknown as Record<string, unknown>;
			},
			onDragStart: () => {
				console.log("[NovelEditor] Drag started");
			},
			});
		};

		// Initial setup
		setupDraggable();

		// Listen for native drag events
		proseMirrorElement.addEventListener("dragstart", handleNativeDragStart, true);
		proseMirrorElement.addEventListener("dragend", handleNativeDragEnd, true);

		return () => {
			if (cleanupDraggable) {
				cleanupDraggable();
			}
			proseMirrorElement.removeEventListener("dragstart", handleNativeDragStart, true);
			proseMirrorElement.removeEventListener("dragend", handleNativeDragEnd, true);
		};
	}, [editorInstance, sourceFilePath]);

	// Cleanup debounce on unmount
	useEffect(() => {
		return () => {
			if (debounceRef.current) {
				clearTimeout(debounceRef.current);
			}
		};
	}, []);

	return (
		<div className="flex flex-1 flex-col" key={editorKey}>
			<EditorRoot>
				<div ref={editorRef}>
					<EditorContent
						className="relative min-h-[60vh] py-4"
						extensions={extensions}
						initialContent={initialEditorContent}
						immediatelyRender={false}
						onUpdate={handleUpdate}
					editorProps={{
						editable: () => !readOnly,
						handleDOMEvents: {
							keydown: (_view: unknown, event: KeyboardEvent) =>
								handleCommandNavigation(event),
						},
						handleKeyDown: (
							view: {
								state: { tr: { insertText: (text: string) => unknown } };
								dispatch: (tr: unknown) => void;
							},
							event: KeyboardEvent
						) => {
							// Handle Tab key for indentation
							if (event.key === "Tab" && !event.shiftKey) {
								event.preventDefault();
								const { state, dispatch } = view;
								const { tr } = state;
								dispatch(tr.insertText("\t"));
								return true;
							}
							return false;
						},
						attributes: {
							class:
								"prose prose-lg dark:prose-invert max-w-none focus:outline-none min-h-[50vh] pl-8",
							"data-placeholder": placeholder,
						},
					}}
				>
					<EditorCommand className="z-50 h-auto max-h-[330px] w-72 overflow-y-auto rounded-md border border-muted bg-background px-1 py-2 shadow-md transition-all">
						<EditorCommandEmpty className="px-2 text-muted-foreground">
							No results
						</EditorCommandEmpty>
						<EditorCommandList>
							{suggestionItems.map((item) => (
								<EditorCommandItem
									key={item.title}
									value={item.title}
									onCommand={(val) => item.command?.(val)}
									className="flex w-full cursor-pointer items-center space-x-2 rounded-md px-2 py-1 text-left text-sm aria-selected:bg-accent"
								>
									<div className="flex h-10 w-10 items-center justify-center rounded-md border border-muted bg-background">
										{item.icon}
									</div>
									<div>
										<p className="font-medium">{item.title}</p>
										<p className="text-xs text-muted-foreground">
											{item.description}
										</p>
									</div>
								</EditorCommandItem>
							))}
						</EditorCommandList>
					</EditorCommand>
				</EditorContent>
				</div>
			</EditorRoot>

			{showJsonPreview && (
				<details className="mt-8 rounded-lg border bg-muted/30 p-3">
					<summary className="cursor-pointer text-sm font-medium text-muted-foreground">
						Editor JSON (live)
					</summary>
					<pre className="mt-2 max-h-64 overflow-auto rounded-lg bg-background p-4 text-xs">
						{jsonContent ? JSON.stringify(jsonContent, null, 2) : "{}"}
					</pre>
				</details>
			)}
		</div>
	);
}

// =============================================================================
// Content Serialization
// =============================================================================

/**
 * Parse markdown content into ProseMirror-compatible JSON
 * This is a simple parser - for full markdown support, use a proper library
 */
function parseMarkdownToContent(markdown: string): unknown {
	const lines = markdown.split("\n");
	const content: unknown[] = [];

	let inCodeBlock = false;
	let codeBlockContent: string[] = [];

	for (const line of lines) {
		// Handle code blocks
		if (line.startsWith("```")) {
			if (inCodeBlock) {
				content.push({
					type: "codeBlock",
					content: [{ type: "text", text: codeBlockContent.join("\n") }],
				});
				codeBlockContent = [];
			}
			inCodeBlock = !inCodeBlock;
			continue;
		}

		if (inCodeBlock) {
			codeBlockContent.push(line);
			continue;
		}

		// Handle headings
		const h1Match = line.match(/^# (.+)$/);
		if (h1Match) {
			content.push({
				type: "heading",
				attrs: { level: 1 },
				content: [{ type: "text", text: h1Match[1] }],
			});
			continue;
		}

		const h2Match = line.match(/^## (.+)$/);
		if (h2Match) {
			content.push({
				type: "heading",
				attrs: { level: 2 },
				content: [{ type: "text", text: h2Match[1] }],
			});
			continue;
		}

		const h3Match = line.match(/^### (.+)$/);
		if (h3Match) {
			content.push({
				type: "heading",
				attrs: { level: 3 },
				content: [{ type: "text", text: h3Match[1] }],
			});
			continue;
		}

		// Handle horizontal rules
		if (line.match(/^---+$/) || line.match(/^\*\*\*+$/)) {
			content.push({ type: "horizontalRule" });
			continue;
		}

		// Handle blockquotes
		const quoteMatch = line.match(/^> (.+)$/);
		if (quoteMatch) {
			content.push({
				type: "blockquote",
				content: [
					{
						type: "paragraph",
						content: [{ type: "text", text: quoteMatch[1] }],
					},
				],
			});
			continue;
		}

		// Handle bullet lists
		const bulletMatch = line.match(/^[-*] (.+)$/);
		if (bulletMatch) {
			content.push({
				type: "bulletList",
				content: [
					{
						type: "listItem",
						content: [
							{
								type: "paragraph",
								content: [{ type: "text", text: bulletMatch[1] }],
							},
						],
					},
				],
			});
			continue;
		}

		// Handle numbered lists
		const numberedMatch = line.match(/^\d+\. (.+)$/);
		if (numberedMatch) {
			content.push({
				type: "orderedList",
				content: [
					{
						type: "listItem",
						content: [
							{
								type: "paragraph",
								content: [{ type: "text", text: numberedMatch[1] }],
							},
						],
					},
				],
			});
			continue;
		}

		// Handle empty lines
		if (line.trim() === "") {
			continue;
		}

		// Default to paragraph
		content.push({
			type: "paragraph",
			content: [{ type: "text", text: line }],
		});
	}

	return {
		type: "doc",
		content: content.length > 0 ? content : [{ type: "paragraph" }],
	};
}

/**
 * Serialize editor content back to markdown
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serializeContentToMarkdown(editor: any): string {
	const json = editor.getJSON();
	return serializeNode(json);
}

/**
 * Serialize a selection range to markdown
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serializeSelectionToMarkdown(editor: any, selection: any): string {
	// Get the selected content as a document fragment
	const fragment = selection.content();
	
	// Create a temporary document with just the selection
	const tempDoc = {
		type: "doc",
		content: fragment.content || [],
	};
	
	return serializeNode(tempDoc);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serializeNode(node: any): string {
	if (!node) return "";

	switch (node.type) {
		case "doc":
			return (node.content || []).map(serializeNode).join("\n\n");

		case "paragraph":
			return (node.content || []).map(serializeNode).join("");

		case "text":
			return node.text || "";

		case "heading": {
			const level = node.attrs?.level || 1;
			const prefix = "#".repeat(level);
			const text = (node.content || []).map(serializeNode).join("");
			return `${prefix} ${text}`;
		}

		case "bulletList":
			return (node.content || [])
				.map((item: unknown) => `- ${serializeNode(item)}`)
				.join("\n");

		case "orderedList":
			return (node.content || [])
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				.map((item: any, i: number) => `${i + 1}. ${serializeNode(item)}`)
				.join("\n");

		case "listItem":
			return (node.content || []).map(serializeNode).join("");

		case "blockquote":
			const quoteText = (node.content || []).map(serializeNode).join("\n");
			return quoteText
				.split("\n")
				.map((line: string) => `> ${line}`)
				.join("\n");

		case "codeBlock":
			const code = (node.content || []).map(serializeNode).join("");
			return `\`\`\`\n${code}\n\`\`\``;

		case "horizontalRule":
			return "---";

		case "taskList":
			return (node.content || []).map(serializeNode).join("\n");

		case "taskItem": {
			const checked = node.attrs?.checked ? "x" : " ";
			const text = (node.content || []).map(serializeNode).join("");
			return `- [${checked}] ${text}`;
		}

		default:
			if (node.content) {
				return (node.content || []).map(serializeNode).join("");
			}
			return "";
	}
}
