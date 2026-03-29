// ===== SwissSideJob App (Frontend für Hostinger) =====

// ⚠️ WICHTIG: Ändere diese URL auf deine Render.com Backend-URL
const API_URL = 'https://swisssidejob-api.onrender.com';

const App = {
  currentPage: 'home',
  currentUser: null,
  jobs: [],
  nextId: 1,
  favorites: [],

  // Category icons
  categoryIcons: {
    'Garten': '🌿',
    'Haushalt': '🏠',
    'Transport': '🚚',
    'Nachhilfe': '📚',
    'Haustiere': '🐾',
    'Digital': '💻',
    'Handwerk': '🔧',
    'Events': '🎉',
    'Sonstiges': '📋',
  },

  // Known city coordinates for radius search (Switzerland)
  cityCoords: {
    'zuerich': { lat: 47.3769, lng: 8.5417 },
    'zürich': { lat: 47.3769, lng: 8.5417 },
    'zurich': { lat: 47.3769, lng: 8.5417 },
    'bern': { lat: 46.9480, lng: 7.4474 },
    'basel': { lat: 47.5596, lng: 7.5886 },
    'luzern': { lat: 47.0502, lng: 8.3093 },
    'st. gallen': { lat: 47.4245, lng: 9.3767 },
    'winterthur': { lat: 47.5001, lng: 8.7240 },
    'lausanne': { lat: 46.5197, lng: 6.6323 },
    'genf': { lat: 46.2044, lng: 6.1432 },
    'lugano': { lat: 46.0037, lng: 8.9511 },
    'biel': { lat: 47.1368, lng: 7.2467 },
    'thun': { lat: 46.7580, lng: 7.6280 },
    'aarau': { lat: 47.3925, lng: 8.0444 },
    'chur': { lat: 46.8499, lng: 9.5329 },
    'schaffhausen': { lat: 47.6960, lng: 8.6340 },
    'freiburg': { lat: 46.8065, lng: 7.1620 },
    'solothurn': { lat: 47.2088, lng: 7.5372 },
    'baden': { lat: 47.4734, lng: 8.3064 },
    'zug': { lat: 47.1663, lng: 8.5155 },
  },

  distanceKm(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLng/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  },

  getCoordsForLocation(location) {
    const loc = location.toLowerCase();
    for (const [city, coords] of Object.entries(this.cityCoords)) {
      if (loc.includes(city)) return coords;
    }
    return null;
  },

  async init() {
    this.loadData();
    await this.restoreSession();
    await this.loadJobsFromApi();
    this.seedJobs();
    this.bindGlobalEvents();
    this.checkPaymentReturn();
    this.router();
    window.addEventListener('hashchange', () => {
      this.checkPaymentReturn();
      this.router();
    });
  },

  // --- Data persistence ---
  loadData() {
    this.jobs = JSON.parse(localStorage.getItem('sj_jobs') || '[]');
    this.currentUser = JSON.parse(localStorage.getItem('sj_user') || 'null');
    this.nextId = parseInt(localStorage.getItem('sj_nextId') || '100');
    this.favorites = JSON.parse(localStorage.getItem('sj_favorites') || '[]');
  },

  saveData() {
    localStorage.setItem('sj_jobs', JSON.stringify(this.jobs));
    localStorage.setItem('sj_user', JSON.stringify(this.currentUser));
    localStorage.setItem('sj_nextId', String(this.nextId));
    localStorage.setItem('sj_favorites', JSON.stringify(this.favorites));
  },

  // --- Favorites ---
  toggleFavorite(id, e) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    const idx = this.favorites.indexOf(id);
    if (idx > -1) {
      this.favorites.splice(idx, 1);
      this.toast('Von Favoriten entfernt', '');
    } else {
      this.favorites.push(id);
      this.toast('Zu Favoriten hinzugefügt', 'success');
    }
    this.saveData();
    this.router();
  },

  isFavorite(id) {
    return this.favorites.includes(id);
  },

  // --- Jobs vom Backend laden ---
  async loadJobsFromApi() {
    try {
      const jobs = await this.api('/api/jobs');
      if (jobs && jobs.length > 0) {
        this.jobs = jobs;
        this.saveData();
      }
    } catch (err) {
      console.log('Backend nicht erreichbar, nutze lokale Daten.');
    }
  },

  // --- Seed demo jobs ---
  seedJobs() {
    if (this.jobs.length > 0) return;
    const demos = [
      {
        title: 'Gartenarbeit am Wochenende',
        description: 'Suche jemanden, der mir samstags bei der Gartenarbeit hilft. Rasen mähen, Hecke schneiden, Unkraut jäten. Werkzeug ist vorhanden. Ca. 4 Stunden.',
        category: 'Garten',
        location: 'Zürich, Seefeld',
        type: 'einmalig',
        price: 80,
        priceType: 'pauschal',
        postedBy: 'Maria S.',
        date: '2026-03-20',
        deadline: '2026-04-05',
        status: 'offen'
      },
      {
        title: 'Nachhilfe Mathematik (Klasse 10)',
        description: 'Mein Sohn braucht Nachhilfe in Mathe, speziell Algebra und Geometrie. 2x pro Woche, jeweils 1 Stunde. Gerne bei uns zu Hause oder online.',
        category: 'Nachhilfe',
        location: 'Bern, Länggasse',
        type: 'regelmaessig',
        price: 35,
        priceType: 'stunde',
        postedBy: 'Thomas K.',
        date: '2026-03-18',
        deadline: '',
        status: 'offen'
      },
      {
        title: 'Umzugshilfe gesucht',
        description: 'Brauche 2 kräftige Helfer für meinen Umzug am 5. April. 3. Stock ohne Aufzug. Transporter ist vorhanden. Dauer ca. 5-6 Stunden.',
        category: 'Transport',
        location: 'Basel, Kleinbasel',
        type: 'einmalig',
        price: 25,
        priceType: 'stunde',
        postedBy: 'Lisa M.',
        date: '2026-03-22',
        deadline: '2026-04-05',
        status: 'offen'
      },
      {
        title: 'Hund ausführen (Mo-Fr)',
        description: 'Suche zuverlässige Person, die meinen Labrador täglich mittags für ca. 30-45 Minuten ausführt. Er ist sehr lieb und gut erzogen.',
        category: 'Haustiere',
        location: 'Luzern, Altstadt',
        type: 'regelmaessig',
        price: 15,
        priceType: 'stunde',
        postedBy: 'Frank W.',
        date: '2026-03-21',
        deadline: '',
        status: 'offen'
      },
      {
        title: 'Website für kleines Café erstellen',
        description: 'Brauche eine einfache Website für mein Café: Startseite, Speisekarte, Kontakt, Öffnungszeiten. Schlicht und modern. Bilder liefere ich.',
        category: 'Digital',
        location: 'Online / Remote',
        type: 'einmalig',
        price: 450,
        priceType: 'pauschal',
        postedBy: 'Anna B.',
        date: '2026-03-19',
        deadline: '2026-04-15',
        status: 'offen'
      },
      {
        title: 'Wohnung putzen (2-Zimmer)',
        description: 'Regelmässige Reinigung meiner 2-Zimmer-Wohnung, ca. 55qm. Einmal pro Woche, vorzugsweise freitags. Putzmittel vorhanden.',
        category: 'Haushalt',
        location: 'Zürich, Oerlikon',
        type: 'regelmaessig',
        price: 15,
        priceType: 'stunde',
        postedBy: 'Jan P.',
        date: '2026-03-23',
        deadline: '',
        status: 'offen'
      }
    ];
    demos.forEach(d => {
      d.id = this.nextId++;
      d.applicants = [];
      this.jobs.push(d);
    });
    this.saveData();
  },

  // --- Router ---
  router() {
    const hash = location.hash.slice(1) || 'home';
    const [page, param] = hash.split('/');
    this.currentPage = page;
    this.renderNavbar();
    const main = document.getElementById('main');

    switch (page) {
      case 'home': this.renderHome(main); break;
      case 'jobs': this.renderJobs(main); break;
      case 'job': this.renderJobDetail(main, parseInt(param)); break;
      case 'new': this.renderNewJob(main); break;
      case 'my-jobs': this.renderMyJobs(main); break;
      case 'pricing': this.renderPricing(main); break;
      case 'login': this.renderLogin(main); break;
      case 'register': this.renderRegister(main); break;
      case 'favorites': this.renderFavorites(main); break;
      default: this.renderHome(main);
    }
    window.scrollTo(0, 0);
  },

  // --- Navbar ---
  renderNavbar() {
    const nav = document.getElementById('navbar');
    const favCount = this.favorites.length;
    const userLinks = this.currentUser
      ? `<a href="#jobs">Jobs finden</a>
         <a href="#pricing">Preise</a>
         <a href="#favorites" style="position:relative">Favoriten${favCount ? `<span style="position:absolute;top:-4px;right:-8px;background:var(--red);color:#fff;font-size:.65rem;font-weight:700;width:18px;height:18px;border-radius:50%;display:flex;align-items:center;justify-content:center">${favCount}</span>` : ''}</a>
         <a href="#new" class="btn-primary">Job anbieten</a>
         <a href="#my-jobs">Meine Jobs</a>
         <button onclick="App.logout()">Abmelden</button>`
      : `<a href="#jobs">Jobs finden</a>
         <a href="#pricing">Preise</a>
         <a href="#login">Anmelden</a>
         <a href="#register" class="btn-primary">Registrieren</a>`;

    nav.innerHTML = `
      <div class="navbar-inner">
        <a href="#home" class="logo">Swiss<span>SideJob</span></a>
        <button class="menu-toggle" onclick="document.querySelector('.nav-links').classList.toggle('open')">
          <svg fill="none" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" d="M4 6h16M4 12h16M4 18h16"/></svg>
        </button>
        <div class="nav-links">${userLinks}</div>
      </div>`;
  },

  // --- Footer ---
  footerHtml() {
    return `
      <footer class="footer-full">
        <div class="footer-inner">
          <div class="footer-col">
            <div class="footer-logo">Swiss<span>SideJob</span></div>
            <p class="footer-desc">Die Plattform für Nebenjobs in der Schweiz. Einfach, schnell und unkompliziert.</p>
            <div class="footer-social">
              <a href="#" aria-label="Instagram" class="social-link">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="5"/><circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" stroke="none"/></svg>
              </a>
              <a href="#" aria-label="LinkedIn" class="social-link">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-4 0v7h-4v-7a6 6 0 016-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>
              </a>
              <a href="#" aria-label="Twitter/X" class="social-link">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4l16 16M20 4L4 20"/></svg>
              </a>
            </div>
          </div>
          <div class="footer-col">
            <h4>Plattform</h4>
            <a href="#jobs">Jobs finden</a>
            <a href="#new">Job anbieten</a>
            <a href="#pricing">Preise</a>
            <a href="#register">Registrieren</a>
          </div>
          <div class="footer-col">
            <h4>Kategorien</h4>
            <a href="#jobs">Haushalt</a>
            <a href="#jobs">Garten</a>
            <a href="#jobs">Transport</a>
            <a href="#jobs">Nachhilfe</a>
          </div>
          <div class="footer-col">
            <h4>Rechtliches</h4>
            <a href="#">Impressum</a>
            <a href="#">Datenschutz</a>
            <a href="#">AGB</a>
            <a href="#">Kontakt</a>
          </div>
        </div>
        <div class="footer-bottom">
          <p>&copy; 2026 SwissSideJob. Alle Rechte vorbehalten. Made with ❤️ in der Schweiz 🇨🇭</p>
          <div class="footer-trust">
            <span>🔒 SSL verschlüsselt</span>
            <span>💳 Stripe Payments</span>
            <span>🇨🇭 Schweizer Plattform</span>
          </div>
        </div>
      </footer>`;
  },

  // --- Home Page ---
  renderHome(el) {
    const jobCount = this.jobs.filter(j => j.status === 'offen').length;
    const userCount = 150 + Math.floor(Math.random() * 50);
    const completedCount = 80 + Math.floor(Math.random() * 30);

    el.innerHTML = `
      <section class="hero">
        <div class="hero-inner">
          <h1>Finde deinen nächsten <em>Nebenjob</em></h1>
          <p>Biete Jobs an oder finde flexible Nebenjobs in deiner Nähe. Einfach, schnell und unkompliziert.</p>
          <div class="hero-actions">
            <a href="#jobs" class="btn btn-primary btn-lg">Jobs durchsuchen</a>
            <a href="#new" class="btn btn-hero-secondary">Job anbieten</a>
          </div>
          <div class="hero-stats">
            <div class="hero-stat">
              <span class="hero-stat-number" data-target="${jobCount}">${jobCount}</span>
              <span class="hero-stat-label">Offene Jobs</span>
            </div>
            <div class="hero-stat">
              <span class="hero-stat-number" data-target="${userCount}">${userCount}+</span>
              <span class="hero-stat-label">Registrierte Nutzer</span>
            </div>
            <div class="hero-stat">
              <span class="hero-stat-number" data-target="${completedCount}">${completedCount}+</span>
              <span class="hero-stat-label">Erledigte Jobs</span>
            </div>
          </div>
          <div class="hero-trust">
            <span>🔒 Sichere Zahlungen</span>
            <span>⚡ Sofort loslegen</span>
            <span>🇨🇭 100% Schweiz</span>
          </div>
        </div>
      </section>

      <section class="section-animate how-it-works">
        <h2>So funktioniert's</h2>
        <div class="steps">
          <div class="step">
            <div class="step-icon">📝</div>
            <h3>Registrieren</h3>
            <p>Erstelle kostenlos ein Konto in wenigen Sekunden.</p>
          </div>
          <div class="step">
            <div class="step-icon">🔍</div>
            <h3>Job finden oder anbieten</h3>
            <p>Durchsuche Angebote oder erstelle selbst einen Job.</p>
          </div>
          <div class="step">
            <div class="step-icon">🤝</div>
            <h3>Kontakt aufnehmen</h3>
            <p>Bewirb dich direkt oder wähle den besten Bewerber.</p>
          </div>
        </div>
      </section>

      <!-- SEKTION: Hilfe finden -->
      <section class="section-animate how-it-works" style="padding-top:0">
        <h2 class="section-title">Dein Leben ist voll genug.</h2>
        <p class="section-subtitle">Lass andere das erledigen, wofür dir die Zeit fehlt – und geniess den Moment.</p>
        <div class="card-grid">
          <div class="feature-card">
            <div class="feature-icon">📦</div>
            <h3>Umzug? Stressfrei erledigt.</h3>
            <p>Schwere Möbel, enger Treppenaufgang, null Bock auf Rückenschmerzen? Lehn dich zurück – jemand in deiner Nähe packt das für dich.</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon">🐕</div>
            <h3>Dein Hund vermisst die frische Luft.</h3>
            <p>12-Stunden-Tag und schlechtes Gewissen? Muss nicht sein. Finde jemanden, der deinen Vierbeiner so liebt wie du.</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon">✨</div>
            <h3>Heimkommen und durchatmen.</h3>
            <p>Stell dir vor, du kommst nach Hause und alles glänzt. Kein Putzen, kein Stress – einfach ankommen und geniessen.</p>
          </div>
        </div>
        <div style="text-align:center;margin-top:32px">
          <a href="#jobs" class="btn btn-primary">Hilfe finden</a>
        </div>
      </section>

      <!-- SEKTION: Geld verdienen -->
      <section class="section-animate how-it-works" style="padding-top:20px">
        <h2 class="section-title">Dein nächster Urlaub finanziert sich nicht von allein.</h2>
        <p class="section-subtitle">Ob Traumreise, neues iPhone oder einfach etwas Extra-Geld – mit SwissSideJob verdienst du es dir flexibel dazu.</p>
        <div class="card-grid">
          <div class="feature-card">
            <div class="feature-icon">🏖️</div>
            <h3>Spar dir den Traumurlaub zusammen.</h3>
            <p>Bali, Mallorca oder einfach mal raus? Jeden Job den du hier machst, bringt dich deinem Ziel ein Stück näher. Geld verdienen nach deinem Zeitplan.</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon">🎯</div>
            <h3>Endlich das kaufen, worauf du sparst.</h3>
            <p>Neues MacBook, Führerschein oder die erste eigene Wohnung? Hör auf zu warten. Nimm einen Nebenjob an und mach es möglich.</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon">💪</div>
            <h3>Arbeite wann du willst. Nicht wann du musst.</h3>
            <p>Kein Chef, keine festen Zeiten. Du entscheidest welchen Job du annimmst und wann. Perfekt neben Studium, Hauptjob oder Familie.</p>
          </div>
        </div>
        <div style="text-align:center;margin-top:32px">
          <a href="#register" class="btn btn-primary">Jetzt Geld verdienen</a>
        </div>
      </section>

      <!-- Kategorien Übersicht -->
      <section class="section-animate how-it-works" style="padding-top:0">
        <h2 class="section-title">Beliebte Kategorien</h2>
        <p class="section-subtitle">Von Haushalt bis Digital – finde den passenden Nebenjob.</p>
        <div class="category-grid">
          ${Object.entries(this.categoryIcons).map(([name, icon]) => {
            const count = this.jobs.filter(j => j.category === name && j.status === 'offen').length;
            return `<a href="#jobs" class="category-card" onclick="setTimeout(()=>{const s=document.getElementById('categoryFilter');if(s){s.value='${name}';App.filterJobs();}},100)">
              <span class="category-card-icon">${icon}</span>
              <span class="category-card-name">${name}</span>
              <span class="category-card-count">${count} Job${count !== 1 ? 's' : ''}</span>
            </a>`;
          }).join('')}
        </div>
      </section>

      ${this.footerHtml()}`;

    // Animate sections on scroll
    this.initScrollAnimations();
  },

  initScrollAnimations() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    }, { threshold: 0.1 });

    document.querySelectorAll('.section-animate').forEach(el => observer.observe(el));
  },

  // --- Jobs Listing ---
  renderJobs(el) {
    const categories = [...new Set(this.jobs.map(j => j.category))].sort();
    el.innerHTML = `
      <section class="search-section">
        <div class="search-bar">
          <input type="text" id="searchInput" placeholder="Job suchen..." oninput="App.filterJobs()">
          <select id="categoryFilter" onchange="App.filterJobs()">
            <option value="">Alle Kategorien</option>
            ${categories.map(c => `<option value="${c}">${this.categoryIcons[c] || ''} ${c}</option>`).join('')}
          </select>
          <select id="typeFilter" onchange="App.filterJobs()">
            <option value="">Alle Typen</option>
            <option value="einmalig">Einmalig</option>
            <option value="regelmaessig">Regelmässig</option>
          </select>
        </div>
        <div class="search-bar" style="margin-top:12px">
          <input type="text" id="locationInput" placeholder="📍 Ort eingeben (z.B. Zürich)" oninput="App.filterJobs()">
          <select id="radiusFilter" onchange="App.filterJobs()">
            <option value="">Umkreis (beliebig)</option>
            <option value="10">10 km</option>
            <option value="25">25 km</option>
            <option value="50">50 km</option>
            <option value="100">100 km</option>
            <option value="200">200 km</option>
          </select>
          <select id="priceFilter" onchange="App.filterJobs()">
            <option value="">Alle Preise</option>
            <option value="0-20">Bis 20 CHF</option>
            <option value="20-50">20 – 50 CHF</option>
            <option value="50-100">50 – 100 CHF</option>
            <option value="100-999999">Über 100 CHF</option>
          </select>
          <select id="sortFilter" onchange="App.filterJobs()">
            <option value="newest">Neueste zuerst</option>
            <option value="price-asc">Preis aufsteigend</option>
            <option value="price-desc">Preis absteigend</option>
          </select>
        </div>
      </section>
      <section class="jobs-section">
        <div class="jobs-grid" id="jobsGrid"></div>
      </section>
      ${this.footerHtml()}`;
    this.filterJobs();
  },

  filterJobs() {
    const q = (document.getElementById('searchInput')?.value || '').toLowerCase();
    const cat = document.getElementById('categoryFilter')?.value || '';
    const type = document.getElementById('typeFilter')?.value || '';
    const locInput = (document.getElementById('locationInput')?.value || '').trim().toLowerCase();
    const radius = parseInt(document.getElementById('radiusFilter')?.value || '0');
    const priceRange = document.getElementById('priceFilter')?.value || '';
    const sort = document.getElementById('sortFilter')?.value || 'newest';

    let filtered = this.jobs.filter(j => j.status === 'offen');
    if (q) filtered = filtered.filter(j =>
      j.title.toLowerCase().includes(q) ||
      j.description.toLowerCase().includes(q) ||
      j.location.toLowerCase().includes(q)
    );
    if (cat) filtered = filtered.filter(j => j.category === cat);
    if (type) filtered = filtered.filter(j => j.type === type);

    // Price filter
    if (priceRange) {
      const [min, max] = priceRange.split('-').map(Number);
      filtered = filtered.filter(j => j.price >= min && j.price <= max);
    }

    if (locInput) {
      const searchCoords = this.getCoordsForLocation(locInput);
      if (searchCoords && radius > 0) {
        filtered = filtered.filter(j => {
          const jobCoords = this.getCoordsForLocation(j.location);
          if (!jobCoords) return false;
          const dist = this.distanceKm(searchCoords.lat, searchCoords.lng, jobCoords.lat, jobCoords.lng);
          j._distance = Math.round(dist);
          return dist <= radius;
        });
      } else {
        filtered = filtered.filter(j => j.location.toLowerCase().includes(locInput));
      }
    }

    // Sorting
    if (sort === 'price-asc') filtered.sort((a, b) => a.price - b.price);
    else if (sort === 'price-desc') filtered.sort((a, b) => b.price - a.price);
    else filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

    const grid = document.getElementById('jobsGrid');
    if (!grid) return;

    if (filtered.length === 0) {
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
        <p>Keine Jobs gefunden.</p>
        <a href="#new" class="btn btn-primary btn-sm">Ersten Job erstellen</a>
      </div>`;
      return;
    }

    grid.innerHTML = filtered.map(j => `
      <a href="#job/${j.id}" class="job-card">
        <div class="job-card-header">
          <div style="display:flex;align-items:center;gap:8px">
            <span class="job-card-cat-icon">${this.categoryIcons[j.category] || '📋'}</span>
            <h3>${this.esc(j.title)}</h3>
          </div>
          <div style="display:flex;align-items:center;gap:8px">
            <button class="btn-fav ${this.isFavorite(j.id) ? 'active' : ''}" onclick="App.toggleFavorite(${j.id}, event)" title="Merken">
              ${this.isFavorite(j.id) ? '❤️' : '🤍'}
            </button>
            <span class="badge ${j.type === 'regelmaessig' ? 'badge-blue' : 'badge-green'}">${j.type === 'regelmaessig' ? 'Regelmässig' : 'Einmalig'}</span>
          </div>
        </div>
        <div class="job-card-body">
          <p>${this.esc(j.description.slice(0, 120))}${j.description.length > 120 ? '...' : ''}</p>
          <div class="job-meta">
            <span>📍 ${this.esc(j.location)}</span>
            ${j._distance !== undefined ? `<span>📏 ${j._distance} km</span>` : ''}
            <span>${this.categoryIcons[j.category] || ''} ${this.esc(j.category)}</span>
            <span>👤 ${this.esc(j.postedBy)}</span>
            ${j.deadline ? `<span>📅 Bis ${j.deadline}</span>` : ''}
          </div>
        </div>
        <div class="job-card-footer">
          <div class="job-price">${j.price} CHF <small>/ ${j.priceType === 'stunde' ? 'Std.' : 'Pauschal'}</small></div>
          <span class="btn btn-primary btn-sm">Ansehen</span>
        </div>
      </a>`).join('');
  },

  // --- Favorites Page ---
  renderFavorites(el) {
    if (!this.currentUser) {
      location.hash = '#login';
      return;
    }
    const favJobs = this.jobs.filter(j => this.favorites.includes(j.id));
    el.innerHTML = `
      <div class="page-header">
        <h1>Meine Favoriten</h1>
        <p>${favJobs.length} gespeicherte Job${favJobs.length !== 1 ? 's' : ''}</p>
      </div>
      <section class="jobs-section">
        <div class="jobs-grid">
          ${favJobs.length ? favJobs.map(j => `
            <a href="#job/${j.id}" class="job-card">
              <div class="job-card-header">
                <div style="display:flex;align-items:center;gap:8px">
                  <span class="job-card-cat-icon">${this.categoryIcons[j.category] || '📋'}</span>
                  <h3>${this.esc(j.title)}</h3>
                </div>
                <button class="btn-fav active" onclick="App.toggleFavorite(${j.id}, event)">❤️</button>
              </div>
              <div class="job-card-body">
                <p>${this.esc(j.description.slice(0, 100))}...</p>
                <div class="job-meta">
                  <span>📍 ${this.esc(j.location)}</span>
                  <span>${this.esc(j.category)}</span>
                </div>
              </div>
              <div class="job-card-footer">
                <div class="job-price">${j.price} CHF <small>/ ${j.priceType === 'stunde' ? 'Std.' : 'Pauschal'}</small></div>
                <span class="btn btn-primary btn-sm">Ansehen</span>
              </div>
            </a>`).join('') : '<div class="empty-state" style="grid-column:1/-1"><p>Noch keine Favoriten gespeichert.</p><a href="#jobs" class="btn btn-primary btn-sm">Jobs durchsuchen</a></div>'}
        </div>
      </section>
      ${this.footerHtml()}`;
  },

  // --- Job Detail ---
  renderJobDetail(el, id) {
    const job = this.jobs.find(j => j.id === id);
    if (!job) {
      el.innerHTML = '<div class="empty-state"><p>Job nicht gefunden.</p><a href="#jobs" class="btn btn-secondary btn-sm">Zurück</a></div>';
      return;
    }

    const isOwner = this.currentUser && job.postedBy === this.currentUser.name;
    const hasApplied = this.currentUser && job.applicants?.some(a => a.name === this.currentUser.name);

    el.innerHTML = `
      <div class="job-detail">
        <a href="#jobs" class="job-detail-back">&larr; Zurück zu allen Jobs</a>
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
          <span style="font-size:2rem">${this.categoryIcons[job.category] || '📋'}</span>
          <h1 style="margin:0">${this.esc(job.title)}</h1>
        </div>
        <div class="job-detail-meta">
          <span class="badge ${job.type === 'regelmaessig' ? 'badge-blue' : 'badge-green'}">${job.type === 'regelmaessig' ? 'Regelmässig' : 'Einmalig'}</span>
          <span>${this.categoryIcons[job.category] || ''} ${this.esc(job.category)}</span>
          <span>📍 ${this.esc(job.location)}</span>
          <span>📅 Erstellt: ${job.date}</span>
          ${job.deadline ? `<span>⏰ Frist: ${job.deadline}</span>` : ''}
        </div>

        <div class="job-detail-sidebar">
          <div class="price">${job.price} CHF <small>/ ${job.priceType === 'stunde' ? 'Stunde' : 'Pauschal'}</small></div>
          <p style="font-size:.8rem;color:var(--gray-400);margin-bottom:12px">zzgl. ${job.priceType === 'stunde' ? '20' : '10'}% Vermittlungsgebühr bei Abschluss</p>
          <div class="posted-by">
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px">
              <div class="avatar">${job.postedBy.charAt(0).toUpperCase()}</div>
              <div>
                <strong>${this.esc(job.postedBy)}</strong>
                <p style="font-size:.8rem;color:var(--gray-400);margin:0">Mitglied seit 2026</p>
              </div>
            </div>
          </div>
          ${job.status !== 'offen'
            ? `<span class="badge badge-orange" style="display:block;text-align:center;padding:12px">Vergeben an ${this.esc(job.acceptedApplicant || '')}</span>`
            : isOwner
              ? `<p style="color:var(--gray-500);font-size:.9rem">${job.applicants?.length || 0} Bewerber für deinen Job.</p>`
              : hasApplied
                ? `<div style="background:var(--green-light);color:var(--green);padding:12px;border-radius:8px;text-align:center;font-weight:600">Du hast dich bereits beworben!</div>`
                : `<button class="btn btn-primary" style="width:100%" onclick="App.showApplyModal(${job.id})">Jetzt bewerben</button>
                   <button class="btn btn-secondary" style="width:100%;margin-top:8px" onclick="App.toggleFavorite(${job.id})">
                     ${this.isFavorite(job.id) ? '❤️ Aus Favoriten entfernen' : '🤍 Zu Favoriten hinzufügen'}
                   </button>`}
        </div>

        <div class="job-detail-description">${this.esc(job.description).replace(/\n/g, '<br>')}</div>

        ${isOwner && job.applicants?.length ? `
          <h3 style="margin-bottom:12px">Bewerber (${job.applicants.length})</h3>
          ${job.applicants.map(a => `
            <div class="applicant-card">
              <div style="display:flex;align-items:center;gap:12px">
                <div class="avatar">${a.name.charAt(0).toUpperCase()}</div>
                <div>
                  <strong>${this.esc(a.name)}</strong>
                  <p style="font-size:.85rem;color:var(--gray-500);margin:0">${this.esc(a.message)}</p>
                </div>
              </div>
              ${job.status === 'offen' ? `<button class="btn btn-primary btn-sm" onclick="App.acceptApplicant(${job.id},'${this.esc(a.name)}')">Annehmen</button>` : ''}
            </div>`).join('')}` : ''}
      </div>

      <!-- Bewerbungs-Modal -->
      <div class="modal-overlay" id="applyModal">
        <div class="modal">
          <div class="modal-header">
            <h2>Bewerbung senden</h2>
            <button class="modal-close" onclick="App.closeApplyModal()">&times;</button>
          </div>
          <div class="modal-body">
            <p style="color:var(--gray-500);margin-bottom:20px">Stelle dich kurz vor und erkläre warum du für diesen Job geeignet bist.</p>
            <form onsubmit="App.submitApplication(event, ${id})">
              <div class="form-group">
                <label>Deine Nachricht</label>
                <textarea id="applyMessage" required placeholder="Hallo! Ich habe Interesse an diesem Job weil..." style="min-height:120px"></textarea>
              </div>
              <div class="form-group">
                <label>Verfügbarkeit</label>
                <input type="text" id="applyAvailability" placeholder="z.B. Mo-Fr ab 17 Uhr, Wochenende ganztags">
              </div>
              <button type="submit" class="btn btn-primary" style="width:100%">Bewerbung absenden</button>
            </form>
          </div>
        </div>
      </div>

      ${this.footerHtml()}`;
  },

  showApplyModal(id) {
    if (!this.currentUser) {
      this.toast('Bitte melde dich zuerst an.', 'error');
      location.hash = '#login';
      return;
    }
    document.getElementById('applyModal').classList.add('active');
  },

  closeApplyModal() {
    document.getElementById('applyModal').classList.remove('active');
  },

  async submitApplication(e, id) {
    e.preventDefault();
    const message = document.getElementById('applyMessage').value.trim();
    const availability = document.getElementById('applyAvailability').value.trim();
    const fullMessage = availability ? `${message}\n\nVerfügbarkeit: ${availability}` : message;

    try {
      await this.api('/api/jobs/' + id + '/apply', {
        method: 'POST',
        body: JSON.stringify({ message: fullMessage })
      });

      const job = this.jobs.find(j => j.id === id);
      if (job) {
        if (!job.applicants) job.applicants = [];
        job.applicants.push({ name: this.currentUser.name, message: fullMessage });
        this.saveData();
      }

      this.closeApplyModal();
      this.toast('Bewerbung erfolgreich gesendet!', 'success');
      this.router();
    } catch (err) {
      this.toast(err.message, 'error');
    }
  },

  async applyToJob(id) {
    this.showApplyModal(id);
  },

  async acceptApplicant(jobId, name) {
    const job = this.jobs.find(j => j.id === jobId);
    if (!job) return;
    const feeRate = job.priceType === 'stunde' ? 0.2 : 0.1;
    const feePercent = job.priceType === 'stunde' ? '20' : '10';
    const fee = (job.price * feeRate).toFixed(2);
    const confirmed = confirm(`${name} annehmen?\n\nVermittlungsgebühr: ${fee} CHF (${feePercent}% von ${job.price} CHF)\nDie Gebühr wird nach Abschluss des Jobs fällig.`);
    if (!confirmed) return;

    try {
      await this.api('/api/jobs/' + jobId + '/accept', {
        method: 'POST',
        body: JSON.stringify({ applicantName: name })
      });

      job.status = 'vergeben';
      job.acceptedApplicant = name;
      job.fee = parseFloat(fee);
      this.saveData();
      this.toast(`${name} wurde angenommen! Vermittlungsgebühr: ${fee} CHF`, 'success');
      this.router();
    } catch (err) {
      this.toast(err.message, 'error');
    }
  },

  // --- New Job ---
  selectedPlan: 'standard',

  renderNewJob(el) {
    if (!this.currentUser) {
      this.toast('Bitte melde dich zuerst an.', 'error');
      location.hash = '#login';
      return;
    }

    el.innerHTML = `
      <div class="job-detail" style="max-width:700px">
        <h1 style="margin-bottom:8px">Neuen Job anbieten</h1>
        <p style="color:var(--gray-500);margin-bottom:32px">Erstelle dein Inserat und wähle ein Paket</p>

        <form onsubmit="App.createJob(event)">
          <div class="form-group">
            <label>Titel</label>
            <input type="text" id="jobTitle" required placeholder="z.B. Gartenarbeit am Wochenende">
          </div>
          <div class="form-group">
            <label>Beschreibung</label>
            <textarea id="jobDesc" required placeholder="Beschreibe den Job möglichst genau..."></textarea>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Kategorie</label>
              <select id="jobCategory" required>
                <option value="">Wählen...</option>
                ${Object.entries(this.categoryIcons).map(([name, icon]) =>
                  `<option value="${name}">${icon} ${name}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label>Ort</label>
              <input type="text" id="jobLocation" required placeholder="z.B. Zürich, Seefeld">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Bezahlung (CHF)</label>
              <input type="number" id="jobPrice" required min="1" placeholder="z.B. 15">
            </div>
            <div class="form-group">
              <label>Bezahlungsart</label>
              <select id="jobPriceType" required>
                <option value="stunde">Pro Stunde</option>
                <option value="pauschal">Pauschal</option>
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Typ</label>
              <select id="jobType" required>
                <option value="einmalig">Einmalig</option>
                <option value="regelmaessig">Regelmässig</option>
              </select>
            </div>
            <div class="form-group">
              <label>Frist / Gewünschtes Datum</label>
              <input type="date" id="jobDeadline" placeholder="Optional">
            </div>
          </div>

          <label style="display:block;font-size:.85rem;font-weight:600;color:var(--gray-700);margin-bottom:12px">Inserat-Paket wählen</label>
          <div class="pricing-cards" id="pricingCards">
            <div class="pricing-card ${this.selectedPlan === 'basic' ? 'selected' : ''}" onclick="App.selectPlan('basic')">
              <div class="pricing-card-name">Basis</div>
              <div class="pricing-card-price">9.90 <small>CHF</small></div>
              <div class="pricing-card-desc">14 Tage sichtbar</div>
            </div>
            <div class="pricing-card ${this.selectedPlan === 'standard' ? 'selected' : ''}" onclick="App.selectPlan('standard')">
              <div class="pricing-badge">Beliebt</div>
              <div class="pricing-card-name">Standard</div>
              <div class="pricing-card-price">19.90 <small>CHF</small></div>
              <div class="pricing-card-desc">30 Tage + Hervorhebung</div>
            </div>
            <div class="pricing-card ${this.selectedPlan === 'premium' ? 'selected' : ''}" onclick="App.selectPlan('premium')">
              <div class="pricing-card-name">Premium</div>
              <div class="pricing-card-price">39.90 <small>CHF</small></div>
              <div class="pricing-card-desc">60 Tage + Top-Platzierung</div>
            </div>
          </div>

          <button type="submit" class="btn btn-primary" style="width:100%;margin-top:24px" id="payBtn">
            Jetzt bezahlen & veröffentlichen
          </button>
          <p style="text-align:center;margin-top:12px;font-size:.8rem;color:var(--gray-400)">
            Sichere Zahlung über Stripe. Kreditkarte, Twint & mehr.
          </p>
        </form>
      </div>`;
  },

  selectPlan(plan) {
    this.selectedPlan = plan;
    document.querySelectorAll('.pricing-card').forEach(c => c.classList.remove('selected'));
    event.currentTarget.classList.add('selected');
  },

  async createJob(e) {
    e.preventDefault();
    const btn = document.getElementById('payBtn');
    btn.disabled = true;
    btn.textContent = 'Wird verarbeitet...';

    const jobData = {
      title: document.getElementById('jobTitle').value.trim(),
      description: document.getElementById('jobDesc').value.trim(),
      category: document.getElementById('jobCategory').value,
      location: document.getElementById('jobLocation').value.trim(),
      type: document.getElementById('jobType').value,
      price: parseInt(document.getElementById('jobPrice').value),
      priceType: document.getElementById('jobPriceType').value,
      deadline: document.getElementById('jobDeadline').value || '',
    };

    localStorage.setItem('sj_pending_job', JSON.stringify(jobData));

    try {
      const res = await fetch(API_URL + '/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: this.selectedPlan,
          jobTitle: jobData.title,
          successUrl: window.location.origin + window.location.pathname
        })
      });
      const data = await res.json();

      if (data.error) {
        this.toast(data.error, 'error');
        btn.disabled = false;
        btn.textContent = 'Jetzt bezahlen & veröffentlichen';
        return;
      }

      if (data.demo) {
        localStorage.setItem('sj_payment_session', data.sessionId);
        localStorage.setItem('sj_payment_plan', this.selectedPlan);
        this.toast(`Demo-Zahlung: ${data.price} CHF (${this.selectedPlan})`, 'success');
        this.finalizeJob(this.selectedPlan);
        return;
      }

      if (data.url) {
        localStorage.setItem('sj_payment_session', data.sessionId);
        window.location.href = data.url;
      }
    } catch (err) {
      const prices = { basic: '9.90', standard: '19.90', premium: '39.90' };
      localStorage.setItem('sj_payment_session', 'demo_session_' + this.selectedPlan);
      localStorage.setItem('sj_payment_plan', this.selectedPlan);
      this.toast(`Demo-Zahlung: ${prices[this.selectedPlan]} CHF (${this.selectedPlan})`, 'success');
      this.finalizeJob(this.selectedPlan);
    }
  },

  async finalizeJob(plan) {
    const jobData = JSON.parse(localStorage.getItem('sj_pending_job') || 'null');
    if (!jobData) {
      this.toast('Keine Job-Daten gefunden.', 'error');
      location.hash = '#jobs';
      return;
    }

    try {
      const job = await this.api('/api/jobs', {
        method: 'POST',
        body: JSON.stringify({ ...jobData, plan })
      });

      this.jobs.unshift(job);
      this.saveData();
      localStorage.removeItem('sj_pending_job');
      localStorage.removeItem('sj_payment_session');
      localStorage.removeItem('sj_payment_plan');
      this.toast('Inserat erfolgreich veröffentlicht!', 'success');
      location.hash = '#jobs';
    } catch (err) {
      const durations = { basic: 14, standard: 30, premium: 60 };
      const job = {
        id: this.nextId++,
        ...jobData,
        postedBy: this.currentUser.name,
        date: new Date().toISOString().slice(0, 10),
        status: 'offen',
        applicants: [],
        plan: plan,
        daysActive: durations[plan] || 14,
        highlighted: plan === 'standard' || plan === 'premium',
        topPlacement: plan === 'premium',
      };

      this.jobs.unshift(job);
      this.saveData();
      localStorage.removeItem('sj_pending_job');
      localStorage.removeItem('sj_payment_session');
      localStorage.removeItem('sj_payment_plan');
      this.toast('Inserat erfolgreich veröffentlicht!', 'success');
      location.hash = '#jobs';
    }
  },

  checkPaymentReturn() {
    if (location.hash.startsWith('#payment-success')) {
      const sessionId = localStorage.getItem('sj_payment_session');
      const plan = localStorage.getItem('sj_payment_plan') || 'basic';
      if (sessionId) {
        this.finalizeJob(plan);
      }
    }
  },

  // --- Pricing Page ---
  renderPricing(el) {
    el.innerHTML = `
      <div class="pricing-page">
        <div class="pricing-hero">
          <h1>Einfache, transparente Preise</h1>
          <p>Wähle das Paket, das zu dir passt. Keine versteckten Gebühren.</p>
        </div>

        <div class="pricing-toggle-wrapper">
          <span class="toggle-label active" id="toggleEinzel">Einzelinserat</span>
          <label class="toggle-switch">
            <input type="checkbox" id="billingToggle" onchange="App.toggleBilling()">
            <span class="toggle-slider"></span>
          </label>
          <span class="toggle-label" id="toggleAbo">Monatsabo <span class="toggle-badge">Bis 50% günstiger</span></span>
        </div>

        <div class="pricing-grid" id="pricingGrid">
          ${this.pricingCardsHtml('einzel')}
        </div>

        <div class="pricing-faq">
          <h2>Häufige Fragen</h2>
          <div class="faq-grid">
            <div class="faq-item">
              <h3>Welche Zahlungsmethoden akzeptiert ihr?</h3>
              <p>Wir akzeptieren Kreditkarten (Visa, Mastercard), TWINT und Banküberweisung – alles über Stripe abgesichert.</p>
            </div>
            <div class="faq-item">
              <h3>Kann ich mein Abo jederzeit kündigen?</h3>
              <p>Ja, monatliche Abos können jederzeit zum Ende des Abrechnungsmonats gekündigt werden.</p>
            </div>
            <div class="faq-item">
              <h3>Was ist die Vermittlungsgebühr?</h3>
              <p>Zusätzlich zum Inserat-Paket fällt bei erfolgreicher Vermittlung eine Gebühr an: 10% bei Pauschalzahlung, 20% bei Stundenlohn.</p>
            </div>
            <div class="faq-item">
              <h3>Was bedeutet "Hervorhebung"?</h3>
              <p>Hervorgehobene Inserate erscheinen mit einem farbigen Rahmen und werden in der Suchliste priorisiert angezeigt.</p>
            </div>
            <div class="faq-item">
              <h3>Was ist "Top-Platzierung"?</h3>
              <p>Dein Inserat erscheint immer ganz oben in den Suchergebnissen – maximale Sichtbarkeit für dein Angebot.</p>
            </div>
            <div class="faq-item">
              <h3>Gibt es eine Geld-zurück-Garantie?</h3>
              <p>Ja! Wenn du innerhalb von 48 Stunden keine Bewerbung erhältst, erstatten wir dir den vollen Betrag.</p>
            </div>
          </div>
        </div>

        <div class="pricing-cta">
          <h2>Bereit loszulegen?</h2>
          <p>Erstelle jetzt dein Inserat und finde den passenden Kandidaten.</p>
          <a href="${this.currentUser ? '#new' : '#register'}" class="btn btn-primary" style="font-size:1.05rem;padding:14px 32px">
            ${this.currentUser ? 'Job inserieren' : 'Kostenlos registrieren'}
          </a>
        </div>

        ${this.footerHtml()}
      </div>`;
  },

  pricingCardsHtml(mode) {
    const plans = mode === 'einzel' ? [
      {
        name: 'Kostenlos', price: '0', period: '', desc: 'Zum Reinschnuppern', color: '', badge: '',
        features: [
          { ok: true, text: '1 aktives Inserat' }, { ok: true, text: '14 Tage sichtbar' },
          { ok: false, text: 'Keine Hervorhebung' }, { ok: false, text: 'Max. 5 Bewerbungen' }, { ok: false, text: 'Kein Chat' },
        ],
        cta: 'Kostenlos starten', href: this.currentUser ? '#new' : '#register', outline: true,
      },
      {
        name: 'Basis', price: '4.90', period: 'einmalig', desc: 'Für Gelegenheits-Inserenten', color: '', badge: '',
        features: [
          { ok: true, text: '1 Inserat' }, { ok: true, text: '30 Tage sichtbar' },
          { ok: false, text: 'Keine Hervorhebung' }, { ok: true, text: 'Bis 10 Bewerbungen' }, { ok: false, text: 'Kein Chat' },
        ],
        cta: 'Jetzt inserieren', href: this.currentUser ? '#new' : '#register', outline: false,
      },
      {
        name: 'Standard', price: '19.90', period: 'einmalig', desc: 'Unsere beliebteste Option', color: 'blue', badge: '⭐ Beliebt',
        features: [
          { ok: true, text: '1 Inserat' }, { ok: true, text: '30 Tage sichtbar' },
          { ok: true, text: 'Hervorhebung in Liste' }, { ok: true, text: 'Unbegrenzte Bewerbungen' }, { ok: true, text: 'Direkt-Chat' },
        ],
        cta: 'Jetzt inserieren', href: this.currentUser ? '#new' : '#register', outline: false,
      },
      {
        name: 'Premium', price: '39.90', period: 'einmalig', desc: 'Maximale Sichtbarkeit', color: 'gold', badge: '🚀 Top',
        features: [
          { ok: true, text: '1 Inserat' }, { ok: true, text: '60 Tage sichtbar' },
          { ok: true, text: 'Top-Platzierung in Suche' }, { ok: true, text: 'Unbegrenzte Bewerbungen' }, { ok: true, text: 'Direkt-Chat + Priorität' },
        ],
        cta: 'Jetzt inserieren', href: this.currentUser ? '#new' : '#register', outline: false,
      },
    ] : [
      {
        name: 'Kostenlos', price: '0', period: '', desc: 'Zum Reinschnuppern', color: '', badge: '',
        features: [
          { ok: true, text: '1 aktives Inserat' }, { ok: true, text: '14 Tage sichtbar' },
          { ok: false, text: 'Keine Hervorhebung' }, { ok: false, text: 'Max. 5 Bewerbungen' }, { ok: false, text: 'Kein Chat' },
        ],
        cta: 'Kostenlos starten', href: this.currentUser ? '#new' : '#register', outline: true,
      },
      {
        name: 'Pro', price: '19.90', period: 'pro Monat', desc: 'Für regelmässige Inserenten', color: 'blue', badge: '⭐ Beliebt',
        features: [
          { ok: true, text: 'Bis 10 aktive Inserate' }, { ok: true, text: 'Inserate 30 Tage sichtbar' },
          { ok: true, text: 'Hervorhebung in Liste' }, { ok: true, text: 'Unbegrenzte Bewerbungen' }, { ok: true, text: 'Direkt-Chat' },
        ],
        cta: 'Pro starten', href: this.currentUser ? '#new' : '#register', outline: false,
      },
      {
        name: 'Business', price: '49.90', period: 'pro Monat', desc: 'Für Firmen & Agenturen', color: 'gold', badge: '🏢 Business',
        features: [
          { ok: true, text: 'Unbegrenzte Inserate' }, { ok: true, text: 'Top-Platzierung immer' },
          { ok: true, text: 'Firmenlogo & Profil' }, { ok: true, text: 'Unbegrenzte Bewerbungen' }, { ok: true, text: 'Prioritäts-Support' },
        ],
        cta: 'Business starten', href: this.currentUser ? '#new' : '#register', outline: false,
      },
    ];

    return plans.map(p => `
      <div class="pricing-card-full ${p.color ? 'pricing-card-' + p.color : ''}">
        ${p.badge ? `<div class="pricing-card-badge">${p.badge}</div>` : ''}
        <div class="pcf-name">${p.name}</div>
        <div class="pcf-price">
          ${p.price === '0' ? '<span class="pcf-amount">Gratis</span>' : `<span class="pcf-amount">CHF ${p.price}</span>`}
          ${p.period ? `<span class="pcf-period">${p.period}</span>` : ''}
        </div>
        <div class="pcf-desc">${p.desc}</div>
        <ul class="pcf-features">
          ${p.features.map(f => `
            <li class="${f.ok ? 'ok' : 'no'}">
              <span class="pcf-icon">${f.ok ? '✓' : '✗'}</span>
              ${f.text}
            </li>`).join('')}
        </ul>
        <a href="${p.href}" class="btn ${p.outline ? 'btn-secondary' : 'btn-primary'}" style="width:100%;justify-content:center;margin-top:auto">
          ${p.cta}
        </a>
      </div>`).join('');
  },

  toggleBilling() {
    const isAbo = document.getElementById('billingToggle').checked;
    document.getElementById('toggleEinzel').classList.toggle('active', !isAbo);
    document.getElementById('toggleAbo').classList.toggle('active', isAbo);
    document.getElementById('pricingGrid').innerHTML = this.pricingCardsHtml(isAbo ? 'abo' : 'einzel');
  },

  // --- My Jobs ---
  renderMyJobs(el) {
    if (!this.currentUser) {
      location.hash = '#login';
      return;
    }
    const myPosted = this.jobs.filter(j => j.postedBy === this.currentUser.name);
    const myApplied = this.jobs.filter(j => j.applicants?.some(a => a.name === this.currentUser.name));

    el.innerHTML = `
      <div class="page-header">
        <h1>Meine Jobs</h1>
        <p>Hallo, ${this.esc(this.currentUser.name)}</p>
        <div class="tabs">
          <button class="tab active" onclick="App.switchTab(this, 'posted')">Meine Angebote (${myPosted.length})</button>
          <button class="tab" onclick="App.switchTab(this, 'applied')">Meine Bewerbungen (${myApplied.length})</button>
        </div>
      </div>
      <section class="jobs-section">
        <div id="tab-posted" class="jobs-grid">
          ${myPosted.length ? myPosted.map(j => this.jobCardHtml(j)).join('') : '<div class="empty-state" style="grid-column:1/-1"><p>Du hast noch keine Jobs erstellt.</p><a href="#new" class="btn btn-primary btn-sm">Jetzt Job erstellen</a></div>'}
        </div>
        <div id="tab-applied" class="jobs-grid" style="display:none">
          ${myApplied.length ? myApplied.map(j => this.jobCardHtml(j)).join('') : '<div class="empty-state" style="grid-column:1/-1"><p>Du hast dich noch nicht beworben.</p><a href="#jobs" class="btn btn-primary btn-sm">Jobs durchsuchen</a></div>'}
        </div>
      </section>
      ${this.footerHtml()}`;
  },

  switchTab(btn, tab) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-posted').style.display = tab === 'posted' ? '' : 'none';
    document.getElementById('tab-applied').style.display = tab === 'applied' ? '' : 'none';
  },

  jobCardHtml(j) {
    return `
      <a href="#job/${j.id}" class="job-card">
        <div class="job-card-header">
          <div style="display:flex;align-items:center;gap:8px">
            <span class="job-card-cat-icon">${this.categoryIcons[j.category] || '📋'}</span>
            <h3>${this.esc(j.title)}</h3>
          </div>
          <span class="badge ${j.status === 'offen' ? 'badge-green' : 'badge-orange'}">${j.status === 'offen' ? 'Offen' : 'Vergeben'}</span>
        </div>
        <div class="job-card-body">
          <p>${this.esc(j.description.slice(0, 100))}...</p>
          <div class="job-meta">
            <span>📍 ${this.esc(j.location)}</span>
            <span>👥 ${j.applicants?.length || 0} Bewerber</span>
          </div>
        </div>
        <div class="job-card-footer">
          <div class="job-price">${j.price} CHF <small>/ ${j.priceType === 'stunde' ? 'Std.' : 'Pauschal'}</small></div>
          <span class="btn btn-secondary btn-sm">Details</span>
        </div>
      </a>`;
  },

  // --- API Helper ---
  token: null,

  getAuthHeader() {
    return this.token ? { 'Authorization': `Bearer ${this.token}` } : {};
  },

  async api(url, options = {}) {
    const fullUrl = url.startsWith('http') ? url : API_URL + url;
    const headers = { 'Content-Type': 'application/json', ...this.getAuthHeader(), ...options.headers };
    try {
      const res = await fetch(fullUrl, { ...options, headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Fehler aufgetreten');
      return data;
    } catch (err) {
      throw err;
    }
  },

  // --- Auth ---
  renderLogin(el) {
    el.innerHTML = `
      <div class="job-detail" style="max-width:420px">
        <h1 style="margin-bottom:8px">Anmelden</h1>
        <p style="color:var(--gray-500);margin-bottom:24px">Willkommen zurück bei SwissSideJob</p>
        <form onsubmit="App.login(event)">
          <div class="form-group">
            <label>E-Mail</label>
            <input type="email" id="loginEmail" required placeholder="name@beispiel.ch">
          </div>
          <div class="form-group">
            <label>Passwort</label>
            <input type="password" id="loginPass" required placeholder="Dein Passwort">
          </div>
          <button type="submit" class="btn btn-primary" style="width:100%" id="loginBtn">Anmelden</button>
          <p style="text-align:center;margin-top:16px;font-size:.9rem;color:var(--gray-500)">
            Noch kein Konto? <a href="#register" style="color:var(--primary);font-weight:600">Registrieren</a>
          </p>
        </form>
      </div>`;
  },

  renderRegister(el) {
    el.innerHTML = `
      <div class="job-detail" style="max-width:420px">
        <h1 style="margin-bottom:8px">Registrieren</h1>
        <p style="color:var(--gray-500);margin-bottom:24px">Erstelle dein kostenloses Konto</p>
        <form onsubmit="App.register(event)">
          <div class="form-group">
            <label>Name</label>
            <input type="text" id="regName" required placeholder="Dein vollständiger Name">
          </div>
          <div class="form-group">
            <label>E-Mail</label>
            <input type="email" id="regEmail" required placeholder="name@beispiel.ch">
          </div>
          <div class="form-group">
            <label>Passwort</label>
            <input type="password" id="regPass" required minlength="4" placeholder="Mindestens 4 Zeichen">
          </div>
          <button type="submit" class="btn btn-primary" style="width:100%" id="regBtn">Konto erstellen</button>
          <p style="text-align:center;margin-top:16px;font-size:.9rem;color:var(--gray-500)">
            Bereits ein Konto? <a href="#login" style="color:var(--primary);font-weight:600">Anmelden</a>
          </p>
        </form>
      </div>`;
  },

  async login(e) {
    e.preventDefault();
    const btn = document.getElementById('loginBtn');
    btn.disabled = true;
    btn.textContent = 'Wird angemeldet...';

    try {
      const data = await this.api('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: document.getElementById('loginEmail').value.trim(),
          password: document.getElementById('loginPass').value,
        })
      });

      this.token = data.token;
      this.currentUser = data.user;
      localStorage.setItem('sj_token', data.token);
      this.saveData();
      this.toast(`Willkommen, ${data.user.name}!`, 'success');
      location.hash = '#jobs';
    } catch (err) {
      this.toast(err.message, 'error');
      btn.disabled = false;
      btn.textContent = 'Anmelden';
    }
  },

  async register(e) {
    e.preventDefault();
    const btn = document.getElementById('regBtn');
    btn.disabled = true;
    btn.textContent = 'Wird erstellt...';

    try {
      const data = await this.api('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          name: document.getElementById('regName').value.trim(),
          email: document.getElementById('regEmail').value.trim(),
          password: document.getElementById('regPass').value,
        })
      });

      this.token = data.token;
      this.currentUser = data.user;
      localStorage.setItem('sj_token', data.token);
      this.saveData();
      this.toast('Konto erstellt! Willkommen!', 'success');
      location.hash = '#jobs';
    } catch (err) {
      this.toast(err.message, 'error');
      btn.disabled = false;
      btn.textContent = 'Konto erstellen';
    }
  },

  logout() {
    this.currentUser = null;
    this.token = null;
    localStorage.removeItem('sj_token');
    this.saveData();
    this.toast('Abgemeldet.', 'success');
    location.hash = '#home';
  },

  async restoreSession() {
    const token = localStorage.getItem('sj_token');
    if (!token) return;

    try {
      const user = await this.api('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      this.token = token;
      this.currentUser = user;
      this.saveData();
    } catch (err) {
      localStorage.removeItem('sj_token');
      this.currentUser = null;
      this.saveData();
    }
  },

  // --- Utilities ---
  esc(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  },

  toast(msg, type = '') {
    const container = document.getElementById('toasts');
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.textContent = msg;
    container.appendChild(t);
    setTimeout(() => t.remove(), 3000);
  },

  bindGlobalEvents() {
    document.addEventListener('click', (e) => {
      const nav = document.querySelector('.nav-links');
      if (nav?.classList.contains('open') && !e.target.closest('.navbar')) {
        nav.classList.remove('open');
      }
    });
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());
