use std::fs;
use std::path::{Path, PathBuf};
use chrono::Utc;

use crate::models::item::ItemMeta;

fn items_dir(project_path: &str) -> PathBuf {
    Path::new(project_path).join("items")
}

fn archive_dir(project_path: &str) -> PathBuf {
    Path::new(project_path).join("archive")
}

fn find_item_dir(base_dir: &Path, item_id: &str) -> Option<PathBuf> {
    fs::read_dir(base_dir).ok()?.find_map(|entry| {
        let entry = entry.ok()?;
        let path = entry.path();
        if path.is_dir() {
            let meta_path = path.join("meta.json");
            if let Ok(content) = fs::read_to_string(&meta_path) {
                if let Ok(meta) = serde_json::from_str::<ItemMeta>(&content) {
                    if meta.id == item_id {
                        return Some(path);
                    }
                }
            }
        }
        None
    })
}

fn find_item_in_project(project_path: &str, item_id: &str) -> Option<PathBuf> {
    find_item_dir(&items_dir(project_path), item_id)
        .or_else(|| find_item_dir(&archive_dir(project_path), item_id))
}

#[tauri::command]
pub fn create_item(project_path: String, title: String, tags: Vec<String>) -> Result<ItemMeta, String> {
    let base = items_dir(&project_path);
    fs::create_dir_all(&base)
        .map_err(|e| format!("创建目录失败: {}", e))?;

    let meta = ItemMeta::new(title, tags);
    let item_dir = base.join(&meta.id);
    fs::create_dir_all(&item_dir)
        .map_err(|e| format!("创建事项目录失败: {}", e))?;

    let meta_json = serde_json::to_string_pretty(&meta)
        .map_err(|e| format!("序列化失败: {}", e))?;

    fs::write(item_dir.join("meta.json"), meta_json)
        .map_err(|e| format!("写入 meta.json 失败: {}", e))?;

    fs::write(item_dir.join("content.md"), "# 新事项\n\n在此开始记录...\n")
        .map_err(|e| format!("创建 content.md 失败: {}", e))?;

    Ok(meta)
}

#[tauri::command]
pub fn list_items(project_path: String, show_archived: bool) -> Result<Vec<ItemMeta>, String> {
    let mut items = Vec::new();

    // 读取 items 目录
    if let Ok(entries) = fs::read_dir(items_dir(&project_path)) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() {
                let meta_path = path.join("meta.json");
                if let Ok(content) = fs::read_to_string(&meta_path) {
                    if let Ok(mut meta) = serde_json::from_str::<ItemMeta>(&content) {
                        meta.archived = false;
                        items.push(meta);
                    }
                }
            }
        }
    }

    // 读取 archive 目录
    if show_archived {
        if let Ok(entries) = fs::read_dir(archive_dir(&project_path)) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.is_dir() {
                    let meta_path = path.join("meta.json");
                    if let Ok(content) = fs::read_to_string(&meta_path) {
                        if let Ok(mut meta) = serde_json::from_str::<ItemMeta>(&content) {
                            meta.archived = true;
                            items.push(meta);
                        }
                    }
                }
            }
        }
    }

    Ok(items)
}

#[tauri::command]
pub fn get_item_content(project_path: String, item_id: String) -> Result<String, String> {
    let item_dir = find_item_in_project(&project_path, &item_id)
        .ok_or("事项不存在")?;

    let content_path = item_dir.join("content.md");
    if !content_path.exists() {
        return Ok(String::new());
    }

    fs::read_to_string(&content_path)
        .map_err(|e| format!("读取内容失败: {}", e))
}

#[tauri::command]
pub fn save_item_content(project_path: String, item_id: String, content: String) -> Result<(), String> {
    let item_dir = find_item_in_project(&project_path, &item_id)
        .ok_or("事项不存在")?;

    fs::write(item_dir.join("content.md"), &content)
        .map_err(|e| format!("保存内容失败: {}", e))?;

    // 更新 meta.json 的 updatedAt
    let meta_path = item_dir.join("meta.json");
    if let Ok(meta_content) = fs::read_to_string(&meta_path) {
        if let Ok(mut meta) = serde_json::from_str::<ItemMeta>(&meta_content) {
            meta.updated_at = Utc::now();
            let json = serde_json::to_string_pretty(&meta)
                .map_err(|e| format!("序列化 meta 失败: {}", e))?;
            fs::write(&meta_path, json)
                .map_err(|e| format!("更新 meta.json 失败: {}", e))?;
        }
    }

    Ok(())
}

