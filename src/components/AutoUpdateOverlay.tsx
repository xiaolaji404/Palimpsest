import { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, Progress, Button, Space, message } from 'antd';
import { check, Update } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';

type Phase = 'prompt' | 'downloading' | 'restart';

const fmt = (bytes?: number) =>
  bytes == null ? '?' : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

export function AutoUpdateOverlay() {
  const startedRef = useRef(false);
  const updateRef = useRef<Update | null>(null);
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>('prompt');
  const [version, setVersion] = useState('');
  const [body, setBody] = useState<string | undefined>();
  const [downloaded, setDownloaded] = useState(0);
  const [total, setTotal] = useState<number | undefined>(undefined);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const update = await check();
        if (!update || cancelled) return;
        updateRef.current = update;
        setVersion(update.version);
        setBody(update.body);
        setPhase('prompt');
        setOpen(true);
      } catch (e) {
        console.error('检查更新失败:', e);
      }
    }, 3000);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  const handleStartDownload = useCallback(async () => {
    const update = updateRef.current;
    if (!update || downloading) return;
    setDownloading(true);
    setDownloaded(0);
    setTotal(undefined);
    setPhase('downloading');
    try {
      await update.downloadAndInstall((event) => {
        if (event.event === 'Started' && event.data.contentLength) {
          setTotal(event.data.contentLength);
        } else if (event.event === 'Progress') {
          setDownloaded((d) => d + event.data.chunkLength);
        }
      });
      setPhase('restart');
    } catch (e) {
      message.error(`下载更新失败: ${e}`);
      setOpen(false);
    } finally {
      setDownloading(false);
    }
  }, [downloading]);

  const handleRestart = useCallback(async () => {
    try {
      await relaunch();
    } catch (e) {
      message.error(`重启失败: ${e}`);
      setOpen(false);
    }
  }, []);

  const handleClose = useCallback(() => {
    if (phase === 'downloading') return;
    setOpen(false);
  }, [phase]);

  const percent =
    total && total > 0 ? Math.min(100, Math.round((downloaded / total) * 100)) : 0;

  const footer =
    phase === 'prompt' ? (
      <Space>
        <Button onClick={handleClose}>稍后</Button>
        <Button type="primary" onClick={handleStartDownload}>下载并安装</Button>
      </Space>
    ) : phase === 'restart' ? (
      <Space>
        <Button onClick={handleClose}>稍后重启</Button>
        <Button type="primary" onClick={handleRestart}>立即重启</Button>
      </Space>
    ) : null;

  const title =
    phase === 'prompt'
      ? `发现新版本 ${version}`
      : phase === 'downloading'
        ? `正在下载更新 ${version}`
        : '更新已就绪';

  return (
    <Modal
      open={open}
      title={title}
      onCancel={handleClose}
      maskClosable={false}
      closable={phase !== 'downloading'}
      footer={footer}
    >
      {phase === 'prompt' && (
        <div>
          <p>当前版本发现可用更新，是否现在下载并安装？</p>
          {body ? (
            <div style={{ maxHeight: 180, overflow: 'auto', color: '#888', fontSize: 13 }}>
              {body}
            </div>
          ) : null}
        </div>
      )}
      {phase === 'downloading' && (
        <div>
          <Progress
            percent={percent}
            status={percent >= 100 ? 'success' : 'active'}
            strokeColor={{ from: '#108ee9', to: '#87d068' }}
          />
          <div style={{ textAlign: 'center', color: '#888', fontSize: 12 }}>
            已下载 {fmt(downloaded)} / {fmt(total)}
          </div>
        </div>
      )}
      {phase === 'restart' && (
        <p>更新已下载并安装完成，重启应用后生效。</p>
      )}
    </Modal>
  );
}
