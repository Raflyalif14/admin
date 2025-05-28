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

// Fungsi bantu: onValueOnce
function onValueOnce(dbRef) {
  return new Promise((resolve, reject) => {
    const unsubscribe = onValue(
      dbRef,
      (snapshot) => {
        unsubscribe(); // Unsubscribe setelah mendapat data
        resolve(snapshot.exists() ? snapshot.val() : null);
      },
      (error) => {
        unsubscribe();
        reject(error);
      }
    );
  });
}

// DOM elements - dengan error handling
const pendingList = document.getElementById("pending-list");
const approvedList = document.getElementById("approved-list");

if (!pendingList || !approvedList) {
  console.error("Required DOM elements not found");
}

// Sidebar toggle dengan error handling
const sidebarLinks = document.querySelectorAll("#sidebar-menu .nav-link");
if (sidebarLinks.length > 0) {
  sidebarLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();

      // Remove active class from all links
      sidebarLinks.forEach((l) => l.classList.remove("active"));
      link.classList.add("active");

      // Hide all sections
      const pendingSection = document.getElementById("pending-section");
      const approvedSection = document.getElementById("approved-section");

      if (pendingSection) pendingSection.classList.add("d-none");
      if (approvedSection) approvedSection.classList.add("d-none");

      // Show target section
      const targetSection = document.getElementById(link.dataset.target);
      if (targetSection) {
        targetSection.classList.remove("d-none");
      }
    });
  });
}

// Map penyimpanan user
const usersMap = {};
let usersLoaded = false;

// Load semua user dulu
const loadUsers = () => {
  return new Promise((resolve) => {
    onValue(
      ref(db, "Users"),
      (snapshot) => {
        if (snapshot.exists()) {
          snapshot.forEach((userSnap) => {
            const user = userSnap.val();
            if (user && user.id) {
              usersMap[user.id] = user.name || "Tanpa Nama";
            }
          });
        }
        usersLoaded = true;
        resolve();
      },
      (error) => {
        console.error("Error loading users:", error);
        usersLoaded = true;
        resolve();
      }
    );
  });
};

// Load recipes setelah users dimuat
async function loadRecipes() {
  if (!usersLoaded) {
    await loadUsers();
  }

  // Load Resep Pending
  onValue(
    ref(db, "PendingRecipes"),
    (snapshot) => {
      if (!pendingList) return;

      pendingList.innerHTML = "";
      if (snapshot.exists()) {
        snapshot.forEach((child) => {
          const data = child.val();
          if (data) {
            renderCard(pendingList, data, child.key, true);
          }
        });
      } else {
        pendingList.innerHTML = `<p class="text-center">Tidak ada resep menunggu persetujuan.</p>`;
      }
    },
    (error) => {
      console.error("Error loading pending recipes:", error);
      if (pendingList) {
        pendingList.innerHTML = `<p class="text-center text-danger">Error loading pending recipes</p>`;
      }
    }
  );

  // Load Resep Approved
  onValue(
    ref(db, "Recipes"),
    (snapshot) => {
      if (!approvedList) return;

      approvedList.innerHTML = "";
      if (snapshot.exists()) {
        snapshot.forEach((child) => {
          const data = child.val();
          if (data) {
            renderCard(approvedList, data, child.key, false);
          }
        });
      } else {
        approvedList.innerHTML = `<p class="text-center">Belum ada resep yang disetujui.</p>`;
      }
    },
    (error) => {
      console.error("Error loading approved recipes:", error);
      if (approvedList) {
        approvedList.innerHTML = `<p class="text-center text-danger">Error loading approved recipes</p>`;
      }
    }
  );
}