#[tauri::command]
pub fn update_item_meta(project_path: String, item_id: String, title: Option<String>, tags: Option<Vec<String>>) -> Result<(), String> {
    let item_dir = find_item_in_project(&project_path, &item_id)
        .ok_or("事项不存在")?;

    let meta_path = item_dir.join("meta.json");
    let meta_content = fs::read_to_string(&meta_path)
        .map_err(|e| format!("读取 meta 失败: {}", e))?;
    let mut meta: ItemMeta = serde_json::from_str(&meta_content)
        .map_err(|e| format!("解析 meta 失败: {}", e))?;

    if let Some(t) = title {
        meta.title = t;
    }
    if let Some(tags) = tags {
        meta.tags = tags;
    }
    meta.updated_at = Utc::now();

    let json = serde_json::to_string_pretty(&meta)
        .map_err(|e| format!("序列化失败: {}", e))?;
    fs::write(&meta_path, json)
        .map_err(|e| format!("写入 meta 失败: {}", e))?;

    Ok(())
}

#[tauri::command]
pub fn complete_item(project_path: String, item_id: String) -> Result<(), String> {
    let src_dir = find_item_dir(&items_dir(&project_path), &item_id)
        .ok_or("事项不存在")?;

    let dest_base = archive_dir(&project_path);
    fs::create_dir_all(&dest_base)
        .map_err(|e| format!("创建 archive 目录失败: {}", e))?;

    let dir_name = src_dir.file_name().unwrap().to_string_lossy().to_string();
    let dest_dir = dest_base.join(&dir_name);

    if dest_dir.exists() {
        fs::remove_dir_all(&dest_dir)
            .map_err(|e| format!("清理已有归档条目失败: {}", e))?;
    }

    // 更新 meta
    let meta_path = src_dir.join("meta.json");
    if let Ok(content) = fs::read_to_string(&meta_path) {
        if let Ok(mut meta) = serde_json::from_str::<ItemMeta>(&content) {
            meta.completed = true;
            meta.archived = true;
            meta.updated_at = Utc::now();
            let json = serde_json::to_string_pretty(&meta)
                .map_err(|e| format!("序列化 meta 失败: {}", e))?;
            fs::write(&meta_path, json)
                .map_err(|e| format!("更新 meta 失败: {}", e))?;
        }
    }

    fs::rename(&src_dir, &dest_dir)
        .map_err(|e| format!("移动事项失败: {}", e))?;

    Ok(())
}

#[tauri::command]
pub fn uncomplete_item(project_path: String, item_id: String) -> Result<(), String> {
    let src_dir = find_item_dir(&archive_dir(&project_path), &item_id)
        .ok_or("事项不存在")?;

    let dest_base = items_dir(&project_path);
    fs::create_dir_all(&dest_base)
        .map_err(|e| format!("创建 items 目录失败: {}", e))?;

    let dir_name = src_dir.file_name().unwrap().to_string_lossy().to_string();
    let dest_dir = dest_base.join(&dir_name);

    if dest_dir.exists() {
        fs::remove_dir_all(&dest_dir)
            .map_err(|e| format!("清理已有条目失败: {}", e))?;
    }

    // 更新 meta
    let meta_path = src_dir.join("meta.json");
    if let Ok(content) = fs::read_to_string(&meta_path) {
        if let Ok(mut meta) = serde_json::from_str::<ItemMeta>(&content) {
            meta.completed = false;
            meta.archived = false;
            meta.updated_at = Utc::now();
            let json = serde_json::to_string_pretty(&meta)
                .map_err(|e| format!("序列化 meta 失败: {}", e))?;
            fs::write(&meta_path, json)
                .map_err(|e| format!("更新 meta 失败: {}", e))?;
        }
    }

    fs::rename(&src_dir, &dest_dir)
        .map_err(|e| format!("移动事项失败: {}", e))?;

    Ok(())
}

#[tauri::command]
pub fn delete_item(project_path: String, item_id: String) -> Result<(), String> {
    let item_dir = find_item_in_project(&project_path, &item_id)
        .ok_or("事项不存在")?;

    fs::remove_dir_all(&item_dir)
        .map_err(|e| format!("删除事项失败: {}", e))?;

    Ok(())
}
