mod models;
mod commands;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            app.handle().plugin(tauri_plugin_dialog::init())?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // 项目
            commands::project::create_project,
            commands::project::open_project,
            commands::project::list_recent_projects,
            // 事项
            commands::item::create_item,
            commands::item::list_items,
            commands::item::get_item_content,
            commands::item::save_item_content,
            commands::item::update_item_meta,
            commands::item::complete_item,
            commands::item::uncomplete_item,
            commands::item::delete_item,
            // 配置
            commands::config::get_config,
            commands::config::save_config,
            commands::config::save_recent_project,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
