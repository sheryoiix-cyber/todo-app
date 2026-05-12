const taskInput = document.getElementById('task-input');
const prioritySelect = document.getElementById('priority-select');
const categorySelect = document.getElementById('category-select');
const addBtn = document.getElementById('add-btn');
const tasksList = document.getElementById('tasks-list');
const emptyState = document.getElementById('empty-state');
const searchInput = document.getElementById('search-input');
const filterButtons = document.querySelectorAll('.filter-btn');
const themeToggle = document.getElementById('theme-toggle');
const exportBtn = document.getElementById('export-btn');
const importBtn = document.getElementById('import-btn');
const importFile = document.getElementById('import-file');
const clearCompletedBtn = document.getElementById('clear-completed-btn');
const clearAllBtn = document.getElementById('clear-all-btn');

let tasks = [];
let currentFilter = 'all';
let searchTerm = '';

const STORAGE_KEY = 'shery_todo_tasks';
const THEME_KEY = 'shery_todo_theme';

document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    loadTasks();
    loadTheme();
    setupMatrixBackground();
});

function initializeApp() {
    addBtn.addEventListener('click', addTask);
    taskInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addTask();
    });
    searchInput.addEventListener('input', (e) => {
        searchTerm = e.target.value.toLowerCase();
        renderTasks();
    });
    filterButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            filterButtons.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentFilter = e.target.dataset.filter;
            renderTasks();
        });
    });
    themeToggle.addEventListener('click', toggleTheme);
    exportBtn.addEventListener('click', exportTasks);
    importBtn.addEventListener('click', () => importFile.click());
    importFile.addEventListener('change', importTasks);
    clearCompletedBtn.addEventListener('click', clearCompleted);
    clearAllBtn.addEventListener('click', clearAll);
}

function addTask() {
    const taskText = taskInput.value.trim();
    const priority = prioritySelect.value;
    const category = categorySelect.value;

    if (taskText === '') {
        alert('Please enter a task!');
        return;
    }

    const task = {
        id: Date.now(),
        text: taskText,
        completed: false,
        priority: priority,
        category: category,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    tasks.unshift(task);
    saveTasks();
    renderTasks();
    updateStats();

    taskInput.value = '';
    prioritySelect.value = 'medium';
    categorySelect.value = 'general';
    taskInput.focus();
}

function deleteTask(id) {
    if (confirm('Are you sure you want to delete this task?')) {
        tasks = tasks.filter(task => task.id !== id);
        saveTasks();
        renderTasks();
        updateStats();
    }
}

function toggleTask(id) {
    const task = tasks.find(t => t.id === id);
    if (task) {
        task.completed = !task.completed;
        task.updatedAt = new Date().toISOString();
        saveTasks();
        renderTasks();
        updateStats();
    }
}

function editTask(id) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    const newText = prompt('Edit task:', task.text);
    if (newText && newText.trim() !== '') {
        task.text = newText.trim();
        task.updatedAt = new Date().toISOString();
        saveTasks();
        renderTasks();
    }
}

function renderTasks() {
    tasksList.innerHTML = '';

    let filteredTasks = tasks.filter(task => {
        const matchesSearch = task.text.toLowerCase().includes(searchTerm);

        let matchesFilter = true;
        if (currentFilter === 'active') matchesFilter = !task.completed;
        if (currentFilter === 'completed') matchesFilter = task.completed;
        if (currentFilter === 'high') matchesFilter = task.priority === 'high';

        return matchesSearch && matchesFilter;
    });

    if (filteredTasks.length === 0) {
        emptyState.classList.add('show');
        return;
    }

    emptyState.classList.remove('show');

    filteredTasks.forEach(task => {
        const li = document.createElement('li');
        li.className = `task-item ${task.completed ? 'completed' : ''}`;
        li.innerHTML = `
            <input 
                type="checkbox" 
                class="task-checkbox" 
                ${task.completed ? 'checked' : ''}
                onchange="toggleTask(${task.id})"
            >
            <div class="task-content">
                <div class="task-text">${escapeHtml(task.text)}</div>
                <div class="task-meta">
                    <span class="task-badge priority-${task.priority}">● ${task.priority.toUpperCase()}</span>
                    <span class="task-badge category-badge">${task.category}</span>
                    <span class="timestamp">${formatDate(task.createdAt)}</span>
                </div>
            </div>
            <div class="task-controls">
                <button class="task-btn" onclick="editTask(${task.id})" title="Edit">✏️</button>
                <button class="task-btn task-btn-delete" onclick="deleteTask(${task.id})" title="Delete">🗑️</button>
            </div>
        `;
        tasksList.appendChild(li);
    });
}

