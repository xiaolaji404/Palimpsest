import { useEffect, useState } from 'react';
import { Button, Card, List, Typography, Space, Tag, Modal, Input, message, Empty, Checkbox, Dropdown } from 'antd';
import { PlusOutlined, DeleteOutlined, InboxOutlined, DownOutlined, FolderOpenOutlined, EditOutlined, UndoOutlined, MoreOutlined, CheckOutlined } from '@ant-design/icons';
import { useProjectStore } from '../stores/projectStore';
import { useItemStore } from '../stores/itemStore';
import { useNavigate } from 'react-router-dom';
import { open } from '@tauri-apps/plugin-dialog';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';
import type { ItemMeta } from '../types';

dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

const { Text, Title } = Typography;

export default function Dashboard() {
  const navigate = useNavigate();
  const { currentProject, currentProjectPath, recentProjects, openProject } = useProjectStore();
  const { items, loading, loadItems, createItem, updateItemMeta, completeItem, uncompleteItem, deleteItem, clearCurrentItem } = useItemStore();
  const [modalVisible, setModalVisible] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newTags, setNewTags] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [messageApi, contextHolder] = message.useMessage();

  useEffect(() => {
    if (currentProjectPath) {
      loadItems(currentProjectPath, showArchived);
    }
  }, [currentProjectPath, showArchived]);

  const handleCreate = async () => {
    if (!newTitle.trim() || !currentProjectPath) return;
    try {
      const tags = newTags.split(',').map(t => t.trim()).filter(Boolean);
      await createItem(currentProjectPath, newTitle.trim(), tags);
      setNewTitle('');
      setNewTags('');
      setModalVisible(false);
      messageApi.success('事项已创建');
    } catch (e: any) {
      messageApi.error(e || '创建失败');
    }
  };

  const handleComplete = async (item: ItemMeta) => {
    if (!currentProjectPath) return;
    try {
      await completeItem(currentProjectPath, item.id);
      messageApi.success('已归档');
    } catch (e: any) {
      messageApi.error(e || '操作失败');
    }
  };

  const handleDelete = async (item: ItemMeta) => {
    if (!currentProjectPath) return;
    try {
      await deleteItem(currentProjectPath, item.id);
      messageApi.success('已删除');
    } catch (e: any) {
      messageApi.error(e || '删除失败');
    }
  };

  const handleUnarchive = async (item: ItemMeta) => {
    if (!currentProjectPath) return;
    try {
      await uncompleteItem(currentProjectPath, item.id);
      await loadItems(currentProjectPath, showArchived);
      messageApi.success('已反归档');
    } catch (e: any) {
      messageApi.error(e || '操作失败');
    }
  };

  const handleToggleComplete = (item: ItemMeta) => {
    if (item.archived) {
      handleUnarchive(item);
    } else {
      handleComplete(item);
    }
  };

  const handleStartEditTitle = (item: ItemMeta) => {
    setEditingId(item.id);
    setEditingTitle(item.title);
  };

  const handleSaveTitle = async () => {
    const id = editingId;
    if (!id || !currentProjectPath) return;
    const title = editingTitle.trim();
    setEditingId(null);
    if (!title) return;
    try {
      await updateItemMeta(currentProjectPath, id, { title });
      messageApi.success('已更新标题');
    } catch (e: any) {
      messageApi.error(e || '更新标题失败');
    }
  };

  const handleOpenItem = (item: ItemMeta) => {
    navigate(`/item/${item.id}`, { state: { title: item.title } });
  };

  const handleSwitchProject = async ({ key }: { key: string }) => {
    try {
      if (key === 'open-other') {
        const path = await open({ directory: true, title: '打开项目目录' });
        if (path) {
          clearCurrentItem();
          await openProject(path as string);
          messageApi.success('已切换项目');
        }
      } else {
        clearCurrentItem();
        await openProject(key);
      }
    } catch (e: any) {
      messageApi.error(e || '切换项目失败');
    }
  };

  return (
    <div style={{ padding: '24px 32px', height: '100vh', overflow: 'auto' }}>
      {contextHolder}
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Dropdown
          trigger={['click']}
          menu={{
            items: [
              ...recentProjects
                .filter((p) => p.path !== currentProjectPath)
                .map((p) => ({
                  key: p.path,
                  label: (
                    <Space>
                      <span>{p.name}</span>
                      <Text type="secondary" style={{ fontSize: 12 }}>{p.path}</Text>
                    </Space>
                  ),
                })),
              recentProjects.filter((p) => p.path !== currentProjectPath).length > 0
                ? { type: 'divider' as const }
                : null,
              { key: 'open-other', icon: <FolderOpenOutlined />, label: '打开其他项目' },
            ].filter(Boolean) as any[],
            onClick: handleSwitchProject,
          }}
        >
          <Space style={{ cursor: 'pointer' }}>
            <Title level={4} style={{ margin: 0 }}>{currentProject?.name || '项目'}</Title>
            <DownOutlined style={{ fontSize: 12, color: '#999' }} />
          </Space>
        </Dropdown>
        <Space>
          <Checkbox
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
          >
            显示归档
          </Checkbox>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setModalVisible(true)}
          >
            新建事项
          </Button>
        </Space>
      </div>

      {items.length === 0 && !loading ? (
        <Empty
          description="暂无事项，点击上方按钮创建"
          style={{ marginTop: 100 }}
        />
      ) : (
        <List
          loading={loading}
          dataSource={items}
          renderItem={(item) => (
            <Card
              size="small"
              style={{ marginBottom: 12, cursor: 'pointer' }}
              className="item-card"
              onClick={() => handleOpenItem(item)}
              styles={{ body: { padding: '12px 16px' } }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button
                  onClick={(e) => { e.stopPropagation(); handleToggleComplete(item); }}
                  title={item.archived ? '反归档' : '标记完成'}
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    flexShrink: 0,
                    border: item.archived ? 'none' : '1.5px solid #d9d9d9',
                    background: item.archived ? '#52c41a' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: '#fff',
                    transition: 'all 0.2s',
                    padding: 0,
                  }}
                  onMouseEnter={(e) => {
                    if (!item.archived) e.currentTarget.style.borderColor = '#1677ff';
                  }}
                  onMouseLeave={(e) => {
                    if (!item.archived) e.currentTarget.style.borderColor = '#d9d9d9';
                  }}
                >
                  {item.archived && <CheckOutlined style={{ fontSize: 12 }} />}
                </button>
                <div
                  style={{ flex: 1, minWidth: 0 }}
                  onMouseEnter={() => setHoveredId(item.id)}
                  onMouseLeave={() => setHoveredId(null)}
                >
                  {editingId === item.id ? (
                    <Input
                      size="small"
                      value={editingTitle}
                      autoFocus
                      onChange={(e) => setEditingTitle(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      onPressEnter={handleSaveTitle}
                      onBlur={handleSaveTitle}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                          e.stopPropagation();
                          setEditingId(null);
                        }
                      }}
                      style={{ maxWidth: 360 }}
                    />
                  ) : (
                    <>
                      <Space style={{ width: '100%' }}>
                        <Text strong style={{ fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.title}
                        </Text>
                        {item.archived && <InboxOutlined style={{ color: '#999', fontSize: 12 }} />}
                        {hoveredId === item.id && (
                          <EditOutlined
                            onClick={(e) => { e.stopPropagation(); handleStartEditTitle(item); }}
                            style={{ color: '#999', cursor: 'pointer', fontSize: 13 }}
                            title="编辑标题"
                          />
                        )}
                      </Space>
                      {item.tags.length > 0 && (
                        <div style={{ marginTop: 6 }}>
                          {item.tags.map((tag) => (
                            <Tag key={tag} color="blue" style={{ fontSize: 11, marginInlineEnd: 4 }}>{tag}</Tag>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
                <Text type="secondary" style={{ fontSize: 12, whiteSpace: 'nowrap', flexShrink: 0 }}>
                  {dayjs(item.updatedAt).fromNow()}
                </Text>
                <Dropdown
                  trigger={['click']}
                  menu={{
                    items: [
                      ...(item.archived ? [{
                        key: 'unarchive', icon: <UndoOutlined />, label: '反归档',
                      }] : []),
                      { key: 'rename', icon: <EditOutlined />, label: '编辑标题' },
                      { type: 'divider' as const },
                      { key: 'delete', icon: <DeleteOutlined />, label: '删除', danger: true },
                    ],
                    onClick: ({ key, domEvent }) => {
                      domEvent.stopPropagation();
                      if (key === 'rename') handleStartEditTitle(item);
                      else if (key === 'delete') {
                        Modal.confirm({
                          title: '删除此事项？',
                          content: `将删除「${item.title}」及其全部内容，此操作不可恢复。`,
                          okText: '删除',
                          okButtonProps: { danger: true },
                          cancelText: '取消',
                          onOk: () => handleDelete(item),
                        });
                      } else if (key === 'unarchive') {
                        handleUnarchive(item);
                      }
                    },
                  }}
                >
                  <Button
                    type="text"
                    size="small"
                    icon={<MoreOutlined />}
                    title="更多"
                    onClick={(e) => e.stopPropagation()}
                  />
                </Dropdown>
              </div>
            </Card>
          )}
        />
      )}

      <Modal
        title="新建事项"
        open={modalVisible}
        onOk={handleCreate}
        onCancel={() => {
          setModalVisible(false);
          setNewTitle('');
          setNewTags('');
        }}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <div>
            <Text>事项标题</Text>
            <Input
              placeholder="输入事项标题"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              style={{ marginTop: 8 }}
              onPressEnter={handleCreate}
            />
          </div>
          <div>
            <Text>标签（用逗号分隔）</Text>
            <Input
              placeholder="bug, urgent"
              value={newTags}
              onChange={(e) => setNewTags(e.target.value)}
              style={{ marginTop: 8 }}
              onPressEnter={handleCreate}
            />
          </div>
        </Space>
      </Modal>
    </div>
  );
}
