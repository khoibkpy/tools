const search = document.querySelector("#toolSearch");
const cards = [...document.querySelectorAll(".tool-card")];
const count = document.querySelector("#toolCount");
const empty = document.querySelector("#emptyState");
const themeToggle = document.querySelector("#themeToggle");

function filterTools() {
  const q = search.value.trim().toLowerCase();
  let visible = 0;
  cards.forEach(card => {
    const match = !q || card.dataset.name.includes(q);
    card.classList.toggle("hidden", !match);
    if (match) visible++;
  });
  count.textContent = `${visible} công cụ`;
  empty.classList.toggle("hidden", visible !== 0);
}

search?.addEventListener("input", filterTools);

const savedTheme = localStorage.getItem("my-tools-theme");
if (savedTheme === "dark") document.body.classList.add("dark");

function updateThemeIcon() {
  themeToggle.textContent = document.body.classList.contains("dark") ? "☀" : "☾";
}
updateThemeIcon();

themeToggle?.addEventListener("click", () => {
  document.body.classList.toggle("dark");
  localStorage.setItem("my-tools-theme",
    document.body.classList.contains("dark") ? "dark" : "light");
  updateThemeIcon();
});
