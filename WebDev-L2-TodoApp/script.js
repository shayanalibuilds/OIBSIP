
const form = document.getElementById("add-form");
const input = document.getElementById("task-input");
const pendingList = document.getElementById("pending-list");
const completedList = document.getElementById("completed-list");
const pendingCount = document.getElementById("pending-count");
const completedCount = document.getElementById("completed-count");
const pendingEmpty = document.getElementById("pending-empty");
const completedEmpty = document.getElementById("completed-empty");
const KEY = "slate-tasks";

const load = () => {
  try { return JSON.parse(localStorage.getItem(KEY)) ?? []; }
  catch { return []; }
};

let tasks = load();
const save = () => localStorage.setItem(KEY, JSON.stringify(tasks));
const stamp = (iso) => new Date(iso).toLocaleString();

function itemView(task) {
  const li = document.createElement("li");
  if (task.done) li.classList.add("done");
  li.innerHTML = `
    <button class="check" type="button" data-act="toggle" aria-label="Toggle complete"></button>
    <div>
      <h3></h3>
      <p class="when"></p>
    </div>
    <div class="acts">
      <button type="button" data-act="edit">Edit</button>
      <button type="button" data-act="delete">Delete</button>
    </div>
  `;
  li.querySelector("h3").textContent = task.text;
  li.querySelector(".when").textContent = task.done
    ? `Added ${stamp(task.createdAt)} · Done ${stamp(task.completedAt)}`
    : `Added ${stamp(task.createdAt)}`;
  li.addEventListener("click", (event) => {
    const act = event.target.dataset.act;
    if (act === "toggle") toggle(task.id);
    if (act === "edit") editTask(task.id, li);
    if (act === "delete") removeTask(task.id);
  });
  return li;
}

function render() {
  pendingList.innerHTML = "";
  completedList.innerHTML = "";
  const pending = tasks.filter((t) => !t.done);
  const done = tasks.filter((t) => t.done);
  pendingCount.textContent = String(pending.length);
  completedCount.textContent = String(done.length);
  pendingEmpty.classList.toggle("show", pending.length === 0);
  completedEmpty.classList.toggle("show", done.length === 0);
  pending.forEach((task) => pendingList.append(itemView(task)));
  done.forEach((task) => completedList.append(itemView(task)));
}

function addTask(text) {
  tasks.unshift({
    id: crypto.randomUUID(),
    text,
    done: false,
    createdAt: new Date().toISOString(),
    completedAt: null,
  });
  save();
  render();
}

function toggle(id) {
  tasks = tasks.map((task) => {
    if (task.id !== id) return task;
    const done = !task.done;
    return { ...task, done, completedAt: done ? new Date().toISOString() : null };
  });
  save();
  render();
}

function editTask(id, li) {
  const task = tasks.find((item) => item.id === id);
  const title = li.querySelector("h3");
  const field = document.createElement("input");
  field.type = "text";
  field.value = task.text;
  title.replaceWith(field);
  field.focus();
  field.select();
  const commit = () => {
    const text = field.value.trim();
    if (text) task.text = text;
    save();
    render();
  };
  field.addEventListener("blur", commit);
  field.addEventListener("keydown", (event) => {
    if (event.key === "Enter") field.blur();
    if (event.key === "Escape") render();
  });
}

function removeTask(id) {
  tasks = tasks.filter((task) => task.id !== id);
  save();
  render();
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = input.value.trim();
  if (!text) return;
  addTask(text);
  input.value = "";
});

render();
