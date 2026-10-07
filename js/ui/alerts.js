let timer = null;

export function showAlert(msg) {
  const box = document.getElementById("alertBox");
  box.textContent = msg;
  box.classList.add("show");
  clearTimeout(timer);
  timer = setTimeout(() => box.classList.remove("show"), 9000);
}
