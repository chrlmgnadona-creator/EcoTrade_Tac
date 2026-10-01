/* =========================================================
   C++ REST API ENGINE & APP STATE MANAGEMENT
   ========================================================= */

const API_BASE = window.location.origin + "/api";

// App State Management
let appState = {
  materials: [],
  requests: [],
  currentUser: null, // Null if guest
  activeTheme: "emerald"
};

// Initialize app on DOM Load
document.addEventListener("DOMContentLoaded", () => {
  loadAppState();
  initTheme();
});

async function loadAppState() {
  // Load local user profile & token if saved
  const savedUser = localStorage.getItem("ecotrade_user");
  appState.currentUser = savedUser ? JSON.parse(savedUser) : null;

  // Fetch Materials and Requests from C++ Backend
  await fetchMaterials();
  await fetchRequests();

  // Update Auth UI Banner
  const authBtnText = document.getElementById("auth-btn-text");
  const welcomeBanner = document.getElementById("user-welcome-banner");

  if (appState.currentUser) {
    if (authBtnText) authBtnText.innerText = appState.currentUser.name;
    if (welcomeBanner) welcomeBanner.style.display = "flex";
    const loggedName = document.getElementById("logged-user-name");
    const loggedBrgy = document.getElementById("logged-user-barangay");
    if (loggedName) loggedName.innerText = appState.currentUser.name;
    if (loggedBrgy) loggedBrgy.innerText = appState.currentUser.barangay;
  } else {
    if (authBtnText) authBtnText.innerText = "Sign In";
    if (welcomeBanner) welcomeBanner.style.display = "none";
  }

  renderMaterials();
  updateImpactStats();
  renderUserDashboard();
}

async function fetchMaterials() {
  try {
    const res = await fetch(`${API_BASE}/materials`);
    if (res.ok) {
      appState.materials = await res.json();
    }
  } catch (err) {
    console.warn("C++ API connection failed for /api/materials. Check if server is running.", err);
  }
}

async function fetchRequests() {
  try {
    const res = await fetch(`${API_BASE}/requests`);
    if (res.ok) {
      appState.requests = await res.json();
    }
  } catch (err) {
    console.warn("C++ API connection failed for /api/requests.", err);
  }
}

/* =========================================================
   THEME SWITCHER LOGIC
   ========================================================= */

function initTheme() {
  const savedTheme = localStorage.getItem("ecotrade_theme") || "emerald";
  selectTheme(savedTheme, false);
}

function toggleThemeMenu(e) {
  e.stopPropagation();
  const menu = document.getElementById("themeMenu");
  if (menu) menu.classList.toggle("show");
}

document.addEventListener("click", () => {
  const menu = document.getElementById("themeMenu");
  if (menu) menu.classList.remove("show");
});

function selectTheme(themeId, save = true) {
  appState.activeTheme = themeId;
  document.documentElement.setAttribute("data-theme", themeId);

  document.querySelectorAll(".theme-option").forEach(opt => {
    if (opt.getAttribute("data-theme-id") === themeId) {
      opt.classList.add("active");
    } else {
      opt.classList.remove("active");
    }
  });

  if (save) {
    localStorage.setItem("ecotrade_theme", themeId);
  }
}

/* =========================================================
   NAVIGATION & TABS
   ========================================================= */

function switchTab(tabId) {
  document.querySelectorAll(".tab-content").forEach(el => el.classList.remove("active"));
  document.querySelectorAll(".nav-btn").forEach(el => el.classList.remove("active"));

  const targetTab = document.getElementById(`tab-${tabId}`);
  if (targetTab) targetTab.classList.add("active");
  
  const navBtn = document.getElementById(`nav-${tabId}`);
  if (navBtn) navBtn.classList.add("active");

  if (tabId === 'dashboard') {
    renderUserDashboard();
  }
}

/* =========================================================
   RENDER MATERIAL LISTINGS (EXPLORE TAB)
   ========================================================= */