// Fungsi render kartu resep
function renderCard(container, data, id, isPending = false) {
  if (!container || !data || !id) return;

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

  // Escape HTML untuk mencegah XSS
  const escapedName = escapeHtml(name);
  const escapedDescription = escapeHtml(description);
  const escapedCategory = escapeHtml(category);
  const escapedAuthorName = escapeHtml(authorName);

  col.innerHTML = `
      <div class="card shadow-sm h-100">
        <img src="${image}" class="card-img-top" alt="Gambar Resep" onerror="this.src='https://via.placeholder.com/300x200?text=No+Image'">
        <div class="card-body d-flex flex-column">
          <h5 class="card-title">${escapedName}</h5>
          <h6 class="card-subtitle mb-2 text-muted">Kategori: ${escapedCategory}</h6>
          <p class="card-text"><strong>Deskripsi:</strong> ${escapedDescription}</p>
          <p class="card-text"><small class="text-muted">Dikirim oleh: ${escapedAuthorName}</small></p>
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

  // Event untuk resep pending
  if (isPending) {
    const approveBtn = col.querySelector(".approve");
    const rejectBtn = col.querySelector(".reject");

    if (approveBtn) {
      approveBtn.addEventListener("click", async () => {
        try {
          approveBtn.disabled = true;
          approveBtn.textContent = "Processing...";

          const recipeIdToUpdate =
            data.originalId && data.originalId !== "" ? data.originalId : id;
          const recipeRef = ref(db, "Recipes/" + recipeIdToUpdate);

          const oldRecipe = await onValueOnce(recipeRef);
          const oldCategory = oldRecipe?.category;
          const newCategory = data.category;

          // Update resep
          await set(recipeRef, {
            ...data,
            id: recipeIdToUpdate,
            status: "approved",
          });

          // Tambah referensi kategori baru
          if (newCategory) {
            await set(
              ref(db, "Categories/" + newCategory + "/" + recipeIdToUpdate),
              true
            );
          }

          // Hapus referensi kategori lama
          if (oldCategory && oldCategory !== newCategory) {
            await remove(
              ref(db, "Categories/" + oldCategory + "/" + recipeIdToUpdate)
            );
          }

          // Hapus dari Pending
          await remove(ref(db, "PendingRecipes/" + id));

          // Kirim notifikasi ke user
          if (authorId) {
            try {
              const userData = await onValueOnce(ref(db, "Users/" + authorId));
              const fcmToken = userData?.fcmToken;

              if (fcmToken) {
                // Ganti dengan URL Cloud Function yang benar
                const response = await fetch(
                  "https://your-region-your-project.cloudfunctions.net/sendApprovalNotification",
                  {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                      token: fcmToken,
                      title: "Resep Disetujui",
                      body: `Resep "${name}" kamu telah disetujui oleh admin!`,
                    }),
                  }
                );

                if (!response.ok) {
                  console.warn(
                    "Failed to send notification:",
                    response.statusText
                  );
                }
              }
            } catch (notifError) {
              console.error("Error sending notification:", notifError);
            }
          }

          col.remove();
          alert("Resep berhasil di-approve!");
        } catch (error) {
          console.error("Error approving recipe:", error);
          alert("Terjadi kesalahan saat approve resep: " + error.message);
          approveBtn.disabled = false;
          approveBtn.textContent = "Approve";
        }
      });
    }

    if (rejectBtn) {
      rejectBtn.addEventListener("click", async () => {
        if (!confirm("Yakin ingin menolak resep ini?")) return;

        try {
          rejectBtn.disabled = true;
          rejectBtn.textContent = "Processing...";

          await remove(ref(db, "PendingRecipes/" + id));
          col.remove();
          alert("Resep ditolak dan dihapus.");
        } catch (error) {
          console.error("Error rejecting recipe:", error);
          alert("Terjadi kesalahan saat menolak resep: " + error.message);
          rejectBtn.disabled = false;
          rejectBtn.textContent = "Reject";
        }
      });
    }
  } else {
    // Event hapus untuk approved
    const deleteBtn = col.querySelector(".delete");
    if (deleteBtn) {
      deleteBtn.addEventListener("click", async () => {
        if (!confirm("Yakin ingin menghapus resep ini?")) return;

        try {
          deleteBtn.disabled = true;
          deleteBtn.textContent = "Deleting...";

          // Hapus dari kategori juga
          if (data.category) {
            await remove(ref(db, "Categories/" + data.category + "/" + id));
          }

          await remove(ref(db, "Recipes/" + id));
          col.remove();
          alert("Resep berhasil dihapus.");
        } catch (error) {
          console.error("Error deleting recipe:", error);
          alert("Terjadi kesalahan saat menghapus resep: " + error.message);
          deleteBtn.disabled = false;
          deleteBtn.textContent = "Hapus";
        }
      });
    }
  }

  container.appendChild(col);
}

// Fungsi untuk escape HTML
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Initialize app
loadRecipes().catch((error) => {
  console.error("Error initializing app:", error);
});
