// StudyVerse feature logic. Existing localStorage keys are deliberately retained.
// Reads are defensive: malformed saved data is left untouched until the user
// explicitly makes a change, so initialization never clears existing records.
function readArray(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "null");
    return Array.isArray(value) ? value : [];
  } catch (error) {
    return [];
  }
}

function readDailyStudy() {
  try {
    const value = JSON.parse(localStorage.getItem("studyverseDailyStudy") || "{}");
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
  } catch (error) {
    return {};
  }
}

let goals = readArray("studyverseGoals");
let plannerTasks = readArray("studyversePlanner");
let studyNotes = readArray("studyverseNotes");
let dailyStudy = readDailyStudy();
let totalStudySeconds = Math.max(0, Number(localStorage.getItem("studyverseStudySeconds")) || 0);
let timeLeft = 25 * 60;
let timerInterval = null;

const $ = selector => document.querySelector(selector);
const byId = id => document.getElementById(id);
const navLinks = document.querySelectorAll(".sidebar nav a");
const pages = document.querySelectorAll(".page-section");
const notesSearch = byId("notesSearch");

function saveGoals() {
  localStorage.setItem("studyverseGoals", JSON.stringify(goals));
}

function localDateKey(date) {
  return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0") + "-" + String(date.getDate()).padStart(2, "0");
}

function showPage(targetId, updateHash) {
  const selectedPage = byId(targetId);
  if (!selectedPage || !selectedPage.classList.contains("page-section")) return;
  pages.forEach(page => page.classList.toggle("active", page === selectedPage));
  navLinks.forEach(link => link.classList.toggle("active", link.getAttribute("href") === "#" + targetId));
  if (updateHash && window.location.hash !== "#" + targetId) {
    history.replaceState(null, "", "#" + targetId);
  }
  window.scrollTo(0, 0);
}

function handlePageLink(event) {
  const link = event.currentTarget;
  const targetId = (link.getAttribute("href") || "").slice(1);
  if (!byId(targetId) || !byId(targetId).classList.contains("page-section")) return;
  event.preventDefault();
  showPage(targetId, true);
}

document.querySelectorAll('.sidebar nav a, [data-page-link], .brand').forEach(link => {
  link.addEventListener("click", handlePageLink);
});
window.addEventListener("hashchange", function () {
  const targetId = window.location.hash.slice(1);
  showPage(byId(targetId) ? targetId : "dashboard", false);
});
showPage(byId(window.location.hash.slice(1)) ? window.location.hash.slice(1) : "dashboard", false);

// Daily goals: the same records are rendered on the dashboard and task page.
function renderGoalList(container, dashboardView) {
  if (!container) return;
  container.replaceChildren();
  if (!goals.length && !dashboardView) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "No goals yet. Add one small step to get started.";
    container.appendChild(empty);
    return;
  }

  goals.forEach(function (goal, index) {
    const row = document.createElement("div");
    row.className = "goal-row";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = goal.completed === true;
    checkbox.setAttribute("aria-label", "Mark " + goal.name + " complete");
    checkbox.addEventListener("change", function () {
      goals[index].completed = checkbox.checked;
      saveGoals();
      showGoals();
    });

    const label = document.createElement("span");
    label.textContent = goal.name;
    if (goal.completed) label.style.textDecoration = "line-through";
    const edit = document.createElement("button");
    edit.type = "button";
    edit.textContent = "Edit";
    edit.setAttribute("aria-label", "Edit goal: " + goal.name);
    edit.addEventListener("click", function () {
      const updatedName = prompt("Edit your study goal:", goal.name);
      if (updatedName === null || !updatedName.trim()) return;
      goals[index].name = updatedName.trim();
      saveGoals();
      showGoals();
    });
    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = "Delete";
    remove.setAttribute("aria-label", "Delete goal: " + goal.name);
    remove.addEventListener("click", function () {
      goals.splice(index, 1);
      saveGoals();
      showGoals();
    });
    row.append(checkbox, label, edit, remove);
    container.appendChild(row);
  });
}

function addGoal() {
  const name = prompt("Enter your study goal:");
  if (name === null || !name.trim()) return;
  goals.push({ name: name.trim(), completed: false });
  saveGoals();
  showGoals();
}