function updateStats() {
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const pending = total - completed;
    const progress = total === 0 ? 0 : Math.round((completed / total) * 100);

    document.getElementById('total-tasks').textContent = total;
    document.getElementById('completed-tasks').textContent = completed;
    document.getElementById('pending-tasks').textContent = pending;
    document.getElementById('progress-percent').textContent = progress + '%';
    document.getElementById('progress-bar').style.width = progress + '%';
}

function saveTasks() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    } catch (error) {
        console.error('Error saving tasks:', error);
    }
}

function loadTasks() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        tasks = stored ? JSON.parse(stored) : [];
        renderTasks();
        updateStats();
    } catch (error) {
        console.error('Error loading tasks:', error);
        tasks = [];
    }
}

function clearCompleted() {
    if (confirm('Delete all completed tasks?')) {
        tasks = tasks.filter(t => !t.completed);
        saveTasks();
        renderTasks();
        updateStats();
    }
}

function clearAll() {
    if (confirm('⚠️ This will DELETE ALL tasks! Continue?')) {
        if (confirm('Are you absolutely sure?')) {
            tasks = [];
            saveTasks();
            renderTasks();
            updateStats();
        }
    }
}

function exportTasks() {
    const dataStr = JSON.stringify(tasks, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `todo-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
}

function importTasks(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const imported = JSON.parse(e.target.result);
            if (Array.isArray(imported)) {
                if (confirm(`Import ${imported.length} tasks?`)) {
                    tasks = imported;
                    saveTasks();
                    renderTasks();
                    updateStats();
                    alert('Tasks imported successfully!');
                }
            } else {
                alert('Invalid file format!');
            }
        } catch (error) {
            alert('Error importing tasks: ' + error.message);
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}

function toggleTheme() {
    const body = document.body;
    const isDarkMode = !body.classList.contains('light-mode');
    
    if (isDarkMode) {
        body.classList.add('light-mode');
        localStorage.setItem(THEME_KEY, 'light');
        themeToggle.querySelector('.theme-icon').textContent = '☀️';
    } else {
        body.classList.remove('light-mode');
        localStorage.setItem(THEME_KEY, 'dark');
        themeToggle.querySelector('.theme-icon').textContent = '🌙';
    }
}

function loadTheme() {
    const savedTheme = localStorage.getItem(THEME_KEY) || 'dark';
    if (savedTheme === 'light') {
        document.body.classList.add('light-mode');
        themeToggle.querySelector('.theme-icon').textContent = '☀️';
    }
}

function formatDate(isoString) {
    const date = new Date(isoString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function setupMatrixBackground() {
    const canvas = document.getElementById('matrix-canvas');
    const ctx = canvas.getContext('2d');

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const characters = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン';
    const charArray = characters.split('');

    const fontSize = 16;
    const columns = canvas.width / fontSize;
    const drops = [];

    for (let i = 0; i < columns; i++) {
        drops[i] = Math.random() * canvas.height;
    }

    function draw() {
        ctx.fillStyle = 'rgba(5, 8, 17, 0.1)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#00ff00';
        ctx.font = fontSize + 'px monospace';

        for (let i = 0; i < drops.length; i++) {
            const text = charArray[Math.floor(Math.random() * charArray.length)];
            ctx.fillText(text, i * fontSize, drops[i]);

            if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
                drops[i] = 0;
            }
            drops[i]++;
        }
    }

    setInterval(draw, 50);

    window.addEventListener('resize', () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    });
}
