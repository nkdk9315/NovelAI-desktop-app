-- Main ジャンル: メインプロンプト用のデフォルトグループを収めるためのシステムジャンル
INSERT OR IGNORE INTO genres (id, name, is_system, sort_order, icon, color) VALUES
    ('genre-main', 'メイン', 1, -1, 'star', '#f59e0b');