const dashboardGoalCard = byId("today-goals");
let dashboardGoalList = byId("todayGoalList");
if (!dashboardGoalList && dashboardGoalCard) {
  dashboardGoalList = document.createElement("div");
  dashboardGoalList.id = "todayGoalList";
  dashboardGoalList.className = "goal-list";
  const progress = dashboardGoalCard.querySelector(".progress-section");
  dashboardGoalCard.insertBefore(dashboardGoalList, progress || null);
}

function showGoals() {
  const completed = goals.filter(goal => goal.completed === true).length;
  const total = goals.length;
  const percent = total ? Math.round(completed / total * 100) : 0;
  const intro = $(".goal-intro");
  if (intro) intro.textContent = total ? "Your goals for today—keep going, one at a time." : "You haven't added any goals yet.";
  renderGoalList(dashboardGoalList, true);
  renderGoalList(byId("goalList"), false);

  const completedCount = byId("tasksCompleted");
  if (completedCount) completedCount.textContent = completed;
  const progressText = byId("progressText");
  if (progressText) progressText.textContent = percent + "% Completed";
  const progressCount = byId("progressCount");
  if (progressCount) progressCount.textContent = completed + "/" + total + " Goals";
  const progressFill = byId("progressFill");
  if (progressFill) progressFill.style.width = percent + "%";
  const progressBar = $(".progress-bar[role='progressbar']");
  if (progressBar) progressBar.setAttribute("aria-valuenow", String(percent));
}

[byId("addFirstGoal"), byId("addGoalButton")].filter(Boolean).forEach(button => button.addEventListener("click", addGoal));
showGoals();

// Focus timer and lifetime + daily study tracking share one interval so each
// real second of focus is recorded exactly once in both existing and chart data.
const timerDisplay = byId("timer");
const timerMessage = byId("timerMessage");
function updateTimerDisplay() {
  if (timerDisplay) {
    timerDisplay.textContent = String(Math.floor(timeLeft / 60)).padStart(2, "0") + ":" + String(timeLeft % 60).padStart(2, "0");
  }
}
function updateStudyTime() {
  const node = byId("studyHours");
  if (node) node.textContent = Math.floor(totalStudySeconds / 60) + " min";
}
function stopTimerInterval() {
  if (timerInterval !== null) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}
function renderWeeklyStudy() {
  const chart = byId("weeklyChart");
  if (!chart) return;
  chart.replaceChildren();
  const today = new Date();
  const days = [];
  for (let offset = 6; offset >= 0; offset--) {
    const date = new Date(today);
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - offset);
    const key = localDateKey(date);
    days.push({ date, key, seconds: Math.max(0, Number(dailyStudy[key]) || 0) });
  }
  const peak = Math.max(1, ...days.map(day => day.seconds));
  const totalMinutes = Math.floor(days.reduce((sum, day) => sum + day.seconds, 0) / 60);
  const total = byId("weeklyStudyTotal");
  if (total) total.textContent = totalMinutes >= 60 ? Math.floor(totalMinutes / 60) + "h " + totalMinutes % 60 + "m" : totalMinutes + " min";

  days.forEach(function (day) {
    const column = document.createElement("div");
    column.className = "chart-day" + (day.key === localDateKey(today) ? " today" : "");
    const minutes = Math.floor(day.seconds / 60);
    const value = document.createElement("strong");
    value.textContent = minutes ? (minutes >= 60 ? Math.floor(minutes / 60) + "h" : minutes + "m") : "";
    const track = document.createElement("div");
    track.className = "chart-track";
    const bar = document.createElement("div");
    bar.className = "chart-bar";
    bar.style.height = day.seconds ? Math.max(7, day.seconds / peak * 100) + "%" : "4px";
    track.appendChild(bar);
    const label = document.createElement("small");
    label.textContent = day.date.toLocaleDateString(undefined, { weekday: "short" });
    column.append(value, track, label);
    column.setAttribute("aria-label", label.textContent + ": " + minutes + " minutes of study");
    chart.appendChild(column);
  });
}

function updateStudyStreak() {
  const streakNode = byId("studyStreak");
  if (!streakNode) return;
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  // If today has not yet been studied, count a streak ending yesterday.
  if (!(Number(dailyStudy[localDateKey(date)]) > 0)) date.setDate(date.getDate() - 1);
  let streak = 0;
  while (Number(dailyStudy[localDateKey(date)]) > 0) {
    streak++;
    date.setDate(date.getDate() - 1);
  }
  streakNode.textContent = streak + (streak === 1 ? " day" : " days");
}

