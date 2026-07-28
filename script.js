"use strict";

const DATA_URL = "lectures.json";

const state = {
  lectures: [],
  category: "all",
  search: "",
  language: "all",
  type: "all"
};

const elements = {
  lectureGrid: document.getElementById("lectureGrid"),
  emptyState: document.getElementById("emptyState"),
  resultSummary: document.getElementById("resultSummary"),
  searchInput: document.getElementById("searchInput"),
  languageFilter: document.getElementById("languageFilter"),
  categoryFilter: document.getElementById("categoryFilter"),
  typeFilter: document.getElementById("typeFilter"),
  categoryTabs: document.getElementById("categoryTabs"),
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
  bindEvents();

  try {
    const response = await fetch(DATA_URL, {
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(
        `Failed to load lecture data: ${response.status}`
      );
    }

    const data = await response.json();

    state.lectures = validateLectures(data.lectures);
    elements.lastUpdated.textContent =
      data.lastUpdated || "—";
  } catch (error) {
    console.error(error);

    elements.lectureGrid.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1">
        <div>⚠</div>
        <h3>Could not load lectures.json.</h3>
        <p>
          Open the website through GitHub Pages or a local
          server instead of double-clicking index.html.
        </p>
      </div>
    `;

    return;
  }
  renderAll();
}

function bindEvents() {
  elements.searchInput?.addEventListener(
    "input",
    debounce((event) => {
      state.search = event.target.value;
      renderLectures();
    }, 120)
  );

  elements.languageFilter?.addEventListener(
    "change",
    (event) => {
      state.language = event.target.value;
      renderLectures();
    }
  );

  elements.categoryFilter?.addEventListener(
    "change",
    (event) => {
      state.category = event.target.value;
      renderCategories();
      renderLectures();
    }
  );

  elements.typeFilter?.addEventListener(
    "change",
    (event) => {
      state.type = event.target.value;
      renderLectures();
    }
  );

  elements.resetButton?.addEventListener(
    "click",
    resetFilters
  );

  elements.closeModalButton?.addEventListener(
    "click",
    closeVideoModal
  );

  elements.videoModal?.addEventListener(
    "click",
    (event) => {
      if (event.target === elements.videoModal) {
        closeVideoModal();
      }
    }
  );

  elements.videoModal?.addEventListener(
    "close",
    () => {
      elements.videoFrame.replaceChildren();
    }
  );
}

function renderAll() {
  renderCategories();
  renderLectures();
}

function renderCategories() {
  if (!elements.categoryTabs) return;

  const categories = [
  "all",
  ...new Set(
    state.lectures.flatMap((lecture) => lecture.category)
  )
];

  elements.categoryTabs.replaceChildren();

  categories.forEach((category) => {
    const button = document.createElement("button");

    button.type = "button";
    button.className =
      `category-button${
        state.category === category ? " active" : ""
      }`;

    button.textContent =
      category === "all" ? "All" : category;

    button.setAttribute(
      "aria-pressed",
      String(state.category === category)
    );

    button.addEventListener("click", () => {
      state.category = category;

      if (elements.categoryFilter) {
        elements.categoryFilter.value = category;
      }

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

  elements.resultSummary.textContent =
    `${lectures.length} ${
      lectures.length === 1 ? "lecture" : "lectures"
    }`;

  lectures.forEach((lecture) => {
    elements.lectureGrid.append(
      createLectureCard(lecture)
    );
  });
}

function createLectureCard(lecture) {
  const fragment =
    elements.cardTemplate.content.cloneNode(true);

  const card =
    fragment.querySelector(".lecture-card");

  const image =
    fragment.querySelector(".lecture-thumbnail");

  const playButton =
    fragment.querySelector(".play-button");

  const metaRow =
    fragment.querySelector(".meta-row");

  const title =
    fragment.querySelector(".lecture-title");

  const provider =
    fragment.querySelector(".provider");

  const tagRow =
    fragment.querySelector(".tag-row");

  const type =
    fragment.querySelector(".lecture-type");

  const sourceLink =
    fragment.querySelector(".source-link");

  card.dataset.id = lecture.id;

  image.src = getThumbnailUrl(lecture.videoId);
  image.alt = `Thumbnail for ${lecture.title}`;

  image.addEventListener(
    "error",
    () => {
      image.src = createFallbackThumbnail(
        lecture.category[0]
      );
    },
    { once: true }
  );

  lecture.category.forEach((category) => {
  metaRow.append(createPill(category));
  });

  metaRow.append(createPill(lecture.level));
  metaRow.append(createPill(lecture.language));

  title.textContent = lecture.title;

  provider.textContent = lecture.instructor
    ? `${lecture.provider} · ${lecture.instructor}`
    : lecture.provider;

  lecture.tags.forEach((tag) => {
    const tagElement =
      document.createElement("span");

    tagElement.className = "tag";
    tagElement.textContent = `#${tag}`;

    tagRow.append(tagElement);
  });

  type.textContent =
    lecture.type === "Playlist"
      ? "Playlist"
      : "Lecture";

  sourceLink.href = getYouTubeUrl(lecture);

  sourceLink.textContent =
    lecture.type === "Playlist"
      ? "See Playlist ↗"
      : "Watch Lecture ↗";

  playButton.setAttribute(
    "aria-label",
    `Play ${lecture.title}`
  );

  playButton.addEventListener("click", () => {
    openVideoModal(lecture);
  });

  return fragment;
}

