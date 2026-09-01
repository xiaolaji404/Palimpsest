use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ItemMeta {
    pub id: String,
    pub title: String,
    pub completed: bool,
    pub archived: bool,
    pub tags: Vec<String>,
    #[serde(rename = "createdAt")]
    pub created_at: DateTime<Utc>,
    #[serde(rename = "updatedAt")]
    pub updated_at: DateTime<Utc>,
}

impl ItemMeta {
    pub fn new(title: String, tags: Vec<String>) -> Self {
        let now = Utc::now();
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            title,
            completed: false,
            archived: false,
            tags,
            created_at: now,
            updated_at: now,
        }
    }
}
