"use strict";

const DATA_URL = "lectures.json";

const state = {
  lectures: [],
  category: "All",
  search: "",
  language: "all",
  sort: "featured",
};

const elements = {
  categoryTabs: document.getElementById("categoryTabs"),
  lectureGrid: document.getElementById("lectureGrid"),
  emptyState: document.getElementById("emptyState"),
  resultSummary: document.getElementById("resultSummary"),
  sectionTitle: document.getElementById("sectionTitle"),
  searchInput: document.getElementById("searchInput"),
  languageFilter: document.getElementById("languageFilter"),
  sortFilter: document.getElementById("sortFilter"),
  favoritesToggle: document.getElementById("favoritesToggle"),
  themeToggle: document.getElementById("themeToggle"),
  resetButton: document.getElementById("resetButton"),
  totalCount: document.getElementById("totalCount"),
  categoryCount: document.getElementById("categoryCount"),
  providerCount: document.getElementById("providerCount"),
  lastUpdated: document.getElementById("lastUpdated"),
  cardTemplate: document.getElementById("lectureCardTemplate"),
  videoModal: document.getElementById("videoModal"),
  modalTitle: document.getElementById("modalTitle"),
  modalSourceLink: document.getElementById("modalSourceLink"),
  videoFrame: document.getElementById("videoFrame"),
  closeModalButton: document.getElementById("closeModalButton")
};

initialize();

async function initialize() {
  applySavedTheme();
  bindEvents();

  try {
    const response = await fetch(DATA_URL, { cache: "no-store" });
    if (!response.ok) throw new Error(`Failed to load lecture data: ${response.status}`);

    const data = await response.json();
    state.lectures = validateLectures(data.lectures);
    elements.lastUpdated.textContent = data.lastUpdated || "—";
  } catch (error) {
    console.error(error);
    elements.lectureGrid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <div>⚠</div>
        <h3>Could not load lectures.json.</h3>
        <p>Open the site through a local server or GitHub Pages rather than double-clicking the file.</p>
      </div>`;
    return;
  }

  updateStatistics();
  renderAll();
}

function bindEvents() {
  elements.searchInput.addEventListener("input", debounce((event) => {
    state.search = event.target.value;
    renderLectures();
  }, 120));

  elements.languageFilter.addEventListener("change", (event) => {
    state.language = event.target.value;
    renderLectures();
  });

  elements.sortFilter.addEventListener("change", (event) => {
    state.sort = event.target.value;
    renderLectures();
  });

  elements.favoritesToggle.addEventListener("click", () => {
    state.favoritesOnly = !state.favoritesOnly;
    elements.favoritesToggle.setAttribute("aria-pressed", String(state.favoritesOnly));
    renderLectures();
  });

  elements.themeToggle.addEventListener("click", toggleTheme);
  elements.resetButton.addEventListener("click", resetFilters);
  elements.closeModalButton.addEventListener("click", closeVideoModal);

  elements.videoModal.addEventListener("click", (event) => {
    if (event.target === elements.videoModal) closeVideoModal();
  });

  elements.videoModal.addEventListener("close", () => {
    elements.videoFrame.replaceChildren();
  });
}

function renderAll() {
  renderCategories();
  renderLectures();
}

function renderCategories() {
  const categories = ["All", ...new Set(state.lectures.map((lecture) => lecture.category))];
  elements.categoryTabs.replaceChildren();

  categories.forEach((category) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `category-button${state.category === category ? " active" : ""}`;
    button.textContent = category;
    button.setAttribute("aria-pressed", String(state.category === category));

    button.addEventListener("click", () => {
      state.category = category;
      renderCategories();
      renderLectures();
    });

    elements.categoryTabs.append(button);
  });
}

function renderLectures() {
  const lectures = getVisibleLectures();

  elements.lectureGrid.replaceChildren();
  elements.emptyState.hidden = lectures.length !== 0;
  elements.lectureGrid.hidden = lectures.length === 0;

  elements.sectionTitle.textContent = state.favoritesOnly
    ? "Saved Lectures"
    : state.category === "All"
      ? "Every Lecture"
      : state.category;

  elements.resultSummary.textContent =
    `${lectures.length} ${lectures.length === 1 ? "lecture" : "lectures"}`;

  lectures.forEach((lecture) => {
    elements.lectureGrid.append(createLectureCard(lecture));
  });
}

function createLectureCard(lecture) {
  const fragment = elements.cardTemplate.content.cloneNode(true);
  const card = fragment.querySelector(".lecture-card");
  const image = fragment.querySelector(".lecture-thumbnail");
  const playButton = fragment.querySelector(".play-button");
  const metaRow = fragment.querySelector(".meta-row");
  const title = fragment.querySelector(".lecture-title");
  const provider = fragment.querySelector(".provider");
  const description = fragment.querySelector(".description");
  const tagRow = fragment.querySelector(".tag-row");
  const type = fragment.querySelector(".lecture-type");
  const sourceLink = fragment.querySelector(".source-link");

  card.dataset.id = lecture.id;

  image.src = getThumbnailUrl(lecture.videoId);
  image.alt = `Thumbnail for ${lecture.title}`;
  image.addEventListener("error", () => {
    image.src = createFallbackThumbnail(lecture.category);
  }, { once: true });

  [lecture.category, lecture.level, lecture.language].forEach((value) => {
    metaRow.append(createPill(value));
  });

  title.textContent = lecture.title;

  provider.textContent = lecture.instructor
    ? `${lecture.provider} · ${lecture.instructor}`
    : lecture.provider;

  description.textContent = lecture.description;

  lecture.tags.forEach((tag) => {
    const tagElement = document.createElement("span");
    tagElement.className = "tag";
    tagElement.textContent = `#${tag}`;
    tagRow.append(tagElement);
  });

  type.textContent = lecture.playlistId
    ? `${lecture.type} · Playlist`
    : lecture.type;

  sourceLink.href = getYouTubeUrl(lecture);

  playButton.setAttribute("aria-label", `Play ${lecture.title}`);
  playButton.addEventListener("click", () => openVideoModal(lecture));

  const isFavorite = state.favorites.has(lecture.id);

  return fragment;
}

