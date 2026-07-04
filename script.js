
class NewsNode {
  constructor(title, image) {
    this.title = title;
    this.image = image;
    this.next = null;
  }
}

class CircularNewsList {
  constructor() {
    this.head = null;
    this.current = null;
  }

  create(items) {
    if (!items || items.length === 0) return;
    let prev = null;
    items.forEach(({ title, image }) => {
      const node = new NewsNode(title, image);
      if (!this.head) this.head = node;
      else prev.next = node;
      prev = node;
    });
    prev.next = this.head;
    this.current = this.head;
  }

  nextItem() {
    if (!this.current) return { title: "No headlines", image: "" };
    this.current = this.current.next;
    return { title: this.current.title, image: this.current.image };
  }
}

function initBreakingNews() {
  const items = [
    { title: "World Leaders Meet for Climate Summit 🌍", image: "https://via.placeholder.com/600x300?text=Climate+Summit" },
    { title: "New AI Tool Revolutionizes Education 💻", image: "https://via.placeholder.com/600x300?text=AI+Education" },
    { title: "Global Markets Hit Record High 📈", image: "https://via.placeholder.com/600x300?text=Global+Markets" },
    { title: "SpaceX Launches New Mission 🚀", image: "https://via.placeholder.com/600x300?text=SpaceX+Mission" },
    { title: "Medical Breakthrough in Cancer Research 🧬", image: "https://via.placeholder.com/600x300?text=Medical+Breakthrough" },
  ];

  const list = new CircularNewsList();
  list.create(items);

  const box = document.getElementById("breakingNewsBox");
  box.innerHTML = `
    <img id="breakingImage" src="${items[0].image}" class="breaking-image" alt="Breaking News">
    <p id="breakingHeadline">${items[0].title}</p>
  `;

  const img = document.getElementById("breakingImage");
  const headline = document.getElementById("breakingHeadline");

  setInterval(() => {
    box.style.opacity = 0;
    setTimeout(() => {
      const next = list.nextItem();
      img.src = next.image;
      headline.textContent = next.title;
      box.style.opacity = 1;
    }, 500);
  }, 3500);
}

// -------------------- News Application --------------------
class NewsApp {
  constructor() {
    this.API_KEY = "5472f65c041649b086b3c5cf805cef78";
    this.BASE_URL = "https://newsapi.org/v2";
    this.bookmarks = new Map();
    this.state = { category: "general", page: 1, query: "", articles: [] };
    this._loadBookmarks();
    this.init();
  }

  init() {
    this.setupTheme();
    this.setupEvents();
    this.loadNews();
    initBreakingNews();              
    this.renderBookmarkedNews();
  }

  setupTheme() {
    const theme = localStorage.getItem("theme") || "light";
    document.documentElement.setAttribute("data-theme", theme);
    document.getElementById("themeIcon").textContent = theme === "dark" ? "☀️" : "🌙";
    document.getElementById("themeToggle").onclick = () => {
      const current = document.documentElement.getAttribute("data-theme");
      const next = current === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      localStorage.setItem("theme", next);
      document.getElementById("themeIcon").textContent = next === "dark" ? "☀️" : "🌙";
    };
  }

  setupEvents() {
    document.querySelectorAll(".category-btn").forEach(btn => {
      btn.onclick = () => this.changeCategory(btn.dataset.category);
    });

    document.getElementById("searchInput").addEventListener("input", (e) => {
      this.state.query = e.target.value.trim();
      this.loadNews();
    });

    document.addEventListener("click", (e) => {
      const bookmarkBtn = e.target.closest(".bookmark-btn");
      if (bookmarkBtn) {
        const url = bookmarkBtn.dataset.url;
        const article = this.state.articles.find(a => a.url === url) || this.bookmarks.get(url);
        if (article) this.toggleBookmark(article);
        e.stopPropagation();
        return;
      }

      const card = e.target.closest(".news-card");
      if (card && card.dataset.url) {
        window.open(card.dataset.url, "_blank");
      }
    });

    document.getElementById("clearBookmarks").onclick = () => {
      if (confirm("Clear all bookmarks?")) {
        this.bookmarks.clear();
        this._saveBookmarks();
        this.renderBookmarkedNews();
      }
    };
  }

