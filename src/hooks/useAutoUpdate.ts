import { useEffect, useRef } from 'react';
import { Modal, message } from 'antd';
import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';

// Silently check for updates once after startup. When an update is found,
// prompt the user to download & install it.
export function useAutoUpdate() {
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    let cancelled = false;
    const timer = setTimeout(async () => {
      let update;
      try {
        update = await check();
      } catch (e) {
        console.error('检查更新失败:', e);
        return;
      }
      if (!update || cancelled) return;

      Modal.confirm({
        title: `发现新版本 ${update.version}`,
        content: '是否现在下载并安装更新？',
        okText: '更新',
        cancelText: '稍后',
        onOk: async () => {
          try {
            await update.downloadAndInstall();
          } catch (e) {
            message.error(`下载更新失败: ${e}`);
            return;
          }
          Modal.confirm({
            title: '更新已下载',
            content: '重启应用以完成更新？',
            okText: '立即重启',
            cancelText: '稍后重启',
            onOk: async () => {
              await relaunch();
            },
          });
        },
      });
    }, 3000);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);
}
