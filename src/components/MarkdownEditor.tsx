import { useState, useCallback, useEffect, useRef } from 'react';
import { MilkdownProvider, Milkdown, useEditor } from '@milkdown/react';
import { Editor, rootCtx, defaultValueCtx, KeymapReady, keymapCtx } from '@milkdown/kit/core';
import type { MilkdownPlugin } from '@milkdown/ctx';
import { commonmark } from '@milkdown/kit/preset/commonmark';
import { gfm } from '@milkdown/kit/preset/gfm';
import { listener, listenerCtx } from '@milkdown/kit/plugin/listener';
import { history } from '@milkdown/kit/plugin/history';
import { indent } from '@milkdown/kit/plugin/indent';
import { cursor } from '@milkdown/kit/plugin/cursor';
import { clipboard } from '@milkdown/kit/plugin/clipboard';
import { block } from '@milkdown/kit/plugin/block';
import { nord } from '@milkdown/theme-nord';
import { TextSelection } from '@milkdown/kit/prose/state';

interface MarkdownEditorProps {
  value: string;
  onChange?: (value: string) => void;
}

const headingEnterPlugin: MilkdownPlugin = (ctx) => async () => {
  await ctx.wait(KeymapReady);
  ctx.get(keymapCtx).addObjectKeymap({
    Enter: {
      key: 'Enter',
      onRun: () => (state, dispatch) => {
        const { $from } = state.selection;
        if ($from.parent.type.name !== 'heading') return false;

        const heading = $from.parent;
        const start = $from.before($from.depth);
        const end = $from.after($from.depth);
        const offset = $from.parentOffset;
        const paragraphType = state.schema.nodes.paragraph;
        const tr = state.tr;
        let cursorPos: number;

        if (offset === 0) {
          // Cursor at very start: turn whole heading into a paragraph
          const after = heading.slice(offset).content;
          tr.replaceWith(start, end, paragraphType.create(null, after));
          cursorPos = start + 1;
        } else if (offset >= heading.nodeSize - 2) {
          // Cursor at end: keep heading, append empty paragraph
          tr.insert(end, paragraphType.create());
          cursorPos = end + 1;
        } else {
          // Cursor in the middle: split into heading(before) + paragraph(after)
          const before = heading.slice(0, offset).content;
          const after = heading.slice(offset).content;
          tr.replaceWith(start, end, [
            heading.copy(before),
            paragraphType.create(null, after),
          ]);
          cursorPos = start + heading.nodeSize + 1;
        }

        tr.setSelection(TextSelection.near(tr.doc.resolve(cursorPos)));
        if (dispatch) dispatch(tr.scrollIntoView());
        return true;
      },
      priority: 60,
    },
  });
};

function EditorContent({
  content,
  onContentChange,
}: {
  content: string;
  onContentChange?: (v: string) => void;
}) {
  const onContentChangeRef = useRef(onContentChange);
  onContentChangeRef.current = onContentChange;

  useEditor(
    (root) =>
      Editor.make()
        .config(nord)
        .config((ctx) => {
          ctx.set(rootCtx, root);
          ctx.set(defaultValueCtx, content);
          ctx.get(listenerCtx).markdownUpdated((_ctx, markdown) => {
            onContentChangeRef.current?.(markdown);
          });
        })
        .use(commonmark)
        .use(gfm)
        .use(listener)
        .use(history)
        .use(indent)
        .use(cursor)
        .use(clipboard)
        .use(block)
        .use(headingEnterPlugin),
    []
  );

  return (
    <div className="milkdown-editor-container" style={{ height: '100%', overflow: 'auto' }}>
      <Milkdown />
    </div>
  );
}

export default function MarkdownEditor({ value, onChange }: MarkdownEditorProps) {
  const [mode, setMode] = useState<'wysiwyg' | 'source'>('wysiwyg');
  const [sourceValue, setSourceValue] = useState(value);
  const [editorKey, setEditorKey] = useState(0);

  // Sync source mode textarea with external value changes
  useEffect(() => {
    if (mode === 'source') {
      setSourceValue(value);
    }
  }, [value, mode]);

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const handleSourceChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setSourceValue(newValue);
    onChangeRef.current?.(newValue);
  }, []);

  const switchToSource = useCallback(() => {
    setMode('source');
  }, []);

  const switchToWysiwyg = useCallback(() => {
    // Increment key to force full remount — loads current value as initial content
    setEditorKey((k) => k + 1);
    setMode('wysiwyg');
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'flex-end',
        padding: '6px 16px',
        gap: 6,
        borderBottom: '1px solid #f0f0f0',
        background: '#fafafa',
      }}>
        <button
          onClick={switchToWysiwyg}
          style={{
            padding: '5px 14px',
            borderRadius: 6,
            border: 'none',
            background: mode === 'wysiwyg' ? '#1677ff' : 'transparent',
            color: mode === 'wysiwyg' ? '#fff' : '#666',
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 500,
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            if (mode !== 'wysiwyg') e.currentTarget.style.background = '#f0f0f0';
          }}
          onMouseLeave={(e) => {
            if (mode !== 'wysiwyg') e.currentTarget.style.background = 'transparent';
          }}
        >
          WYSIWYG
        </button>
        <button
          onClick={switchToSource}
          style={{
            padding: '5px 14px',
            borderRadius: 6,
            border: 'none',
            background: mode === 'source' ? '#1677ff' : 'transparent',
            color: mode === 'source' ? '#fff' : '#666',
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 500,
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            if (mode !== 'source') e.currentTarget.style.background = '#f0f0f0';
          }}
          onMouseLeave={(e) => {
            if (mode !== 'source') e.currentTarget.style.background = 'transparent';
          }}
        >
          源码
        </button>
      </div>
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {mode === 'wysiwyg' ? (
          <MilkdownProvider key={editorKey}>
            <EditorContent content={value} onContentChange={onChange} />
          </MilkdownProvider>
        ) : (
          <textarea
            value={sourceValue}
            onChange={handleSourceChange}
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              outline: 'none',
              resize: 'none',
              padding: '32px 48px',
              fontSize: 15,
              lineHeight: 1.8,
              fontFamily: "'SF Mono', 'Fira Code', 'Cascadia Code', Menlo, Monaco, Consolas, monospace",
              color: '#1a1a1a',
              background: '#fff',
            }}
            spellCheck={false}
          />
        )}
      </div>
    </div>
  );
}
