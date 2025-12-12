async function loadJSON(url) {
  const res = await fetch(url);
  return await res.json();
}

function createCard({ name, iconUrl, tooltip }) {
  const div = document.createElement("div");
  div.classList.add("badge-item");

  div.innerHTML = `
    <img src="${iconUrl}" alt="${name}">
    <p>${name}</p>
    <p class="character-description">${tooltip || ""}</p>
  `;
  return div;
}


async function renderCharacters() {
  const badgeContainer = document.getElementById("showcase-badges");
  const cursedContainer = document.getElementById("showcase-cursed");

  const [badges, cursed] = await Promise.all([
    loadJSON("/json/badges.json"),
    loadJSON("/json/cursed_characters.json"),
  ]);

  // Process badges
  badges.forEach(badge => {
    const card = createCard({
      name: badge.badgeName,
      iconUrl: badge.iconUrl,
      tooltip: badge.tooltip
    });
    badgeContainer.appendChild(card);
  });

  // Process cursed
  cursed.forEach(curse => {
    const card = createCard({
      name: curse.name,
      iconUrl: curse.url,
      tooltip: curse.tooltip
    });
    cursedContainer.appendChild(card);
  });
}

renderCharacters();