function recordStudySecond() {
  totalStudySeconds++;
  localStorage.setItem("studyverseStudySeconds", String(totalStudySeconds));
  const key = localDateKey(new Date());
  dailyStudy[key] = (Number(dailyStudy[key]) || 0) + 1;
  localStorage.setItem("studyverseDailyStudy", JSON.stringify(dailyStudy));
  updateStudyTime();
  renderWeeklyStudy();
  updateStudyStreak();
}

if (byId("startTimer")) byId("startTimer").addEventListener("click", function () {
  if (timerInterval !== null || timeLeft <= 0) return;
  if (timerMessage) timerMessage.textContent = "Focus mode activated! 💪";
  timerInterval = setInterval(function () {
    if (timeLeft <= 0) {
      stopTimerInterval();
      if (timerMessage) timerMessage.textContent = "Session completed! Great work! 🎉";
      alert("Congratulations! You completed your focus session!");
      return;
    }
    timeLeft--;
    recordStudySecond();
    updateTimerDisplay();
    if (timeLeft === 0) {
      stopTimerInterval();
      if (timerMessage) timerMessage.textContent = "Session completed! Great work! 🎉";
      alert("Congratulations! You completed your focus session!");
    }
  }, 1000);
});
if (byId("pauseTimer")) byId("pauseTimer").addEventListener("click", function () {
  stopTimerInterval();
  if (timerMessage) timerMessage.textContent = "Timer paused. Take a breath! ☕";
});
if (byId("resetTimer")) byId("resetTimer").addEventListener("click", function () {
  stopTimerInterval();
  timeLeft = 25 * 60;
  updateTimerDisplay();
  if (timerMessage) timerMessage.textContent = "Ready for another focus session! 🚀";
});
updateTimerDisplay();
updateStudyTime();
renderWeeklyStudy();
updateStudyStreak();

// Planner: preserve the existing planner storage key and record shape.
const plannerInput = byId("plannerTask");
const plannerDate = byId("plannerDate");
const plannerTime = byId("plannerTime");
const plannerList = byId("plannerList");
function savePlanner() {
  localStorage.setItem("studyversePlanner", JSON.stringify(plannerTasks));
}
function renderPlanner() {
  if (!plannerList) return;
  plannerList.replaceChildren();
  const sorted = plannerTasks.map((task, index) => ({ task, index })).sort((a, b) => {
    return new Date(a.task.date + "T" + (a.task.time || "23:59")) - new Date(b.task.date + "T" + (b.task.time || "23:59"));
  });
  if (!sorted.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "No study sessions planned yet. Add one above to get started.";
    plannerList.appendChild(empty);
    return;
  }
  sorted.forEach(function (entry) {
    const task = entry.task;
    const index = entry.index;
    const item = document.createElement("div");
    item.className = "planner-item";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = task.completed === true;
    checkbox.setAttribute("aria-label", "Mark " + task.name + " completed");
    checkbox.addEventListener("change", function () {
      plannerTasks[index].completed = checkbox.checked;
      savePlanner();
      renderPlanner();
    });
    const details = document.createElement("div");
    const name = document.createElement("strong");
    name.textContent = task.name;
    const date = document.createElement("small");
    const parsedDate = new Date((task.date || "") + "T00:00:00");
    date.textContent = "📅 " + (Number.isNaN(parsedDate.getTime()) ? task.date : parsedDate.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })) + "  ·  🕒 " + (task.time || "No time set");
    const status = document.createElement("span");
    status.className = "planner-status";
    const sessionDateTime = new Date(task.date + "T" + (task.time || "23:59"));
    if (task.completed) status.textContent = "Completed ✅";
    else if (!Number.isNaN(sessionDateTime.getTime()) && sessionDateTime < new Date()) status.textContent = "Missed ⚠️";
    else status.textContent = "Upcoming 📅";
    details.append(name, date, status);
    const edit = document.createElement("button");
    edit.type = "button";
    edit.textContent = "Edit";
    edit.setAttribute("aria-label", "Edit session: " + task.name);
    edit.addEventListener("click", function () {
      const newName = prompt("Enter new task name:", task.name);
      if (newName === null || !newName.trim()) return;
      const newDate = prompt("Enter new date (YYYY-MM-DD):", task.date);
      if (newDate === null || !newDate.trim()) return;
      const newTime = prompt("Enter new time (HH:MM):", task.time || "");
      if (newTime === null || !newTime.trim()) return;
      plannerTasks[index] = { ...task, name: newName.trim(), date: newDate.trim(), time: newTime.trim() };
      savePlanner();
      renderPlanner();
    });
    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = "Delete";
    remove.setAttribute("aria-label", "Delete session: " + task.name);
    remove.addEventListener("click", function () {
      plannerTasks.splice(index, 1);
      savePlanner();
      renderPlanner();
    });
    item.append(checkbox, details, edit, remove);
    plannerList.appendChild(item);
  });
}
if (byId("addPlannerTask")) byId("addPlannerTask").addEventListener("click", function () {
  const name = plannerInput.value.trim();
  if (!name || !plannerDate.value || !plannerTime.value) {
    alert("Please enter a task and select both a date and time!");
    return;
  }
  plannerTasks.push({ name, date: plannerDate.value, time: plannerTime.value, completed: false });
  savePlanner();
  plannerInput.value = "";
  plannerDate.value = "";
  plannerTime.value = "";
  renderPlanner();
});
renderPlanner();