function getVisibleLectures() {
  const query = normalizeText(state.search);

  const collator = new Intl.Collator("en", {
    sensitivity: "base",
    numeric: true,
    ignorePunctuation: true
  });

  return state.lectures
    .filter((lecture) => {
      const searchableText = normalizeText([
        lecture.title,
        lecture.provider,
        lecture.instructor,
        lecture.category.join(" "),
        lecture.type,
        ...lecture.tags
      ].join(" "));

      const matchesCategory =
        state.category === "all" ||
        lecture.category.includes(state.category);

      const matchesLanguage =
        state.language === "all" ||
        lecture.language === state.language;

      const matchesType =
        state.type === "all" ||
        lecture.type === state.type;

      const matchesSearch =
        !query ||
        searchableText.includes(query);

      return (
        matchesCategory &&
        matchesLanguage &&
        matchesType &&
        matchesSearch
      );
    })
    .sort((a, b) => {
      return collator.compare(
        a.title.trim(),
        b.title.trim()
      );
    });
}

function openVideoModal(lecture) {
  const iframe = document.createElement("iframe");

  iframe.src = getEmbedUrl(lecture);
  iframe.title = lecture.title;

  iframe.allow =
    "accelerometer; autoplay; clipboard-write; " +
    "encrypted-media; gyroscope; picture-in-picture; " +
    "web-share";

  iframe.allowFullscreen = true;

  elements.modalTitle.textContent = lecture.title;

  elements.modalSourceLink.href =
    getYouTubeUrl(lecture);

  elements.modalSourceLink.textContent =
    lecture.type === "Playlist"
      ? "See Original YouTube Playlist ↗"
      : "See Original YouTube Video ↗";

  elements.videoFrame.replaceChildren(iframe);
  elements.videoModal.showModal();
}

function closeVideoModal() {
  if (elements.videoModal.open) {
    elements.videoModal.close();
  }
}

function resetFilters() {
  state.category = "all";
  state.search = "";
  state.language = "all";
  state.type = "all";

  elements.searchInput.value = "";
  elements.languageFilter.value = "all";
  elements.categoryFilter.value = "all";

  if (elements.typeFilter) {
    elements.typeFilter.value = "all";
  }

  renderAll();
}

function updateStatistics() {
  elements.totalCount.textContent =
    state.lectures.length;

  elements.categoryCount.textContent =
    new Set(
      state.lectures.flatMap((item) => item.category)
      ).size;

  elements.providerCount.textContent =
    new Set(
      state.lectures.map((item) => item.provider)
    ).size;
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
    .map((item) => {
      const categories = Array.isArray(item.category)
        ? item.category
        : String(item.category).split(",");

      return {
        id: String(item.id),
        title: String(item.title).trim(),
        provider: String(item.provider).trim(),
        instructor: String(item.instructor || "").trim(),

        category: categories
          .map((category) => String(category).trim())
          .filter(Boolean),

        level: String(item.level || "Beginner").trim(),
        language: String(item.language || "English").trim(),
        videoId: String(item.videoId).trim(),
        playlistId: String(item.playlistId || "").trim(),

        type: String(
          item.type ||
          (item.playlistId ? "Playlist" : "Lecture")
        ).trim(),

        tags: Array.isArray(item.tags)
          ? item.tags.map((tag) => String(tag).trim())
          : [],

        featured: Number(item.featured || 0),
        addedAt: String(item.addedAt || "")
      };
    });
}

function createPill(text) {
  const element = document.createElement("span");

  element.className = "pill";
  element.textContent = text;

  return element;
}

function getYouTubeUrl(lecture) {
  const video =
    encodeURIComponent(lecture.videoId);

  if (lecture.playlistId) {
    const playlist =
      encodeURIComponent(lecture.playlistId);

    return (
      `https://www.youtube.com/watch` +
      `?v=${video}&list=${playlist}`
    );
  }

  return (
    `https://www.youtube.com/watch?v=${video}`
  );
}

function getEmbedUrl(lecture) {
  const video =
    encodeURIComponent(lecture.videoId);

  if (lecture.playlistId) {
    const playlist =
      encodeURIComponent(lecture.playlistId);

    return (
      `https://www.youtube-nocookie.com/embed/` +
      `${video}?autoplay=1&rel=0&list=${playlist}`
    );
  }

  return (
    `https://www.youtube-nocookie.com/embed/` +
    `${video}?autoplay=1&rel=0`
  );
}

function getThumbnailUrl(videoId) {
  return (
    `https://i.ytimg.com/vi/` +
    `${encodeURIComponent(videoId)}/hqdefault.jpg`
  );
}

function createFallbackThumbnail(category) {
  const safeText =
    String(category || "Open Lecture").slice(0, 28);

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg"
         width="640"
         height="360">
      <rect width="100%"
            height="100%"
            fill="#eee7f5"/>
      <text x="50%"
            y="50%"
            dominant-baseline="middle"
            text-anchor="middle"
            font-family="Arial, sans-serif"
            font-size="34"
            fill="#694c86">
        ${escapeSvg(safeText)}
      </text>
    </svg>
  `;

  return (
    `data:image/svg+xml;charset=UTF-8,` +
    encodeURIComponent(svg)
  );
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

    timer = setTimeout(
      () => callback(...args),
      delay
    );
  };
}