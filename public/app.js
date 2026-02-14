// API Configuration
const API_BASE = '/api';
let authToken = localStorage.getItem('authToken');
let currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');

// Charts
let completionChart = null;
let dailyHoursChart = null;

// Focus & break timer
let timerInterval = null;
let timerMode = 'study'; // 'study' | 'break'
let remainingSeconds = 0;

// Tasks (upcoming tests, homework, assignments)
let cachedTasks = [];

// Calendar view
let calendarMonthOffset = 0;

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    setupEventListeners();
    checkAuth();
});

function initializeApp() {
    // Set today's date as default for start date
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('startDate').value = today;
}

function setupEventListeners() {
    // Auth tabs
    document.querySelectorAll('.auth-tabs .tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tab = e.target.dataset.tab;
            switchAuthTab(tab);
        });
    });

    // Main tabs
    document.querySelectorAll('.tabs .tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tab = e.target.dataset.tab;
            switchTab(tab);
        });
    });

    // Auth forms
    document.getElementById('loginFormElement').addEventListener('submit', handleLogin);
    document.getElementById('registerFormElement').addEventListener('submit', handleRegister);
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);

    // Forgot password
    const forgotLink = document.getElementById('forgotPasswordLink');
    const forgotModal = document.getElementById('forgotPasswordModal');
    const forgotForm = document.getElementById('forgotPasswordForm');
    const cancelForgotBtn = document.getElementById('cancelForgotBtn');
    const forgotClose = document.querySelector('.forgot-close');

    if (forgotLink && forgotModal && forgotForm && cancelForgotBtn && forgotClose) {
        forgotLink.addEventListener('click', () => {
            forgotForm.reset();
            forgotModal.classList.add('active');
        });
        cancelForgotBtn.addEventListener('click', () => forgotModal.classList.remove('active'));
        forgotClose.addEventListener('click', () => forgotModal.classList.remove('active'));
        forgotModal.addEventListener('click', (e) => {
            if (e.target.id === 'forgotPasswordModal') {
                forgotModal.classList.remove('active');
            }
        });
        forgotForm.addEventListener('submit', handleForgotPassword);
    }

    // Subject management
    document.getElementById('addSubjectBtn').addEventListener('click', () => openSubjectModal());
    document.getElementById('subjectForm').addEventListener('submit', handleSubjectSubmit);
    document.getElementById('cancelSubjectBtn').addEventListener('click', closeSubjectModal);
    document.querySelector('.close').addEventListener('click', closeSubjectModal);

    // Schedule
    document.getElementById('generateScheduleBtn').addEventListener('click', generateSchedule);
    const rebalanceBtn = document.getElementById('rebalanceScheduleBtn');
    if (rebalanceBtn) {
        rebalanceBtn.addEventListener('click', rebalanceSchedule);
    }
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const view = e.target.dataset.view;
            switchScheduleView(view);
        });
    });

    // Focus & break timer controls
    const startBtn = document.getElementById('startTimerBtn');
    const pauseBtn = document.getElementById('pauseTimerBtn');
    const resetBtn = document.getElementById('resetTimerBtn');

    if (startBtn && pauseBtn && resetBtn) {
        startBtn.addEventListener('click', startFocusTimer);
        pauseBtn.addEventListener('click', pauseFocusTimer);
        resetBtn.addEventListener('click', resetFocusTimer);
    }

    // Modal close on outside click
    document.getElementById('subjectModal').addEventListener('click', (e) => {
        if (e.target.id === 'subjectModal') {
            closeSubjectModal();
        }
    });

    // Task management
    const addTaskBtn = document.getElementById('addTaskBtn');
    const taskForm = document.getElementById('taskForm');
    const cancelTaskBtn = document.getElementById('cancelTaskBtn');
    const taskModal = document.getElementById('taskModal');

    if (addTaskBtn && taskForm && cancelTaskBtn && taskModal) {
        addTaskBtn.addEventListener('click', () => openTaskModal());
        taskForm.addEventListener('submit', handleTaskSubmit);
        cancelTaskBtn.addEventListener('click', closeTaskModal);
        document.querySelector('.task-close').addEventListener('click', closeTaskModal);
        taskModal.addEventListener('click', (e) => {
            if (e.target.id === 'taskModal') {
                closeTaskModal();
            }
        });

        const typeFilter = document.getElementById('taskTypeFilter');
        const statusFilter = document.getElementById('taskStatusFilter');
        if (typeFilter && statusFilter) {
            typeFilter.addEventListener('change', () => displayTasks(cachedTasks));
            statusFilter.addEventListener('change', () => displayTasks(cachedTasks));
        }
    }

    // Dashboard quick add
    const quickAddBtn = document.getElementById('dashboardQuickAddTaskBtn');
    if (quickAddBtn) {
        quickAddBtn.addEventListener('click', () => openTaskModal());
    }
}

function checkAuth() {
    if (authToken && currentUser) {
        showApp();
        loadSubjects();
        loadSchedule();
        loadProgress();
        loadTasks();
        loadDashboard();
    } else {
        showAuth();
    }
}

