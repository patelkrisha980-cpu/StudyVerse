

// Dashboard polish: make shortcut cards behave like the sidebar, without changing
// the existing navigation or any of the user's saved data.
document.querySelectorAll("[data-page-link]").forEach(function (link) {
  link.addEventListener("click", function (event) {
    const targetId = link.getAttribute("href").slice(1);
    const targetPage = document.getElementById(targetId);
    if (!targetPage) return;

    event.preventDefault();
    pages.forEach(function (page) { page.classList.remove("active"); });
    targetPage.classList.add("active");
    navLinks.forEach(function (navLink) {
      navLink.classList.toggle("active", navLink.getAttribute("href") === "#" + targetId);
    });
    document.querySelector(".main-content").scrollTop = 0;
    window.scrollTo(0, 0);
  });
});

// Track daily focus time separately from the existing lifetime total so the
// weekly chart can be built without altering or migrating existing records.
const dailyStudyKey = "studyverseDailyStudy";
let dailyStudy = {};
try {
  const savedDailyStudy = JSON.parse(localStorage.getItem(dailyStudyKey) || "{}");
  if (savedDailyStudy && typeof savedDailyStudy === "object" && !Array.isArray(savedDailyStudy)) {
    dailyStudy = savedDailyStudy;
  }
} catch (error) {
  dailyStudy = {};
}

function localDateKey(date) {
  return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0") + "-" + String(date.getDate()).padStart(2, "0");
}

function renderWeeklyStudy() {
  const chart = document.getElementById("weeklyChart");
  if (!chart) return;
  chart.innerHTML = "";
  const today = new Date();
  const days = [];
  for (let offset = 6; offset >= 0; offset--) {
    const date = new Date(today);
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - offset);
    const key = localDateKey(date);
    const seconds = Math.max(0, Number(dailyStudy[key]) || 0);
    days.push({ date, key, seconds });
  }
  const peak = Math.max(1, ...days.map(day => day.seconds));
  const totalSeconds = days.reduce((sum, day) => sum + day.seconds, 0);
  const totalMinutes = Math.floor(totalSeconds / 60);
  const totalLabel = totalMinutes >= 60
    ? Math.floor(totalMinutes / 60) + "h " + (totalMinutes % 60) + "m"
    : totalMinutes + " min";
  document.getElementById("weeklyStudyTotal").textContent = totalLabel;

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
    bar.style.height = day.seconds ? Math.max(7, (day.seconds / peak) * 100) + "%" : "4px";
    track.appendChild(bar);
    const label = document.createElement("small");
    label.textContent = day.date.toLocaleDateString(undefined, { weekday: "short" });
    column.append(value, track, label);
    column.setAttribute("aria-label", label.textContent + ": " + minutes + " minutes");
    chart.appendChild(column);
  });
}

function stopDailyStudyTracking() {
  if (window.studyverseDailyInterval) {
    clearInterval(window.studyverseDailyInterval);
    window.studyverseDailyInterval = null;
  }
}

document.getElementById("startTimer").addEventListener("click", function () {
  if (window.studyverseDailyInterval) return;
  window.studyverseDailyInterval = setInterval(function () {
    if (timerInterval === null || timeLeft <= 0) {
      stopDailyStudyTracking();
      return;
    }
    const key = localDateKey(new Date());
    dailyStudy[key] = (Number(dailyStudy[key]) || 0) + 1;
    localStorage.setItem(dailyStudyKey, JSON.stringify(dailyStudy));
    renderWeeklyStudy();
  }, 1000);
});
document.getElementById("pauseTimer").addEventListener("click", stopDailyStudyTracking);
document.getElementById("resetTimer").addEventListener("click", stopDailyStudyTracking);
renderWeeklyStudy();

// Search saved notes in place; filtering never changes the stored notes.
const notesSearch = document.getElementById("notesSearch");
if (notesSearch) {
  notesSearch.addEventListener("input", function () {
    const query = notesSearch.value.trim().toLowerCase();
    document.querySelectorAll("#notesList .note-item").forEach(function (note) {
      note.hidden = !note.textContent.toLowerCase().includes(query);
    });
  });
}

// Keep the dashboard's visible counters and labels in sync with existing data.
function updateDashboardPolish() {
  const completed = goals.filter(goal => goal.completed).length;
  const completedCount = document.getElementById("tasksCompleted");
  if (completedCount) completedCount.textContent = completed;

  const streakNode = document.getElementById("studyStreak");
  if (streakNode) {
    let streak = 0;
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    while ((Number(dailyStudy[localDateKey(date)]) || 0) > 0) {
      streak++;
      date.setDate(date.getDate() - 1);
    }
    streakNode.textContent = streak + (streak === 1 ? " day" : " days");
  }

  const todayLabel = document.getElementById("todayLabel");
  if (todayLabel) todayLabel.textContent = new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" }).toUpperCase();
}

// Existing render functions run on startup. Wrapping them keeps all original
// goal/note behavior while refreshing the enhanced dashboard after edits.
const originalShowGoals = showGoals;
showGoals = function () {
  originalShowGoals();
  updateDashboardPolish();
};
const originalShowNotes = showNotes;
showNotes = function () {
  originalShowNotes();
  const count = document.getElementById("notesCount");
  if (count) count.textContent = studyNotes.length + (studyNotes.length === 1 ? " note" : " notes");
  if (notesSearch && notesSearch.value) {
    const query = notesSearch.value.trim().toLowerCase();
    document.querySelectorAll("#notesList .note-item").forEach(function (note) {
      note.hidden = !note.textContent.toLowerCase().includes(query);
    });
  }
};
updateDashboardPolish();
