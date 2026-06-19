<script lang="ts">
	import { onMount, onDestroy } from 'svelte';

	interface Props {
		value?: string;
		onExecute?: (sql: string) => void;
		onValueChange?: (value: string) => void;
		dialect?: string;
	}

	let { value = $bindable(''), onExecute, onValueChange, dialect = 'sql' }: Props = $props();

	let editorEl: HTMLDivElement;
	let editorView: import('@codemirror/view').EditorView | null = null;

	onMount(async () => {
		const { EditorView, keymap } = await import('@codemirror/view');
		const { EditorState } = await import('@codemirror/state');
		const { defaultKeymap, history, historyKeymap } = await import('@codemirror/commands');
		const { sql } = await import('@codemirror/lang-sql');
		const {
			lineNumbers,
			highlightActiveLineGutter,
			highlightActiveLine,
			dropCursor,
		} = await import('@codemirror/view');
		const {
			syntaxHighlighting,
			defaultHighlightStyle,
			bracketMatching,
		} = await import('@codemirror/language');
		const { closeBrackets, closeBracketsKeymap } = await import('@codemirror/autocomplete');

		const executeKeymap = keymap.of([
			{
				key: 'Mod-Enter',
				run: (view) => {
					const currentSql = view.state.doc.toString();
					onExecute?.(currentSql);
					return true;
				},
			},
		]);

		const updateListener = EditorView.updateListener.of((update) => {
			if (update.docChanged) {
				const newValue = update.state.doc.toString();
				value = newValue;
				onValueChange?.(newValue);
			}
		});

		const theme = EditorView.theme(
			{
				'&': {
					backgroundColor: 'var(--bg-editor, #18181b)',
					color: 'var(--text-primary, #e4e4e7)',
					height: '100%',
					fontSize: '13px',
					fontFamily: 'var(--font-mono, "Geist Mono", monospace)',
				},
				'.cm-content': {
					padding: '12px 0',
					caretColor: 'var(--accent-blue, #60a5fa)',
				},
				'.cm-line': {
					padding: '0 16px',
				},
				'.cm-gutters': {
					backgroundColor: 'var(--bg-editor, #18181b)',
					color: 'var(--text-muted, #71717a)',
					border: 'none',
					borderRight: '1px solid var(--border-default, #27272a)',
					paddingRight: '8px',
				},
				'.cm-activeLineGutter': {
					backgroundColor: 'var(--bg-hover, #27272a)',
				},
				'.cm-activeLine': {
					backgroundColor: 'rgba(96,165,250,0.05)',
				},
				'.cm-cursor': {
					borderLeftColor: 'var(--accent-blue, #60a5fa)',
				},
				'.cm-selectionBackground': {
					backgroundColor: 'rgba(96,165,250,0.15)',
				},
				'&.cm-focused .cm-selectionBackground': {
					backgroundColor: 'rgba(96,165,250,0.2)',
				},
				'.cm-matchingBracket': {
					backgroundColor: 'rgba(96,165,250,0.2)',
					outline: '1px solid var(--accent-blue, #60a5fa)',
				},
				'.cm-scroller': {
					overflow: 'auto',
					fontFamily: 'inherit',
				},
			},
			{ dark: true }
		);

		const state = EditorState.create({
			doc: value,
			extensions: [
				lineNumbers(),
				highlightActiveLineGutter(),
				highlightActiveLine(),
				dropCursor(),
				history(),
				bracketMatching(),
				closeBrackets(),
				sql(),
				syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
				keymap.of([
					...defaultKeymap,
					...historyKeymap,
					...closeBracketsKeymap,
				]),
				executeKeymap,
				updateListener,
				theme,
				EditorView.lineWrapping,
			],
		});

		editorView = new EditorView({ state, parent: editorEl });
	});

	onDestroy(() => {
		editorView?.destroy();
	});

	// Allow external value updates
	$effect(() => {
		if (editorView && editorView.state.doc.toString() !== value) {
			editorView.dispatch({
				changes: {
					from: 0,
					to: editorView.state.doc.length,
					insert: value,
				},
			});
		}
	});
</script>

<div class="sql-editor" bind:this={editorEl}></div>

<style>
	.sql-editor {
		width: 100%;
		height: 100%;
		overflow: hidden;
	}

	:global(.sql-editor .cm-editor) {
		height: 100%;
		outline: none;
	}
</style>
