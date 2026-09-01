import { useEffect, useRef, useCallback, useState } from 'react';
import { Button, Typography, Space, Spin, message } from 'antd';
import { ArrowLeftOutlined, SaveOutlined } from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import { useProjectStore } from '../stores/projectStore';
import { useItemStore } from '../stores/itemStore';
import MarkdownEditor from '../components/MarkdownEditor';

const { Text } = Typography;

interface PendingSave {
  path: string;
  id: string;
  content: string;
}

export default function ItemEditor() {
  const { itemId } = useParams<{ itemId: string }>();
  const navigate = useNavigate();
  const { currentProjectPath } = useProjectStore();
  const { currentItemId, currentContent, openItem, saveContent, setCurrentContent } = useItemStore();
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [messageApi, contextHolder] = message.useMessage();
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [lastSaved, setLastSaved] = useState<string>('');
  const pendingSaveRef = useRef<PendingSave | null>(null);
  const saveInProgressRef = useRef(false);

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
        padding: '12px 24px',
        borderBottom: '1px solid #f0f0f0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: '#fff',
      }}>
        <Space>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/')}
          />
          <Text type="secondary">
            {saving ? '保存中...' : lastSaved ? `已保存 ${lastSaved}` : ''}
          </Text>
        </Space>
        <Button
          icon={<SaveOutlined />}
          onClick={handleManualSave}
          loading={saving}
        >
          保存
        </Button>
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
