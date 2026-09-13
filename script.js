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
const alarmSound = document.getElementById("alarm-sound");
const menuToggle = document.getElementById("menu-toggle");
const topMenu = document.getElementById("top-menu");
const shareReceiptBtn = document.getElementById("share-receipt-btn");

const menuIcon = menuToggle.querySelector('i');
menuToggle.addEventListener("click", () => {
  const isOpen = topMenu.classList.toggle("open");
  if(isOpen) {
    menuIcon.classList.replace('fa-bars', 'fa-xmark');
    menuIcon.style.transform = 'rotate(90deg)';
  } else {
    menuIcon.classList.replace('fa-xmark', 'fa-bars');
    menuIcon.style.transform = 'rotate(0deg)';
  }
});

document.addEventListener("click", (e) => {
  if (!menuToggle.contains(e.target) && !topMenu.contains(e.target)) {
    topMenu.classList.remove("open");
    menuIcon.classList.replace('fa-xmark', 'fa-bars');
    menuIcon.style.transform = 'rotate(0deg)';
  }
});

// SERVICE WORKER REGISTRATION
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js')
    .then(reg => console.log('SW registered!', reg))
    .catch(err => console.error('SW registration failed!', err));
}

// PUSH NOTIFICATION HELPER
const showPushNotification = (title, body) => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then(registration => {
      registration.showNotification(title, {
        body: body,
        icon: './icon-192.svg',
        vibrate: [300, 100, 300, 100, 300], // vibration pattern
        requireInteraction: true // Keep on screen until clicked
      });
    });
  } else if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, { body: body, icon: './icon-192.svg', requireInteraction: true });
  }
};

// STATE
let tasks = JSON.parse(localStorage.getItem("tasks")) || [];
let taskIdCounter = tasks.length ? Math.max(...tasks.map(t => t.id)) + 1 : 1;
let draggedItemIndex = null;
let editingTaskId = null;

// INIT
const init = () => {
  renderTask();
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
  }, 6000);
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
          if ('Notification' in window && Notification.permission === 'granted') {
            showPushNotification('Upcoming Task', `${task.text} is due in 5 minutes!`);
          }
          task.preNotified = true;
          localStorage.setItem("tasks", JSON.stringify(tasks));
        }

        // Actual Alarm
        if (now >= dueTime && !task.notified) {
          // Play Alarm
          alarmSound.play().catch(e => console.log("Audio play blocked by browser."));
          
          showToast(`⏰ Alarm: "${task.text}" is due now!`);
          if ('Notification' in window && Notification.permission === 'granted') {
            showPushNotification('Task Due!', task.text);
          }
          task.notified = true;
          localStorage.setItem("tasks", JSON.stringify(tasks));
        }
      }
    });
  }, 10000); // check every 10 seconds
};

// ADD OR UPDATE TASK
const addTask = () => {
  const taskText = taskInput.value.trim();
  if (taskText === "") return;

  if (editingTaskId !== null) {
    // Update existing task
    const taskIndex = tasks.findIndex(t => t.id === editingTaskId);
    if (taskIndex !== -1) {
      tasks[taskIndex].text = taskText;
      tasks[taskIndex].desc = taskDesc.value.trim();
      
      // If due date changed, reset notification flags
      if (tasks[taskIndex].dueDate !== taskDate.value) {
        tasks[taskIndex].notified = false;
        tasks[taskIndex].preNotified = false;
      }
      tasks[taskIndex].dueDate = taskDate.value;
      tasks[taskIndex].priority = taskPriority.value;
    }
    editingTaskId = null;
    addBtn.innerText = 'Add Task';
    showToast("Task updated");
  } else {
    // Add new task
    const task = {
      id: taskIdCounter++,
      text: taskText,
      desc: taskDesc.value.trim(),
      completed: false,
      dueDate: taskDate.value,
      notified: false,
      preNotified: false,
      priority: taskPriority.value,
      createdAt: new Date().toISOString(),
      completedAt: null,
      isNew: true
    };
    tasks.push(task);
    showToast("Task added");
  }

  taskInput.value = "";
  taskDesc.value = "";
  taskDate.value = "";
  taskPriority.value = "Medium";
  saveTasks();
  if (typeof taskInputModal !== 'undefined' && taskInputModal) {
    taskInputModal.classList.remove("show");
  }
};

addBtn.addEventListener("click", () => {
  // Request permission on user gesture if not already granted
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
  addTask();
});

taskInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
    addTask();
  }
});

