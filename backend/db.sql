-- CREATE TABLES

CREATE TABLE users (
    user_id       TEXT PRIMARY KEY,
    name          TEXT NOT NULL,
    email         TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    profile_picture TEXT,
    user_role     TEXT NOT NULL DEFAULT 'user',
    created_at    TEXT NOT NULL,
    updated_at    TEXT NOT NULL
);

CREATE TABLE projects (
    project_id  TEXT PRIMARY KEY,
    title       TEXT NOT NULL,
    description TEXT,
    due_date    TEXT,
    creator_id  TEXT NOT NULL,
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL,
    FOREIGN KEY (creator_id) REFERENCES users(user_id)
);

CREATE TABLE tasks (
    task_id     TEXT PRIMARY KEY,
    title       TEXT NOT NULL,
    description TEXT,
    due_date    TEXT,
    priority    TEXT NOT NULL DEFAULT 'medium',
    status      TEXT NOT NULL DEFAULT 'pending',
    creator_id  TEXT NOT NULL,
    project_id  TEXT,
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL,
    FOREIGN KEY (creator_id) REFERENCES users(user_id),
    FOREIGN KEY (project_id) REFERENCES projects(project_id)
);

CREATE TABLE subtasks (
    subtask_id  TEXT PRIMARY KEY,
    task_id     TEXT NOT NULL,
    title       TEXT NOT NULL,
    is_completed BOOLEAN NOT NULL DEFAULT false,
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL,
    FOREIGN KEY (task_id) REFERENCES tasks(task_id)
);

