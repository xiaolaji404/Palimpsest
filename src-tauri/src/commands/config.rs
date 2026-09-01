use std::fs;
use std::path::Path;
use chrono::Utc;

use crate::models::project::RecentProject;

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct AppConfig {
    #[serde(rename = "recentProjects")]
    pub recent_projects: Vec<RecentProject>,
    #[serde(rename = "currentProjectPath")]
    pub current_project_path: Option<String>,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            recent_projects: Vec::new(),
            current_project_path: None,
        }
    }
}

fn config_dir() -> String {
    let home = std::env::var("HOME")
        .or_else(|_| std::env::var("USERPROFILE"))
        .unwrap_or_else(|_| ".".to_string());

    if cfg!(target_os = "macos") {
        format!("{}/Library/Application Support/com.palimpsest.app", home)
    } else if cfg!(target_os = "windows") {
        std::env::var("APPDATA").unwrap_or_else(|_| format!("{}/AppData/Roaming", home))
    } else {
        format!("{}/.config/palimpsest", home)
    }
}

fn config_path() -> String {
    format!("{}/config.json", config_dir())
}

#[tauri::command]
pub fn get_config() -> Result<AppConfig, String> {
    let path = config_path();
    if !Path::new(&path).exists() {
        return Ok(AppConfig::default());
    }

    let content = fs::read_to_string(&path)
        .map_err(|e| format!("读取配置失败: {}", e))?;
    let config: AppConfig = serde_json::from_str(&content)
        .map_err(|e| format!("解析配置失败: {}", e))?;

    Ok(config)
}

#[tauri::command]
pub fn save_config(config: AppConfig) -> Result<(), String> {
    let dir = config_dir();
    fs::create_dir_all(&dir)
        .map_err(|e| format!("创建配置目录失败: {}", e))?;

    let json = serde_json::to_string_pretty(&config)
        .map_err(|e| format!("序列化配置失败: {}", e))?;

    fs::write(config_path(), json)
        .map_err(|e| format!("写入配置失败: {}", e))?;

    Ok(())
}

#[tauri::command]
pub fn save_recent_project(name: String, path: String) -> Result<AppConfig, String> {
    let mut config = get_config()?;

    // 移除已有的同路径项目
    config.recent_projects.retain(|p| p.path != path);

    // 添加到最前面
    config.recent_projects.insert(0, RecentProject {
        name,
        path,
        last_opened: Utc::now(),
    });

    // 最多保留 10 个
    config.recent_projects.truncate(10);

    save_config(config.clone())?;
    Ok(config)
}
