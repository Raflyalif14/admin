// Proteksi akses admin
if (localStorage.getItem("adminLoggedIn") !== "true") {
  window.location.href = "login.html";
}

// Logout handler
document.getElementById("logoutBtn").addEventListener("click", () => {
  localStorage.removeItem("adminLoggedIn");
  window.location.href = "login.html";
});

// Firebase import
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getDatabase,
  ref,
  onValue,
  set,
  remove,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyDVGNrb5IdXunyXPm8Uay3HVBykiPs_J40",
  authDomain: "recipes-app-f172f.firebaseapp.com",
  databaseURL: "https://recipes-app-f172f-default-rtdb.firebaseio.com",
  projectId: "recipes-app-f172f",
  storageBucket: "recipes-app-f172f.appspot.com",
  messagingSenderId: "272717420782",
  appId: "1:272717420782:web:a2dcbe0c41b6ec7c01bbff",
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Sidebar toggle
document.querySelectorAll("#sidebar-menu .nav-link").forEach((link) => {
  link.addEventListener("click", (e) => {
    e.preventDefault();
    document
      .querySelectorAll("#sidebar-menu .nav-link")
      .forEach((l) => l.classList.remove("active"));
    link.classList.add("active");

    document
      .querySelectorAll(".section")
      .forEach((sec) => sec.classList.add("d-none"));
    document.getElementById(link.dataset.target).classList.remove("d-none");
  });
});

// DOM references
const pendingList = document.getElementById("pending-list");
const approvedList = document.getElementById("approved-list");
const usersMap = {};
const DEFAULT_IMAGE = "https://via.placeholder.com/300x200?text=No+Image";

// Load users and then recipes
onValue(ref(db, "Users"), (snapshot) => {
  snapshot.forEach((userSnap) => {
    const user = userSnap.val();
    usersMap[user.id] = user.name || "Tanpa Nama";
  });
  loadRecipes();
});

let recipesListenerAttached = false;

// Load recipes
function loadRecipes() {
  if (recipesListenerAttached) return;
  recipesListenerAttached = true;

  // Tampilkan loading
  pendingList.innerHTML = <p class="text-center">Memuat resep menunggu...</p>;
  approvedList.innerHTML = <p class="text-center">Memuat resep disetujui...</p>;

  // Approved
  onValue(ref(db, "Recipes"), (snapshot) => {
    renderList(approvedList, snapshot, false);
  });

  // Pending
  onValue(ref(db, "PendingRecipes"), (snapshot) => {
    renderList(pendingList, snapshot, true);
  });
}

// Utility: render list
function renderList(container, snapshot, isPending) {
  container.innerHTML = "";
  if (!snapshot.exists()) {
    container.innerHTML = `<p class="text-center">${
      isPending
        ? "Tidak ada resep menunggu persetujuan."
        : "Belum ada resep yang disetujui."
    }</p>`;
    return;
  }

  snapshot.forEach((child) => {
    const data = child.val();
    const id = child.key;
    renderCard(container, data, id, isPending);
  });
}

// Check duplikat
function checkDuplicateRecipe(name, authorId) {
  return new Promise((resolve) => {
    onValue(
      ref(db, "Recipes"),
      (snapshot) => {
        let found = false;
        snapshot.forEach((child) => {
          const r = child.val();
          if (r.name === name && r.authorId === authorId) found = true;
        });
        resolve(found);
      },
      { onlyOnce: true }
    );
  });
}

// Render 1 card
function renderCard(container, data, id, isPending = false) {
  const {
    name = "Tanpa Nama",
    description = "-",
    category = "Tidak ada kategori",
    authorId = "",
    image = DEFAULT_IMAGE,
  } = data;

  const col = document.createElement("div");
  col.className = "col-md-6 col-lg-4";

  col.innerHTML = `
    <div class="card shadow-sm h-100">
      <img src="${image}" class="card-img-top" alt="Gambar Resep" style="height: 200px; object-fit: cover;">
      <div class="card-body d-flex flex-column">
        <h5 class="card-title">${name}</h5>
        <h6 class="card-subtitle mb-2 text-muted">Kategori: ${category}</h6>
        <p class="card-text"><strong>Deskripsi:</strong> ${description}</p>
        <p class="card-text"><small class="text-muted">Dikirim oleh: ${
          usersMap[authorId] || "Pengguna tidak diketahui"
        }</small></p>
        ${
          isPending
            ? `<div class="mt-auto d-flex justify-content-between">
                <button class="btn btn-success btn-sm approve">Approve</button>
                <button class="btn btn-danger btn-sm reject">Reject</button>
              </div>`
            : `<div class="mt-auto d-flex justify-content-between align-items-center">
                <span class="text-success fw-bold">✅ Disetujui</span>
                <button class="btn btn-outline-danger btn-sm delete">Hapus</button>
              </div>`
        }
      </div>
    </div>
  `;

  if (isPending) {
    const approveBtn = col.querySelector(".approve");
    const rejectBtn = col.querySelector(".reject");

    approveBtn.onclick = async () => {
      approveBtn.disabled = true;
      approveBtn.textContent = "Menyetujui...";

      const isDupe = await checkDuplicateRecipe(name, authorId);
      if (isDupe) {
        alert("Resep sudah disetujui sebelumnya!");
        approveBtn.disabled = false;
        approveBtn.textContent = "Approve";
        return;
      }

      const newData = {
        name,
        description,
        category,
        authorId,
        image,
        status: "approved",
        id: data.originalId || id,
        approvedAt: Date.now(),
      };

      try {
        await set(ref(db, "Recipes/" + newData.id), newData);
        await remove(ref(db, "PendingRecipes/" + id));
        alert("Resep berhasil disetujui!");
      } catch (err) {
        alert("Gagal menyetujui resep.");
      }
    };

    rejectBtn.onclick = async () => {
      if (!confirm("Yakin tolak resep ini?")) return;
      rejectBtn.disabled = true;
      try {
        await remove(ref(db, "PendingRecipes/" + id));
        alert("Resep ditolak.");
      } catch {
        alert("Gagal menolak resep.");
        rejectBtn.disabled = false;
      }
    };
  } else {
    col.querySelector(".delete").onclick = async () => {
      if (!confirm("Hapus resep ini?")) return;
      try {
        await remove(ref(db, "Recipes/" + id));
        alert("Resep dihapus.");
      } catch {
        alert("Gagal menghapus resep.");
      }
    };
  }

  container.appendChild(col);
}
