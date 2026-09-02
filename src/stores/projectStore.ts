import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import type { Project, RecentProject, AppConfig } from '../types';

interface ProjectState {
  config: AppConfig | null;
  currentProject: Project | null;
  currentProjectPath: string | null;
  recentProjects: RecentProject[];
  loading: boolean;

  loadConfig: () => Promise<void>;
  createProject: (name: string, path: string, description?: string) => Promise<Project>;
  openProject: (path: string) => Promise<Project>;
  switchProject: (path: string) => Promise<void>;
  removeRecentProject: (path: string) => Promise<void>;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  config: null,
  currentProject: null,
  currentProjectPath: null,
  recentProjects: [],
  loading: false,

  loadConfig: async () => {
    try {
      const config = await invoke<AppConfig>('get_config');
      set({
        config,
        recentProjects: config.recentProjects || [],
        currentProjectPath: config.currentProjectPath,
      });

      if (config.currentProjectPath) {
        try {
          const project = await invoke<Project>('open_project', { path: config.currentProjectPath });
          set({ currentProject: project });
        } catch {
          set({ currentProject: null, currentProjectPath: null });
        }
      }
    } catch (e) {
      console.error('加载配置失败:', e);
    }
  },

  createProject: async (name, path, description = '') => {
    set({ loading: true });
    try {
      const project = await invoke<Project>('create_project', { name, path, description });
      await invoke('save_recent_project', { name, path });
      const config = await invoke<AppConfig>('get_config');
      set({
        currentProject: project,
        currentProjectPath: path,
        recentProjects: config.recentProjects,
        config,
      });
      return project;
    } finally {
      set({ loading: false });
    }
  },

  openProject: async (path) => {
    set({ loading: true });
    try {
      const project = await invoke<Project>('open_project', { path });
      await invoke('save_recent_project', { name: project.name, path });
      const config = await invoke<AppConfig>('get_config');
      set({
        currentProject: project,
        currentProjectPath: path,
        recentProjects: config.recentProjects,
        config,
      });
      return project;
    } finally {
      set({ loading: false });
    }
  },

  switchProject: async (path) => {
    await get().openProject(path);
  },

  removeRecentProject: async (path) => {
    const config = get().config;
    if (!config) return;
    const recentProjects = (config.recentProjects || []).filter((r) => r.path !== path);
    const newConfig = { ...config, recentProjects };
    await invoke('save_config', { config: newConfig });
    set({ config: newConfig, recentProjects });
  },
}));