CREATE TABLE task_comments (
    comment_id   TEXT PRIMARY KEY,
    task_id      TEXT NOT NULL,
    user_id      TEXT NOT NULL,
    comment_text TEXT NOT NULL,
    created_at   TEXT NOT NULL,
    FOREIGN KEY (task_id) REFERENCES tasks(task_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

CREATE TABLE task_assignees (
    record_id   TEXT PRIMARY KEY,
    task_id     TEXT NOT NULL,
    user_id     TEXT NOT NULL,
    assigned_at TEXT NOT NULL,
    FOREIGN KEY (task_id) REFERENCES tasks(task_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

CREATE TABLE labels (
    label_id   TEXT PRIMARY KEY,
    label_name TEXT NOT NULL UNIQUE
);

CREATE TABLE task_labels (
    record_id TEXT PRIMARY KEY,
    task_id   TEXT NOT NULL,
    label_id  TEXT NOT NULL,
    FOREIGN KEY (task_id) REFERENCES tasks(task_id),
    FOREIGN KEY (label_id) REFERENCES labels(label_id)
);

CREATE TABLE notifications (
    notification_id  TEXT PRIMARY KEY,
    user_id          TEXT NOT NULL,
    notification_type TEXT NOT NULL,
    task_id          TEXT,
    message          TEXT NOT NULL,
    is_read          BOOLEAN NOT NULL DEFAULT false,
    created_at       TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (task_id) REFERENCES tasks(task_id)
);

-- SEED DATA

-- Insert users
INSERT INTO users (user_id, name, email, password_hash, profile_picture, user_role, created_at, updated_at) VALUES
('user1', 'Alice Johnson', 'alice@example.com', 'hashed_password_alice', 'https://picsum.photos/seed/alice/200', 'user', '2023-10-01 10:00:00', '2023-10-01 10:00:00'),
('user2', 'Bob Smith', 'bob@example.com', 'hashed_password_bob', 'https://picsum.photos/seed/bob/200', 'manager', '2023-10-01 10:05:00', '2023-10-01 10:05:00'),
('user3', 'Cindy Lee', 'cindy@example.com', 'hashed_password_cindy', 'https://picsum.photos/seed/cindy/200', 'user', '2023-10-01 10:10:00', '2023-10-01 10:10:00');

-- Insert projects
INSERT INTO projects (project_id, title, description, due_date, creator_id, created_at, updated_at) VALUES
('project1', 'Website Redesign', 'Revamp the company website', '2023-11-30', 'user2', '2023-10-01 11:00:00', '2023-10-01 11:00:00'),
('project2', 'Mobile App Launch', 'Develop and launch the new mobile app', '2023-12-15', 'user2', '2023-10-01 11:05:00', '2023-10-01 11:05:00');

-- Insert tasks
INSERT INTO tasks (task_id, title, description, due_date, priority, status, creator_id, project_id, created_at, updated_at) VALUES
('task1', 'Create wireframes', 'Design initial wireframes for the website redesign', '2023-10-15', 'high', 'in_progress', 'user1', 'project1', '2023-10-02 09:00:00', '2023-10-02 09:30:00'),
('task2', 'Set up project repository', 'Initialize git repo for mobile app project', '2023-10-12', 'medium', 'pending', 'user2', 'project2', '2023-10-02 10:00:00', '2023-10-02 10:10:00'),
('task3', 'Write unit tests', 'Implement tests for new features', '2023-10-20', 'low', 'pending', 'user3', NULL, '2023-10-02 10:30:00', '2023-10-02 10:30:00'),
('task4', 'Deploy to staging', 'Deploy current build to staging environment', '2023-10-18', 'medium', 'in_progress', 'user2', 'project1', '2023-10-02 11:00:00', '2023-10-02 11:15:00');

-- Insert subtasks
INSERT INTO subtasks (subtask_id, task_id, title, is_completed, created_at, updated_at) VALUES
('subtask1', 'task1', 'Sketch layout', false, '2023-10-03 08:00:00', '2023-10-03 08:00:00'),
('subtask2', 'task1', 'Review with team', false, '2023-10-03 08:10:00', '2023-10-03 08:10:00'),
('subtask3', 'task2', 'Set up CI/CD pipeline', false, '2023-10-03 09:00:00', '2023-10-03 09:00:00'),
('subtask4', 'task4', 'Prepare environment variables', true, '2023-10-03 09:30:00', '2023-10-03 09:45:00');

-- Insert task comments
INSERT INTO task_comments (comment_id, task_id, user_id, comment_text, created_at) VALUES
('comment1', 'task1', 'user2', 'Looks good, please also consider mobile layout.', '2023-10-04 10:00:00'),
('comment2', 'task1', 'user3', 'I can provide some input on colors.', '2023-10-04 10:05:00'),
('comment3', 'task2', 'user1', 'Repo initialized. Ready for push.', '2023-10-04 11:00:00'),
('comment4', 'task4', 'user2', 'Staging deployment scheduled for today.', '2023-10-04 11:30:00');

-- Insert task assignees
INSERT INTO task_assignees (record_id, task_id, user_id, assigned_at) VALUES
('ta1', 'task1', 'user2', '2023-10-04 12:00:00'),
('ta2', 'task1', 'user3', '2023-10-04 12:05:00'),
('ta3', 'task2', 'user1', '2023-10-04 12:10:00'),
('ta4', 'task3', 'user3', '2023-10-04 12:15:00'),
('ta5', 'task4', 'user1', '2023-10-04 12:20:00'),
('ta6', 'task4', 'user2', '2023-10-04 12:25:00');

-- Insert labels
INSERT INTO labels (label_id, label_name) VALUES
('label1', 'urgent'),
('label2', 'feature'),
('label3', 'bug'),
('label4', 'research');

-- Insert task labels
INSERT INTO task_labels (record_id, task_id, label_id) VALUES
('tl1', 'task1', 'label1'),
('tl2', 'task1', 'label4'),
('tl3', 'task2', 'label2'),
('tl4', 'task3', 'label3'),
('tl5', 'task4', 'label2'),
('tl6', 'task4', 'label1');

-- Insert notifications
INSERT INTO notifications (notification_id, user_id, notification_type, task_id, message, is_read, created_at) VALUES
('notif1', 'user2', 'assignment', 'task1', 'You have been assigned to task "Create wireframes".', false, '2023-10-05 08:00:00'),
('notif2', 'user3', 'comment', 'task1', 'A comment has been added to "Create wireframes".', false, '2023-10-05 08:05:00'),
('notif3', 'user1', 'status_change', 'task2', 'Task "Set up project repository" status updated.', false, '2023-10-05 08:10:00'),
('notif4', 'user2', 'assignment', 'task4', 'You have been assigned to task "Deploy to staging".', true, '2023-10-05 08:15:00'),
('notif5', 'user1', 'general', NULL, 'System maintenance scheduled for tonight.', false, '2023-10-05 08:20:00');