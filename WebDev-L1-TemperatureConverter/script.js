const form = document.getElementById("converter");
const valueInput = document.getElementById("value");
const errorEl = document.getElementById("error");
const results = document.getElementById("results");

function toCelsius(value, unit) {
  if (unit === "C") return value;
  if (unit === "F") return ((value - 32) * 5) / 9;
  return value - 273.15;
}

function format(n) {
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  errorEl.hidden = true;
  results.hidden = true;

  const raw = valueInput.value.trim();
  if (raw === "" || Number.isNaN(Number(raw))) {
    errorEl.textContent = "Enter a numeric temperature.";
    errorEl.hidden = false;
    return;
  }

  const value = Number(raw);
  const unit = form.unit.value;
  const celsius = toCelsius(value, unit);

  if (celsius < -273.15) {
    errorEl.textContent = "That value is below absolute zero (−273.15°C).";
    errorEl.hidden = false;
    return;
  }

  document.getElementById("outC").textContent = `${format(celsius)} °C`;
  document.getElementById("outF").textContent = `${format((celsius * 9) / 5 + 32)} °F`;
  document.getElementById("outK").textContent = `${format(celsius + 273.15)} K`;
  results.hidden = false;
});
