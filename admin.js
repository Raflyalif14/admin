// Proteksi akses admin
if (localStorage.getItem("adminLoggedIn") !== "true") {
  window.location.href = "login.html";
}

document.getElementById("logoutBtn").addEventListener("click", () => {
  localStorage.removeItem("adminLoggedIn");
  window.location.href = "login.html";
});

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
  measurementId: "G-Y34XQ5CB8G",
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// DOM
const pendingList = document.getElementById("pending-list");
const approvedList = document.getElementById("approved-list");

// Sidebar toggle
document.querySelectorAll("#sidebar-menu .nav-link").forEach((link) => {
  link.addEventListener("click", (e) => {
    e.preventDefault();

    document
      .querySelectorAll("#sidebar-menu .nav-link")
      .forEach((l) => l.classList.remove("active"));
    link.classList.add("active");

    document.getElementById("pending-section").classList.add("d-none");
    document.getElementById("approved-section").classList.add("d-none");

    document.getElementById(link.dataset.target).classList.remove("d-none");
  });
});

// Map penyimpanan user
const usersMap = {};

// Load semua user dulu
onValue(ref(db, "Users"), (snapshot) => {
  if (snapshot.exists()) {
    snapshot.forEach((userSnap) => {
      const user = userSnap.val();
      usersMap[user.id] = user.name || "Tanpa Nama";
    });

    // Setelah user dimuat, baru muat resep
    loadRecipes();
  }
});

function loadRecipes() {
  // Load Resep Pending
  onValue(ref(db, "PendingRecipes"), (snapshot) => {
    pendingList.innerHTML = "";
    if (snapshot.exists()) {
      snapshot.forEach((child) => {
        renderCard(pendingList, child.val(), child.key, true);
      });
    } else {
      pendingList.innerHTML = `<p class="text-center">Tidak ada resep menunggu persetujuan.</p>`;
    }
  });

  // Load Resep Approved
  onValue(ref(db, "Recipes"), (snapshot) => {
    approvedList.innerHTML = "";
    if (snapshot.exists()) {
      snapshot.forEach((child) => {
        renderCard(approvedList, child.val(), child.key, false);
      });
    } else {
      approvedList.innerHTML = `<p class="text-center">Belum ada resep yang disetujui.</p>`;
    }
  });
}

// Fungsi render kartu resep
function renderCard(container, data, id, isPending = false) {
  const {
    name = "Tanpa Nama",
    description = "-",
    category = "Tidak ada kategori",
    authorId = "",
    image = "https://via.placeholder.com/300x200?text=No+Image",
  } = data;

  const authorName = usersMap[authorId] || "Pengguna tidak diketahui";

  const col = document.createElement("div");
  col.className = "col-md-6 col-lg-4";

  col.innerHTML = `
    <div class="card shadow-sm h-100">
      <img src="${image}" class="card-img-top" alt="Gambar Resep">
      <div class="card-body d-flex flex-column">
        <h5 class="card-title">${name}</h5>
        <h6 class="card-subtitle mb-2 text-muted">Kategori: ${category}</h6>
        <p class="card-text"><strong>Deskripsi:</strong> ${description}</p>
        <p class="card-text"><small class="text-muted">Dikirim oleh: ${authorName}</small></p>
        ${
          isPending
            ? `
          <div class="mt-auto d-flex justify-content-between">
            <button class="btn btn-success btn-sm approve">Approve</button>
            <button class="btn btn-danger btn-sm reject">Reject</button>
          </div>
        `
            : `
          <div class="mt-auto d-flex justify-content-between align-items-center">
            <span class="text-success fw-bold">✅ Disetujui</span>
            <button class="btn btn-outline-danger btn-sm delete">Hapus</button>
          </div>
        `
        }
      </div>
    </div>
  `;

  if (isPending) {
    col.querySelector(".approve").addEventListener("click", async () => {
      const recipeIdToUpdate =
        data.originalId && data.originalId !== "" ? data.originalId : id;
      const recipeRef = ref(db, "Recipes/" + recipeIdToUpdate);

      // Ambil data lama resep yang diapprove
      const oldRecipe = await onValueOnce(recipeRef);
      const oldCategory = oldRecipe?.category;
      const newCategory = data.category;

      // Update data resep sesuai originalId (atau id baru kalau tambah baru)
      await set(recipeRef, {
        ...data,
        id: recipeIdToUpdate,
        status: "approved",
      });

      // Tambah referensi kategori baru
      await set(
        ref(db, "Categories/" + newCategory + "/" + recipeIdToUpdate),
        true
      );

      // Hapus referensi kategori lama jika ada dan berbeda
      if (oldCategory && oldCategory !== newCategory) {
        await remove(
          ref(db, "Categories/" + oldCategory + "/" + recipeIdToUpdate)
        );
      }

      // Hapus resep di PendingRecipes
      await remove(ref(db, "PendingRecipes/" + id));

      col.remove();
      alert("Resep berhasil di-approve dan diperbarui!");
    });

    col.querySelector(".reject").addEventListener("click", () => {
      remove(ref(db, "PendingRecipes/" + id)).then(() => {
        col.remove();
        alert("Resep ditolak dan dihapus.");
      });
    });
  } else {
    col.querySelector(".delete").addEventListener("click", () => {
      if (confirm("Yakin ingin menghapus resep ini?")) {
        remove(ref(db, "Recipes/" + id)).then(() => {
          col.remove();
          alert("Resep berhasil dihapus.");
        });
      }
    });
  }

  function onValueOnce(ref) {
    return new Promise((resolve) => {
      onValue(
        ref,
        (snapshot) => {
          resolve(snapshot.exists() ? snapshot.val() : null);
        },
        {
          onlyOnce: true,
        }
      );
    });
  }

  container.appendChild(col);
}
