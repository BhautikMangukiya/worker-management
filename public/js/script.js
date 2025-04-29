// ✅ Worker Management Functions

function openAddWorkerForm() {
  window.location.href = "/workers/add";
}

function editWorker(workerId) {
  window.location.href = `/workers/edit/${workerId}`;
}

function deleteWorker(workerId) {
  if (confirm("Are you sure you want to delete this worker?")) {
    fetch(`/workers/delete/${workerId}`, { method: "POST" })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to delete worker.");
        }
        window.location.reload();
      })
      .catch((err) => console.error("Delete Worker Error:", err));
  }
}

// ✅ Task Management Functions

function AddTaskForm(workerId) {
  window.location.href = `/tasks/add/${workerId}`;
}

// Toggle Add Task Form
function showAddTaskForm() {
  document.getElementById("addTaskForm").style.display = "block";
  document.getElementById("taskTable").style.display = "none";
}

// Fetch and Display Tasks
function viewTasks(workerId) {
  fetch(`/tasks/${workerId}/view`)
    .then((response) => {
      if (!response.ok) {
        throw new Error("Failed to fetch tasks.");
      }
      return response.json();
    })
    .then((tasks) => {
      document.getElementById("taskTable").style.display = "block";
      document.getElementById("addTaskForm").style.display = "none";

      const taskList = document.getElementById("taskList");
      taskList.innerHTML = "";

      if (tasks.length === 0) {
        taskList.innerHTML = '<tr><td colspan="4" style="text-align:center;">No tasks assigned</td></tr>';
        return;
      }

      tasks.forEach((task) => {
        taskList.innerHTML += `
          <tr>
            <td>${task.taskName}</td>
            <td>${task.taskDetails}</td>
            <td>${new Date(task.taskDate).toLocaleDateString()}</td>
            <td>${task.priority}</td>
          </tr>
        `;
      });
    })
    .catch((error) => console.error("View Tasks Error:", error));
}