function renderMaterials() {
  const container = document.getElementById("materials-container");
  const countEl = document.getElementById("results-count");
  if (!container) return;

  const searchInput = document.getElementById("search-input");
  const searchVal = searchInput ? searchInput.value.toLowerCase() : "";
  const catVal = document.getElementById("filter-category")?.value || "ALL";
  const typeVal = document.getElementById("filter-type")?.value || "ALL";
  const brgyVal = document.getElementById("filter-barangay")?.value || "ALL";
  const sortVal = document.getElementById("filter-sort")?.value || "newest";

  let filtered = appState.materials.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchVal) || item.description.toLowerCase().includes(searchVal);
    const matchesCat = catVal === "ALL" || item.category === catVal;
    const matchesType = typeVal === "ALL" || item.type === typeVal;
    const matchesBrgy = brgyVal === "ALL" || item.barangay === brgyVal;
    return matchesSearch && matchesCat && matchesType && matchesBrgy;
  });

  if (sortVal === "price-low") {
    filtered.sort((a, b) => a.price - b.price);
  } else if (sortVal === "price-high") {
    filtered.sort((a, b) => b.price - a.price);
  } else {
    filtered.sort((a, b) => new Date(b.datePosted) - new Date(a.datePosted));
  }

  if (countEl) countEl.innerText = `Showing ${filtered.length} material listings in Tacloban`;

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 50px 20px; background: var(--card-bg); border-radius: var(--radius-md);">
        <i class="fa-solid fa-box-open" style="font-size: 3rem; color: var(--text-muted); margin-bottom: 15px;"></i>
        <h3 style="color: var(--text-dark);">No Reusable Materials Found</h3>
        <p style="color: var(--text-muted); font-size: 0.9rem;">Try adjusting your category search filters or list a new item for trade.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(item => {
    let tagClass = "tag-sale";
    let tagText = "For Sale";
    let priceDisplay = `₱${Number(item.price).toLocaleString('en-PH', {minimumFractionDigits: 2})}`;

    if (item.type === "FOR_TRADE") {
      tagClass = "tag-trade";
      tagText = "Open for Trade";
      priceDisplay = "For Trade";
    } else if (item.type === "FREE") {
      tagClass = "tag-free";
      tagText = "Free / Giveaway";
      priceDisplay = "FREE";
    }

    return `
      <div class="item-card" onclick="openDetailModal('${item.id}')">
        <div class="card-img-wrap">
          <img src="${item.imageUrl}" alt="${item.title}" onerror="this.src='https://via.placeholder.com/400x300?text=Reusable+Material'">
          <span class="card-type-tag ${tagClass}">${tagText}</span>
        </div>
        <div class="card-body">
          <div class="card-category">${item.category}</div>
          <h3 class="card-title">${item.title}</h3>
          <p class="card-desc">${item.description}</p>
          <div class="card-footer-info">
            <span class="card-price">${priceDisplay}</span>
            <span class="card-location"><i class="fa-solid fa-location-dot"></i> ${item.barangay.replace("Brgy ", "")}</span>
          </div>
        </div>
      </div>
    `;
  }).join("");
}

function applyFilters() {
  renderMaterials();
}

function resetFilters() {
  if (document.getElementById("search-input")) document.getElementById("search-input").value = "";
  if (document.getElementById("filter-category")) document.getElementById("filter-category").value = "ALL";
  if (document.getElementById("filter-type")) document.getElementById("filter-type").value = "ALL";
  if (document.getElementById("filter-barangay")) document.getElementById("filter-barangay").value = "ALL";
  if (document.getElementById("filter-sort")) document.getElementById("filter-sort").value = "newest";
  renderMaterials();
}

/* =========================================================
   DETAIL & PICKUP REQUEST MODAL
   ========================================================= */

