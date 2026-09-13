// ELEMENTS
const taskInput = document.getElementById("task-input");
const taskDesc = document.getElementById("task-desc");
const taskDate = document.getElementById("task-date");
const taskPriority = document.getElementById("task-priority");
const addBtn = document.getElementById("add-btn");
const taskList = document.getElementById("task-list");
const emptyState = document.getElementById("empty-state");
const searchInput = document.getElementById("search-input");
const themeToggle = document.getElementById("theme-toggle");
const exportBtn = document.getElementById("export-btn");
const importFile = document.getElementById("import-file");
const pomodoroToggle = document.getElementById("toggle-pomodoro");
const pomodoroSection = document.getElementById("pomodoro-section");
const alarmSound = document.getElementById("alarm-sound");

// STATE
let tasks = JSON.parse(localStorage.getItem("tasks")) || [];
let taskIdCounter = tasks.length ? Math.max(...tasks.map(t => t.id)) + 1 : 1;
let draggedItemIndex = null;

// INIT
const init = () => {
  renderTask();
  updatePomodoroDisplay();
  checkReminders();
};

// SAVE TO LOCAL STORAGE
const saveTasks = () => {
  localStorage.setItem("tasks", JSON.stringify(tasks));
  renderTask();
};

// NOTIFICATION / TOAST SYSTEM
const showToast = (message) => {
  const container = document.getElementById("toast-container");
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.innerText = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.remove();
  }, 3000);
};

// NATIVE NOTIFICATIONS & ALARM
const checkReminders = () => {
  setInterval(() => {
    const now = new Date();
    tasks.forEach(task => {
      if (task.dueDate && !task.completed) {
        const dueTime = new Date(task.dueDate);
        const timeDiffMs = dueTime - now;
        const timeDiffMinutes = timeDiffMs / (1000 * 60);

        // Pre-Alarm: 5 minutes before
        if (timeDiffMinutes <= 5 && timeDiffMinutes > 0 && !task.preNotified) {
          showToast(`⏳ Heads up: "${task.text}" is due in 5 minutes!`);
          if (Notification.permission === 'granted') {
            new Notification('Upcoming Task', { body: `${task.text} is due in 5 minutes!`, icon: './icon-192.svg' });
          }
          task.preNotified = true;
          localStorage.setItem("tasks", JSON.stringify(tasks));
        }

        // Actual Alarm
        if (now >= dueTime && !task.notified) {
          // Play Alarm
          alarmSound.play().catch(e => console.log("Audio play blocked by browser."));
          
          showToast(`⏰ Alarm: "${task.text}" is due now!`);
          if (Notification.permission === 'granted') {
            new Notification('Task Due!', { body: task.text, icon: './icon-192.svg' });
          } else if (Notification.permission !== 'denied') {
            Notification.requestPermission().then(permission => {
              if (permission === 'granted') {
                new Notification('Task Due!', { body: task.text, icon: './icon-192.svg' });
              }
            });
          }
          task.notified = true;
          localStorage.setItem("tasks", JSON.stringify(tasks));
        }
      }
    });
  }, 10000); // check every 10 seconds
};

// ADD TASK
const addTask = () => {
  const taskText = taskInput.value.trim();
  if (taskText === "") return;

  const task = {
    id: taskIdCounter++,
    text: taskText,
    desc: taskDesc.value.trim(),
    completed: false,
    dueDate: taskDate.value,
    notified: false,
    preNotified: false,
    priority: taskPriority.value,
    createdAt: new Date(),
  };

  tasks.push(task);
  taskInput.value = "";
  taskDesc.value = "";
  taskDate.value = "";
  taskPriority.value = "Medium";
  saveTasks();
  showToast("Task added");
};

addBtn.addEventListener("click", addTask);
taskInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") addTask();
});

