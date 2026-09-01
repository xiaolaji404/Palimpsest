use std::fs;
use std::path::Path;

use crate::models::project::{Project, RecentProject};

fn project_file_path(project_path: &str) -> std::path::PathBuf {
    Path::new(project_path).join("project.json")
}

#[tauri::command]
pub fn create_project(name: String, path: String, description: String) -> Result<Project, String> {
    let project_path = Path::new(&path);

    if project_path.exists() {
        if let Ok(mut entries) = fs::read_dir(project_path) {
            if entries.next().is_some() {
                return Err("目录不为空".to_string());
            }
        }
    }

    fs::create_dir_all(project_path)
        .map_err(|e| format!("创建目录失败: {}", e))?;
    fs::create_dir_all(project_path.join("items"))
        .map_err(|e| format!("创建 items 目录失败: {}", e))?;
    fs::create_dir_all(project_path.join("archive"))
        .map_err(|e| format!("创建 archive 目录失败: {}", e))?;

    let project = Project::new(name, description);
    let json = serde_json::to_string_pretty(&project)
        .map_err(|e| format!("序列化失败: {}", e))?;

    fs::write(project_file_path(&path), json)
        .map_err(|e| format!("写入 project.json 失败: {}", e))?;

    Ok(project)
}

#[tauri::command]
pub fn open_project(path: String) -> Result<Project, String> {
    let file_path = project_file_path(&path);
    if !file_path.exists() {
        return Err("项目不存在".to_string());
    }

    let content = fs::read_to_string(&file_path)
        .map_err(|e| format!("读取项目失败: {}", e))?;
    let project: Project = serde_json::from_str(&content)
        .map_err(|e| format!("解析项目失败: {}", e))?;

    Ok(project)
}

#[tauri::command]
pub fn list_recent_projects(config_path: String) -> Result<Vec<RecentProject>, String> {
    if !Path::new(&config_path).exists() {
        return Ok(Vec::new());
    }

    let content = fs::read_to_string(&config_path)
        .map_err(|e| format!("读取配置失败: {}", e))?;

    let map: serde_json::Value = serde_json::from_str(&content)
        .map_err(|e| format!("解析配置失败: {}", e))?;

    let projects: Vec<RecentProject> = map
        .get("recentProjects")
        .and_then(|v| serde_json::from_value(v.clone()).ok())
        .unwrap_or_default();

    Ok(projects)
}
