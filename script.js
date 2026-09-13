const taskInput = document.getElementById("task-input");
const taskDate = document.getElementById("task-date");
const taskPriority = document.getElementById("task-priority");
const addBtn = document.getElementById("add-btn");
const taskList = document.getElementById("task-list");
const emptyState = document.getElementById("empty-state");
const totalTaskElement = document.getElementById("total-tasks");
const completedTask = document.getElementById("completed-tasks");
const pendingTask = document.getElementById("pending-tasks");
const filterButtons = document.querySelectorAll(".filter-btn");
const searchInput = document.getElementById("search-input");
const themeToggle = document.getElementById("theme-toggle");
const exportBtn = document.getElementById("export-btn");
const importFile = document.getElementById("import-file");

// POMODORO ELEMENTS
const pomodoroTime = document.getElementById("pomodoro-time");
const pomodoroStartBtn = document.getElementById("pomodoro-start");
const pomodoroResetBtn = document.getElementById("pomodoro-reset");

// NOTIFICATION SYSTEM
const toastContainer = document.getElementById("toast-container");
const showToast = (message) => {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.innerHTML = message;
  toastContainer.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
};

// REMINDER ALERT SYSTEM
const checkDueDates = () => {
  const today = new Date().toISOString().split('T')[0];
  const dueTasks = tasks.filter(t => !t.completed && t.dueDate && t.dueDate <= today);
  
  if (dueTasks.length > 0) {
    showToast(`<i class="fa-solid fa-bell"></i> Reminder: You have ${dueTasks.length} pending task(s) due today or earlier!`);
    
    // Optionally trigger native browser notification if permitted
    if (Notification.permission === "granted") {
      new Notification("Task Reminder", {
        body: `You have ${dueTasks.length} pending task(s) due today or earlier!`,
        icon: "icon-192.png"
      });
    } else if (Notification.permission !== "denied") {
      Notification.requestPermission().then(permission => {
        if (permission === "granted") {
          new Notification("Task Reminder", {
            body: `You have ${dueTasks.length} pending task(s) due today or earlier!`,
            icon: "icon-192.png"
          });
        }
      });
    }
  }
};

// THEME TOGGLE
let isDarkMode = localStorage.getItem("darkMode") === "true";
if (isDarkMode) document.body.classList.add("dark-mode");
themeToggle.innerHTML = isDarkMode ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';

themeToggle.addEventListener("click", () => {
  isDarkMode = !isDarkMode;
  document.body.classList.toggle("dark-mode", isDarkMode);
  themeToggle.innerHTML = isDarkMode ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
  localStorage.setItem("darkMode", isDarkMode);
  showToast(isDarkMode ? '<i class="fa-solid fa-moon"></i> Dark mode enabled' : '<i class="fa-solid fa-sun"></i> Light mode enabled');
});

// PWA INSTALL MODAL
let deferredPrompt;
const installModal = document.getElementById("install-modal");
const btnInstall = document.getElementById("install-accept");
const btnDecline = document.getElementById("install-decline");

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  if (!localStorage.getItem('pwaDeclined')) {
    installModal.style.display = "flex";
  }
});

btnInstall.addEventListener('click', () => {
  installModal.style.display = "none";
  if (deferredPrompt) {
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then((choiceResult) => {
      if (choiceResult.outcome === 'accepted') {
        showToast('<i class="fa-solid fa-check"></i> App installed successfully!');
      }
      deferredPrompt = null;
    });
  }
});
btnDecline.addEventListener('click', () => {
  installModal.style.display = "none";
  localStorage.setItem('pwaDeclined', 'true');
});


// POMODORO STATE
let timerInterval = null;
let timeLeft = 25 * 60; // 25 minutes
let isTimerRunning = false;

// SERVICE WORKER REGISTRATION
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(registration => console.log('ServiceWorker registration successful'))
      .catch(err => console.log('ServiceWorker registration failed: ', err));
  });
}

//TASK DATA STORAGE
let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
let taskIdCounter = tasks.length > 0 ? Math.max(...tasks.map(t => t.id)) + 1 : 1;
let currentFilter = "all";
let searchTerm = "";

const saveTasks = () => {
  localStorage.setItem('tasks', JSON.stringify(tasks));
};

// EVENT LISTENERS
taskInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter" && !addBtn.disabled) addTask();
});
taskInput.addEventListener("input", function () {
  addBtn.disabled = this.value.trim() === "";
});
searchInput.addEventListener("input", function () {
  searchTerm = this.value.toLowerCase();
  renderTask();
});

