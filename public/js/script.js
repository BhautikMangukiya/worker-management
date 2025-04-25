function openAddWorkerForm() {
  window.location.href = "/workers/add";
}

function editWorker(workerId) {
  window.location.href = `/workers/edit/${workerId}`;
}

function deleteWorker(workerId) {
  if (confirm("Are you sure you want to delete this worker?")) {
    fetch(`/workers/delete/${workerId}`, { method: "POST" })
      .then(() => window.location.reload())
      .catch((err) => console.error(err));
  }
}

// task page

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
    .then((response) => response.json())
    .then((tasks) => {
      document.getElementById("taskTable").style.display = "block";
      document.getElementById("addTaskForm").style.display = "none";

      const taskList = document.getElementById("taskList");
      taskList.innerHTML = "";

      if (tasks.length === 0) {
        taskList.innerHTML = '<tr><td colspan="4">No tasks assigned</td></tr>'; 
        return;
      }

      tasks.forEach((task) => {
        taskList.innerHTML += `
                    <tr>
                        <td>${task.taskName}</td>
                        <td>${task.taskDetails}</td>
                        <td>${new Date(
                          task.taskDate
                        ).toLocaleDateString()}</td> <!-- Format date -->
                        <td>${task.priority}</td>
                    </tr>
                `;
      });
    })
    .catch((error) => console.error("Error fetching tasks:", error));
}

// pdf dawenloda
