function renderHeaderClock() {
  const panel = document.querySelector("#clockPanel");
  const today = document.querySelector("#todayText");
  const clock = document.querySelector("#clockText");
  if (!panel || !today || !clock) return;

  const now = new Date();
  const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");

  today.textContent = `${year}.${month}.${day} ${weekdays[now.getDay()]}요일`;
  clock.textContent = `${hours}:${minutes}`;
  panel.dateTime = now.toISOString();
}

renderHeaderClock();
setInterval(renderHeaderClock, 30 * 1000);