function switchAuthTab(tab) {
    document.querySelectorAll('.auth-tabs .tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
    
    document.getElementById('loginForm').classList.toggle('active', tab === 'login');
    document.getElementById('registerForm').classList.toggle('active', tab === 'register');
}

function switchTab(tab) {
    document.querySelectorAll('.tabs .tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
    
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    document.getElementById(`${tab}Tab`).classList.add('active');

    if (tab === 'dashboard') {
        loadDashboard();
    } else if (tab === 'schedule') {
        loadSchedule();
    } else if (tab === 'progress') {
        loadProgress();
    } else if (tab === 'tasks') {
        loadTasks();
    }
}

function switchScheduleView(view) {
    document.querySelectorAll('.view-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`[data-view="${view}"]`).classList.add('active');
    displaySchedule(view);
}

// Auth Functions
async function handleForgotPassword(e) {
    e.preventDefault();
    const username = document.getElementById('forgotUsername').value;
    const newPassword = document.getElementById('forgotNewPassword').value;
    const confirmPassword = document.getElementById('forgotConfirmPassword').value;

    if (newPassword !== confirmPassword) {
        alert('Passwords do not match');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/forgot-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, newPassword })
        });

        const data = await response.json();
        if (response.ok) {
            alert('Password updated. You can now log in with your new password.');
            document.getElementById('forgotPasswordModal').classList.remove('active');
            switchAuthTab('login');
        } else {
            alert(data.error || 'Failed to update password');
        }
    } catch (error) {
        alert('Error updating password');
    }
}
async function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;

    try {
        const response = await fetch(`${API_BASE}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();
        if (response.ok) {
            authToken = data.token;
            currentUser = data.user;
            localStorage.setItem('authToken', authToken);
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            showApp();
            loadSubjects();
        } else {
            alert(data.error || 'Login failed');
        }
    } catch (error) {
        alert('Error connecting to server');
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const username = document.getElementById('registerUsername').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;

    try {
        const response = await fetch(`${API_BASE}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        });

        const data = await response.json();
        if (response.ok) {
            authToken = data.token;
            currentUser = data.user;
            localStorage.setItem('authToken', authToken);
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            showApp();
            loadSubjects();
        } else {
            alert(data.error || 'Registration failed');
        }
    } catch (error) {
        alert('Error connecting to server');
    }
}

function handleLogout() {
    authToken = null;
    currentUser = null;
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    showAuth();
}

function showAuth() {
    document.getElementById('authSection').style.display = 'block';
    document.getElementById('appSection').style.display = 'none';
    document.getElementById('logoutBtn').style.display = 'none';
    document.getElementById('userInfo').textContent = '';
}

function showApp() {
    document.getElementById('authSection').style.display = 'none';
    document.getElementById('appSection').style.display = 'block';
    document.getElementById('logoutBtn').style.display = 'block';
    document.getElementById('userInfo').textContent = `Welcome, ${currentUser.username}`;
}

