// server.mjs

// Import required modules and configure environment
import express from "express";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
import http from "http";
import { Server as SocketIOServer } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";
import pkg from "pg";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";

// Load environment variables from .env file
dotenv.config();

// Destructure Postgres Pool from pg package and configure db connection using provided snippet.
const { Pool } = pkg;
const { DATABASE_URL, PGHOST, PGDATABASE, PGUSER, PGPASSWORD, PGPORT = 5432, NODE_ENV } = process.env;
const isProduction = NODE_ENV === 'production';

const pool = new Pool(
  DATABASE_URL
    ? { 
        connectionString: DATABASE_URL, 
        ssl: isProduction ? { require: true, rejectUnauthorized: false } : false 
      }
    : {
        host: PGHOST,
        database: PGDATABASE,
        user: PGUSER,
        password: PGPASSWORD,
        port: Number(PGPORT),
        ssl: isProduction ? { require: true, rejectUnauthorized: false } : false,
      }
);
/*
  The pool allows us to connect and perform queries on the Postgres DB.
*/

// Initialize the express app and http server
const app = express();
const server = http.createServer(app);

// Setup Socket.IO for realtime websocket communication with CORS enabled.
const io = new SocketIOServer(server, {
  cors: {
    origin: "*",
  },
});

// Morgan middleware to log incoming requests with sanitized body to avoid logging sensitive data
app.use(morgan((tokens, req, res) => {
  const safeBody = { ...req.body };
  if (safeBody.password) safeBody.password = "[REDACTED]";
  return [
    tokens.method(req, res),
    tokens.url(req, res),
    "headers:" + JSON.stringify(req.headers),
    "query:" + JSON.stringify(req.query),
    "body:" + JSON.stringify(safeBody),
    tokens.status(req, res),
    tokens["response-time"](req, res) + " ms"
  ].join(" | ");
}));

// Enable CORS and JSON body parser middleware.
app.use(cors());
app.use(express.json());

// JWT secret from env
const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret";

// =============================================================================
// JWT Authentication Middleware for Express REST API endpoints
// =============================================================================
/*
  This middleware extracts the token from the Authorization header,
  verifies it, and stores the decoded payload in req.user.
*/
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  // Expected format: "Bearer <token>"
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Token missing" });
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: "Invalid token" });
    req.user = user; // contains user_id, email, name, user_role, etc.
    next();
  });
}

// =============================================================================
// Websocket Authentication Middleware for Socket.IO Connections
// =============================================================================
/*
  This middleware ensures that each socket connection provides a valid JWT.
  The token is expected to be sent in socket.handshake.auth.token.
*/
io.use((socket, next) => {
  const token = socket.handshake.auth.token || socket.handshake.query.token;
  if (!token) {
    return next(new Error("Authentication error: Token missing"));
  }
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return next(new Error("Authentication error: Invalid token"));
    socket.user = user; // assign the decoded token data to socket.user
    next();
  });
});

// Listen for new socket.io connections
io.on("connection", (socket) => {
  console.log("New websocket connection, user:", socket.user.user_id);
  
  // Optionally handle socket events if needed.
  socket.on("disconnect", () => {
    console.log("Socket disconnected:", socket.user.user_id);
  });
});

// =============================================================================
// REST API Endpoints
// =============================================================================

// ------------------
// Auth Routes
// ------------------