filterButtons.forEach((btn) => {
  btn.addEventListener("click", function () {
    filterButtons.forEach((b) => b.classList.remove("active"));
    this.classList.add("active");
    currentFilter = this.dataset.filter;
    renderTask();
  });
});

// EXPORT / IMPORT
exportBtn.addEventListener("click", () => {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(tasks));
  const dlAnchorElem = document.createElement('a');
  dlAnchorElem.setAttribute("href", dataStr);
  dlAnchorElem.setAttribute("download", "tasks_backup.json");
  dlAnchorElem.click();
  showToast('<i class="fa-solid fa-file-export"></i> Tasks exported successfully!');
});

importFile.addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const importedTasks = JSON.parse(e.target.result);
      if (Array.isArray(importedTasks)) {
        tasks = importedTasks;
        saveTasks();
        renderTask();
        showToast('<i class="fa-solid fa-file-import"></i> Tasks imported successfully!');
      }
    } catch (err) {
      showToast('<i class="fa-solid fa-triangle-exclamation"></i> Invalid JSON file');
    }
  };
  reader.readAsText(file);
});


// ADD TASK
const addTask = () => {
  const taskText = taskInput.value.trim();
  if (taskText === "") return showToast('<i class="fa-solid fa-circle-exclamation"></i> Please enter a task');

  const task = {
    id: taskIdCounter++,
    text: taskText,
    completed: false,
    dueDate: taskDate.value,
    priority: taskPriority.value,
    createdAt: new Date(),
  };

  tasks.push(task);
  saveTasks();

  taskInput.value = "";
  taskDate.value = "";
  taskPriority.value = "Medium";
  addBtn.disabled = true;

  renderTask();
  showToast('<i class="fa-solid fa-circle-plus"></i> Task added!');
};
addBtn.addEventListener("click", addTask);

// TOGGLE
const toggleTask = (taskId) => {
  const task = tasks.find((t) => t.id === taskId);
  if (task) {
    task.completed = !task.completed;
    saveTasks();
    renderTask();
    if(task.completed) showToast('<i class="fa-solid fa-circle-check"></i> Task marked completed!');
  }
};

// DELETE
const deleteTask = (taskId) => {
  if (confirm("Are you sure you want to delete this task?")) {
    tasks = tasks.filter((t) => t.id !== taskId);
    saveTasks();
    renderTask();
    showToast('<i class="fa-solid fa-trash-can"></i> Task deleted!');
  }
};

// EDIT
window.editTask = (taskId) => {
  const task = tasks.find((t) => t.id === taskId);
  if (!task) return;

  const taskEl = document.querySelector(`[data-data-id="${task.id}"]`);
  const mainInfo = taskEl.querySelector(".task-main-info");
  const actions = taskEl.querySelector(".task-actions");

  mainInfo.innerHTML = `<input type="text" class="task-input-edit" value="${task.text}" maxlength="100">`;
  actions.innerHTML = `
        <button class="btn save-btn" onclick="saveEdit(${taskId})">Save</button>
        <button class="btn cancel-btn" onclick="cancelEdit()">Cancel</button>
    `;
};

window.saveEdit = (taskId) => {
  const task = tasks.find((t) => t.id === taskId);
  if (!task) return;

  const taskEl = document.querySelector(`[data-data-id="${task.id}"]`);
  const taskInputEl = taskEl.querySelector(".task-input-edit");
  const newText = taskInputEl.value.trim();

  if (newText === "") return showToast('<i class="fa-solid fa-circle-exclamation"></i> Task cannot be empty!');
  task.text = newText;
  saveTasks();
  renderTask();
  showToast('<i class="fa-solid fa-pen-to-square"></i> Task updated!');
};

window.cancelEdit = () => renderTask();

// DRAG AND DROP GLOBALS
let dragStartIndex = -1;

// RENDER
const renderTask = () => {
  taskList.innerHTML = "";
  
  let filteredTask = tasks.filter(t => t.text.toLowerCase().includes(searchTerm));

  if (currentFilter === "completed") {
    filteredTask = filteredTask.filter((t) => t.completed);
  } else if (currentFilter === "pending") {
    filteredTask = filteredTask.filter((t) => !t.completed);
  }

  emptyState.style.display = filteredTask.length === 0 ? "block" : "none";

  filteredTask.forEach((task, index) => {
    const taskElement = createTask(task, index);
    taskList.appendChild(taskElement);
  });

  totalTaskElement.textContent = tasks.length;
  completedTask.textContent = tasks.filter((t) => t.completed).length;
  pendingTask.textContent = tasks.filter((t) => !t.completed).length;
};

