const taskInput = document.getElementById("task-input");
const addBtn = document.getElementById("add-btn");
const taskList = document.getElementById("task-list");
const emptyState = document.getElementById("empty-state");
const totalTaskElement = document.getElementById("total-tasks");
const completedTask = document.getElementById("completed-tasks");
const pendingTask = document.getElementById("pending-tasks");
const filterButtons = document.querySelectorAll(".filter-btn");

//TASK DATA  STORAGE
let tasks = [];
let taskIdCounter = 1;
let currentFilter = "all";

//CLICK EVENT ON BUTTON
taskInput.addEventListener("keypress", function (e) {
  if (e.key === "Enter") {
    addTask();
  }
});

//iNPUT VALIDATION
taskInput.addEventListener("input", function () {
  const isEmpty = this.value.trim() === "";
  addBtn.disabled = isEmpty;
});

//FILTERING BUTTON AND REMOVING/ADDING ACTIVE STATE
filterButtons.forEach((btn) => {
  btn.addEventListener("click", function () {
    filterButtons.forEach((b) => b.classList.remove("active"));
    this.classList.add("active");
    currentFilter = this.dataset.filter;
    renderTask();
  });
});

//Adding Task
const addTask = () => {
  const taskText = taskInput.value.trim();
  console.log(taskText);

  if (taskText === "") {
    alert("Please enter task");
    return;
  }

  //create task object
  const task = {
    id: taskIdCounter++,
    text: taskText,
    completed: false,
    createdAt: new Date(),
  };

  //Updating the Array with new task
  tasks.push(task);

  //Clear input
  taskInput.value = "";
  addBtn.disabled = true;

  //update ui

  renderTask();
  // updateTask()
};

addBtn.addEventListener("click", addTask);

const toggleTask = (taskId) => {
  const task = tasks.find((task) => task.id === taskId);

  if (task) {
    task.completed = !task.completed;
    renderTask();
    // updateTask()
  }
};

const deleteTask = (taskId) => {
  if (confirm("Are you sure you want to delete this task?")) {
    tasks = tasks.filter((task) => task.id !== taskId);

    renderTask();
    // updateTask()
  }
};

const renderTask = () => {
  // Clear current tasks
  taskList.innerHTML = "";

  let filteredTask = tasks;

  if (currentFilter === "completed") {
    filteredTask = tasks.filter((task) => task.completed);
  } else if (currentFilter === "pending") {
    filteredTask = tasks.filter((t) => !t.completed);
  }

  if (filteredTask.length === 0) {
    emptyState.style.display = "block";
  } else {
    emptyState.style.display = "none";
  }

  filteredTask.forEach((task) => {
    const taskElement = createTask(task);
    taskList.appendChild(taskElement);
  });

  // Update task counts
  totalTaskElement.textContent = tasks.length;
  completedTask.textContent = tasks.filter((task) => task.completed).length;
  pendingTask.textContent = tasks.filter((task) => !task.completed).length;
};

const createTask = (task) => {
  const li = document.createElement("li");

  li.className = `task-item ${task.completed ? "completed" : ""}`;

  li.setAttribute("data-task-id", task.id);

  li.innerHTML = `<div class="task-content">
    <input type="checkbox" class="task-checkbox" ${
      task.completed ? "checked" : ""
    } onchange="toggleTask(${task.id})">
      <span class="task-text ${task.completed ? "completed" : ""}">${
    task.text
  }</span>
      <button class="btn delete-btn" onclick="deleteTask(${
        task.id
      })">Delete</button>
  </div>`;

  return li;
};

const init = () => {
  addBtn.disabled = true;
  renderTask();
  // updateTask()
};

init();