// CREATE TASK ELEMENT
const createTask = (task, index) => {
  const li = document.createElement("li");
  li.className = `task-item ${task.completed ? "completed" : ""}`;
  li.setAttribute("data-id", task.id);
  li.setAttribute("draggable", "true");
  li.dataset.index = index;

  let displayDate = "";
  if (task.dueDate) {
    const d = new Date(task.dueDate);
    displayDate = d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
  const dateHTML = task.dueDate ? `<span class="badge"><i class="fa-regular fa-calendar"></i> ${displayDate}</span>` : '';
  const priorityClass = task.priority ? task.priority.toLowerCase() : 'medium';
  const badgeHTML = task.priority ? `<span class="badge ${priorityClass}"><i class="fa-solid fa-flag"></i> ${task.priority}</span>` : '';
  const descHTML = task.desc ? `<div class="task-desc">${task.desc}</div>` : '';

  li.innerHTML = `
  <input type="checkbox" class="task-item-checkbox" ${task.completed ? "checked" : ""} />
  <div class="task-content">
    <div class="task-text">${task.text}</div>
    ${descHTML}
    <div class="task-meta">
      ${dateHTML}
      ${badgeHTML}
    </div>
  </div>
  <div class="task-actions">
    <button class="delete-btn" title="Delete Task"><i class="fa-solid fa-trash"></i></button>
    <i class="fa-solid fa-grip-lines drag-handle"></i>
  </div>
  `;

  // Toggle Checkbox
  const checkbox = li.querySelector(".task-item-checkbox");
  checkbox.addEventListener("change", () => {
    task.completed = checkbox.checked;
    saveTasks();
  });

  // Delete
  const deleteBtn = li.querySelector(".delete-btn");
  deleteBtn.addEventListener("click", () => {
    tasks = tasks.filter((t) => t.id !== task.id);
    saveTasks();
    showToast("Task deleted");
  });

  // Drag Events
  li.addEventListener("dragstart", (e) => {
    draggedItemIndex = index;
    e.dataTransfer.effectAllowed = "move";
    li.style.opacity = "0.5";
  });
  li.addEventListener("dragover", (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  });
  li.addEventListener("drop", (e) => {
    e.preventDefault();
    const targetIndex = index;
    if (draggedItemIndex !== null && draggedItemIndex !== targetIndex) {
      const movedItem = tasks.splice(draggedItemIndex, 1)[0];
      tasks.splice(targetIndex, 0, movedItem);
      saveTasks();
    }
  });
  li.addEventListener("dragend", () => {
    li.style.opacity = "1";
    draggedItemIndex = null;
    renderTask();
  });

  return li;
};

// RENDER TASKS
const renderTask = (filterText = "") => {
  taskList.innerHTML = "";
  
  const filtered = tasks.filter(t => 
    t.text.toLowerCase().includes(filterText.toLowerCase()) || 
    (t.desc && t.desc.toLowerCase().includes(filterText.toLowerCase()))
  );
  
  if (filtered.length === 0) {
    emptyState.style.display = "block";
  } else {
    emptyState.style.display = "none";
    filtered.forEach((task, index) => {
      taskList.appendChild(createTask(task, index));
    });
  }
};

// SEARCH
searchInput.addEventListener("input", (e) => {
  renderTask(e.target.value);
});

// THEME TOGGLE
themeToggle.addEventListener("click", () => {
  const current = document.body.getAttribute("data-theme");
  const newTheme = current === "dark" ? "light" : "dark";
  document.body.setAttribute("data-theme", newTheme);
  localStorage.setItem("theme", newTheme);
});
if (localStorage.getItem("theme") === "dark") {
  document.body.setAttribute("data-theme", "dark");
}

// POMODORO TOGGLE
pomodoroToggle.addEventListener("click", () => {
  if (pomodoroSection.style.display === "none") {
    pomodoroSection.style.display = "block";
  } else {
    pomodoroSection.style.display = "none";
  }
});

// EXPORT/IMPORT
exportBtn.addEventListener("click", () => {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(tasks));
  const dlAnchorElem = document.createElement('a');
  dlAnchorElem.setAttribute("href", dataStr);
  dlAnchorElem.setAttribute("download", "tasks_export.json");
  dlAnchorElem.click();
  showToast("Tasks exported");
});

importFile.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const importedTasks = JSON.parse(event.target.result);
      if (Array.isArray(importedTasks)) {
        tasks = importedTasks;
        saveTasks();
        showToast("Tasks imported successfully");
      }
    } catch (err) {
      showToast("Error importing tasks");
    }
  };
  reader.readAsText(file);
});

// POMODORO LOGIC
let pomodoroInterval;
let timeLeft = 25 * 60;
let isPomodoroRunning = false;
const pomodoroTimeDisplay = document.getElementById("pomodoro-time");
const pomodoroStartBtn = document.getElementById("pomodoro-start");
const pomodoroResetBtn = document.getElementById("pomodoro-reset");

const updatePomodoroDisplay = () => {
  const m = Math.floor(timeLeft / 60).toString().padStart(2, "0");
  const s = (timeLeft % 60).toString().padStart(2, "0");
  pomodoroTimeDisplay.innerText = `${m}:${s}`;
};

pomodoroStartBtn.addEventListener("click", () => {
  if (isPomodoroRunning) {
    clearInterval(pomodoroInterval);
    pomodoroStartBtn.innerText = "Start";
  } else {
    pomodoroInterval = setInterval(() => {
      if (timeLeft > 0) {
        timeLeft--;
        updatePomodoroDisplay();
      } else {
        clearInterval(pomodoroInterval);
        alarmSound.play().catch(e => console.log("Audio blocked"));
        showToast("Pomodoro session completed!");
        isPomodoroRunning = false;
        pomodoroStartBtn.innerText = "Start";
      }
    }, 1000);
    pomodoroStartBtn.innerText = "Pause";
  }
  isPomodoroRunning = !isPomodoroRunning;
});

pomodoroResetBtn.addEventListener("click", () => {
  clearInterval(pomodoroInterval);
  isPomodoroRunning = false;
  pomodoroStartBtn.innerText = "Start";
  timeLeft = 25 * 60;
  updatePomodoroDisplay();
});

// PWA INSTALL
let deferredPrompt;
const installModal = document.getElementById('install-modal');
const installAccept = document.getElementById('install-accept');
const installDecline = document.getElementById('install-decline');

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  if (!localStorage.getItem('pwaPromptDeclined')) {
    installModal.style.display = 'flex';
  }
});

installAccept.addEventListener('click', async () => {
  installModal.style.display = 'none';
  if (deferredPrompt) {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);
    deferredPrompt = null;
  }
});

installDecline.addEventListener('click', () => {
  installModal.style.display = 'none';
  localStorage.setItem('pwaPromptDeclined', 'true');
});

init();
