import { useEffect } from 'react';
import { Button, Card, List, Typography, Space, Tag, Empty, message, Popconfirm } from 'antd';
import { ArrowLeftOutlined, UndoOutlined, DeleteOutlined, InboxOutlined } from '@ant-design/icons';
import { useProjectStore } from '../stores/projectStore';
import { useItemStore } from '../stores/itemStore';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';
import type { ItemMeta } from '../types';

dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

const { Text, Title } = Typography;

export default function Archive() {
  const navigate = useNavigate();
  const { currentProjectPath } = useProjectStore();
  const { items, loading, loadItems, uncompleteItem, deleteItem } = useItemStore();
  const [messageApi, contextHolder] = message.useMessage();

  useEffect(() => {
    if (currentProjectPath) {
      loadItems(currentProjectPath, true);
    }
  }, [currentProjectPath]);

  const archivedItems = items.filter(i => i.archived);

  const handleUnarchive = async (item: ItemMeta) => {
    if (!currentProjectPath) return;
    try {
      await uncompleteItem(currentProjectPath, item.id);
      loadItems(currentProjectPath, true);
      messageApi.success('已反归档');
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

  return (
    <div style={{ padding: '24px 32px', height: '100vh', overflow: 'auto' }}>
      {contextHolder}
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/')} />
          <Title level={4} style={{ margin: 0 }}>
            <InboxOutlined /> 归档
          </Title>
        </Space>
      </div>

      {archivedItems.length === 0 && !loading ? (
        <Empty description="暂无归档事项" style={{ marginTop: 100 }} />
      ) : (
        <List
          loading={loading}
          dataSource={archivedItems}
          renderItem={(item) => (
            <Card size="small" style={{ marginBottom: 12 }} className="item-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <Text strong style={{ fontSize: 16 }}>{item.title}</Text>
                  <div style={{ marginTop: 8 }}>
                    {item.tags.map((tag) => (
                      <Tag key={tag}>{tag}</Tag>
                    ))}
                  </div>
                </div>
                <Space>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {dayjs(item.updatedAt).fromNow()}
                  </Text>
                  <Popconfirm title="确定反归档？" onConfirm={() => handleUnarchive(item)}>
                    <Button type="link" size="small" icon={<UndoOutlined />}>
                      反归档
                    </Button>
                  </Popconfirm>
                  <Popconfirm title="确定永久删除？" onConfirm={() => handleDelete(item)}>
                    <Button type="link" danger size="small" icon={<DeleteOutlined />}>
                      删除
                    </Button>
                  </Popconfirm>
                </Space>
              </div>
            </Card>
          )}
        />
      )}
    </div>
  );
}