// CREATE TASK ELEMENT
const createTask = (task, index) => {
  const li = document.createElement("li");
  li.className = `task-item ${task.completed ? "completed" : ""}`;
  li.setAttribute("data-id", task.id);
  li.setAttribute("draggable", "true");
  li.dataset.index = index;

  if (task.isNew) {
    const priority = task.priority || "Medium";
    li.classList.add(`task-add-${priority.toLowerCase()}`);
    task.isNew = false;
  }
  
  if (task.isRecentlyCompleted) {
    const priority = task.priority || "Medium";
    li.classList.add(`task-comp-${priority.toLowerCase()}`);
    task.isRecentlyCompleted = false;
  }

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
    <button class="edit-btn" title="Edit Task"><i class="fa-solid fa-pen"></i></button>
    <button class="delete-btn" title="Delete Task"><i class="fa-solid fa-trash"></i></button>
    <i class="fa-solid fa-grip-lines drag-handle"></i>
  </div>
  `;

  // Toggle Checkbox
  const checkbox = li.querySelector(".task-item-checkbox");
  checkbox.addEventListener("change", () => {
    task.completed = checkbox.checked;
    const priority = task.priority || "Medium";
    
    if (task.completed) {
      task.completedAt = new Date().toISOString();
      task.isRecentlyCompleted = true;
      
      const compliments = {
        "High": [
          "Thou hast conquered the highest peak! Thy glory outshines the fullest moon upon a midnight sea! 🌕",
          "As the moon doth rule the starry heavens, so hast thou mastered this mighty labor! ✨",
          "A wondrous triumph! Even the great lunar sphere bows to the brilliance of thy deed! 🌙",
          "Lo, a monumental victory! Thy strength is as the tidal pull of the silver moon! 🌊",
          "The night sky rejoiceth! Thou hast vanquished thy greatest task beneath the watchful moon! 🌖"
        ],
        "Medium": [
          "Well wrought, mine own beloved! Thy steady hands shine with the grace of the crescent moon. 🌙",
          "Sweet victory! Another noble task illuminated by thy lunar radiance. 🌌",
          "As the moon doth guide the weary traveler, thy diligence lighteth the path of triumph! 🌔",
          "Verily, thou art a marvel! Thy work glows softly as moonlight upon a quiet meadow. 🎑",
          "Another beautiful deed accomplished, bathed in the silver glow of the evening star! ✨"
        ],
        "Low": [
          "A gentle labor, sweetly finished, like a fleeting shadow passing o'er the moon. 🌘",
          "Softly and gracefully done, my dearest, as the moonbeams caress the slumbering earth. 🌠",
          "'Tis but a trifle for thee, yet thy brilliance twinkles like a quiet star beside the moon! 💫",
          "Even in the smallest of deeds, thy gentle lunar spirit doth bring peace to the night. 🌒",
          "A swift and quiet victory, like a pale moon rising in the early dusk. 🌛"
        ]
      };
      const msgs = compliments[priority];
      const randomMsg = msgs[Math.floor(Math.random() * msgs.length)];
      showToast(randomMsg);
    } else {
      task.completedAt = null;
    }
    saveTasks();
  });

  // Edit
  const editBtn = li.querySelector(".edit-btn");
  editBtn.addEventListener("click", () => {
    taskInput.value = task.text;
    taskDesc.value = task.desc || "";
    taskDate.value = task.dueDate || "";
    taskPriority.value = task.priority || "Medium";
    
    editingTaskId = task.id;
    addBtn.innerText = 'Save Update';
    if (typeof taskInputModal !== 'undefined' && taskInputModal) {
      taskInputModal.classList.add("show");
    }
    taskInput.focus();
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
  
  let filtered = tasks.filter(t => 
    t.text.toLowerCase().includes(filterText.toLowerCase()) || 
    (t.desc && t.desc.toLowerCase().includes(filterText.toLowerCase()))
  );

  if (currentFilter === "pending") {
    filtered = filtered.filter(t => !t.completed);
  } else if (currentFilter === "completed") {
    filtered = filtered.filter(t => t.completed);
  }
  
  if (filtered.length === 0) {
    emptyState.style.display = "block";
  } else {
    emptyState.style.display = "none";
    filtered.forEach((task, index) => {
      taskList.appendChild(createTask(task, index));
    });
  }

  updateStats();
};

// STATS
const updateStats = () => {
  const total = tasks.length;
  const completed = tasks.filter(t => t.completed).length;
  const pending = total - completed;
  document.getElementById("total-tasks").innerText = total;
  document.getElementById("completed-tasks").innerText = completed;
  document.getElementById("pending-tasks").innerText = pending;
};

// FILTER
let currentFilter = "all";
const filterBtns = document.querySelectorAll(".filter-btn");
filterBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    filterBtns.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    currentFilter = btn.getAttribute("data-filter");
    renderTask(searchInput.value);
  });
});

// SEARCH
searchInput.addEventListener("input", (e) => {
  renderTask(e.target.value);
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

// FAB AND MODAL
const fabAddTask = document.getElementById("fab-add-task");
const taskInputModal = document.getElementById("task-input-modal");
const closeInputModal = document.getElementById("close-input-modal");

fabAddTask.addEventListener("click", () => {
  taskInputModal.classList.add("show");
  taskInput.focus();
});

closeInputModal.addEventListener("click", () => {
  taskInputModal.classList.remove("show");
});

// THEME
const themeIcon = document.getElementById("theme-icon");
const themeText = document.getElementById("theme-text");

if (localStorage.getItem("theme") === "dark") {
  document.body.setAttribute("data-theme", "dark");
  if (themeIcon) {
    themeIcon.classList.remove("fa-moon");
    themeIcon.classList.add("fa-sun");
  }
  if (themeText) themeText.innerText = "Switch to Light Mode";
}

themeToggle.addEventListener("click", (e) => {
  e.stopPropagation();
  if (document.body.getAttribute("data-theme") === "dark") {
    document.body.removeAttribute("data-theme");
    localStorage.setItem("theme", "light");
    if (themeIcon) {
      themeIcon.classList.remove("fa-sun");
      themeIcon.classList.add("fa-moon");
    }
    if (themeText) themeText.innerText = "Switch to Dark Mode";
  } else {
    document.body.setAttribute("data-theme", "dark");
    localStorage.setItem("theme", "dark");
    if (themeIcon) {
      themeIcon.classList.remove("fa-moon");
      themeIcon.classList.add("fa-sun");
    }
    if (themeText) themeText.innerText = "Switch to Light Mode";
  }
});

// ALARM SELECTOR
const alarmSelector = document.getElementById("alarm-selector");
if (localStorage.getItem("alarmTone")) {
  alarmSelector.value = localStorage.getItem("alarmTone");
  alarmSound.src = alarmSelector.value;
}

alarmSelector.addEventListener("change", (e) => {
  const selectedTone = e.target.value;
  alarmSound.src = selectedTone;
  localStorage.setItem("alarmTone", selectedTone);
  
  // Play a quick preview
  alarmSound.currentTime = 0;
  alarmSound.play().catch(err => console.log("Audio preview blocked", err));
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
    installModal.classList.add('show');
  }
});

installAccept.addEventListener('click', async () => {
  installModal.classList.remove('show');
  if (deferredPrompt) {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);
    deferredPrompt = null;
  }
});

installDecline.addEventListener('click', () => {
  installModal.classList.remove('show');
  localStorage.setItem('pwaPromptDeclined', 'true');
});

init();

// SHARE RECEIPT
const formatReceipt = () => {
  let receipt = "🧾 TASK RECEIPT\n";
  receipt += `Generated on: ${new Date().toLocaleString()}\n`;
  receipt += "-----------------------------------\n\n";

  tasks.forEach((t, i) => {
    receipt += `${i + 1}. ${t.text}\n`;
    receipt += `   Priority: ${t.priority || "Medium"}\n`;
    
    // Created Date
    if (t.createdAt) {
      receipt += `   Added: ${new Date(t.createdAt).toLocaleString()}\n`;
    } else {
      receipt += `   Added: Unknown\n`;
    }
    
    // Status
    let statusText = t.completed ? "✅ Completed" : "⏳ Pending";
    if (!t.completed && t.dueDate) {
      const due = new Date(t.dueDate);
      if (new Date() > due) {
        statusText += " (🚨 OVERDUE)";
      }
    }
    receipt += `   Status: ${statusText}\n`;

    if (t.completedAt && t.completed) {
      receipt += `   Completed On: ${new Date(t.completedAt).toLocaleString()}\n`;
    }
    if (t.dueDate) {
      receipt += `   Due Date: ${new Date(t.dueDate).toLocaleString()}\n`;
    }
    receipt += "\n";
  });
  
  receipt += "-----------------------------------\n";
  receipt += `Total: ${tasks.length} | Completed: ${tasks.filter(t=>t.completed).length} | Pending: ${tasks.filter(t=>!t.completed).length}`;
  return receipt;
};

if (shareReceiptBtn) {
  shareReceiptBtn.addEventListener("click", async () => {
    if (tasks.length === 0) {
      showToast("No tasks to share!");
      return;
    }
    const receiptText = formatReceipt();
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Task Manager Receipt',
          text: receiptText
        });
        showToast("Receipt shared!");
      } catch (err) {
        console.log("Error sharing", err);
      }
    } else {
      // Fallback
      navigator.clipboard.writeText(receiptText).then(() => {
        showToast("Receipt copied to clipboard!");
      });
    }
  });
}
