const form = document.getElementById("profileForm");
const statusMessage = document.getElementById("status");
const saveButton = document.getElementById("saveBtn");

const fields = {
  name: document.getElementById("name"),
  bio: document.getElementById("bio"),
  skills: document.getElementById("skills"),
  github: document.getElementById("github"),
  linkedin: document.getElementById("linkedin"),
  portfolio: document.getElementById("portfolio")
};

function makeLink(label, value) {
  if (!value) return "";
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol)) return "";
    return `<a href="${url.href}" target="_blank" rel="noopener noreferrer">${label}</a>`;
  } catch {
    return "";
  }
}

function updatePreview() {
  const name = fields.name.value.trim();
  document.getElementById("avatar").textContent = name ? name.charAt(0).toUpperCase() : "A";
  document.getElementById("previewName").textContent = name || "Your Name";
  document.getElementById("previewBio").textContent =
    fields.bio.value.trim() || "Your short bio will appear here. Share what makes you, you.";

  const skills = fields.skills.value.split(",").map(s => s.trim()).filter(Boolean).slice(0, 10);
  document.getElementById("previewSkills").innerHTML = skills.length
    ? skills.map(skill => {
        const span = document.createElement("span");
        span.textContent = skill;
        return span.outerHTML;
      }).join("")
    : '<span class="placeholder-skill">Your skills</span>';

  document.getElementById("previewLinks").innerHTML =
    makeLink("GitHub ↗", fields.github.value) +
    makeLink("LinkedIn ↗", fields.linkedin.value) +
    makeLink("Portfolio ↗", fields.portfolio.value);
}

Object.values(fields).forEach(field => field.addEventListener("input", updatePreview));
updatePreview();

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  statusMessage.classList.remove("error");
  statusMessage.textContent = "Saving your profile...";
  saveButton.disabled = true;
  document.getElementById("savedBox").classList.add("hidden");

  const payload = Object.fromEntries(
    Object.entries(fields).map(([key, field]) => [key, field.value.trim()])
  );

  try {
    const response = await fetch("/api/profiles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Unable to save profile.");

    statusMessage.textContent = result.message;
    const link = document.getElementById("profileLink");
    link.href = `/api/profiles/${encodeURIComponent(result.profile.id)}`;
    document.getElementById("savedBox").classList.remove("hidden");
  } catch (error) {
    statusMessage.textContent = error.message;
    statusMessage.classList.add("error");
  } finally {
    saveButton.disabled = false;
  }
});