// Subject Functions
async function loadSubjects() {
    try {
        const response = await fetch(`${API_BASE}/subjects`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        if (response.ok) {
            const subjects = await response.json();
            displaySubjects(subjects);
        }
    } catch (error) {
        console.error('Error loading subjects:', error);
    }
}

function displaySubjects(subjects) {
    const container = document.getElementById('subjectsList');
    
    if (subjects.length === 0) {
        container.innerHTML = '<div class="empty-state"><h3>No subjects yet</h3><p>Add your first subject to get started!</p></div>';
        return;
    }

    container.innerHTML = subjects.map(subject => `
        <div class="subject-card">
            <h3>${escapeHtml(subject.name)}</h3>
            <div class="subject-info">
                <p><strong>Priority:</strong> <span class="priority-badge priority-${subject.priority}">${subject.priority}</span></p>
                <p><strong>Deadline:</strong> ${formatDate(subject.deadline)}</p>
                <p><strong>Estimated Hours:</strong> ${subject.estimatedHours || 0}</p>
                ${subject.topics && subject.topics.length > 0 ? `<p><strong>Topics:</strong> ${subject.topics.join(', ')}</p>` : ''}
            </div>
            <div class="subject-actions">
                <button class="btn-secondary" onclick="editSubject('${subject.id}')">Edit</button>
                <button class="btn-danger" onclick="deleteSubject('${subject.id}')">Delete</button>
            </div>
        </div>
    `).join('');
}

function openSubjectModal(subject = null) {
    const modal = document.getElementById('subjectModal');
    const form = document.getElementById('subjectForm');
    const title = document.getElementById('modalTitle');
    
    if (subject) {
        title.textContent = 'Edit Subject';
        document.getElementById('subjectId').value = subject.id;
        document.getElementById('subjectName').value = subject.name;
        document.getElementById('subjectPriority').value = subject.priority;
        document.getElementById('subjectDeadline').value = subject.deadline;
        document.getElementById('subjectHours').value = subject.estimatedHours || 0;
        document.getElementById('subjectTopics').value = subject.topics ? subject.topics.join(', ') : '';
    } else {
        title.textContent = 'Add Subject';
        form.reset();
        document.getElementById('subjectId').value = '';
        document.getElementById('subjectDeadline').value = new Date().toISOString().split('T')[0];
    }
    
    modal.classList.add('active');
}

function closeSubjectModal() {
    document.getElementById('subjectModal').classList.remove('active');
}

async function handleSubjectSubmit(e) {
    e.preventDefault();
    
    const subjectId = document.getElementById('subjectId').value;
    const subject = {
        name: document.getElementById('subjectName').value,
        priority: parseInt(document.getElementById('subjectPriority').value),
        deadline: document.getElementById('subjectDeadline').value,
        estimatedHours: parseFloat(document.getElementById('subjectHours').value) || 0,
        topics: document.getElementById('subjectTopics').value.split(',').map(t => t.trim()).filter(t => t)
    };

    try {
        let response;
        if (subjectId) {
            response = await fetch(`${API_BASE}/subjects/${subjectId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify(subject)
            });
        } else {
            response = await fetch(`${API_BASE}/subjects`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify(subject)
            });
        }

        if (response.ok) {
            closeSubjectModal();
            loadSubjects();
        } else {
            const data = await response.json();
            alert(data.error || 'Failed to save subject');
        }
    } catch (error) {
        alert('Error saving subject');
    }
}

async function editSubject(id) {
    try {
        const response = await fetch(`${API_BASE}/subjects`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        if (response.ok) {
            const subjects = await response.json();
            const subject = subjects.find(s => s.id === id);
            if (subject) {
                openSubjectModal(subject);
            }
        }
    } catch (error) {
        console.error('Error loading subject:', error);
    }
}

async function deleteSubject(id) {
    if (!confirm('Are you sure you want to delete this subject?')) return;

    try {
        const response = await fetch(`${API_BASE}/subjects/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        if (response.ok) {
            loadSubjects();
        } else {
            alert('Failed to delete subject');
        }
    } catch (error) {
        alert('Error deleting subject');
    }
}

// Schedule Functions
async function generateSchedule() {
    const availableHours = parseFloat(document.getElementById('availableHours').value);
    const maxSessionDuration = parseFloat(document.getElementById('maxSessionDuration').value);
    const breakDuration = parseFloat(document.getElementById('breakDuration').value);
    const startDate = document.getElementById('startDate').value;

    try {
        const response = await fetch(`${API_BASE}/schedule/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
                availableHours,
                maxSessionDuration,
                breakDuration,
                startDate
            })
        });

        if (response.ok) {
            const schedule = await response.json();
            displaySchedule('daily');
            alert('Schedule generated successfully!');
        } else {
            const data = await response.json();
            alert(data.error || 'Failed to generate schedule');
        }
    } catch (error) {
        alert('Error generating schedule');
    }
}

async function loadSchedule() {
    try {
        const response = await fetch(`${API_BASE}/schedule`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        if (response.ok) {
            const schedule = await response.json();
            if (schedule) {
                displaySchedule('daily');
            }
        }
    } catch (error) {
        console.error('Error loading schedule:', error);
    }
}

async function rebalanceSchedule() {
    try {
        const response = await fetch(`${API_BASE}/schedule/rebalance`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            }
        });

        const data = await response.json();
        if (response.ok) {
            alert('Schedule rebalanced based on completed sessions.');
            displaySchedule('daily');
        } else {
            alert(data.error || 'Failed to rebalance schedule');
        }
    } catch (error) {
        alert('Error rebalancing schedule');
    }
}

async function displaySchedule(view) {
    try {
        const response = await fetch(`${API_BASE}/schedule`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        if (!response.ok) {
            document.getElementById('scheduleContent').innerHTML = '<div class="empty-state"><h3>No schedule found</h3><p>Generate a schedule to get started!</p></div>';
            return;
        }

        const schedule = await response.json();
        if (!schedule) {
            document.getElementById('scheduleContent').innerHTML = '<div class="empty-state"><h3>No schedule found</h3><p>Generate a schedule to get started!</p></div>';
            return;
        }

        const progress = await fetch(`${API_BASE}/progress`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        }).then(r => r.ok ? r.json() : {}).catch(() => ({}));

        const container = document.getElementById('scheduleContent');
        
        if (view === 'daily') {
            displayDailySchedule(schedule.daily, progress);
        } else {
            displayWeeklySchedule(schedule.weekly, progress);
        }
    } catch (error) {
        console.error('Error displaying schedule:', error);
    }
}

function displayDailySchedule(daySchedule, progress) {
    const container = document.getElementById('scheduleContent');
    
    if (!daySchedule || !daySchedule.sessions || daySchedule.sessions.length === 0) {
        container.innerHTML = '<div class="empty-state"><h3>No schedule for today</h3><p>Generate a schedule to see your study plan!</p></div>';
        return;
    }

    container.innerHTML = `
        <div class="schedule-day">
            <h3>${formatDate(daySchedule.date)} - ${daySchedule.totalHours || 0} hours</h3>
            ${daySchedule.sessions.map(session => {
                const isCompleted = progress[session.id]?.completed || false;
                return `
                    <div class="session-item ${isCompleted ? 'completed' : ''}" style="opacity: ${isCompleted ? 0.7 : 1}">
                        <div class="session-info">
                            <div class="session-time">${session.startTime} - ${session.endTime}</div>
                            <div class="session-subject">${escapeHtml(session.subjectName)}</div>
                            <div class="session-details">
                                Duration: ${session.duration} hours | Priority: ${session.priority}
                                ${session.topics && session.topics.length > 0 ? `| Topics: ${session.topics.join(', ')}` : ''}
                            </div>
                        </div>
                        <div class="session-actions">
                            <button class="btn-${isCompleted ? 'secondary' : 'success'}" onclick="toggleSessionProgress('${session.id}', ${!isCompleted})">
                                ${isCompleted ? '✓ Completed' : 'Mark Complete'}
                            </button>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

function displayWeeklySchedule(weeklySchedule, progress) {
    const container = document.getElementById('scheduleContent');
    
    if (!weeklySchedule || weeklySchedule.length === 0) {
        container.innerHTML = '<div class="empty-state"><h3>No weekly schedule found</h3><p>Generate a schedule to see your study plan!</p></div>';
        return;
    }

    container.innerHTML = weeklySchedule.map(day => {
        const isCompleted = day.sessions.every(s => progress[s.id]?.completed);
        return `
            <div class="schedule-day">
                <h3>${formatDate(day.date)} - ${day.totalHours || 0} hours ${isCompleted ? '✓' : ''}</h3>
                ${day.sessions.map(session => {
                    const sessionCompleted = progress[session.id]?.completed || false;
                    return `
                        <div class="session-item ${sessionCompleted ? 'completed' : ''}" style="opacity: ${sessionCompleted ? 0.7 : 1}">
                            <div class="session-info">
                                <div class="session-time">${session.startTime} - ${session.endTime}</div>
                                <div class="session-subject">${escapeHtml(session.subjectName)}</div>
                                <div class="session-details">
                                    Duration: ${session.duration} hours | Priority: ${session.priority}
                                    ${session.topics && session.topics.length > 0 ? `| Topics: ${session.topics.join(', ')}` : ''}
                                </div>
                            </div>
                            <div class="session-actions">
                                <button class="btn-${sessionCompleted ? 'secondary' : 'success'}" onclick="toggleSessionProgress('${session.id}', ${!sessionCompleted})">
                                    ${sessionCompleted ? '✓ Completed' : 'Mark Complete'}
                                </button>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }).join('');
}

async function toggleSessionProgress(sessionId, completed) {
    try {
        const response = await fetch(`${API_BASE}/progress`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ sessionId, completed })
        });

        if (response.ok) {
            const currentView = document.querySelector('.view-btn.active').dataset.view;
            displaySchedule(currentView);
            loadProgress();
        }
    } catch (error) {
        console.error('Error updating progress:', error);
    }
}

// Progress Functions
async function loadProgress() {
    try {
        const [scheduleRes, progressRes] = await Promise.all([
            fetch(`${API_BASE}/schedule`, { headers: { 'Authorization': `Bearer ${authToken}` } }),
            fetch(`${API_BASE}/progress`, { headers: { 'Authorization': `Bearer ${authToken}` } })
        ]);

        const schedule = scheduleRes.ok ? await scheduleRes.json() : null;
        const progress = progressRes.ok ? await progressRes.json() : {};

        if (!schedule || !schedule.weekly) {
            document.getElementById('progressContent').innerHTML = '<div class="empty-state"><h3>No progress data</h3><p>Generate a schedule first to track your progress!</p></div>';
            return;
        }

        displayProgress(schedule, progress);
    } catch (error) {
        console.error('Error loading progress:', error);
    }
}

function displayProgress(schedule, progress) {
    const allSessions = schedule.weekly.flatMap(day => day.sessions);
    const totalSessions = allSessions.length;
    const completedSessions = allSessions.filter(s => progress[s.id]?.completed).length;
    const totalHours = allSessions.reduce((sum, s) => sum + s.duration, 0);
    const completedHours = allSessions
        .filter(s => progress[s.id]?.completed)
        .reduce((sum, s) => sum + s.duration, 0);
    
    const completionRate = totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0;

    // Subject-wise aggregation
    const subjectStats = {};
    allSessions.forEach(s => {
        const key = s.subjectId || s.subjectName || 'Unknown';
        if (!subjectStats[key]) {
            subjectStats[key] = {
                subjectName: s.subjectName || 'Unknown subject',
                totalSessions: 0,
                completedSessions: 0,
                totalHours: 0,
                completedHours: 0,
                priority: s.priority
            };
        }
        const stat = subjectStats[key];
        stat.totalSessions += 1;
        stat.totalHours += s.duration;
        if (progress[s.id]?.completed) {
            stat.completedSessions += 1;
            stat.completedHours += s.duration;
        }
    });

    const container = document.getElementById('progressContent');
    container.innerHTML = `
        <div class="progress-card">
            <h3>Overall Progress</h3>
            <div class="progress-stats">
                <div class="stat-item">
                    <div class="stat-value">${completionRate}%</div>
                    <div class="stat-label">Completion Rate</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${completedSessions}/${totalSessions}</div>
                    <div class="stat-label">Sessions Completed</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${completedHours.toFixed(1)}/${totalHours.toFixed(1)}</div>
                    <div class="stat-label">Hours Completed</div>
                </div>
            </div>
        </div>
        <div class="progress-card">
            <h3>Subject-wise Progress</h3>
            <div class="subjects-grid">
                ${Object.values(subjectStats)
                    .map(stat => {
                        const pct = stat.totalSessions
                            ? Math.round((stat.completedSessions / stat.totalSessions) * 100)
                            : 0;
                        return `
                            <div class="subject-card">
                                <h3>${escapeHtml(stat.subjectName)}</h3>
                                <div class="subject-info">
                                    <p><strong>Completion:</strong> ${pct}%</p>
                                    <p><strong>Sessions:</strong> ${stat.completedSessions}/${stat.totalSessions}</p>
                                    <p><strong>Hours:</strong> ${stat.completedHours.toFixed(1)}/${stat.totalHours.toFixed(1)}</p>
                                </div>
                            </div>
                        `;
                    }).join('')}
            </div>
        </div>
        <div class="progress-card">
            <h3>Remaining Sessions</h3>
            <div class="subjects-grid">
                ${allSessions
                    .filter(s => !progress[s.id]?.completed)
                    .map(session => `
                        <div class="subject-card">
                            <h3>${escapeHtml(session.subjectName)}</h3>
                            <div class="subject-info">
                                <p><strong>Time:</strong> ${session.startTime} - ${session.endTime}</p>
                                <p><strong>Duration:</strong> ${session.duration} hours</p>
                                <p><strong>Priority:</strong> <span class="priority-badge priority-${session.priority}">${session.priority}</span></p>
                                ${session.topics && session.topics.length > 0 ? `<p><strong>Topics:</strong> ${session.topics.join(', ')}</p>` : ''}
                            </div>
                            <div class="subject-actions">
                                <button class="btn-success" onclick="toggleSessionProgress('${session.id}', true)">Mark Complete</button>
                            </div>
                        </div>
                    `).join('')}
            </div>
            ${allSessions.filter(s => !progress[s.id]?.completed).length === 0 ? 
                '<div class="empty-state"><h3>🎉 All sessions completed!</h3></div>' : ''}
        </div>
    `;

    renderProgressCharts(schedule, {
        totalSessions,
        completedSessions,
        totalHours,
        completedHours,
        completionRate
    }, progress);
}

// Dashboard Functions
async function loadDashboard() {
    if (!authToken || !currentUser) return;

    try {
        const [scheduleRes, progressRes, tasksRes, subjectsRes] = await Promise.all([
            fetch(`${API_BASE}/schedule`, { headers: { 'Authorization': `Bearer ${authToken}` } }),
            fetch(`${API_BASE}/progress`, { headers: { 'Authorization': `Bearer ${authToken}` } }),
            fetch(`${API_BASE}/tasks`, { headers: { 'Authorization': `Bearer ${authToken}` } }),
            fetch(`${API_BASE}/subjects`, { headers: { 'Authorization': `Bearer ${authToken}` } })
        ]);

        const schedule = scheduleRes.ok ? await scheduleRes.json() : null;
        const progress = progressRes.ok ? await progressRes.json() : {};
        const tasks = tasksRes.ok ? await tasksRes.json() : [];
        const subjects = subjectsRes.ok ? await subjectsRes.json() : [];

        const welcomeTitle = document.getElementById('dashboardWelcomeTitle');
        if (welcomeTitle && currentUser) {
            welcomeTitle.textContent = `Welcome, ${currentUser.username}`;
        }

        renderDashboardTasks(tasks);
        renderDashboardDeadlines(tasks, subjects);
        renderDashboardProgress(schedule, progress);
        renderDashboardSuggestion(subjects, tasks, schedule, progress);

        // Simple reminder banner
        const banner = document.getElementById('dashboardReminderBanner');
        if (banner) {
            const todayStr = new Date().toISOString().split('T')[0];
            const dueToday = (tasks || []).filter(t => t.dueDate === todayStr && !t.completed).length;
            const overdue = (tasks || []).filter(t => t.dueDate < todayStr && !t.completed).length;

            if (overdue > 0) {
                banner.textContent = `You have ${overdue} overdue task${overdue === 1 ? '' : 's'}. Try to clear one today.`;
            } else if (dueToday > 0) {
                banner.textContent = `You have ${dueToday} task${dueToday === 1 ? '' : 's'} due today. Plan time for them.`;
            } else if (!schedule || !schedule.weekly || schedule.weekly.length === 0) {
                banner.textContent = 'No study plan yet. Generate a schedule to get a focused study day.';
            } else {
                banner.textContent = 'Nice work staying on top of things. Keep your streak going today.';
            }
        }
    } catch (error) {
        console.error('Error loading dashboard:', error);
    }
}

function renderDashboardTasks(tasks) {
    const container = document.getElementById('dashboardTodayTasks');
    if (!container) return;

    const todayStr = new Date().toISOString().split('T')[0];
    const todayTasks = (tasks || []).filter(t => t.dueDate === todayStr).sort((a, b) => a.type.localeCompare(b.type));

    if (todayTasks.length === 0) {
        container.innerHTML = '<p class="dashboard-list-meta">No tasks due today. This is a great day to review past topics.</p>';
        return;
    }

    container.innerHTML = todayTasks.map(t => `
        <div class="dashboard-list-item">
            <div>
                <div class="dashboard-list-title">${escapeHtml(t.title)}</div>
                <div class="dashboard-list-meta">${formatTaskType(t.type)}${t.subject ? ` • ${escapeHtml(t.subject)}` : ''}</div>
            </div>
            <button class="btn-success" style="padding:0.25rem 0.6rem;font-size:0.75rem;"
                onclick="toggleTaskCompleted('${t.id}', ${!t.completed})">
                ${t.completed ? 'Undo' : 'Done'}
            </button>
        </div>
    `).join('');
}

function renderDashboardDeadlines(tasks, subjects) {
    const container = document.getElementById('dashboardUpcoming');
    if (!container) return;

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    const entries = [];

    // Subject deadlines
    (subjects || []).forEach(s => {
        if (!s.deadline) return;
        entries.push({
            type: 'subject',
            label: s.name,
            date: s.deadline,
            priority: s.priority
        });
    });

    // Task deadlines
    (tasks || []).forEach(t => {
        entries.push({
            type: t.type,
            label: t.title,
            date: t.dueDate,
            priority: t.type === 'test' ? 1 : 3
        });
    });

    const upcoming = entries
        .filter(e => e.date >= todayStr)
        .sort((a, b) => new Date(a.date) - new Date(b.date) || (a.priority || 3) - (b.priority || 3))
        .slice(0, 6);

    if (upcoming.length === 0) {
        container.innerHTML = '<p class="dashboard-list-meta">No upcoming deadlines yet.</p>';
        return;
    }

    container.innerHTML = upcoming.map(e => {
        const d = new Date(e.date);
        const day = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const isExam = e.type === 'test';
        return `
            <div class="dashboard-list-item">
                <div>
                    <div class="dashboard-list-title">${escapeHtml(e.label)}</div>
                    <div class="dashboard-list-meta">
                        ${isExam ? 'Exam' : e.type === 'subject' ? 'Subject deadline' : formatTaskType(e.type)}
                    </div>
                </div>
                <span class="dashboard-list-meta">${day}</span>
            </div>
        `;
    }).join('');
}

function renderDashboardProgress(schedule, progress) {
    const container = document.getElementById('dashboardProgressSummary');
    if (!container) return;

    if (!schedule || !schedule.weekly) {
        container.innerHTML = '<p class="dashboard-list-meta">Generate a schedule to see study progress here.</p>';
        return;
    }

    const allSessions = schedule.weekly.flatMap(day => day.sessions);
    const totalSessions = allSessions.length;
    const completedSessions = allSessions.filter(s => progress[s.id]?.completed).length;
    const totalHours = allSessions.reduce((sum, s) => sum + s.duration, 0);
    const completedHours = allSessions.filter(s => progress[s.id]?.completed).reduce((sum, s) => sum + s.duration, 0);
    const completionRate = totalSessions ? Math.round((completedSessions / totalSessions) * 100) : 0;

    container.innerHTML = `
        <div class="dashboard-progress-pill">
            <span>Completion</span>
            <strong>${completionRate}%</strong>
        </div>
        <div class="dashboard-progress-pill">
            <span>Sessions</span>
            <strong>${completedSessions}/${totalSessions}</strong>
        </div>
        <div class="dashboard-progress-pill">
            <span>Hours</span>
            <strong>${completedHours.toFixed(1)}/${totalHours.toFixed(1)}</strong>
        </div>
    `;
}

function renderDashboardSuggestion(subjects, tasks, schedule, progress) {
    const container = document.getElementById('dashboardSuggestion');
    if (!container) return;

    if (!subjects || subjects.length === 0) {
        container.innerHTML = '<p>Add some subjects to get smart study suggestions.</p>';
        return;
    }

    const today = new Date();
    const scored = subjects.map(s => {
        const deadline = new Date(s.deadline);
        const daysToDeadline = Math.max(1, Math.round((deadline - today) / (1000 * 60 * 60 * 24)));
        const priorityScore = (6 - (s.priority || 3)) * 2;
        const hours = s.estimatedHours || 0;
        const hoursScore = Math.min(4, hours / 2);
        const score = priorityScore + hoursScore + (10 / daysToDeadline);
        return { subject: s, score, daysToDeadline };
    }).sort((a, b) => b.score - a.score);

    const top = scored[0];
    if (!top) {
        container.innerHTML = '<p>Once you add more details, we’ll suggest what to focus on first.</p>';
        return;
    }

    const s = top.subject;
    container.innerHTML = `
        <p><strong>Focus on:</strong> ${escapeHtml(s.name)}</p>
        <p class="dashboard-list-meta">
            Priority ${s.priority}, about ${s.estimatedHours || 0} hour(s) planned,
            deadline in ${top.daysToDeadline} day${top.daysToDeadline === 1 ? '' : 's'}.
            Try one Pomodoro (25 minutes) on this subject next.
        </p>
    `;
}
// Utility Functions
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Task Functions
async function loadTasks() {
    try {
        const response = await fetch(`${API_BASE}/tasks`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        if (!response.ok) {
            document.getElementById('tasksList').innerHTML =
                '<div class="empty-state"><h3>No tasks yet</h3><p>Add your upcoming tests, assignments or homework.</p></div>';
            return;
        }

        const tasks = await response.json();
        cachedTasks = tasks || [];
        displayTasks(cachedTasks);
    } catch (error) {
        console.error('Error loading tasks:', error);
    }
}

function displayTasks(tasks) {
    const container = document.getElementById('tasksList');
    if (!container) return;

    if (!tasks || tasks.length === 0) {
        container.innerHTML =
            '<div class="empty-state"><h3>No tasks yet</h3><p>Add your upcoming tests, assignments or homework.</p></div>';
        return;
    }

    const typeFilter = document.getElementById('taskTypeFilter')?.value || 'all';
    const statusFilter = document.getElementById('taskStatusFilter')?.value || 'all';
    const now = new Date();

    const filtered = tasks.filter(task => {
        if (typeFilter !== 'all' && task.type !== typeFilter) return false;
        if (statusFilter === 'pending' && task.completed) return false;
        if (statusFilter === 'completed' && !task.completed) return false;
        return true;
    }).sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

    if (filtered.length === 0) {
        container.innerHTML =
            '<div class="empty-state"><h3>No matching tasks</h3><p>Change the filters to see more items.</p></div>';
        return;
    }

    container.innerHTML = filtered.map(task => {
        const due = new Date(task.dueDate);
        const diffDays = Math.round((due - now) / (1000 * 60 * 60 * 24));
        let dueClass = 'task-due';
        let dueLabel = '';

        if (diffDays < 0) {
            dueLabel = `Overdue (${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? '' : 's'} ago)`;
        } else if (diffDays === 0) {
            dueLabel = 'Due today';
        } else if (diffDays <= 3) {
            dueLabel = `Due in ${diffDays} day${diffDays === 1 ? '' : 's'}`;
        } else {
            dueLabel = `Due in ${diffDays} days`;
        }

        if (diffDays <= 1) {
            dueClass += ' soon';
        } else if (diffDays >= 4) {
            dueClass += ' ok';
        }

        const typeClass = `task-chip ${task.type}`;

        return `
            <div class="task-card">
                <div class="task-header">
                    <div class="task-title">${escapeHtml(task.title)}</div>
                    <span class="${typeClass}">${formatTaskType(task.type)}</span>
                </div>
                <div class="task-meta">
                    <span class="${dueClass}">${dueLabel}</span>
                    ${task.subjectId || task.subjectName || task.subject
                        ? ` • Subject: ${escapeHtml(task.subjectName || task.subject || '')}`
                        : ''}
                </div>
                ${task.notes ? `<div class="task-notes">${escapeHtml(task.notes)}</div>` : ''}
                <div class="task-footer">
                    <span class="task-status ${task.completed ? 'completed' : 'pending'}">
                        ${task.completed ? 'Completed' : 'Pending'}
                    </span>
                    <div class="task-actions">
                        <button class="btn-success" onclick="toggleTaskCompleted('${task.id}', ${!task.completed})">
                            ${task.completed ? 'Mark pending' : 'Mark done'}
                        </button>
                        <button class="btn-secondary" onclick="editTask('${task.id}')">Edit</button>
                        <button class="btn-danger" onclick="deleteTask('${task.id}')">Delete</button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function openTaskModal(task = null) {
    const modal = document.getElementById('taskModal');
    const form = document.getElementById('taskForm');
    const titleEl = document.getElementById('taskModalTitle');

    if (!modal || !form || !titleEl) return;

    if (task) {
        titleEl.textContent = 'Edit Task';
        document.getElementById('taskId').value = task.id;
        document.getElementById('taskTitle').value = task.title;
        document.getElementById('taskType').value = task.type;
        document.getElementById('taskDueDate').value = task.dueDate;
        document.getElementById('taskSubject').value = task.subjectName || task.subject || '';
        document.getElementById('taskNotes').value = task.notes || '';
    } else {
        titleEl.textContent = 'Add Task';
        form.reset();
        document.getElementById('taskId').value = '';
        document.getElementById('taskDueDate').value = new Date().toISOString().split('T')[0];
    }

    modal.classList.add('active');
}

function closeTaskModal() {
    const modal = document.getElementById('taskModal');
    if (modal) modal.classList.remove('active');
}

async function handleTaskSubmit(e) {
    e.preventDefault();

    const id = document.getElementById('taskId').value;
    const payload = {
        title: document.getElementById('taskTitle').value,
        type: document.getElementById('taskType').value,
        dueDate: document.getElementById('taskDueDate').value,
        subject: document.getElementById('taskSubject').value || null,
        notes: document.getElementById('taskNotes').value || ''
    };

    try {
        let response;
        if (id) {
            response = await fetch(`${API_BASE}/tasks/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify(payload)
            });
        } else {
            response = await fetch(`${API_BASE}/tasks`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify(payload)
            });
        }

        if (!response.ok) {
            const data = await response.json();
            alert(data.error || 'Failed to save task');
            return;
        }

        closeTaskModal();
        loadTasks();
    } catch (error) {
        alert('Error saving task');
    }
}

async function editTask(id) {
    const task = cachedTasks.find(t => t.id === id);
    if (task) {
        openTaskModal(task);
    }
}

async function deleteTask(id) {
    if (!confirm('Are you sure you want to delete this task?')) return;

    try {
        const response = await fetch(`${API_BASE}/tasks/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        if (!response.ok) {
            alert('Failed to delete task');
            return;
        }

        loadTasks();
    } catch (error) {
        alert('Error deleting task');
    }
}

async function toggleTaskCompleted(id, completed) {
    const task = cachedTasks.find(t => t.id === id);
    if (!task) return;

    try {
        const response = await fetch(`${API_BASE}/tasks/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ completed })
        });

        if (!response.ok) return;
        loadTasks();
    } catch (error) {
        console.error('Error updating task:', error);
    }
}

function formatTaskType(type) {
    switch (type) {
        case 'test': return 'Test / Exam';
        case 'assignment': return 'Assignment';
        case 'homework': return 'Homework';
        case 'project': return 'Project';
        default: return 'Other';
    }
}

// Chart rendering (no AI/ML, pure visualisation)
function renderProgressCharts(schedule, stats, progress) {
    if (typeof Chart === 'undefined') {
        // Chart library not loaded; fail silently
        return;
    }

    const completionCtx = document.getElementById('completionChart');
    const dailyCtx = document.getElementById('dailyHoursChart');

    if (!completionCtx || !dailyCtx || !schedule || !schedule.weekly) return;

    // Destroy existing charts to avoid duplicates
    if (completionChart) {
        completionChart.destroy();
        completionChart = null;
    }
    if (dailyHoursChart) {
        dailyHoursChart.destroy();
        dailyHoursChart = null;
    }

    const remainingSessions = Math.max(stats.totalSessions - stats.completedSessions, 0);

    completionChart = new Chart(completionCtx.getContext('2d'), {
        type: 'doughnut',
        data: {
            labels: ['Completed', 'Remaining'],
            datasets: [{
                data: [stats.completedSessions, remainingSessions],
                backgroundColor: ['#667eea', '#e0e7ff'],
                borderWidth: 0
            }]
        },
        options: {
            plugins: {
                legend: {
                    position: 'bottom'
                },
                tooltip: {
                    callbacks: {
                        label: (ctx) => `${ctx.label}: ${ctx.parsed} sessions`
                    }
                }
            },
            cutout: '65%'
        }
    });

    // Compute hours per day (completed vs total)
    const labels = [];
    const totalHoursPerDay = [];
    const completedHoursPerDay = [];

    schedule.weekly.forEach(day => {
        labels.push(new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' }));
        const sessions = day.sessions || [];
        const total = sessions.reduce((sum, s) => sum + s.duration, 0);
        const completed = sessions
            .filter(s => progress[s.id]?.completed)
            .reduce((sum, s) => sum + s.duration, 0);

        totalHoursPerDay.push(total);
        completedHoursPerDay.push(completed);
    });

    dailyHoursChart = new Chart(dailyCtx.getContext('2d'), {
        type: 'bar',
        data: {
            labels,
            datasets: [
                {
                    label: 'Completed hours',
                    data: completedHoursPerDay,
                    backgroundColor: '#667eea'
                },
                {
                    label: 'Planned hours',
                    data: totalHoursPerDay,
                    backgroundColor: '#cbd5ff'
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Hours'
                    }
                }
            }
        }
    });
}

// Focus & break timer (simple rule‑based scheduler)
function startFocusTimer() {
    const studyInput = document.getElementById('studyMinutes');
    const breakInput = document.getElementById('breakMinutes');
    const display = document.getElementById('timerDisplay');
    const modeLabel = document.getElementById('timerModeLabel');

    if (!studyInput || !breakInput || !display || !modeLabel) return;

    const studyMinutes = parseInt(studyInput.value, 10) || 25;
    const breakMinutes = parseInt(breakInput.value, 10) || 5;

    if (!remainingSeconds) {
        remainingSeconds = (timerMode === 'study' ? studyMinutes : breakMinutes) * 60;
    }

    if (timerInterval) return; // already running

    timerInterval = setInterval(() => {
        remainingSeconds -= 1;
        if (remainingSeconds <= 0) {
            clearInterval(timerInterval);
            timerInterval = null;
            handleTimerComplete(studyMinutes, breakMinutes);
        }
        updateTimerDisplay();
    }, 1000);

    updateTimerDisplay();
}

function pauseFocusTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

function resetFocusTimer() {
    pauseFocusTimer();
    timerMode = 'study';
    remainingSeconds = 0;
    updateTimerDisplay();
}

function handleTimerComplete(studyMinutes, breakMinutes) {
    if (timerMode === 'study') {
        alert('Study session complete! Time for a break.');
        timerMode = 'break';
        remainingSeconds = breakMinutes * 60;
    } else {
        alert('Break over. Let’s get back to studying!');
        timerMode = 'study';
        remainingSeconds = studyMinutes * 60;
    }
    updateTimerDisplay();
}

function updateTimerDisplay() {
    const display = document.getElementById('timerDisplay');
    const modeLabel = document.getElementById('timerModeLabel');
    if (!display || !modeLabel) return;

    const minutes = Math.floor((remainingSeconds || 0) / 60);
    const seconds = (remainingSeconds || 0) % 60;
    display.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    modeLabel.textContent = timerMode === 'study' ? 'Study time' : 'Break time';
}
