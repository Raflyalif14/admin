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
  push,
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
  // Load Resep Approved
  onValue(ref(db, "Recipes"), (snapshot) => {
    approvedList.innerHTML = "";

    if (snapshot.exists()) {
      snapshot.forEach((child) => {
        const recipeData = child.val();
        renderCard(approvedList, recipeData, child.key, false);
      });
    } else {
      approvedList.innerHTML = `<p class="text-center">Belum ada resep yang disetujui.</p>`;
    }
  });

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
}

// Fungsi untuk mengecek apakah resep sudah ada di approved recipes
async function checkDuplicateRecipe(name, authorId) {
  return new Promise((resolve) => {
    const recipesRef = ref(db, "Recipes");
    onValue(
      recipesRef,
      (snapshot) => {
        let isDuplicate = false;
        if (snapshot.exists()) {
          snapshot.forEach((child) => {
            const recipe = child.val();
            if (recipe.name === name && recipe.authorId === authorId) {
              isDuplicate = true;
            }
          });
        }
        resolve(isDuplicate);
      },
      { onlyOnce: true }
    ); // Hanya baca sekali, tidak perlu listener terus-menerus
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
    ingredients = [],
    instructions = [],
  } = data;

  const authorName = usersMap[authorId] || "Pengguna tidak diketahui";

  const col = document.createElement("div");
  col.className = "col-md-6 col-lg-4";

  col.innerHTML = `
    <div class="card shadow-sm h-100">
      <img src="${image}" class="card-img-top" alt="Gambar Resep" style="height: 200px; object-fit: cover;">
      <div class="card-body d-flex flex-column">
        <h5 class="card-title">${name}</h5>
        <h6 class="card-subtitle mb-2 text-muted">Kategori: ${category}</h6>
        <p class="card-text"><strong>Deskripsi:</strong> ${description}</p>
        <p class="card-text"><small class="text-muted">Dikirim oleh: ${authorName}</small></p>
        ${
          isPending
            ? `
          <div class="mt-auto d-flex justify-content-between">
            <button class="btn btn-success btn-sm approve" data-id="${id}">Approve</button>
            <button class="btn btn-danger btn-sm reject" data-id="${id}">Reject</button>
          </div>
        `
            : `
          <div class="mt-auto d-flex justify-content-between align-items-center">
            <span class="text-success fw-bold">✅ Disetujui</span>
            <button class="btn btn-outline-danger btn-sm delete" data-id="${id}">Hapus</button>
          </div>
        `
        }
      </div>
    </div>
  `;

  if (isPending) {
    col.querySelector(".approve").addEventListener("click", async (e) => {
      const recipeId = e.target.getAttribute("data-id");

      // Disable button untuk mencegah double click
      const approveBtn = e.target;
      approveBtn.disabled = true;
      approveBtn.textContent = "Processing...";

      try {
        // Cek duplikasi sebelum approve
        const isDuplicate = await checkDuplicateRecipe(
          data.name,
          data.authorId
        );

        if (isDuplicate) {
          alert("Resep ini sudah pernah disetujui sebelumnya!");
          // Re-enable button
          approveBtn.disabled = false;
          approveBtn.textContent = "Approve";
          return;
        }

        // Buat objek resep yang bersih
        const cleanRecipeData = {
          name: data.name,
          description: data.description,
          category: data.category,
          authorId: data.authorId,
          image: data.image,
          ingredients: data.ingredients || [],
          instructions: data.instructions || [],
          status: "approved",
          approvedAt: new Date().toISOString(),
          approvedBy: "admin",
        };

        // Gunakan push untuk generate key baru otomatis
        const newRecipeRef = push(ref(db, "Recipes"));

        // Tambahkan ke Recipes
        await set(newRecipeRef, cleanRecipeData);

        // Hapus dari PendingRecipes
        await remove(ref(db, "PendingRecipes/" + recipeId));

        alert("Resep berhasil di-approve!");
      } catch (error) {
        console.error("Error approving recipe:", error);
        alert("Terjadi kesalahan saat menyetujui resep.");

        // Re-enable button jika error
        approveBtn.disabled = false;
        approveBtn.textContent = "Approve";
      }
    });

    col.querySelector(".reject").addEventListener("click", async (e) => {
      const recipeId = e.target.getAttribute("data-id");

      if (confirm("Yakin ingin menolak resep ini?")) {
        try {
          await remove(ref(db, "PendingRecipes/" + recipeId));
          alert("Resep ditolak dan dihapus.");
        } catch (error) {
          console.error("Error rejecting recipe:", error);
          alert("Terjadi kesalahan saat menolak resep.");
        }
      }
    });
  } else {
    col.querySelector(".delete").addEventListener("click", async (e) => {
      const recipeId = e.target.getAttribute("data-id");

      if (confirm("Yakin ingin menghapus resep ini?")) {
        try {
          await remove(ref(db, "Recipes/" + recipeId));
          alert("Resep berhasil dihapus.");
        } catch (error) {
          console.error("Error deleting recipe:", error);
          alert("Terjadi kesalahan saat menghapus resep.");
        }
      }
    });
  }

  container.appendChild(col);
}
