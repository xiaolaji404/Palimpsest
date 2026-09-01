import { useState } from 'react';
import { Button, Card, List, Typography, Space, Tag, Modal, Input, message } from 'antd';
import { FolderOpenOutlined, PlusOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { useProjectStore } from '../stores/projectStore';
import { open } from '@tauri-apps/plugin-dialog';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';

dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

const { Title, Text } = Typography;

export default function ProjectList() {
  const { recentProjects, createProject, openProject } = useProjectStore();
  const [modalVisible, setModalVisible] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [selectedPath, setSelectedPath] = useState('');
  const [creating, setCreating] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();

  const handleSelectPath = async () => {
    const path = await open({ directory: true, title: '选择项目路径' });
    if (path) {
      setSelectedPath(path as string);
    }
  };

  const handleCreate = async () => {
    if (!projectName.trim()) {
      messageApi.warning('请输入项目名称');
      return;
    }
    if (!selectedPath) {
      messageApi.warning('请选择项目路径');
      return;
    }

    setCreating(true);
    try {
      const fullPath = `${selectedPath}/${projectName}`;
      await createProject(projectName, fullPath);
      setModalVisible(false);
      setProjectName('');
      setSelectedPath('');
      messageApi.success('项目创建成功');
    } catch (e: any) {
      messageApi.error(e || '创建失败');
    } finally {
      setCreating(false);
    }
  };

  const handleOpenExisting = async () => {
    const path = await open({ directory: true, title: '选择已有项目目录' });
    if (path) {
      try {
        await openProject(path as string);
        messageApi.success('项目已打开');
      } catch (e: any) {
        messageApi.error(e || '打开项目失败，请确认目录中包含 project.json');
      }
    }
  };

  const handleOpenRecent = async (path: string) => {
    try {
      await openProject(path);
    } catch (e: any) {
      messageApi.error(e || '打开项目失败');
    }
  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      background: '#f5f5f5',
      padding: '40px',
    }}>
      {contextHolder}
      <Card
        style={{ width: 600, maxWidth: '90vw', borderRadius: 12 }}
        styles={{ body: { padding: 40 } }}
      >
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <Title level={2} style={{ margin: 0 }}>Palimpsest</Title>
          <Text type="secondary">工作事项记录</Text>
        </div>

        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            size="large"
            block
            onClick={() => setModalVisible(true)}
          >
            新建项目
          </Button>
          <Button
            icon={<FolderOpenOutlined />}
            size="large"
            block
            onClick={handleOpenExisting}
          >
            打开已有项目
          </Button>
        </Space>

        {recentProjects.length > 0 && (
          <>
            <div style={{ margin: '32px 0 16px', borderTop: '1px solid #f0f0f0', paddingTop: 24 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                <ClockCircleOutlined /> 最近打开
              </Text>
            </div>
            <List
              dataSource={recentProjects}
              renderItem={(item) => (
                <List.Item
                  style={{ cursor: 'pointer', padding: '12px 16px', borderRadius: 8 }}
                  onClick={() => handleOpenRecent(item.path)}
                  className="recent-project-item"
                >
                  <List.Item.Meta
                    title={item.name}
                    description={
                      <Space>
                        <Text type="secondary" copyable={{ text: item.path }} style={{ fontSize: 12 }}>
                          {item.path}
                        </Text>
                        <Tag>{dayjs(item.lastOpened).fromNow()}</Tag>
                      </Space>
                    }
                  />
                </List.Item>
              )}
            />
          </>
        )}
      </Card>

      <Modal
        title="新建项目"
        open={modalVisible}
        onOk={handleCreate}
        onCancel={() => {
          setModalVisible(false);
          setProjectName('');
          setSelectedPath('');
        }}
        confirmLoading={creating}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <div>
            <Text>项目名称</Text>
            <Input
              placeholder="输入项目名称"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              style={{ marginTop: 8 }}
            />
          </div>
          <div>
            <Text>项目路径</Text>
            <div style={{ marginTop: 8 }}>
              <Space>
                <Input
                  value={selectedPath}
                  placeholder="选择父目录"
                  readOnly
                  style={{ width: 300 }}
                />
                <Button onClick={handleSelectPath}>选择目录</Button>
              </Space>
              {selectedPath && projectName && (
                <Text type="secondary" style={{ fontSize: 12, marginTop: 4, display: 'block' }}>
                  将创建: {selectedPath}/{projectName}
                </Text>
              )}
            </div>
          </div>
        </Space>
      </Modal>
    </div>
  );
}