function openDetailModal(id) {
  const item = appState.materials.find(m => m.id === id);
  if (!item) return;

  document.getElementById("request-item-id").value = item.id;
  document.getElementById("modal-item-title").innerText = item.title;
  document.getElementById("modal-item-img").src = item.imageUrl;
  document.getElementById("modal-item-cat").innerText = item.category;
  document.getElementById("modal-item-barangay").innerText = item.barangay;
  document.getElementById("modal-item-desc").innerText = item.description;
  document.getElementById("modal-item-qty").innerText = item.quantity;
  document.getElementById("modal-item-owner").innerText = `${item.ownerName} (${item.ownerContact})`;
  document.getElementById("modal-item-pickup").innerText = `${item.barangay} Material Recovery Point`;

  const typeBadge = document.getElementById("modal-item-type");
  const priceDisplay = document.getElementById("modal-item-price");

  if (item.type === "FOR_SALE") {
    typeBadge.className = "badge badge-sale";
    typeBadge.innerText = "For Sale";
    priceDisplay.innerText = `₱${Number(item.price).toLocaleString('en-PH', {minimumFractionDigits: 2})}`;
  } else if (item.type === "FOR_TRADE") {
    typeBadge.className = "badge badge-trade";
    typeBadge.innerText = "Open for Trade";
    priceDisplay.innerText = "Barter / Item Exchange";
  } else {
    typeBadge.className = "badge badge-sale";
    typeBadge.innerText = "Free Pickup";
    priceDisplay.innerText = "0.00 (Donation)";
  }

  if (appState.currentUser) {
    document.getElementById("req-name").value = appState.currentUser.name;
  }

  document.getElementById("detailModal").classList.add("active");
}

async function submitTradeRequest(e) {
  e.preventDefault();
  const itemId = document.getElementById("request-item-id").value;
  const item = appState.materials.find(m => m.id === itemId);

  const payload = {
    id: "req-" + Date.now(),
    itemId: itemId,
    itemTitle: item ? item.title : "Material",
    requesterName: document.getElementById("req-name").value,
    requesterContact: document.getElementById("req-contact").value,
    message: document.getElementById("req-msg").value,
    dateSent: new Date().toISOString().split('T')[0]
  };

  try {
    const res = await fetch(`${API_BASE}/requests`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      alert("Success! Your request has been registered!.");
      closeModal('detailModal');
      document.getElementById("request-form").reset();
      await fetchRequests();
      renderUserDashboard();
    } else {
      alert("Failed to submit request to database.");
    }
  } catch (err) {
    console.error("C++ API Submission error:", err);
    alert("Could not reach C++ backend server.");
  }
}

/* =========================================================
   CREATE NEW MATERIAL LISTING MODAL
   ========================================================= */

function openCreateModal() {
  if (!appState.currentUser) {
    alert("Please sign in or register your Tacloban resident profile to list reusable materials.");
    openAuthModal();
    return;
  }
  document.getElementById("createModal").classList.add("active");
}

function togglePriceField() {
  const type = document.getElementById("create-type").value;
  const priceGroup = document.getElementById("price-group");
  const priceInput = document.getElementById("create-price");

  if (type === "FOR_SALE") {
    priceGroup.style.display = "flex";
    priceInput.required = true;
  } else {
    priceGroup.style.display = "none";
    priceInput.required = false;
    priceInput.value = "";
  }
}

let uploadedImageBase64 = null;

function handleFileSelect(e) {
  const file = e.target.files[0];
  if (file) {
    document.getElementById("file-name-label").innerText = `Selected: ${file.name}`;
    const reader = new FileReader();
    reader.onload = function(evt) {
      uploadedImageBase64 = evt.target.result;
    };
    reader.readAsDataURL(file);
  }
}

async function handleCreateItem(e) {
  e.preventDefault();

  const title = document.getElementById("create-title").value;
  const category = document.getElementById("create-category").value;
  const type = document.getElementById("create-type").value;
  const price = parseFloat(document.getElementById("create-price").value) || 0;
  const quantity = document.getElementById("create-quantity").value;
  const barangay = document.getElementById("create-barangay").value;
  const desc = document.getElementById("create-desc").value;

  const categoryImages = {
    "Construction & Timber": "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=600&q=80",
    "Scrap Metal & Wire": "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=600&q=80",
    "Plastics & Containers": "https://images.unsplash.com/photo-1590247813693-5541d1c609fd?auto=format&fit=crop&w=600&q=80",
    "Furniture & Fixtures": "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=600&q=80"
  };

  const newItem = {
    id: "item-" + Date.now(),
    title: title,
    category: category,
    type: type,
    price: price,
    quantity: quantity,
    description: desc,
    barangay: barangay,
    ownerName: appState.currentUser.name,
    ownerContact: "0917-000-1122",
    ownerId: appState.currentUser.id,
    imageUrl: uploadedImageBase64 || categoryImages[category] || "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=600&q=80",
    datePosted: new Date().toISOString().split('T')[0]
  };

  try {
    const res = await fetch(`${API_BASE}/materials`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newItem)
    });

    if (res.ok) {
      alert("Your material has been saved to the C++ SQLite database!");
      closeModal("createModal");
      document.getElementById("create-item-form").reset();
      uploadedImageBase64 = null;
      document.getElementById("file-name-label").innerText = "JPG, PNG or WEBP (Max 5MB)";

      await fetchMaterials();
      renderMaterials();
      updateImpactStats();
      renderUserDashboard();
    } else {
      alert("Failed to publish material listing.");
    }
  } catch (err) {
    console.error("Failed to post to C++ server:", err);
    alert("Error communicating with backend.");
  }
}

