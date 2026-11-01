
let goals = JSON.parse(localStorage.getItem("studyverseGoals")) || [];

const goalButton = document.querySelector(".content-card button");
const goalMessage = document.querySelector(".content-card p");
const goalTitle = document.querySelector(".content-card h2");

function saveGoals() {
  localStorage.setItem("studyverseGoals", JSON.stringify(goals));
}

goalButton.addEventListener("click", function () {
  const goal = prompt("Enter your study goal:");

  if (goal === null || goal.trim() === "") {
    return;
  }

  goals.push({
    name: goal.trim(),
    completed: false
  });

  saveGoals();
  showGoals();
});

function showGoals() {
  goalTitle.textContent = "Today's Goals 🎯";
  goalMessage.innerHTML = "";

  if (goals.length === 0) {
    goalMessage.textContent = "You haven't added any goals yet.";
  }

  goals.forEach(function (goal, index) {
    const item = document.createElement("div");
    item.style.margin = "15px 0";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = goal.completed;

    checkbox.addEventListener("change", function () {
      goal.completed = checkbox.checked;
      saveGoals();
      showGoals();
    });

    const label = document.createElement("span");
    label.textContent = " " + goal.name;
    label.style.marginLeft = "8px";

    if (goal.completed) {
      label.style.textDecoration = "line-through";
      label.style.color = "#999";
    }

    item.appendChild(checkbox);
    item.appendChild(label);
    goalMessage.appendChild(item);
  });

  const completedTasks = goals.filter(
    goal => goal.completed
  ).length;

  document.querySelector(".stat-card h3").textContent =
    completedTasks;

  // Update daily progress
  const totalGoals = goals.length;

  const progress = totalGoals === 0
    ? 0
    : Math.round((completedTasks / totalGoals) * 100);

  document.getElementById("progressText").textContent =
    progress + "% Completed";

  document.getElementById("progressCount").textContent =
    completedTasks + "/" + totalGoals + " Goals";

  document.getElementById("progressFill").style.width =
    progress + "%";

  goalButton.textContent = "Add Another Goal";
  showTasksPageGoals();
}

showGoals();

let timeLeft = 25 * 60;
let timerInterval = null;

const timerDisplay = document.getElementById("timer");
const timerMessage = document.getElementById("timerMessage");

function updateTimerDisplay() {
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  timerDisplay.textContent =
    String(minutes).padStart(2, "0") + ":" +
    String(seconds).padStart(2, "0");
}

document.getElementById("startTimer").addEventListener("click", function () {
  if (timerInterval !== null) return;

  timerMessage.textContent = "Focus mode activated! 💪";

  timerInterval = setInterval(function () {
    if (timeLeft > 0) {
      timeLeft--;
      updateTimerDisplay();
    } else {
      clearInterval(timerInterval);
      timerInterval = null;
      timerMessage.textContent = "Session completed! Great work! 🎉";
      alert("Congratulations! You completed your focus session!");
    }
  }, 1000);
});

document.getElementById("pauseTimer").addEventListener("click", function () {
  clearInterval(timerInterval);
  timerInterval = null;
  timerMessage.textContent = "Timer paused. Take a breath! ☕";
});

document.getElementById("resetTimer").addEventListener("click", function () {
  clearInterval(timerInterval);
  timerInterval = null;
  timeLeft = 25 * 60;
  updateTimerDisplay();
  timerMessage.textContent = "Ready for another focus session! 🚀";
});

updateTimerDisplay();

let totalStudySeconds = Number(
  localStorage.getItem("studyverseStudySeconds")
) || 0;

function updateStudyTime() {
  const minutes = Math.floor(totalStudySeconds / 60);

  document.getElementById("studyHours").textContent =
    minutes + " min";
}

// Add one second of study time while the timer is running
const originalTimerStart = document.getElementById("startTimer");

originalTimerStart.addEventListener("click", function () {
  if (window.studyTrackingInterval) return;

  window.studyTrackingInterval = setInterval(function () {
    if (timerInterval !== null && timeLeft > 0) {
      totalStudySeconds++;

      localStorage.setItem(
        "studyverseStudySeconds",
        totalStudySeconds
      );

      updateStudyTime();
    }
  }, 1000);
});

