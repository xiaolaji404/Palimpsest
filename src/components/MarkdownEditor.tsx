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
import { CodeOutlined, EyeOutlined } from '@ant-design/icons';

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

  const toggleMode = useCallback(() => {
    if (mode === 'source') {
      // Switch back to visual editor, remount to load current value
      setEditorKey((k) => k + 1);
      setMode('wysiwyg');
    } else {
      setMode('source');
    }
  }, [mode]);

  return (
    <div style={{ position: 'relative', height: '100%' }}>
      <div style={{ height: '100%' }}>
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
      <button
        onClick={toggleMode}
        style={{
          position: 'absolute',
          left: 10,
          bottom: 10,
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: '2px 8px',
          borderRadius: 4,
          border: 'none',
          background: 'rgba(0, 0, 0, 0.04)',
          color: '#999',
          cursor: 'pointer',
          fontSize: 12,
          lineHeight: '20px',
          opacity: 0.7,
          transition: 'all 0.2s',
          zIndex: 10,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.opacity = '1';
          e.currentTarget.style.color = '#1677ff';
          e.currentTarget.style.background = 'rgba(22, 119, 255, 0.1)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.opacity = '0.7';
          e.currentTarget.style.color = '#999';
          e.currentTarget.style.background = 'rgba(0, 0, 0, 0.04)';
        }}
        title={mode === 'source' ? '切换回可视化编辑' : '查看 Markdown 源码'}
      >
        {mode === 'source' ? <EyeOutlined /> : <CodeOutlined />}
        {mode === 'source' ? '可视化' : '源码'}
      </button>
    </div>
  );
}