function getVisibleLectures() {
  const query = normalizeText(state.search);

  const filtered = state.lectures.filter((lecture) => {
    const searchableText = normalizeText([
      lecture.title,
      lecture.provider,
      lecture.instructor,
      lecture.category,
      lecture.description,
      ...lecture.tags
    ].join(" "));

    return (
      (state.category === "All" || lecture.category === state.category) &&
      (state.language === "all" || lecture.language === state.language) &&
      (!state.favoritesOnly || state.favorites.has(lecture.id)) &&
      (!query || searchableText.includes(query))
    );
  });

  return filtered.sort((a, b) => {
    if (state.sort === "title") return a.title.localeCompare(b.title, "en");
    if (state.sort === "provider") return a.provider.localeCompare(b.provider, "en");
    if (state.sort === "newest") {
      return String(b.addedAt).localeCompare(String(a.addedAt));
    }

    return Number(b.featured || 0) - Number(a.featured || 0);
  });
}

function openVideoModal(lecture) {
  const iframe = document.createElement("iframe");

  iframe.src = getEmbedUrl(lecture);
  iframe.title = lecture.title;
  iframe.allow =
    "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
  iframe.allowFullscreen = true;

  elements.modalTitle.textContent = lecture.title;
  elements.modalSourceLink.href = getYouTubeUrl(lecture);
  elements.videoFrame.replaceChildren(iframe);
  elements.videoModal.showModal();
}

function closeVideoModal() {
  if (elements.videoModal.open) {
    elements.videoModal.close();
  }
}

function resetFilters() {
  state.category = "All";
  state.search = "";
  state.language = "all";
  state.sort = "featured";
  state.favoritesOnly = false;

  elements.searchInput.value = "";
  elements.languageFilter.value = "all";
  elements.sortFilter.value = "featured";
  elements.favoritesToggle.setAttribute("aria-pressed", "false");

  renderAll();
}

function updateStatistics() {
  elements.totalCount.textContent = state.lectures.length;

  elements.categoryCount.textContent =
    new Set(state.lectures.map((item) => item.category)).size;

  elements.providerCount.textContent =
    new Set(state.lectures.map((item) => item.provider)).size;
}

function applySavedTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  const prefersDark =
    window.matchMedia("(prefers-color-scheme: dark)").matches;

  setTheme(saved || (prefersDark ? "dark" : "light"));
}

function toggleTheme() {
  const nextTheme =
    document.documentElement.dataset.theme === "dark"
      ? "light"
      : "dark";

  setTheme(nextTheme);
  localStorage.setItem(THEME_KEY, nextTheme);
}

function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  elements.themeToggle.textContent = theme === "dark" ? "☀" : "☾";

  elements.themeToggle.setAttribute(
    "aria-label",
    theme === "dark"
      ? "Switch to light mode"
      : "Switch to dark mode"
  );
}

function validateLectures(items) {
  if (!Array.isArray(items)) {
    throw new TypeError("lectures must be an array.");
  }

  return items
    .filter((item) =>
      item &&
      item.id &&
      item.title &&
      item.provider &&
      item.category &&
      item.videoId
    )
    .map((item) => ({
      id: String(item.id),
      title: String(item.title),
      provider: String(item.provider),
      instructor: String(item.instructor || ""),
      category: String(item.category),
      level: String(item.level || "Beginner"),
      language: String(item.language || "English"),
      description: String(item.description || ""),
      videoId: String(item.videoId),
      playlistId: String(item.playlistId || ""),
      type: String(item.type || "Lecture"),
      tags: Array.isArray(item.tags) ? item.tags.map(String) : [],
      featured: Number(item.featured || 0),
      addedAt: String(item.addedAt || "")
    }));
}

function createPill(text) {
  const element = document.createElement("span");
  element.className = "pill";
  element.textContent = text;
  return element;
}

function getYouTubeUrl(lecture) {
  const video = encodeURIComponent(lecture.videoId);
  const playlist = lecture.playlistId
    ? `&list=${encodeURIComponent(lecture.playlistId)}`
    : "";

  return `https://www.youtube.com/watch?v=${video}${playlist}`;
}

function getEmbedUrl(lecture) {
  const video = encodeURIComponent(lecture.videoId);
  const playlist = lecture.playlistId
    ? `&list=${encodeURIComponent(lecture.playlistId)}`
    : "";

  return `https://www.youtube-nocookie.com/embed/${video}?autoplay=1&rel=0${playlist}`;
}

function getThumbnailUrl(videoId) {
  return `https://i.ytimg.com/vi/${encodeURIComponent(videoId)}/hqdefault.jpg`;
}

function createFallbackThumbnail(category) {
  const safeText = String(category || "Open Lecture").slice(0, 28);

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="640" height="360">
      <rect width="100%" height="100%" fill="#eee7f5"/>
      <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
        font-family="Arial, sans-serif" font-size="34" fill="#694c86">
        ${escapeSvg(safeText)}
      </text>
    </svg>`;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLocaleLowerCase("en");
}

function escapeSvg(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function debounce(callback, delay) {
  let timer;

  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => callback(...args), delay);
  };
}