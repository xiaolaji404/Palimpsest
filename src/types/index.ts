export interface Project {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface ItemMeta {
  id: string;
  title: string;
  completed: boolean;
  archived: boolean;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface RecentProject {
  name: string;
  path: string;
  lastOpened: string;
}

export interface AppConfig {
  recentProjects: RecentProject[];
  currentProjectPath: string | null;
}
