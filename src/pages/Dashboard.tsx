import { useEffect, useState } from 'react';
import { Button, Card, List, Typography, Space, Tag, Modal, Input, message, Empty, Checkbox, Popconfirm, Dropdown } from 'antd';
import { PlusOutlined, DeleteOutlined, CheckCircleOutlined, InboxOutlined, DownOutlined, FolderOpenOutlined } from '@ant-design/icons';
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
  const { items, loading, loadItems, createItem, completeItem, deleteItem, clearCurrentItem } = useItemStore();
  const [modalVisible, setModalVisible] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newTags, setNewTags] = useState('');
  const [showArchived, setShowArchived] = useState(false);
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

  const handleOpenItem = (item: ItemMeta) => {
    navigate(`/item/${item.id}`);
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
              actions={
                item.archived
                  ? [
                      <Popconfirm
                        key="unarchive"
                        title="确定反归档？"
                        onConfirm={(e) => { e?.stopPropagation(); handleComplete(item); }}
                      >
                        <Button type="link" size="small" onClick={(e) => e.stopPropagation()}>
                          反归档
                        </Button>
                      </Popconfirm>
                    ]
                  : [
                      <Popconfirm
                        key="complete"
                        title="标记为完成？"
                        onConfirm={(e) => { e?.stopPropagation(); handleComplete(item); }}
                      >
                        <Button
                          type="link"
                          size="small"
                          icon={<CheckCircleOutlined />}
                          onClick={(e) => e.stopPropagation()}
                        >
                          完成
                        </Button>
                      </Popconfirm>,
                      <Popconfirm
                        key="delete"
                        title="确定删除此事项？"
                        onConfirm={(e) => { e?.stopPropagation(); handleDelete(item); }}
                      >
                        <Button
                          type="link"
                          danger
                          size="small"
                          icon={<DeleteOutlined />}
                          onClick={(e) => e.stopPropagation()}
                        >
                          删除
                        </Button>
                      </Popconfirm>,
                    ]
              }
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <Space>
                    {item.archived && <InboxOutlined style={{ color: '#999' }} />}
                    <Text strong style={{ fontSize: 16 }}>{item.title}</Text>
                  </Space>
                  <div style={{ marginTop: 8 }}>
                    {item.tags.map((tag) => (
                      <Tag key={tag} color="blue">{tag}</Tag>
                    ))}
                  </div>
                </div>
                <Text type="secondary" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                  {dayjs(item.updatedAt).fromNow()}
                </Text>
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