// CREATE TASK ELEMENT
const createTask = (task, index) => {
  const li = document.createElement("li");
  li.className = `task-item ${task.completed ? "completed" : ""}`;
  li.setAttribute("data-data-id", task.id);
  li.setAttribute("draggable", "true");
  li.dataset.index = index; // for drag and drop

  const priorityClass = task.priority ? task.priority.toLowerCase() : 'medium';
  const badgeHTML = task.priority ? `<span class="badge ${priorityClass}">${task.priority}</span>` : '';
  const dateHTML = task.dueDate ? `<span class="badge"><i class="fa-regular fa-calendar"></i> ${task.dueDate}</span>` : '';

  li.innerHTML = `
  <div class="task-content">
    <div class="task-main-info">
      <input type="checkbox" class="task-checkbox" ${task.completed ? "checked" : ""} onchange="toggleTask(${task.id})">
      <span class="task-text ${task.completed ? "completed" : ""}">${task.text}</span>
    </div>
    <div class="task-actions">
      <button class="btn edit-btn" onclick="editTask(${task.id})">Edit</button>
      <button class="btn delete-btn" onclick="deleteTask(${task.id})">Delete</button>
    </div>
  </div>
  <div class="task-meta">
    ${badgeHTML}
    ${dateHTML}
  </div>`;

  // DRAG AND DROP EVENTS
  li.addEventListener("dragstart", (e) => {
    dragStartIndex = tasks.indexOf(task); // Get real index in tasks array
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", dragStartIndex);
    setTimeout(() => li.classList.add("drag-over"), 0);
  });

  li.addEventListener("dragover", (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    li.style.border = "2px dashed #4facfe";
  });

  li.addEventListener("dragleave", () => {
    li.style.border = "";
  });

  li.addEventListener("dragend", () => {
    li.classList.remove("drag-over");
    li.style.border = "";
  });

  li.addEventListener("drop", (e) => {
    e.preventDefault();
    li.style.border = "";
    const dragEndIndex = tasks.indexOf(task);
    if (dragStartIndex !== dragEndIndex && dragStartIndex !== -1) {
      swapItems(dragStartIndex, dragEndIndex);
    }
  });

  return li;
};

// SWAP ARRAY ITEMS
const swapItems = (fromIndex, toIndex) => {
  const item = tasks.splice(fromIndex, 1)[0];
  tasks.splice(toIndex, 0, item);
  saveTasks();
  renderTask();
};


const init = () => {
  addBtn.disabled = true;
  renderTask();
  updatePomodoroDisplay();
  checkDueDates();
};

// POMODORO LOGIC
const formatTime = (seconds) => {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

const updatePomodoroDisplay = () => {
  pomodoroTime.textContent = formatTime(timeLeft);
};

pomodoroStartBtn.addEventListener('click', () => {
  if (isTimerRunning) {
    clearInterval(timerInterval);
    pomodoroStartBtn.textContent = 'Start';
    pomodoroStartBtn.classList.remove('cancel-btn');
    pomodoroStartBtn.classList.add('add-btn');
  } else {
    timerInterval = setInterval(() => {
      timeLeft--;
      updatePomodoroDisplay();
      if (timeLeft <= 0) {
        clearInterval(timerInterval);
        isTimerRunning = false;
        pomodoroStartBtn.textContent = 'Start';
        pomodoroStartBtn.classList.remove('cancel-btn');
        pomodoroStartBtn.classList.add('add-btn');
        showToast('<i class="fa-solid fa-stopwatch"></i> Pomodoro session completed! Take a break.');
        timeLeft = 25 * 60;
        updatePomodoroDisplay();
        
        // Also trigger native notification for Pomodoro
        if (Notification.permission === "granted") {
          new Notification("Pomodoro Complete", {
            body: "Your session is over. Take a break!",
            icon: "icon-192.png"
          });
        }
      }
    }, 1000);
    pomodoroStartBtn.textContent = 'Pause';
    pomodoroStartBtn.classList.remove('add-btn');
    pomodoroStartBtn.classList.add('cancel-btn');
  }
  isTimerRunning = !isTimerRunning;
});

pomodoroResetBtn.addEventListener('click', () => {
  clearInterval(timerInterval);
  isTimerRunning = false;
  timeLeft = 25 * 60;
  updatePomodoroDisplay();
  pomodoroStartBtn.textContent = 'Start';
  pomodoroStartBtn.classList.remove('cancel-btn');
  pomodoroStartBtn.classList.add('add-btn');
});

// Explicit window bindings for inline HTML onclick handlers
window.toggleTask = toggleTask;
window.deleteTask = deleteTask;

init();
