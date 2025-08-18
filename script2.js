// DOM Elements
const taskInput = document.getElementById('task-input');
const addBtn = document.getElementById('add-btn');
const taskList = document.getElementById('task-list');
const emptyState = document.getElementById('empty-state');
const totalTasksElement = document.getElementById('total-tasks');
const completedTasksElement = document.getElementById('completed-tasks');
const pendingTasksElement = document.getElementById('pending-tasks');
const filterButtons = document.querySelectorAll('.filter-btn');

// Task data storage
let tasks = [];
let taskIdCounter = 1;
let currentFilter = 'all';

// Event Listeners
addBtn.addEventListener('click', addTask);
taskInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        addTask();
    }
});

// Input validation
taskInput.addEventListener('input', function() {
    const isEmpty = this.value.trim() === '';
    addBtn.disabled = isEmpty;
});

// Filter buttons
filterButtons.forEach(btn => {
    btn.addEventListener('click', function() {
        // Remove active class from all buttons
        filterButtons.forEach(b => b.classList.remove('active'));
        // Add active class to clicked button
        this.classList.add('active');
        currentFilter = this.dataset.filter;
        renderTasks();
    });
});

// Functions
function addTask() {
    const taskText = taskInput.value.trim();
    
    if (taskText === '') {
        alert('Please enter a task!');
        return;
    }

    // Create task object
    const task = {
        id: taskIdCounter++,
        text: taskText,
        completed: false,
        createdAt: new Date()
    };

    // Add to tasks array
    tasks.push(task);

    // Clear input
    taskInput.value = '';
    addBtn.disabled = true;

    // Re-render tasks
    renderTasks();
    updateStats();
}

function toggleTask(taskId) {
    // Find task and toggle completed status
    const task = tasks.find(t => t.id === taskId);
    if (task) {
        task.completed = !task.completed;
        renderTasks();
        updateStats();
    }
}

function deleteTask(taskId) {
    if (confirm('Are you sure you want to delete this task?')) {
        // Remove task from array
        tasks = tasks.filter(t => t.id !== taskId);
        renderTasks();
        updateStats();
    }
}

function editTask(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const taskElement = document.querySelector(`[data-task-id="${taskId}"]`);
    const taskText = taskElement.querySelector('.task-text');
    const taskActions = taskElement.querySelector('.task-actions');

    // Replace text with input field
    const currentText = task.text;
    taskText.innerHTML = `<input type="text" class="task-input-edit" value="${currentText}" maxlength="100">`;
    
    // Replace buttons with save/cancel
    taskActions.innerHTML = `
        <button class="btn save-btn" onclick="saveTask(${taskId})">Save</button>
        <button class="btn cancel-btn" onclick="cancelEdit(${taskId})">Cancel</button>
    `;

    // Focus on input
    const input = taskText.querySelector('.task-input-edit');
    input.focus();
    input.select();

    // Allow Enter to save
    input.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            saveTask(taskId);
        }
    });
}

function saveTask(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const taskElement = document.querySelector(`[data-task-id="${taskId}"]`);
    const input = taskElement.querySelector('.task-input-edit');
    const newText = input.value.trim();

    if (newText === '') {
        alert('Task cannot be empty!');
        return;
    }

    // Update task text
    task.text = newText;
    
    // Re-render tasks
    renderTasks();
}

function cancelEdit(taskId) {
    // Simply re-render to cancel edit mode
    renderTasks();
}

function renderTasks() {
    // Clear current tasks
    taskList.innerHTML = '';

    // Filter tasks based on current filter
    let filteredTasks = tasks;
    if (currentFilter === 'completed') {
        filteredTasks = tasks.filter(t => t.completed);
    } else if (currentFilter === 'pending') {
        filteredTasks = tasks.filter(t => !t.completed);
    }

    // Show/hide empty state
    if (filteredTasks.length === 0) {
        emptyState.style.display = 'block';
        return;
    } else {
        emptyState.style.display = 'none';
    }

    // Create task elements
    filteredTasks.forEach(task => {
        const taskElement = createTaskElement(task);
        taskList.appendChild(taskElement);
    });
}

function createTaskElement(task) {
    // Create list item
    const li = document.createElement('li');
    li.className = `task-item ${task.completed ? 'completed' : ''}`;
    li.setAttribute('data-task-id', task.id);

    // Create task content
    li.innerHTML = `
        <div class="task-content">
            <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''} 
                   onchange="toggleTask(${task.id})">
            <span class="task-text ${task.completed ? 'completed' : ''}">${task.text}</span>
            <div class="task-actions">
                <button class="btn edit-btn" onclick="editTask(${task.id})">Edit</button>
                <button class="btn delete-btn" onclick="deleteTask(${task.id})">Delete</button>
            </div>
        </div>
    `;

    return li;
}

function updateStats() {
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const pending = total - completed;

    totalTasksElement.textContent = total;
    completedTasksElement.textContent = completed;
    pendingTasksElement.textContent = pending;
}

// Initialize the app
function init() {
    addBtn.disabled = true;
    renderTasks();
    updateStats();
}

// Start the app
init();