
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = 3000;
const JWT_SECRET = 'your-secret-key-change-in-production';
const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const SUBJECTS_FILE = path.join(DATA_DIR, 'subjects.json');
const SCHEDULES_FILE = path.join(DATA_DIR, 'schedules.json');
const PROGRESS_FILE = path.join(DATA_DIR, 'progress.json');
const TASKS_FILE = path.join(DATA_DIR, 'tasks.json');

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// Initialize data directory and files
async function initializeData() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    
    const files = [
      { path: USERS_FILE, default: [] },
      { path: SUBJECTS_FILE, default: {} },
      { path: SCHEDULES_FILE, default: {} },
      { path: PROGRESS_FILE, default: {} },
      { path: TASKS_FILE, default: {} }
    ];
    
    for (const file of files) {
      try {
        await fs.access(file.path);
      } catch {
        await fs.writeFile(file.path, JSON.stringify(file.default, null, 2));
      }
    }
  } catch (error) {
    console.error('Error initializing data:', error);
  }
}

// Authentication middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
}

// Helper functions for file operations
async function readJSON(filePath) {
  try {
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return null;
  }
}

async function writeJSON(filePath, data) {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}

// Auth Routes
app.post('/api/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const users = await readJSON(USERS_FILE) || [];
    
    if (users.find(u => u.username === username || u.email === email)) {
      return res.status(400).json({ error: 'Username or email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
      id: Date.now().toString(),
      username,
      email,
      password: hashedPassword,
      createdAt: new Date().toISOString()
    };

    users.push(newUser);
    await writeJSON(USERS_FILE, users);

    const token = jwt.sign({ id: newUser.id, username: newUser.username }, JWT_SECRET);
    res.json({ token, user: { id: newUser.id, username: newUser.username, email: newUser.email } });
  } catch (error) {
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const users = await readJSON(USERS_FILE) || [];
    const user = users.find(u => u.username === username);

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET);
    res.json({ token, user: { id: user.id, username: user.username, email: user.email } });
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
});