  async loadNews() {
    this._showLoading(true);
    const params = new URLSearchParams({
      apiKey: this.API_KEY,
      page: this.state.page,
      pageSize: 20,
      country: "us",
      category: this.state.category,
    });
    if (this.state.query) params.append("q", this.state.query);

    const url = `${this.BASE_URL}/top-headlines?${params.toString()}`;
    try {
      const resp = await fetch(url);
      const data = await resp.json();
      if (data.status === "ok") {
        this.state.articles = data.articles || [];
      } else {
        this.state.articles = this._sampleArticles();
      }
    } catch {
      this.state.articles = this._sampleArticles();
    } finally {
      this._showLoading(false);
      this.renderNews();
    }
  }

  renderNews() {
    const grid = document.getElementById("newsGrid");
    grid.innerHTML = "";
    this.state.articles.forEach(article => {
      const card = document.createElement("div");
      card.className = "news-card";
      card.dataset.url = article.url;

      const img = article.urlToImage ? `<img src="${article.urlToImage}" class="news-image" alt="news image">` : `<img src="https://via.placeholder.com/600x360?text=News" class="news-image" alt="placeholder">`;

      const isBookmarked = this.bookmarks.has(article.url);
      card.innerHTML = `
        ${img}
        <div class="news-content">
          <h3 class="news-title">${this._escapeHtml(article.title || "Untitled")}</h3>
          <p class="news-description">${this._escapeHtml(article.description || "")}</p>
          <div class="news-meta">
            <span>${this._escapeHtml(article.source?.name || "")}</span>
            <span>${new Date(article.publishedAt || Date.now()).toLocaleDateString()}</span>
          </div>
          <button class="bookmark-btn" data-url="${article.url}">
            ${isBookmarked ? "★ Bookmarked" : "☆ Bookmark"}
          </button>
        </div>
      `;
      grid.appendChild(card);
    });
  }

  toggleBookmark(article) {
    if (this.bookmarks.has(article.url)) {
      this.bookmarks.delete(article.url);
    } else {
      this.bookmarks.set(article.url, article);
    }
    this._saveBookmarks();
    this.renderBookmarkedNews();
    this.renderNews();
  }

  renderBookmarkedNews() {
    const section = document.getElementById("bookmarkedSection");
    const grid = document.getElementById("bookmarkedGrid");
    const items = Array.from(this.bookmarks.values());
    if (items.length === 0) {
      section.style.display = "none";
      return;
    }
    section.style.display = "block";
    grid.innerHTML = "";
    items.forEach(article => {
      const card = document.createElement("div");
      card.className = "news-card";
      card.dataset.url = article.url;
      const img = article.urlToImage ? `<img src="${article.urlToImage}" class="news-image">` : `<img src="https://via.placeholder.com/600x360?text=Bookmark" class="news-image">`;
      card.innerHTML = `
        ${img}
        <div class="news-content">
          <h3 class="news-title">${this._escapeHtml(article.title || "Untitled")}</h3>
          <p class="news-description">${this._escapeHtml(article.description || "")}</p>
        </div>
      `;
      grid.appendChild(card);
    });
  }

  changeCategory(cat) {
    this.state.category = cat;
    document.querySelectorAll(".category-btn").forEach(b => b.classList.remove("active"));
    const el = document.querySelector(`[data-category="${cat}"]`);
    if (el) el.classList.add("active");
    this.loadNews();
  }

    _saveBookmarks() {
    localStorage.setItem("newsBookmarks", JSON.stringify(Array.from(this.bookmarks.entries())));
  }

  _loadBookmarks() {
    const saved = JSON.parse(localStorage.getItem("newsBookmarks") || "[]");
    this.bookmarks = new Map(saved);
  }

  _sampleArticles() {
    return [
      {
        title: "Sample News Article 1",
        description: "This is a fallback article shown when the API is unreachable.",
        url: "https://example.com/news1",
        urlToImage: "https://via.placeholder.com/600x360?text=Sample+1",
        source: { name: "Example Source" },
        publishedAt: new Date().toISOString(),
      },
      {
        title: "Sample News Article 2",
        description: "Stay tuned for live updates once internet access is restored.",
        url: "https://example.com/news2",
        urlToImage: "https://via.placeholder.com/600x360?text=Sample+2",
        source: { name: "Example Source" },
        publishedAt: new Date().toISOString(),
      },
    ];
  }

  _showLoading(show) {
    document.getElementById("loading").style.display = show ? "block" : "none";
  }

  _escapeHtml(str) {
    if (!str) return "";
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
}

// -------------------- Initialize App --------------------
window.addEventListener("DOMContentLoaded", () => new NewsApp());
