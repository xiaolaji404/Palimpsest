import { useEffect, useRef, useCallback, useState } from 'react';
import { Button, Typography, Spin, message } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useProjectStore } from '../stores/projectStore';
import { useItemStore } from '../stores/itemStore';
import MarkdownEditor from '../components/MarkdownEditor';

const { Text, Title } = Typography;

interface PendingSave {
  path: string;
  id: string;
  content: string;
}

export default function ItemEditor() {
  const { itemId } = useParams<{ itemId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { currentProjectPath } = useProjectStore();
  const { items, currentItemId, currentContent, openItem, saveContent, setCurrentContent } = useItemStore();
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [messageApi, contextHolder] = message.useMessage();
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [lastSaved, setLastSaved] = useState<string>('');
  const pendingSaveRef = useRef<PendingSave | null>(null);
  const saveInProgressRef = useRef(false);

  // Prefer title carried from the list; fall back to the item store list.
  const titleFromState = (location.state as { title?: string } | null)?.title;
  const title = titleFromState || items.find((i) => i.id === itemId)?.title || '事项';


  // Always-latest content so effect cleanup can flush the outgoing item
  const contentRef = useRef(currentContent);
  contentRef.current = currentContent;

  const flushPending = useCallback(async () => {
    if (saveInProgressRef.current) return;
    const pending = pendingSaveRef.current;
    if (!pending) return;
    pendingSaveRef.current = null;
    saveInProgressRef.current = true;
    setSaving(true);
    try {
      await saveContent(pending.path, pending.id, pending.content);
      setLastSaved(new Date().toLocaleTimeString());
    } catch (e: any) {
      messageApi.error(e || '保存失败');
      // Requeue so a later flush retries
      pendingSaveRef.current = pending;
    } finally {
      setSaving(false);
      saveInProgressRef.current = false;
      if (pendingSaveRef.current) void flushPending();
    }
  }, [saveContent, messageApi]);

  // Load item content. Flush the outgoing item's unsaved edits before switching.
  useEffect(() => {
    if (!currentProjectPath || !itemId) return;
    const projectPath = currentProjectPath;
    const id = itemId;

    setLoading(true);
    openItem(projectPath, id)
      .then(() => setLoading(false))
      .catch((e) => {
        messageApi.error(`打开事项失败: ${e}`);
        navigate('/');
      });

    return () => {
      // Persist any unsaved edits of the item we're leaving behind
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
      const pending = pendingSaveRef.current;
      if (pending) {
        pendingSaveRef.current = null;
        void saveContent(pending.path, pending.id, pending.content)
          .catch((e) => messageApi.error(`保存失败: ${e}`));
      }
    };
  }, [currentProjectPath, itemId]);

  const handleChange = useCallback((value: string) => {
    setCurrentContent(value);
    if (!currentProjectPath || !itemId) return;
    pendingSaveRef.current = { path: currentProjectPath, id: itemId, content: value };

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    saveTimerRef.current = setTimeout(() => {
      saveTimerRef.current = null;
      void flushPending();
    }, 500);
  }, [setCurrentContent, currentProjectPath, itemId, flushPending]);

  const handleManualSave = useCallback(() => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    if (!currentProjectPath || !itemId) return;
    pendingSaveRef.current = { path: currentProjectPath, id: itemId, content: contentRef.current };
    void flushPending();
  }, [currentProjectPath, itemId, flushPending]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleManualSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleManualSave]);

  const ready = !loading && currentItemId === itemId;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {contextHolder}
      <div style={{
        padding: '10px 16px',
        borderBottom: '1px solid #f0f0f0',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        background: '#fff',
      }}>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/')}
        />
        <Title
          level={5}
          style={{
            margin: 0,
            flex: 1,
            minWidth: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
          title={title}
        >
          {title}
        </Title>
        <Text type="secondary" style={{ fontSize: 12, flexShrink: 0 }}>
          {saving ? '保存中...' : lastSaved ? `已保存 ${lastSaved}` : '自动保存已开启'}
        </Text>
      </div>
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {ready ? (
          <MarkdownEditor
            key={itemId}
            value={currentContent}
            onChange={handleChange}
          />
        ) : (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <Spin size="large" />
          </div>
        )}
      </div>
    </div>
  );
}