// Simple "forgot password" (no email, for demo only)
app.post('/api/forgot-password', async (req, res) => {
  try {
    const { username, newPassword } = req.body;

    if (!username || !newPassword) {
      return res.status(400).json({ error: 'Username and new password are required' });
    }

    const users = await readJSON(USERS_FILE) || [];
    const index = users.findIndex(u => u.username === username);

    if (index === -1) {
      return res.status(404).json({ error: 'User not found' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    users[index].password = hashedPassword;
    users[index].passwordUpdatedAt = new Date().toISOString();

    await writeJSON(USERS_FILE, users);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// Subject Routes
app.get('/api/subjects', authenticateToken, async (req, res) => {
  try {
    const subjects = await readJSON(SUBJECTS_FILE) || {};
    const userSubjects = subjects[req.user.id] || [];
    res.json(userSubjects);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch subjects' });
  }
});

app.post('/api/subjects', authenticateToken, async (req, res) => {
  try {
    const { name, topics, priority, deadline, estimatedHours } = req.body;
    
    if (!name || !priority || !deadline) {
      return res.status(400).json({ error: 'Name, priority, and deadline are required' });
    }

    const subjects = await readJSON(SUBJECTS_FILE) || {};
    const userSubjects = subjects[req.user.id] || [];
    
    const newSubject = {
      id: Date.now().toString(),
      name,
      topics: topics || [],
      priority: parseInt(priority), // 1 = highest, 5 = lowest
      deadline: deadline,
      estimatedHours: parseFloat(estimatedHours) || 0,
      createdAt: new Date().toISOString()
    };

    userSubjects.push(newSubject);
    subjects[req.user.id] = userSubjects;
    await writeJSON(SUBJECTS_FILE, subjects);

    res.json(newSubject);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create subject' });
  }
});

app.put('/api/subjects/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const subjects = await readJSON(SUBJECTS_FILE) || {};
    const userSubjects = subjects[req.user.id] || [];
    
    const index = userSubjects.findIndex(s => s.id === id);
    if (index === -1) {
      return res.status(404).json({ error: 'Subject not found' });
    }

    userSubjects[index] = { ...userSubjects[index], ...req.body };
    subjects[req.user.id] = userSubjects;
    await writeJSON(SUBJECTS_FILE, subjects);

    res.json(userSubjects[index]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update subject' });
  }
});

app.delete('/api/subjects/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const subjects = await readJSON(SUBJECTS_FILE) || {};
    const userSubjects = subjects[req.user.id] || [];
    
    subjects[req.user.id] = userSubjects.filter(s => s.id !== id);
    await writeJSON(SUBJECTS_FILE, subjects);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete subject' });
  }
});

// Schedule Generation Route
app.post('/api/schedule/generate', authenticateToken, async (req, res) => {
  try {
    const { availableHours, maxSessionDuration, breakDuration, startDate } = req.body;
    
    const subjects = await readJSON(SUBJECTS_FILE) || {};
    const userSubjects = subjects[req.user.id] || [];
    
    if (userSubjects.length === 0) {
      return res.status(400).json({ error: 'No subjects found. Please add subjects first.' });
    }

    const schedule = generateSchedule(
      userSubjects,
      availableHours || 4,
      maxSessionDuration || 2,
      breakDuration || 0.5,
      startDate || new Date().toISOString()
    );

    const schedules = await readJSON(SCHEDULES_FILE) || {};
    schedules[req.user.id] = schedule;
    await writeJSON(SCHEDULES_FILE, schedules);

    res.json(schedule);
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate schedule' });
  }
});

app.get('/api/schedule', authenticateToken, async (req, res) => {
  try {
    const schedules = await readJSON(SCHEDULES_FILE) || {};
    const userSchedule = schedules[req.user.id] || null;
    res.json(userSchedule);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch schedule' });
  }
});

// Rebalance schedule based on completed sessions (push missed work forward)
app.post('/api/schedule/rebalance', authenticateToken, async (req, res) => {
  try {
    const [schedules, subjectsMap, progressMap] = await Promise.all([
      readJSON(SCHEDULES_FILE) || {},
      readJSON(SUBJECTS_FILE) || {},
      readJSON(PROGRESS_FILE) || {}
    ]);

    const existing = schedules[req.user.id];
    if (!existing || !existing.weekly) {
      return res.status(400).json({ error: 'No existing schedule to rebalance' });
    }

    const userSubjects = subjectsMap[req.user.id] || [];
    if (userSubjects.length === 0) {
      return res.status(400).json({ error: 'No subjects found. Please add subjects first.' });
    }

    const userProgress = progressMap[req.user.id] || {};

    // Compute completed hours per subject from the current schedule
    const hoursBySubject = {};
    for (const day of existing.weekly) {
      for (const session of day.sessions || []) {
        if (userProgress[session.id]?.completed) {
          hoursBySubject[session.subjectId] = (hoursBySubject[session.subjectId] || 0) + (session.duration || 0);
        }
      }
    }

    // Adjust subject hours by subtracting what is already completed
    const adjustedSubjects = userSubjects.map(subject => {
      const done = hoursBySubject[subject.id] || 0;
      const original = subject.estimatedHours || 0;
      const remaining = Math.max(0, original - done);
      return { ...subject, estimatedHours: remaining };
    }).filter(s => (s.estimatedHours || 0) > 0);

    if (adjustedSubjects.length === 0) {
      return res.status(400).json({ error: 'All scheduled study time is already completed.' });
    }

    const settings = existing.settings || {};
    const today = new Date().toISOString().split('T')[0];

    const newSchedule = generateSchedule(
      adjustedSubjects,
      settings.availableHours || 4,
      settings.maxSessionDuration || 2,
      settings.breakDuration || 0.5,
      today
    );

    schedules[req.user.id] = newSchedule;
    await writeJSON(SCHEDULES_FILE, schedules);

    res.json(newSchedule);
  } catch (error) {
    res.status(500).json({ error: 'Failed to rebalance schedule' });
  }
});

// Progress Routes
app.get('/api/progress', authenticateToken, async (req, res) => {
  try {
    const progress = await readJSON(PROGRESS_FILE) || {};
    const userProgress = progress[req.user.id] || {};
    res.json(userProgress);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch progress' });
  }
});

app.post('/api/progress', authenticateToken, async (req, res) => {
  try {
    const { sessionId, completed } = req.body;
    
    const progress = await readJSON(PROGRESS_FILE) || {};
    if (!progress[req.user.id]) {
      progress[req.user.id] = {};
    }
    
    progress[req.user.id][sessionId] = {
      completed: completed || false,
      updatedAt: new Date().toISOString()
    };
    
    await writeJSON(PROGRESS_FILE, progress);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update progress' });
  }
});

// Upcoming tasks (tests, homework, assignments, etc.)
app.get('/api/tasks', authenticateToken, async (req, res) => {
  try {
    const tasks = await readJSON(TASKS_FILE) || {};
    const userTasks = tasks[req.user.id] || [];
    res.json(userTasks);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

app.post('/api/tasks', authenticateToken, async (req, res) => {
  try {
    const { title, type, dueDate, subjectId, notes } = req.body;

    if (!title || !type || !dueDate) {
      return res.status(400).json({ error: 'Title, type, and due date are required' });
    }

    const tasks = await readJSON(TASKS_FILE) || {};
    const userTasks = tasks[req.user.id] || [];

    const newTask = {
      id: Date.now().toString(),
      title,
      type,
      dueDate,
      subjectId: subjectId || null,
      notes: notes || '',
      completed: false,
      createdAt: new Date().toISOString()
    };

    userTasks.push(newTask);
    tasks[req.user.id] = userTasks;
    await writeJSON(TASKS_FILE, tasks);

    res.json(newTask);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create task' });
  }
});

app.put('/api/tasks/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const tasks = await readJSON(TASKS_FILE) || {};
    const userTasks = tasks[req.user.id] || [];

    const index = userTasks.findIndex(t => t.id === id);
    if (index === -1) {
      return res.status(404).json({ error: 'Task not found' });
    }

    userTasks[index] = { ...userTasks[index], ...req.body, id };
    tasks[req.user.id] = userTasks;
    await writeJSON(TASKS_FILE, tasks);

    res.json(userTasks[index]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update task' });
  }
});

app.delete('/api/tasks/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const tasks = await readJSON(TASKS_FILE) || {};
    const userTasks = tasks[req.user.id] || [];

    tasks[req.user.id] = userTasks.filter(t => t.id !== id);
    await writeJSON(TASKS_FILE, tasks);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

// Rule-based Scheduling Algorithm
function generateSchedule(subjects, availableHours, maxSessionDuration, breakDuration, startDate) {
  const schedule = {
    daily: [],
    weekly: [],
    generatedAt: new Date().toISOString(),
    settings: {
      availableHours,
      maxSessionDuration,
      breakDuration
    }
  };

  // Sort subjects by priority and deadline proximity
  const sortedSubjects = [...subjects].sort((a, b) => {
    // First by priority (lower number = higher priority)
    if (a.priority !== b.priority) {
      return a.priority - b.priority;
    }
    // Then by deadline (earlier deadline first)
    return new Date(a.deadline) - new Date(b.deadline);
  });

  // Calculate total hours needed
  const totalHours = subjects.reduce((sum, s) => sum + (s.estimatedHours || 0), 0);
  const daysNeeded = Math.ceil(totalHours / availableHours);
  
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);

  // Generate weekly schedule (7 days)
  const weeklySchedule = [];
  let remainingHours = totalHours;
  let subjectIndex = 0;
  let subjectHoursRemaining = sortedSubjects.length > 0 ? sortedSubjects[0].estimatedHours || 0 : 0;

  for (let day = 0; day < 7; day++) {
    const currentDate = new Date(start);
    currentDate.setDate(start.getDate() + day);
    
    const daySchedule = {
      date: currentDate.toISOString().split('T')[0],
      sessions: [],
      totalHours: 0
    };

    let dayHoursUsed = 0;
    let currentTime = 9; // Start at 9 AM

    while (dayHoursUsed < availableHours && remainingHours > 0) {
      // Find next subject with remaining hours
      while (subjectIndex < sortedSubjects.length && subjectHoursRemaining <= 0) {
        subjectIndex++;
        if (subjectIndex < sortedSubjects.length) {
          subjectHoursRemaining = sortedSubjects[subjectIndex].estimatedHours || 0;
        }
      }

      if (subjectIndex >= sortedSubjects.length) break;

      const subject = sortedSubjects[subjectIndex];
      const sessionDuration = Math.min(
        maxSessionDuration,
        availableHours - dayHoursUsed,
        subjectHoursRemaining,
        remainingHours
      );

      if (sessionDuration > 0) {
        const session = {
          id: `${day}-${daySchedule.sessions.length}`,
          subjectId: subject.id,
          subjectName: subject.name,
          startTime: formatTime(currentTime),
          endTime: formatTime(currentTime + sessionDuration),
          duration: sessionDuration,
          topics: subject.topics || [],
          priority: subject.priority
        };

        daySchedule.sessions.push(session);
        daySchedule.totalHours += sessionDuration;
        dayHoursUsed += sessionDuration;
        remainingHours -= sessionDuration;
        subjectHoursRemaining -= sessionDuration;
        currentTime += sessionDuration;

        // Add break if not last session of the day
        if (dayHoursUsed < availableHours && remainingHours > 0) {
          currentTime += breakDuration;
        }
      } else {
        break;
      }
    }

    weeklySchedule.push(daySchedule);
    if (remainingHours <= 0) break;
  }

  schedule.weekly = weeklySchedule;
  schedule.daily = weeklySchedule[0] || { date: start.toISOString().split('T')[0], sessions: [] };

  return schedule;
}

function formatTime(hours) {
  const h = Math.floor(hours);
  const m = Math.floor((hours - h) * 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

// Start server
initializeData().then(() => {
  app.listen(PORT, () => {
    console.log(`Smart Study Scheduler server running on http://localhost:${PORT}`);
  });
});
