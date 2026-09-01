import { useCallback, useEffect, useState } from 'react';
import { Modal, message } from 'antd';
import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';

export function useAutoUpdate() {
  const [checking, setChecking] = useState(false);

  const performUpdate = useCallback(async (silent: boolean) => {
    if (checking) return;
    setChecking(true);
    try {
      const update = await check();
      if (!update) {
        if (!silent) {
          message.info('当前已是最新版本');
        }
        return;
      }
      const downloadAndInstall = async () => {
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
      };
      if (silent) {
        // 静默检查到更新时，仅提示一次
        downloadAndInstall();
      } else {
        downloadAndInstall();
      }
    } catch (e: any) {
      console.error('检查更新失败:', e);
      if (!silent) {
        message.error(`检查更新失败: ${e}`);
      }
    } finally {
      setChecking(false);
    }
  }, [checking]);

  useEffect(() => {
    // 启动后 3 秒静默检查一次
    const timer = setTimeout(() => {
      performUpdate(true);
    }, 3000);
    return () => clearTimeout(timer);
  }, [performUpdate]);

  return { checking, checkForUpdate: () => performUpdate(false) };
}
