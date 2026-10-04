-- AI プロンプト作成: ユーザーが登録する LLM プロバイダー（OpenAI 互換エンドポイント）
CREATE TABLE IF NOT EXISTS ai_providers (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    base_url    TEXT NOT NULL,
    api_key     TEXT NOT NULL DEFAULT '',
    model       TEXT NOT NULL,
    json_mode   INTEGER NOT NULL DEFAULT 1,
    sort_order  INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL
);