// Notes: original {title, content} records remain compatible. Editing updates
// that record in place; search only filters rendered cards, never stored data.
const noteTitleInput = byId("noteTitle");
const noteContentInput = byId("noteContent");
const notesList = byId("notesList");
function saveNotes() {
  localStorage.setItem("studyverseNotes", JSON.stringify(studyNotes));
}
function renderNotes() {
  if (!notesList) return;
  notesList.replaceChildren();
  const query = notesSearch ? notesSearch.value.trim().toLowerCase() : "";
  let shown = 0;
  studyNotes.forEach(function (note, index) {
    const titleText = String(note.title || "");
    const contentText = String(note.content || "");
    if (query && !(titleText + " " + contentText).toLowerCase().includes(query)) return;
    shown++;
    const item = document.createElement("article");
    item.className = "note-item";
    const title = document.createElement("h3");
    title.textContent = titleText;
    const content = document.createElement("p");
    content.textContent = contentText;
    const edit = document.createElement("button");
    edit.type = "button";
    edit.textContent = "Edit";
    edit.setAttribute("aria-label", "Edit note: " + titleText);
    edit.addEventListener("click", function () {
      const updatedTitle = prompt("Edit note title:", titleText);
      if (updatedTitle === null || !updatedTitle.trim()) return;
      const updatedContent = prompt("Edit note content:", contentText);
      if (updatedContent === null || !updatedContent.trim()) return;
      studyNotes[index] = { ...note, title: updatedTitle.trim(), content: updatedContent.trim() };
      saveNotes();
      renderNotes();
    });
    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = "Delete";
    remove.setAttribute("aria-label", "Delete note: " + titleText);
    remove.addEventListener("click", function () {
      studyNotes.splice(index, 1);
      saveNotes();
      renderNotes();
    });
    item.append(title, content, edit, remove);
    notesList.appendChild(item);
  });
  const count = byId("notesCount");
  if (count) count.textContent = studyNotes.length + (studyNotes.length === 1 ? " note" : " notes");
  if (!shown) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = query ? "No notes match your search." : "No notes saved yet. Your next bright idea can start here.";
    notesList.appendChild(empty);
  }
}
if (byId("saveNote")) byId("saveNote").addEventListener("click", function () {
  const title = noteTitleInput.value.trim();
  const content = noteContentInput.value.trim();
  if (!title || !content) {
    alert("Please enter both a title and note.");
    return;
  }
  studyNotes.push({ title, content });
  saveNotes();
  noteTitleInput.value = "";
  noteContentInput.value = "";
  renderNotes();
});
if (notesSearch) notesSearch.addEventListener("input", renderNotes);
renderNotes();

// Theme choice keeps the original studyverseTheme key.
const themeToggle = byId("themeToggle");
function updateThemeButton() {
  if (!themeToggle) return;
  const isDark = document.body.classList.contains("dark-mode");
  themeToggle.innerHTML = isDark ? "☀️ <span>Light mode</span>" : "🌙 <span>Dark mode</span>";
  themeToggle.setAttribute("aria-pressed", String(isDark));
}
if (localStorage.getItem("studyverseTheme") === "dark") document.body.classList.add("dark-mode");
updateThemeButton();
if (themeToggle) themeToggle.addEventListener("click", function () {
  document.body.classList.toggle("dark-mode");
  localStorage.setItem("studyverseTheme", document.body.classList.contains("dark-mode") ? "dark" : "light");
  updateThemeButton();
});

const todayLabel = byId("todayLabel");
if (todayLabel) todayLabel.textContent = new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" }).toUpperCase();
