declare module "novel" {
	// Root provider that wires up Novel's editor context.
	export const EditorRoot: React.ComponentType<React.PropsWithChildren>;

	// Wrapper around Tiptap's EditorProvider. Children can include EditorCommand UI.
	export const EditorContent: React.ComponentType<
		React.PropsWithChildren<{
			className?: string;
			extensions?: unknown[];
			editorProps?: Record<string, unknown>;
			initialContent?: unknown;
			immediatelyRender?: boolean;
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			onUpdate?: (props: { editor: any }) => void;
		}>
	>;

	// Slash-command palette components (wrappers over cmdk).
	export const EditorCommand: React.ComponentType<
		React.PropsWithChildren<{ className?: string }>
	>;
	export const EditorCommandList: React.ComponentType<React.PropsWithChildren>;
	export const EditorCommandItem: React.ComponentType<
		React.PropsWithChildren<{
			value: string;
			onCommand: (val: { editor: unknown; range: unknown }) => void;
			className?: string;
		}>
	>;
	export const EditorCommandEmpty: React.ComponentType<
		React.PropsWithChildren<{ className?: string }>
	>;

	// Preconfigured Placeholder extension.
	export const Placeholder: unknown;

	// Additional Novel/Tiptap extensions.
	export const HighlightExtension: unknown;
	export const HorizontalRule: unknown;
	export const GlobalDragHandle: unknown;
	export const Command: {
		configure: (options?: Record<string, unknown>) => unknown;
	};

	// Slash-command suggestion helpers.
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	export interface SuggestionItem {
		title: string;
		description: string;
		icon: React.ReactNode;
		searchTerms?: string[];
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		command?: (props: { editor: any; range: any }) => void;
	}

	export function createSuggestionItems(
		items: SuggestionItem[]
	): SuggestionItem[];

	export function renderItems(
		elementRef?: React.RefObject<Element> | null
	): {
		onStart: (props: unknown) => void | false;
		onUpdate: (props: unknown) => void;
		onKeyDown: (props: unknown) => unknown;
		onExit: () => void;
	};

	// Re-exported Tiptap StarterKit.
	export const StarterKit: {
		configure: (options?: Record<string, unknown>) => unknown;
	};

	// Hook re-exported from Tiptap's useCurrentEditor.
	export function useEditor(): unknown;

	// Command navigation handler for keyboard events in slash command menu.
	export function handleCommandNavigation(
		event: KeyboardEvent
	): true | undefined;
}