/* =========================================================
   USER DASHBOARD & MANAGEMENT
   ========================================================= */

function renderUserDashboard() {
  const userNameEl = document.getElementById("dash-user-name");
  const userDetailsEl = document.getElementById("dash-user-details");
  const myTableTbody = document.getElementById("my-listings-tbody");
  const requestsTbody = document.getElementById("my-requests-tbody");
  const reqBadge = document.getElementById("my-req-count");

  if (!userNameEl || !myTableTbody || !requestsTbody) return;

  if (!appState.currentUser) {
    userNameEl.innerText = "Guest Visitor";
    userDetailsEl.innerText = "Please log in using the button above to manage your personal material listings and pickup requests.";
    myTableTbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color: var(--text-muted); padding: 20px;">Log in to view your posted materials</td></tr>`;
    requestsTbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color: var(--text-muted); padding: 20px;">Log in to view trade offers</td></tr>`;
    if (reqBadge) reqBadge.style.display = "none";
    return;
  }

  userNameEl.innerText = appState.currentUser.name;
  userDetailsEl.innerText = `Registered Tacloban Citizen • Resident of ${appState.currentUser.barangay}`;

  const myListings = appState.materials.filter(m => m.ownerName === appState.currentUser.name || m.ownerId === appState.currentUser.id);
  
  if (myListings.length === 0) {
    myTableTbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color: var(--text-muted); padding: 20px;">You haven't listed any materials yet. Click "List Item" to post!</td></tr>`;
  } else {
    myTableTbody.innerHTML = myListings.map(item => `
      <tr>
        <td><strong>${item.title}</strong></td>
        <td>${item.category}</td>
        <td>${item.type === 'FOR_SALE' ? '₱' + item.price : item.type}</td>
        <td><span class="badge badge-sale">Active</span></td>
        <td>
          <button class="btn btn-secondary btn-sm" onclick="deleteListing('${item.id}')" style="background:#ef4444; color:#fff;">
            <i class="fa-solid fa-trash"></i> Delete
          </button>
        </td>
      </tr>
    `).join("");
  }

  if (reqBadge) {
    reqBadge.innerText = appState.requests.length;
    reqBadge.style.display = appState.requests.length > 0 ? "inline-block" : "none";
  }

  if (appState.requests.length === 0) {
    requestsTbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color: var(--text-muted); padding: 20px;">No trade inquiries or pickup requests received yet.</td></tr>`;
  } else {
    requestsTbody.innerHTML = appState.requests.map(req => `
      <tr>
        <td><strong>${req.itemTitle}</strong></td>
        <td>${req.requesterName}<br><small style="color:var(--text-muted);">${req.requesterContact}</small></td>
        <td style="max-width: 250px;">${req.message}</td>
        <td>${req.dateSent}</td>
        <td><span class="badge badge-trade">${req.status}</span></td>
        <td>
          ${req.status === 'Pending' ? `
            <button class="btn btn-secondary btn-sm" onclick="updateRequestStatus('${req.id}', 'Approved')" style="background:#10b981; color:#fff;">Approve</button>
          ` : ''}
        </td>
      </tr>
    `).join("");
  }
}