document.getElementById("pauseTimer").addEventListener("click", function () {
  clearInterval(window.studyTrackingInterval);
  window.studyTrackingInterval = null;
});

document.getElementById("resetTimer").addEventListener("click", function () {
  clearInterval(window.studyTrackingInterval);
  window.studyTrackingInterval = null;
});

updateStudyTime();

let plannerTasks = JSON.parse(
  localStorage.getItem("studyversePlanner")
) || [];

const plannerInput = document.getElementById("plannerTask");
const plannerDate = document.getElementById("plannerDate");
const plannerTime = document.getElementById("plannerTime");
const plannerList = document.getElementById("plannerList");

document.getElementById("addPlannerTask").addEventListener("click", function () {
 const taskName = plannerInput.value.trim();
 const taskDate = plannerDate.value;
 const taskTime = plannerTime.value;

  if (!taskName || !taskDate || !taskTime) {
    alert("Please enter a task and select a date!");
    return;
  }

plannerTasks.push({
  name: taskName,
  date: taskDate,
  time: taskTime,
  completed: false
});

  localStorage.setItem(
    "studyversePlanner",
    JSON.stringify(plannerTasks)
  );

  plannerInput.value = "";
  plannerDate.value = "";
  plannerTime.value = "";

  showPlannerTasks();
});




function showPlannerTasks() {
  plannerList.innerHTML = "";

  const now = new Date();

  // Sort sessions by date and time
  const sortedTasks = plannerTasks
    .map((task, index) => ({ ...task, originalIndex: index }))
    .sort((a, b) => {
      const dateA = new Date(a.date + "T" + (a.time || "23:59"));
      const dateB = new Date(b.date + "T" + (b.time || "23:59"));
      return dateA - dateB;
    });

  sortedTasks.forEach(function (task) {
    const index = task.originalIndex;

    const item = document.createElement("div");
    item.className = "planner-item";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = task.completed === true;

    checkbox.addEventListener("change", function () {
      plannerTasks[index].completed = checkbox.checked;

      localStorage.setItem(
        "studyversePlanner",
        JSON.stringify(plannerTasks)
      );

      showPlannerTasks();
    });

    const details = document.createElement("div");
    const name = document.createElement("strong");
    const date = document.createElement("small");
    const status = document.createElement("span");
    status.setAttribute("class", "planner-status");

    name.textContent = task.name;

    date.textContent =
      "📅 " + task.date + "  🕒 " + (task.time || "No time set");

    const sessionDateTime = new Date(
      task.date + "T" + (task.time || "23:59")
    );

    if (task.completed) {
      status.textContent = "Completed ✅";
      status.style.color = "green";
    } else if (sessionDateTime < now) {
      status.textContent = "Missed ⚠️";
      status.style.color = "red";
    } else {
      status.textContent = "Upcoming 📅";
      status.style.color = "#7766e8";
    }

    status.style.display = "block";
    status.style.marginTop = "6px";
    date.style.display = "block";
    date.style.marginTop = "6px";

    if (task.completed) {
      name.style.textDecoration = "line-through";
      name.style.color = "#999";
    }

    details.appendChild(name);
    details.appendChild(date);
    details.appendChild(status);

    const deleteButton = document.createElement("button");
    deleteButton.textContent = "Delete";

    deleteButton.addEventListener("click", function () {
      plannerTasks.splice(index, 1);

      localStorage.setItem(
        "studyversePlanner",
        JSON.stringify(plannerTasks)
      );

      showPlannerTasks();
    });

    item.appendChild(checkbox);
    item.appendChild(details);
    item.appendChild(deleteButton);

    plannerList.appendChild(item);
  });
}
showPlannerTasks();

let studyNotes = JSON.parse(
  localStorage.getItem("studyverseNotes")
) || [];

const noteTitleInput = document.getElementById("noteTitle");
const noteContentInput = document.getElementById("noteContent");
const notesList = document.getElementById("notesList");

