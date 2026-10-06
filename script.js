const gallery = document.getElementById("gallery");
const emptyState = document.getElementById("emptyState");
const photoModal = document.getElementById("photoModal");
const addModal = document.getElementById("addModal");
const modalImage = document.getElementById("modalImage");
const modalCategory = document.getElementById("modalCategory");
const modalName = document.getElementById("modalName");
const modalAge = document.getElementById("modalAge");
const modalNote = document.getElementById("modalNote");
const storageMessage = document.getElementById("storageMessage");

const labels = {
  waifu: "Waifu",
  anime: "Anime",
  penghormatan: "Penghormatan"
};

let activeCategory = "all";
let selectedPhotoId = null;

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function getPhotos() {
  const response = await fetch("/api/photos", { cache: "no-store" });
  if (!response.ok) {
    throw new Error(await response.text() || "Gagal mengambil galeri.");
  }
  return await response.json();
}

async function renderGallery() {
  try {
    const allPhotos = await getPhotos();
    const photos = activeCategory === "all"
      ? allPhotos
      : allPhotos.filter(photo => photo.category === activeCategory);

    gallery.innerHTML = "";
    emptyState.textContent = "Belum ada foto pada kategori ini.";
    emptyState.classList.toggle("hidden", photos.length !== 0);

    photos.forEach(item => {
      const card = document.createElement("article");
      card.className = "card";
      card.innerHTML = `
        <img class="card-image"
             src="${escapeHtml(item.image)}"
             alt="${escapeHtml(item.name)}"
             loading="lazy">
        <div class="card-body">
          <span class="badge">${escapeHtml(labels[item.category] || item.category)}</span>
          <h2 class="card-name">${escapeHtml(item.name)}</h2>
          <p class="card-meta">Umur: ${escapeHtml(item.age || "-")}</p>
          <p class="card-note">${escapeHtml(item.note || "")}</p>
        </div>`;
      card.addEventListener("click", () => openPhoto(item));
      gallery.appendChild(card);
    });
  } catch (error) {
    console.error(error);
    gallery.innerHTML = "";
    emptyState.textContent = "Galeri belum dapat dimuat.";
    emptyState.classList.remove("hidden");
  }
}

function openPhoto(item) {
  selectedPhotoId = item.id;
  modalImage.src = item.image;
  modalImage.alt = item.name;
  modalCategory.textContent = labels[item.category] || item.category;
  modalName.textContent = item.name;
  modalAge.textContent = item.age || "-";
  modalNote.textContent = item.note || "";
  photoModal.classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function closePhoto() {
  photoModal.classList.add("hidden");
  selectedPhotoId = null;
  document.body.style.overflow = "";
}

function closeAddPhoto() {
  addModal.classList.add("hidden");
  document.body.style.overflow = "";
  document.getElementById("photoForm").reset();
  document.getElementById("fileName").textContent = "Belum ada file dipilih";
  document.getElementById("preview").src = "";
  document.getElementById("previewWrap").classList.add("hidden");
  storageMessage.textContent = "Foto akan disimpan online di ImageKit.";
}

document.querySelectorAll(".category-btn").forEach(button => {
  button.addEventListener("click", () => {
    activeCategory = button.dataset.category;
    document.querySelectorAll(".category-btn")
      .forEach(btn => btn.classList.toggle("active", btn === button));
    renderGallery();
  });
});

document.getElementById("addPhotoBtn").addEventListener("click", () => {
  addModal.classList.remove("hidden");
  document.body.style.overflow = "hidden";
});

document.getElementById("closeModal").addEventListener("click", closePhoto);
document.getElementById("closeAddModal").addEventListener("click", closeAddPhoto);
document.getElementById("cancelAdd").addEventListener("click", closeAddPhoto);

photoModal.addEventListener("click", event => {
  if (event.target === photoModal) closePhoto();
});

addModal.addEventListener("click", event => {
  if (event.target === addModal) closeAddPhoto();
});

document.getElementById("photoFile").addEventListener("change", event => {
  const file = event.target.files?.[0];
  if (!file) return;

  document.getElementById("fileName").textContent = file.name;

  const reader = new FileReader();
  reader.onload = () => {
    document.getElementById("preview").src = reader.result;
    document.getElementById("previewWrap").classList.remove("hidden");
  };
  reader.onerror = () => {
    storageMessage.textContent = "Foto tidak dapat dibaca oleh browser.";
  };
  reader.readAsDataURL(file);
});

document.getElementById("photoForm").addEventListener("submit", async event => {
  event.preventDefault();

  const file = document.getElementById("photoFile").files?.[0];
  const category = document.getElementById("category").value;
  const name = document.getElementById("name").value.trim();
  const age = document.getElementById("age").value.trim() || "-";
  const note = document.getElementById("note").value.trim();
  const adminPassword = document.getElementById("adminPassword").value;
  const submitButton = event.submitter;

  if (!file) {
    storageMessage.textContent = "Pilih foto terlebih dahulu.";
    return;
  }

  if (!name) {
    storageMessage.textContent = "Nama wajib diisi.";
    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = "Mengunggah...";

  try {
    storageMessage.textContent = "Meminta autentikasi upload...";

    const authResponse = await fetch("/api/upload-auth", {
      headers: {
        Authorization: `Bearer ${adminPassword}`
      }
    });

    const authText = await authResponse.text();

    if (!authResponse.ok) {
      throw new Error(authText || "Autentikasi admin gagal.");
    }

    const auth = JSON.parse(authText);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("fileName", file.name);
    formData.append("token", auth.token);
    formData.append("signature", auth.signature);
    formData.append("expire", String(auth.expire));
    formData.append("publicKey", auth.publicKey);
    formData.append("useUniqueFileName", "true");
    formData.append("folder", `/galeri/${category}`);
    formData.append("customMetadata", JSON.stringify({
      category: category,
      Name: name,
      Age: age,
      Note: note
    }));

    storageMessage.textContent = "Mengunggah foto ke ImageKit...";

    const uploadResponse = await fetch(
      "https://upload.imagekit.io/api/v1/files/upload",
      {
        method: "POST",
        body: formData
      }
    );

    const uploadText = await uploadResponse.text();

    if (!uploadResponse.ok) {
      throw new Error(uploadText || "Upload ImageKit gagal.");
    }

    activeCategory = category;
    document.querySelectorAll(".category-btn")
      .forEach(btn => btn.classList.toggle(
        "active",
        btn.dataset.category === activeCategory
      ));

    closeAddPhoto();
    await renderGallery();
  } catch (error) {
    console.error(error);
    storageMessage.textContent = `Gagal upload: ${error.message}`;
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Upload Foto";
  }
});

document.getElementById("deletePhotoBtn").addEventListener("click", async () => {
  if (!selectedPhotoId) return;

  const password = window.prompt("Masukkan password admin untuk menghapus foto:");
  if (!password) return;

  if (!window.confirm("Hapus foto ini dari galeri online?")) return;

  try {
    const response = await fetch("/api/delete", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${password}`
      },
      body: JSON.stringify({ fileId: selectedPhotoId })
    });

    const text = await response.text();

    if (!response.ok) {
      throw new Error(text || "Gagal menghapus foto.");
    }

    closePhoto();
    await renderGallery();
  } catch (error) {
    alert(`Gagal menghapus: ${error.message}`);
  }
});

document.addEventListener("keydown", event => {
  if (event.key !== "Escape") return;

  if (!photoModal.classList.contains("hidden")) closePhoto();
  if (!addModal.classList.contains("hidden")) closeAddPhoto();
});

renderGallery();