async function updateRequestStatus(requestId, newStatus) {
  try {
    const res = await fetch(`${API_BASE}/requests/${requestId}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus })
    });

    if (res.ok) {
      await fetchRequests();
      renderUserDashboard();
    } else {
      alert("Failed to update request status.");
    }
  } catch (err) {
    console.error("Status update error:", err);
    alert("Error communicating with C++ server.");
  }
}

async function deleteListing(id) {
  if (confirm("Are you sure you want to remove this reusable material listing?")) {
    try {
      const res = await fetch(`${API_BASE}/materials/${id}`, {
        method: "DELETE"
      });

      if (res.ok) {
        await fetchMaterials();
        renderMaterials();
        renderUserDashboard();
        updateImpactStats();
      } else {
        alert("Could not delete item from database.");
      }
    } catch (err) {
      console.error("Delete request error:", err);
      alert("Error contacting C++ server.");
    }
  }
}

/* =========================================================
   ECO IMPACT CALCULATOR STATS
   ========================================================= */

function updateImpactStats() {
  const totalItems = appState.materials.length;
  const estKg = totalItems * 14.5;
  const co2Saved = estKg * 1.3;

  const itemStat = document.getElementById("stat-total-items");
  const divStat = document.getElementById("stat-diverted-kg");
  const co2Stat = document.getElementById("stat-co2-saved");

  if (itemStat) itemStat.innerText = totalItems;
  if (divStat) divStat.innerText = `${Math.round(estKg)} kg`;
  if (co2Stat) co2Stat.innerText = `${Math.round(co2Saved)} kg`;
}

/* =========================================================
   AUTHENTICATION LOGIC (REGISTER & LOGIN VIA C++)
   ========================================================= */

let isSignUpMode = false;

function openAuthModal() {
  document.getElementById("authModal").classList.add("active");
}

function toggleAuthModal() {
  if (appState.currentUser) {
    logoutUser();
  } else {
    openAuthModal();
  }
}

function toggleAuthMode() {
  isSignUpMode = !isSignUpMode;
  const title = document.getElementById("auth-modal-title");
  const btn = document.getElementById("auth-submit-btn");
  const link = document.getElementById("auth-toggle-link");
  const text = document.getElementById("auth-toggle-text");
  const groupName = document.getElementById("group-auth-name");
  const groupBrgy = document.getElementById("group-auth-barangay");

  if (isSignUpMode) {
    title.innerText = "Citizen Registration";
    btn.innerText = "Create Profile";
    text.innerText = "Already registered?";
    link.innerText = "Log In Here";
    groupName.style.display = "block";
    groupBrgy.style.display = "block";
  } else {
    title.innerText = "Citizen Login";
    btn.innerText = "Log In";
    text.innerText = "Don't have a Tacloban resident profile?";
    link.innerText = "Register Here";
    groupName.style.display = "none";
    groupBrgy.style.display = "none";
  }
}

async function handleAuthSubmit(e) {
  e.preventDefault();

  const email = document.getElementById("auth-email").value;
  const password = document.getElementById("auth-password").value;
  const name = document.getElementById("auth-fullname")?.value;
  const barangay = document.getElementById("auth-barangay")?.value;

  const endpoint = isSignUpMode 
    ? `${API_BASE}/auth/register` 
    : `${API_BASE}/auth/login`;

  const payload = isSignUpMode 
    ? { email, password, name, barangay } 
    : { email, password };

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.error || "Authentication failed.");
      return;
    }

    appState.currentUser = data.user;
    localStorage.setItem("ecotrade_user", JSON.stringify(data.user));
    if (data.token) {
      localStorage.setItem("ecotrade_token", data.token);
    }

    await loadAppState();
    closeModal("authModal");
    alert(`Welcome, ${data.user.name}!`);

  } catch (err) {
    console.error("C++ Auth server error:", err);
    alert("The server is offline, try again later cuhh.");
  }
}

function logoutUser() {
  appState.currentUser = null;
  localStorage.removeItem("ecotrade_user");
  localStorage.removeItem("ecotrade_token");
  loadAppState();
  renderUserDashboard();
  alert("You have logged out.");
}

/* =========================================================
   GENERIC MODAL HELPERS
   ========================================================= */

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove("active");
}