document.getElementById("saveNote").addEventListener("click", function () {
  const title = noteTitleInput.value.trim();
  const content = noteContentInput.value.trim();

  if (!title || !content) {
    alert("Please enter both a title and note.");
    return;
  }

  studyNotes.push({ title, content });

  localStorage.setItem(
    "studyverseNotes",
    JSON.stringify(studyNotes)
  );

  noteTitleInput.value = "";
  noteContentInput.value = "";

  showNotes();
});

function showNotes() {
  notesList.innerHTML = "";

  studyNotes.forEach(function (note, index) {
    const item = document.createElement("div");
    item.className = "note-item";

    const title = document.createElement("h3");
    title.textContent = note.title;

    const content = document.createElement("p");
    content.textContent = note.content;

    const deleteButton = document.createElement("button");
    deleteButton.textContent = "Delete";

    deleteButton.addEventListener("click", function () {
      studyNotes.splice(index, 1);

      localStorage.setItem(
        "studyverseNotes",
        JSON.stringify(studyNotes)
      );

      showNotes();
    });

    item.appendChild(title);
    item.appendChild(content);
    item.appendChild(deleteButton);

    notesList.appendChild(item);
  });
}

showNotes();
const themeToggle = document.getElementById("themeToggle");

themeToggle.addEventListener("click", function () {
  document.body.classList.toggle("dark-mode");

  if (document.body.classList.contains("dark-mode")) {
    themeToggle.textContent = "☀️ Light Mode";
    localStorage.setItem("studyverseTheme", "dark");
  } else {
    themeToggle.textContent = "🌙 Dark Mode";
    localStorage.setItem("studyverseTheme", "light");
  }
});

// Keep the selected theme after refreshing
if (localStorage.getItem("studyverseTheme") === "dark") {
  document.body.classList.add("dark-mode");
  themeToggle.textContent = "☀️ Light Mode";
}
// STUDYVERSE PAGE NAVIGATION

const navLinks = document.querySelectorAll(".sidebar nav a");
const pages = document.querySelectorAll(".page-section");

navLinks.forEach(function (link) {
  link.addEventListener("click", function (event) {
    event.preventDefault();

    const targetId = link.getAttribute("href").substring(1);

    // Hide all pages
    pages.forEach(function (page) {
      page.classList.remove("active");
    });

    // Show selected page
    const selectedPage = document.getElementById(targetId);

    if (selectedPage) {
      selectedPage.classList.add("active");
    }

    // Update active sidebar link
    navLinks.forEach(function (navLink) {
      navLink.classList.remove("active");
    });

    link.classList.add("active");

    // Return to top of selected page
    document.querySelector(".main-content").scrollTop = 0;
    window.scrollTo(0, 0);
  });
});

// DISPLAY GOALS ON MY TASKS PAGE

function showTasksPageGoals() {
  const goalList = document.getElementById("goalList");

  if (!goalList) return;

  goalList.innerHTML = "";

  goals.forEach(function (goal, index) {
    const item = document.createElement("div");
    item.style.margin = "15px 0";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = goal.completed;

    checkbox.addEventListener("change", function () {
      goal.completed = checkbox.checked;
      saveGoals();
      showGoals();
    });

    const label = document.createElement("span");
    label.textContent = " " + goal.name;
    label.style.marginLeft = "8px";

    if (goal.completed) {
      label.style.textDecoration = "line-through";
      label.style.color = "#999";
    }

item.appendChild(checkbox);
item.appendChild(label);

const deleteButton = document.createElement("button");
deleteButton.textContent = "Delete";
deleteButton.style.marginLeft = "15px";

deleteButton.addEventListener("click", function () {
  goals.splice(index, 1);
  saveGoals();
  showGoals();
});

item.appendChild(deleteButton);
goalList.appendChild(item);
  });
}

// ADD GOALS FROM MY TASKS PAGE

document.getElementById("addGoalButton").addEventListener("click", function () {
  const goal = prompt("Enter your study goal:");

  if (goal === null || goal.trim() === "") return;

  goals.push({
    name: goal.trim(),
    completed: false
  });

  saveGoals();
  showGoals();
});

// SHOW SAVED GOALS
showTasksPageGoals();