/*
  POST /api/auth/register
  Handles user registration:
    - Validates input fields.
    - Checks if email is already used.
    - Hashes the password.
    - Inserts a new record into the users table.
    - Generates and returns a JWT token along with user details.
*/
app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, password, profile_picture } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email, and password are required" });
    }
    // Check if email already exists
    const existingUser = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ message: "Email already in use" });
    }
    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);
    const user_id = uuidv4();
    const timestamp = new Date().toISOString();
    const user_role = "user"; // default role

    // Insert new user into the database
    await pool.query(
      `INSERT INTO users (user_id, name, email, password_hash, profile_picture, user_role, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [user_id, name, email, hashedPassword, profile_picture || null, user_role, timestamp, timestamp]
    );

    // Generate JWT token for the new user
    const token = jwt.sign({ user_id, email, name, user_role }, JWT_SECRET, { expiresIn: "1d" });
    res.status(201).json({
      message: "Registration successful",
      token,
      user: { user_id, name, email, user_role }
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

/*
  POST /api/auth/login
  Authenticates the user:
    - Retrieves user record by email.
    - Compares provided password with stored hash.
    - Returns a JWT token and user details upon successful login.
*/
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    if (result.rows.length === 0) {
      return res.status(400).json({ message: "Invalid credentials" });
    }
    const user = result.rows[0];
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(400).json({ message: "Invalid credentials" });
    }
    const token = jwt.sign(
      { user_id: user.user_id, email: user.email, name: user.name, user_role: user.user_role },
      JWT_SECRET,
      { expiresIn: "1d" }
    );
    res.json({
      message: "Login successful",
      token,
      user: {
        user_id: user.user_id,
        name: user.name,
        email: user.email,
        user_role: user.user_role
      }
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// ------------------
// User Profile Routes
// ------------------

/*
  GET /api/users/profile
  Retrieves profile of the authenticated user from the users table.
*/
app.get("/api/users/profile", authenticateToken, async (req, res) => {
  try {
    const { user_id } = req.user;
    const result = await pool.query("SELECT user_id, name, email, profile_picture, user_role FROM users WHERE user_id = $1", [user_id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json({ user: result.rows[0] });
  } catch (error) {
    console.error("Fetch profile error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

/*
  PUT /api/users/profile
  Updates the authenticated user’s profile:
    - Accepts new name, email, and/or profile_picture.
    - Updates the record in the users table with a new updated_at timestamp.
*/
app.put("/api/users/profile", authenticateToken, async (req, res) => {
  try {
    const { name, email, profile_picture } = req.body;
    const { user_id } = req.user;
    if (!name || !email) {
      return res.status(400).json({ message: "Name and email are required" });
    }
    const timestamp = new Date().toISOString();
    await pool.query(
      `UPDATE users SET name = $1, email = $2, profile_picture = $3, updated_at = $4 WHERE user_id = $5`,
      [name, email, profile_picture || null, timestamp, user_id]
    );
    const result = await pool.query("SELECT user_id, name, email, profile_picture, user_role FROM users WHERE user_id = $1", [user_id]);
    res.json({ message: "Profile updated", user: result.rows[0] });
  } catch (error) {
    console.error("Profile update error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// ------------------
// Dashboard Route
// ------------------

/*
  GET /api/dashboard
  Retrieves aggregated dashboard data:
  - Task statistics (total, pending, in_progress, completed) for the authenticated user.
  - Upcoming deadlines for tasks.
*/
app.get("/api/dashboard", authenticateToken, async (req, res) => {
  try {
    const { user_id } = req.user;
    // Query task counts by status (tasks created by the user or assigned to the user)
    const statsQuery = `
      SELECT 
        COUNT(*) FILTER (WHERE status = 'pending') AS pending,
        COUNT(*) FILTER (WHERE status = 'in_progress') AS in_progress,
        COUNT(*) FILTER (WHERE status = 'completed') AS completed,
        COUNT(*) AS total_tasks
      FROM tasks
      WHERE creator_id = $1
    `;
    const statsResult = await pool.query(statsQuery, [user_id]);
    const statistics = statsResult.rows[0];

    // Query upcoming deadlines (for tasks with non-null due_date, ordered ascending)
    const deadlineQuery = `
      SELECT task_id, title, due_date FROM tasks
      WHERE creator_id = $1 AND due_date IS NOT NULL
      ORDER BY due_date ASC
      LIMIT 5
    `;
    const deadlineResult = await pool.query(deadlineQuery, [user_id]);
    const upcoming_deadlines = deadlineResult.rows;

    res.json({ statistics, upcoming_deadlines });
  } catch (error) {
    console.error("Dashboard error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// ------------------
// Task Routes
// ------------------

/*
  POST /api/tasks
  Creates a new task:
    - Inserts a record in the tasks table with generated task_id and timestamps.
    - Optionally inserts subtasks, assignees, and label associations.
    - Emits a "task_created" websocket event with task details.
*/
app.post("/api/tasks", authenticateToken, async (req, res) => {
  try {
    const {
      title,
      description,
      due_date,
      priority = "medium",
      status = "pending",
      project_id,
      assignees = [],
      labels = [],
      subtasks = []
    } = req.body;
    if (!title) {
      return res.status(400).json({ message: "Title is required" });
    }
    // Validate subtasks: each must have a title
    if (subtasks && subtasks.length > 0 && !subtasks.every(st => st.title)) {
      return res.status(400).json({ message: "Each subtask must have a title" });
    }
    const task_id = uuidv4();
    const { user_id } = req.user;
    const timestamp = new Date().toISOString();
    // Insert task into tasks table
    await pool.query(
      `INSERT INTO tasks 
       (task_id, title, description, due_date, priority, status, creator_id, project_id, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [task_id, title, description || null, due_date || null, priority, status, user_id, project_id || null, timestamp, timestamp]
    );
    // Insert subtasks if provided
    for (const subtask of subtasks) {
      const subtask_id = uuidv4();
      await pool.query(
        `INSERT INTO subtasks (subtask_id, task_id, title, is_completed, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [subtask_id, task_id, subtask.title, false, timestamp, timestamp]
      );
    }
    // Insert task assignees if provided
    for (const assigned_user_id of assignees) {
      const record_id = uuidv4();
      await pool.query(
        `INSERT INTO task_assignees (record_id, task_id, user_id, assigned_at)
         VALUES ($1, $2, $3, $4)`,
        [record_id, task_id, assigned_user_id, timestamp]
      );
    }
    // Insert task labels if provided
    for (const label_id of labels) {
      const record_id = uuidv4();
      await pool.query(
        `INSERT INTO task_labels (record_id, task_id, label_id)
         VALUES ($1, $2, $3)`,
        [record_id, task_id, label_id]
      );
    }
    // Emit websocket event for new task creation
    const taskCreatedPayload = {
      task_id,
      title,
      status,
      due_date: due_date || null,
      creator_id: user_id
    };
    io.emit("task_created", { event: "task_created", data: taskCreatedPayload });
    res.status(201).json({ message: "Task created", task: taskCreatedPayload });
  } catch (error) {
    console.error("Task creation error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

/*
  GET /api/tasks
  Retrieves a list of tasks for the authenticated user.
    - Supports optional filtering by status via query parameters.
    - Aggregates assignees and labels as arrays for each task.
*/
app.get("/api/tasks", authenticateToken, async (req, res) => {
  try {
    const { user_id } = req.user;
    const { status } = req.query;
    // Base query: tasks where the user is the creator or is assigned to the task.
    let baseQuery = `
      SELECT 
        t.*, 
        (SELECT COALESCE(json_agg(ta.user_id), '[]'::json) FROM task_assignees ta WHERE ta.task_id = t.task_id) AS assignees,
        (SELECT COALESCE(json_agg(tl.label_id), '[]'::json) FROM task_labels tl WHERE tl.task_id = t.task_id) AS labels
      FROM tasks t
      WHERE t.creator_id = $1 
         OR t.task_id IN (SELECT task_id FROM task_assignees WHERE user_id = $1)
    `;
    const params = [user_id];
    if (status) {
      baseQuery += " AND t.status = $2";
      params.push(status);
    }
    const tasksResult = await pool.query(baseQuery, params);
    res.json({ tasks: tasksResult.rows });
  } catch (error) {
    console.error("Fetching tasks error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

/*
  GET /api/tasks/:task_id
  Retrieves full details for a specific task:
    - Fetch task record, subtasks, comments, assignees (with user details), and labels.
*/
app.get("/api/tasks/:task_id", authenticateToken, async (req, res) => {
  try {
    const { task_id } = req.params;
    // Fetch basic task details
    const taskResult = await pool.query("SELECT * FROM tasks WHERE task_id = $1", [task_id]);
    if (taskResult.rows.length === 0) {
      return res.status(404).json({ message: "Task not found" });
    }
    const task = taskResult.rows[0];
    // Fetch subtasks
    const subtasksResult = await pool.query("SELECT subtask_id, title, is_completed FROM subtasks WHERE task_id = $1", [task_id]);
    // Fetch comments
    const commentsResult = await pool.query("SELECT comment_id, user_id, comment_text, created_at FROM task_comments WHERE task_id = $1 ORDER BY created_at ASC", [task_id]);
    // Fetch assignees with basic user info
    const assigneesResult = await pool.query(
      `SELECT u.user_id, u.name 
       FROM task_assignees ta 
       JOIN users u ON ta.user_id = u.user_id 
       WHERE ta.task_id = $1`,
      [task_id]
    );
    // Fetch labels
    const labelsResult = await pool.query("SELECT label_id FROM task_labels WHERE task_id = $1", [task_id]);
    res.json({
      task: {
        ...task,
        subtasks: subtasksResult.rows,
        comments: commentsResult.rows,
        assignees: assigneesResult.rows,
        labels: labelsResult.rows.map(row => row.label_id)
      }
    });
  } catch (error) {
    console.error("Fetching task details error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

/*
  PUT /api/tasks/:task_id
  Updates an existing task’s details:
    - Accepts fields similar to task creation.
    - Updates the main tasks table and refreshes the updated_at timestamp.
    - Emits a "task_updated" websocket event.
*/
app.put("/api/tasks/:task_id", authenticateToken, async (req, res) => {
  try {
    const { task_id } = req.params;
    const existingTaskResult = await pool.query("SELECT * FROM tasks WHERE task_id = $1", [task_id]);
    if (existingTaskResult.rows.length === 0) {
      return res.status(404).json({ message: "Task not found" });
    }
    if (existingTaskResult.rows[0].creator_id !== req.user.user_id) {
      return res.status(403).json({ message: "Unauthorized: Only the task creator can update the task" });
    }
    const { title, description, due_date, priority, status, project_id } = req.body;
    const timestamp = new Date().toISOString();
    const fields = [];
    const values = [];
    let idx = 1;
    if (title) { fields.push(`title = $${idx++}`); values.push(title); }
    if (description !== undefined) { fields.push(`description = $${idx++}`); values.push(description); }
    if (due_date !== undefined) { fields.push(`due_date = $${idx++}`); values.push(due_date); }
    if (priority) { fields.push(`priority = $${idx++}`); values.push(priority); }
    if (status) { fields.push(`status = $${idx++}`); values.push(status); }
    if (project_id !== undefined) { fields.push(`project_id = $${idx++}`); values.push(project_id); }
    fields.push(`updated_at = $${idx++}`);
    values.push(timestamp);
    values.push(task_id);
    const updateQuery = `UPDATE tasks SET ${fields.join(", ")} WHERE task_id = $${idx} RETURNING *`;
    const updateResult = await pool.query(updateQuery, values);
    const updatedTask = updateResult.rows[0];
    const updatedFields = { status, priority, due_date };
    const payload = {
      task_id,
      updated_fields: updatedFields,
      updated_at: timestamp
    };
    io.emit("task_updated", { event: "task_updated", data: payload });
    res.json({ message: "Task updated", task: updatedTask });
  } catch (error) {
    console.error("Task update error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

/*
  DELETE /api/tasks/:task_id
  Deletes a task:
    - Removes the task record and related records (subtasks, comments, assignees, labels).
    - Emits a "task_deleted" websocket event.
*/
app.delete("/api/tasks/:task_id", authenticateToken, async (req, res) => {
  try {
    const { task_id } = req.params;
    const existingTaskResult = await pool.query("SELECT * FROM tasks WHERE task_id = $1", [task_id]);
    if (existingTaskResult.rows.length === 0) {
      return res.status(404).json({ message: "Task not found" });
    }
    if (existingTaskResult.rows[0].creator_id !== req.user.user_id) {
      return res.status(403).json({ message: "Unauthorized: Only the task creator can delete the task" });
    }
    await pool.query("DELETE FROM subtasks WHERE task_id = $1", [task_id]);
    await pool.query("DELETE FROM task_comments WHERE task_id = $1", [task_id]);
    await pool.query("DELETE FROM task_assignees WHERE task_id = $1", [task_id]);
    await pool.query("DELETE FROM task_labels WHERE task_id = $1", [task_id]);
    await pool.query("DELETE FROM tasks WHERE task_id = $1", [task_id]);
    io.emit("task_deleted", { event: "task_deleted", data: { task_id } });
    res.json({ message: "Task deleted successfully" });
  } catch (error) {
    console.error("Task deletion error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

/*
  POST /api/tasks/:task_id/comments
  Adds a new comment to a specified task:
    - Inserts a new record into the task_comments table with generated comment_id.
    - Emits a "new_comment" websocket event.
*/
app.post("/api/tasks/:task_id/comments", authenticateToken, async (req, res) => {
  try {
    const { task_id } = req.params;
    const { comment_text } = req.body;
    if (!comment_text) {
      return res.status(400).json({ message: "Comment text is required" });
    }
    const comment_id = uuidv4();
    const { user_id } = req.user;
    const timestamp = new Date().toISOString();
    await pool.query(
      `INSERT INTO task_comments (comment_id, task_id, user_id, comment_text, created_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [comment_id, task_id, user_id, comment_text, timestamp]
    );
    const commentPayload = { comment_id, task_id, user_id, comment_text, created_at: timestamp };
    io.emit("new_comment", { event: "new_comment", data: commentPayload });
    res.status(201).json({ message: "Comment added", comment: commentPayload });
  } catch (error) {
    console.error("Adding comment error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// ------------------
// Notification Routes
// ------------------

/*
  GET /api/notifications
  Retrieves all notifications for the authenticated user.
*/
app.get("/api/notifications", authenticateToken, async (req, res) => {
  try {
    const { user_id } = req.user;
    const notificationsResult = await pool.query(
      "SELECT notification_id, notification_type, task_id, message, is_read, created_at FROM notifications WHERE user_id = $1 ORDER BY created_at DESC",
      [user_id]
    );
    res.json({ notifications: notificationsResult.rows });
  } catch (error) {
    console.error("Fetching notifications error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

/*
  PUT /api/notifications/:notification_id
  Updates a notification (e.g. marking as read):
    - Accepts a JSON payload with { is_read: boolean }.
*/
app.put("/api/notifications/:notification_id", authenticateToken, async (req, res) => {
  try {
    const { notification_id } = req.params;
    const { is_read } = req.body;
    const notifResult = await pool.query("SELECT * FROM notifications WHERE notification_id = $1", [notification_id]);
    if (notifResult.rows.length === 0) {
      return res.status(404).json({ message: "Notification not found" });
    }
    if (notifResult.rows[0].user_id !== req.user.user_id) {
      return res.status(403).json({ message: "Unauthorized: Cannot update this notification" });
    }
    await pool.query("UPDATE notifications SET is_read = $1 WHERE notification_id = $2", [is_read, notification_id]);
    res.json({ message: "Notification updated" });
  } catch (error) {
    console.error("Notification update error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// ------------------
// Project Routes
// ------------------

/*
  POST /api/projects
  Creates a new project:
    - Inserts a new record into the projects table with generated project_id.
*/
app.post("/api/projects", authenticateToken, async (req, res) => {
  try {
    const { title, description, due_date } = req.body;
    if (!title) {
      return res.status(400).json({ message: "Project title is required" });
    }
    const project_id = uuidv4();
    const { user_id } = req.user;
    const timestamp = new Date().toISOString();
    await pool.query(
      `INSERT INTO projects (project_id, title, description, due_date, creator_id, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [project_id, title, description || null, due_date || null, user_id, timestamp, timestamp]
    );
    res.status(201).json({
      message: "Project created",
      project: { project_id, title, description, due_date }
    });
  } catch (error) {
    console.error("Project creation error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

/*
  GET /api/projects/:project_id
  Retrieves project details along with associated tasks.
*/
app.get("/api/projects/:project_id", authenticateToken, async (req, res) => {
  try {
    const { project_id } = req.params;
    const projectResult = await pool.query("SELECT * FROM projects WHERE project_id = $1", [project_id]);
    if (projectResult.rows.length === 0) {
      return res.status(404).json({ message: "Project not found" });
    }
    const project = projectResult.rows[0];
    const tasksResult = await pool.query("SELECT task_id, title, status, due_date FROM tasks WHERE project_id = $1", [project_id]);
    project.tasks = tasksResult.rows;
    res.json({ project });
  } catch (error) {
    console.error("Fetching project error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// ------------------
// Labels Route
// ------------------

/*
  GET /api/labels
  Retrieves the list of available task labels from the labels table.
*/
app.get("/api/labels", async (req, res) => {
  try {
    const labelsResult = await pool.query("SELECT label_id, label_name FROM labels");
    res.json({ labels: labelsResult.rows });
  } catch (error) {
    console.error("Fetching labels error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// =============================================================================
// Serve Static Files and SPA Fallback
// =============================================================================

// ESM workaround for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, "public")));

// Catch-all route for SPA routing
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// =============================================================================
// Start the HTTP and WebSocket Server
// =============================================================================

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});