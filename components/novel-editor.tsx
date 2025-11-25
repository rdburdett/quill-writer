"use client";

import { useState } from "react";
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
} from "novel";

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

/**
 * Define slash-command suggestions following the Novel docs:
 * https://novel.sh/docs/guides/tailwind/slash-command
 */
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

/**
 * Configure the slash-command extension following the docs pattern.
 */
const slashCommand = Command.configure({
	suggestion: {
		items: () => suggestionItems,
		render: renderItems,
	},
});

/**
 * Extensions array, including the slash-command extension.
 */
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


export function NovelEditor({ showJsonPreview = false }: { showJsonPreview?: boolean }) {
	const [jsonContent, setJsonContent] = useState<unknown>(null);

	return (
		<div className="flex flex-1 flex-col">
			<EditorRoot>
				<EditorContent
					className="relative min-h-[60vh] py-4"
					extensions={extensions}
					immediatelyRender={false}
					onUpdate={({ editor }) => {
						setJsonContent(editor.getJSON());
					}}
				editorProps={{
					handleDOMEvents: {
						keydown: (_view: unknown, event: KeyboardEvent) =>
							handleCommandNavigation(event),
					},
					handleKeyDown: (
						view: { state: { tr: { insertText: (text: string) => unknown } }; dispatch: (tr: unknown) => void },
						event: KeyboardEvent
					) => {
						// Handle Tab key for indentation
						if (event.key === "Tab" && !event.shiftKey) {
							event.preventDefault();
							const { state, dispatch } = view;
							const { tr } = state;
							// Insert a tab character at cursor position
							dispatch(tr.insertText("\t"));
							return true;
						}
						return false;
					},
					attributes: {
						class:
							"prose prose-lg dark:prose-invert max-w-none focus:outline-none min-h-[50vh] pl-8",
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
