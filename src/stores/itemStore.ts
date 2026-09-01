import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import type { ItemMeta } from '../types';

interface ItemState {
  items: ItemMeta[];
  currentItemId: string | null;
  currentContent: string;
  loading: boolean;
  saving: boolean;

  loadItems: (projectPath: string, showArchived?: boolean) => Promise<void>;
  createItem: (projectPath: string, title: string, tags?: string[]) => Promise<ItemMeta>;
  openItem: (projectPath: string, itemId: string) => Promise<void>;
  saveContent: (projectPath: string, itemId: string, content: string) => Promise<void>;
  completeItem: (projectPath: string, itemId: string) => Promise<void>;
  uncompleteItem: (projectPath: string, itemId: string) => Promise<void>;
  deleteItem: (projectPath: string, itemId: string) => Promise<void>;
  setCurrentContent: (content: string) => void;
  clearCurrentItem: () => void;
}

let openRequestSeq = 0;

export const useItemStore = create<ItemState>((set) => ({
  items: [],
  currentItemId: null,
  currentContent: '',
  loading: false,
  saving: false,

  loadItems: async (projectPath, showArchived = false) => {
    set({ loading: true });
    try {
      const items = await invoke<ItemMeta[]>('list_items', {
        projectPath,
        showArchived,
      });
      set({ items });
    } finally {
      set({ loading: false });
    }
  },

  createItem: async (projectPath, title, tags = []) => {
    const meta = await invoke<ItemMeta>('create_item', {
      projectPath,
      title,
      tags,
    });
    set((state) => ({ items: [meta, ...state.items] }));
    return meta;
  },

  openItem: async (projectPath, itemId) => {
    const seq = ++openRequestSeq;
    try {
      const content = await invoke<string>('get_item_content', {
        projectPath,
        itemId,
      });
      // Discard stale responses from rapid navigation
      if (seq !== openRequestSeq) return;
      set({ currentItemId: itemId, currentContent: content });
    } catch (e) {
      if (seq !== openRequestSeq) return;
      console.error('Failed to open item:', e);
      throw e;
    }
  },

  saveContent: async (projectPath, itemId, content) => {
    set({ saving: true });
    try {
      await invoke('save_item_content', {
        projectPath,
        itemId,
        content,
      });
    } finally {
      set({ saving: false });
    }
  },

  completeItem: async (projectPath, itemId) => {
    await invoke('complete_item', { projectPath, itemId });
    set((state) => ({
      items: state.items.filter((i) => i.id !== itemId),
      currentItemId: state.currentItemId === itemId ? null : state.currentItemId,
      currentContent: state.currentItemId === itemId ? '' : state.currentContent,
    }));
  },

  uncompleteItem: async (projectPath, itemId) => {
    await invoke('uncomplete_item', { projectPath, itemId });
    // Reload items to reflect the restored item
    const items = await invoke<ItemMeta[]>('list_items', {
      projectPath,
      showArchived: false,
    });
    set({ items });
  },

  deleteItem: async (projectPath, itemId) => {
    await invoke('delete_item', { projectPath, itemId });
    set((state) => ({
      items: state.items.filter((i) => i.id !== itemId),
      currentItemId: state.currentItemId === itemId ? null : state.currentItemId,
    }));
  },

  setCurrentContent: (content) => set({ currentContent: content }),
  clearCurrentItem: () => set({ currentItemId: null, currentContent: '' }),
}));
