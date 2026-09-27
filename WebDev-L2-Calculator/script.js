const display = document.getElementById("display");
const tape = document.getElementById("tape");
const keys = document.getElementById("keys");

let current = "0";
let stored = null;
let operator = null;
let fresh = false;
let lastRight = null;

const symbols = { "+": "+", "−": "−", "×": "×", "÷": "÷" };

function format(value) {
  if (value === "Error") return "Error";
  const number = Number(value);
  if (!Number.isFinite(number)) return "Error";
  const text = Number.isInteger(number) ? String(number) : String(Math.round(number * 1e10) / 1e10);
  return text.length > 14 ? number.toExponential(6) : text;
}

function paint() {
  display.textContent = format(current);
  if (operator && stored !== null) {
    tape.textContent = fresh
      ? `${format(stored)} ${symbols[operator]}`
      : `${format(stored)} ${symbols[operator]} ${format(current)}`;
  } else if (lastRight !== null && stored === null) {
    tape.textContent = lastRight;
  } else {
    tape.textContent = "";
  }

  keys.querySelectorAll(".op").forEach((button) => {
    button.classList.toggle("is-on", button.dataset.operator === operator && fresh);
  });
}

function apply(a, b, op) {
  const x = Number(a);
  const y = Number(b);
  if (op === "+") return x + y;
  if (op === "−") return x - y;
  if (op === "×") return x * y;
  if (y === 0) return "Error";
  return x / y;
}

function inputDigit(digit) {
  if (current === "Error") clearAll();
  if (fresh) {
    current = digit === "." ? "0." : digit;
    fresh = false;
    lastRight = null;
    paint();
    return;
  }
  if (digit === "." && current.includes(".")) return;
  current = current === "0" && digit !== "." ? digit : current + digit;
  paint();
}

function setOperator(next) {
  if (current === "Error") return;
  if (stored !== null && operator && !fresh) {
    const result = apply(stored, current, operator);
    lastRight = `${format(stored)} ${symbols[operator]} ${format(current)}`;
    current = String(result);
    stored = result === "Error" ? null : current;
    operator = result === "Error" ? null : next;
    fresh = true;
    paint();
    return;
  }
  stored = current;
  operator = next;
  fresh = true;
  lastRight = null;
  paint();
}

function equals() {
  if (current === "Error") return;
  if (stored === null || !operator) return;
  const result = apply(stored, current, operator);
  lastRight = `${format(stored)} ${symbols[operator]} ${format(current)} =`;
  current = String(result);
  stored = null;
  operator = null;
  fresh = true;
  paint();
}

function clearAll() {
  current = "0";
  stored = null;
  operator = null;
  fresh = false;
  lastRight = null;
  paint();
}

function del() {
  if (fresh || current === "Error") return;
  current = current.length <= 1 ? "0" : current.slice(0, -1);
  paint();
}

keys.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  if (button.dataset.digit !== undefined) inputDigit(button.dataset.digit);
  if (button.dataset.operator) setOperator(button.dataset.operator);
  if (button.dataset.action === "clear") clearAll();
  if (button.dataset.action === "delete") del();
  if (button.dataset.action === "equals") equals();
});

window.addEventListener("keydown", (event) => {
  const map = { "/": "÷", "*": "×", "-": "−", "+": "+" };
  if (/^[0-9.]$/.test(event.key)) inputDigit(event.key);
  if (map[event.key]) setOperator(map[event.key]);
  if (event.key === "Enter" || event.key === "=") {
    event.preventDefault();
    equals();
  }
  if (event.key === "Backspace") del();
  if (event.key === "Escape") clearAll();
});

paint();
