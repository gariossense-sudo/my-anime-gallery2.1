// ======================================================
// MY ANIME GALLERY - ONLINE VERSION
// ImageKit + Cloudflare Worker
// ======================================================

const gallery = document.getElementById("gallery");
const emptyState = document.getElementById("emptyState");

const photoModal = document.getElementById("photoModal");
const addModal = document.getElementById("addModal");

const modalImage = document.getElementById("modalImage");
const modalCategory = document.getElementById("modalCategory");
const modalName = document.getElementById("modalName");
const modalAge = document.getElementById("modalAge");
const modalNote = document.getElementById("modalNote");

const storageMessage =
  document.getElementById("storageMessage");

const addPhotoBtn =
  document.getElementById("addPhotoBtn");

const closeModalBtn =
  document.getElementById("closeModal");

const closeAddModalBtn =
  document.getElementById("closeAddModal");

const cancelAddBtn =
  document.getElementById("cancelAdd");

const deletePhotoBtn =
  document.getElementById("deletePhotoBtn");

const photoForm =
  document.getElementById("photoForm");

const photoFileInput =
  document.getElementById("photoFile");

const fileNameElement =
  document.getElementById("fileName");

const previewElement =
  document.getElementById("preview");

const previewWrap =
  document.getElementById("previewWrap");

// ======================================================
// KATEGORI
// ======================================================

const labels = {
  waifu: "Waifu",
  anime: "Anime",
  penghormatan: "Penghormatan"
};

// Nilai harus sama persis dengan option
// Single Select di ImageKit.
const imageKitCategory = {
  waifu: "Waifu",
  anime: "Anime",
  penghormatan: "Penghormatan"
};

let activeCategory = "all";
let selectedPhotoId = null;

// ======================================================
// HELPER
// ======================================================

function getElementByIds(...ids) {
  for (const id of ids) {
    const element =
      document.getElementById(id);

    if (element) {
      return element;
    }
  }

  return null;
}

function getValue(...ids) {
  const element =
    getElementByIds(...ids);

  return element
    ? element.value.trim()
    : "";
}

function setMessage(message) {
  if (storageMessage) {
    storageMessage.textContent = message;
  }
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function readResponseError(response) {
  const text = await response.text();

  try {
    const data = JSON.parse(text);

    return (
      data.error ||
      data.message ||
      text
    );
  } catch {
    return (
      text ||
      `HTTP ${response.status}`
    );
  }
}

// ======================================================
// AMBIL FOTO DARI CLOUDFLARE WORKER
// ======================================================

async function getPhotos() {
  const response =
    await fetch("/api/photos", {
      method: "GET",
      cache: "no-store"
    });

  if (!response.ok) {
    throw new Error(
      await readResponseError(response)
    );
  }

  const data =
    await response.json();

  if (!Array.isArray(data)) {
    throw new Error(
      "Data galeri tidak valid."
    );
  }

  return data;
}

// ======================================================
// TAMPILKAN GALERI
// ======================================================

async function renderGallery() {
  if (!gallery) {
    return;
  }

  gallery.innerHTML = "";

  try {
    const allPhotos =
      await getPhotos();

    const photos =
      activeCategory === "all"
        ? allPhotos
        : allPhotos.filter(
            photo =>
              photo.category ===
              activeCategory
          );

    if (emptyState) {
      emptyState.classList.toggle(
        "hidden",
        photos.length !== 0
      );
    }

    if (photos.length === 0) {
      if (emptyState) {
        emptyState.textContent =
          "Belum ada foto pada kategori ini.";
      }

      return;
    }

    photos.forEach(item => {
      const card =
        document.createElement("article");

      card.className = "card";

      card.innerHTML = `
        <img
          class="card-image"
          src="${escapeHtml(item.image)}"
          alt="${escapeHtml(item.name)}"
          loading="lazy"
        >

        <div class="card-body">

          <span class="badge">
            ${escapeHtml(
              labels[item.category] ||
              item.category ||
              "Anime"
            )}
          </span>

          <h2 class="card-name">
            ${escapeHtml(
              item.name || "Tanpa Nama"
            )}
          </h2>

          <p class="card-meta">
            Umur:
            ${escapeHtml(
              item.age || "-"
            )}
          </p>

          <p class="card-note">
            ${escapeHtml(
              item.note || ""
            )}
          </p>

        </div>
      `;

      card.addEventListener(
        "click",
        () => openPhoto(item)
      );

      gallery.appendChild(card);
    });

  } catch (error) {
    console.error(
      "Render gallery error:",
      error
    );

    if (emptyState) {
      emptyState.textContent =
        "Galeri belum dapat dimuat.";

      emptyState.classList.remove(
        "hidden"
      );
    }
  }
}

// ======================================================
// MODAL DETAIL FOTO
// ======================================================

function openPhoto(item) {
  selectedPhotoId = item.id;

  if (modalImage) {
    modalImage.src = item.image;
    modalImage.alt = item.name || "";
  }

  if (modalCategory) {
    modalCategory.textContent =
      labels[item.category] ||
      item.category ||
      "Anime";
  }

  if (modalName) {
    modalName.textContent =
      item.name || "Tanpa Nama";
  }

  if (modalAge) {
    modalAge.textContent =
      item.age || "-";
  }

  if (modalNote) {
    modalNote.textContent =
      item.note || "";
  }

  if (photoModal) {
    photoModal.classList.remove(
      "hidden"
    );
  }

  document.body.style.overflow =
    "hidden";
}

function closePhoto() {
  if (photoModal) {
    photoModal.classList.add(
      "hidden"
    );
  }

  selectedPhotoId = null;

  document.body.style.overflow =
    "";
}

// ======================================================
// MODAL TAMBAH FOTO
// ======================================================

function openAddPhoto() {
  if (addModal) {
    addModal.classList.remove(
      "hidden"
    );
  }

  document.body.style.overflow =
    "hidden";

  setMessage(
    "Foto akan disimpan online di ImageKit."
  );
}

function resetForm() {
  if (photoForm) {
    photoForm.reset();
  }

  if (fileNameElement) {
    fileNameElement.textContent =
      "Belum ada file dipilih";
  }

  if (previewElement) {
    previewElement.src = "";
  }

  if (previewWrap) {
    previewWrap.classList.add(
      "hidden"
    );
  }
}

function closeAddPhoto() {
  if (addModal) {
    addModal.classList.add(
      "hidden"
    );
  }

  document.body.style.overflow =
    "";

  resetForm();

  setMessage(
    "Foto akan disimpan online di ImageKit."
  );
}

// ======================================================
// FILTER KATEGORI
// ======================================================

document
  .querySelectorAll(".category-btn")
  .forEach(button => {

    button.addEventListener(
      "click",
      () => {

        activeCategory =
          button.dataset.category;

        document
          .querySelectorAll(
            ".category-btn"
          )
          .forEach(btn => {

            btn.classList.toggle(
              "active",
              btn === button
            );

          });

        renderGallery();
      }
    );

  });

// ======================================================
// TOMBOL TAMBAH FOTO
// ======================================================

if (addPhotoBtn) {
  addPhotoBtn.addEventListener(
    "click",
    openAddPhoto
  );
}

// ======================================================
// TOMBOL TUTUP
// ======================================================

if (closeModalBtn) {
  closeModalBtn.addEventListener(
    "click",
    closePhoto
  );
}

if (closeAddModalBtn) {
  closeAddModalBtn.addEventListener(
    "click",
    closeAddPhoto
  );
}

if (cancelAddBtn) {
  cancelAddBtn.addEventListener(
    "click",
    closeAddPhoto
  );
}

// ======================================================
// KLIK LUAR MODAL
// ======================================================

if (photoModal) {
  photoModal.addEventListener(
    "click",
    event => {

      if (
        event.target ===
        photoModal
      ) {
        closePhoto();
      }

    }
  );
}

if (addModal) {
  addModal.addEventListener(
    "click",
    event => {

      if (
        event.target ===
        addModal
      ) {
        closeAddPhoto();
      }

    }
  );
}

// ======================================================
// PREVIEW FOTO
// ======================================================

if (photoFileInput) {

  photoFileInput.addEventListener(
    "change",
    event => {

      const file =
        event.target.files?.[0];

      if (!file) {
        return;
      }

      if (fileNameElement) {
        fileNameElement.textContent =
          file.name;
      }

      if (
        !file.type ||
        !file.type.startsWith(
          "image/"
        )
      ) {

        setMessage(
          "File harus berupa gambar."
        );

        return;
      }

      const reader =
        new FileReader();

      reader.onload = () => {

        if (previewElement) {
          previewElement.src =
            reader.result;
        }

        if (previewWrap) {
          previewWrap.classList.remove(
            "hidden"
          );
        }

      };

      reader.onerror = () => {

        setMessage(
          "Foto tidak dapat dibaca."
        );

      };

      reader.readAsDataURL(file);
    }
  );

}

// ======================================================
// UPLOAD FOTO
// ======================================================

if (photoForm) {

  photoForm.addEventListener(
    "submit",
    async event => {

      event.preventDefault();

      // ----------------------------------------------
      // Cari input dengan dukungan:
      // name / Name
      // age / Age
      // note / Note
      // ----------------------------------------------

      const nameInput =
        getElementByIds(
          "name",
          "Name"
        );

      const ageInput =
        getElementByIds(
          "age",
          "Age"
        );

      const noteInput =
        getElementByIds(
          "note",
          "Note"
        );

      const categoryInput =
        getElementByIds(
          "category",
          "Category"
        );

      const passwordInput =
        getElementByIds(
          "adminPassword",
          "AdminPassword"
        );

      const file =
        photoFileInput?.files?.[0];

      const category =
        categoryInput
          ? categoryInput.value
          : "";

      const name =
        nameInput
          ? nameInput.value.trim()
          : "";

      const age =
        ageInput
          ? ageInput.value.trim()
          : "-";

      const note =
        noteInput
          ? noteInput.value.trim()
          : "";

      const adminPassword =
        passwordInput
          ? passwordInput.value
          : "";

      const submitButton =
        event.submitter ||
        photoForm.querySelector(
          'button[type="submit"]'
        );

      // ----------------------------------------------
      // VALIDASI
      // ----------------------------------------------

      if (!file) {

        setMessage(
          "Pilih foto terlebih dahulu."
        );

        return;
      }

      if (!name) {

        setMessage(
          "Nama wajib diisi."
        );

        if (nameInput) {
          nameInput.focus();
        }

        return;
      }

      if (!category) {

        setMessage(
          "Pilih kategori terlebih dahulu."
        );

        if (categoryInput) {
          categoryInput.focus();
        }

        return;
      }

      if (!adminPassword) {

        setMessage(
          "Password admin wajib diisi."
        );

        if (passwordInput) {
          passwordInput.focus();
        }

        return;
      }

      if (
        !imageKitCategory[
          category
        ]
      ) {

        setMessage(
          "Kategori tidak valid."
        );

        return;
      }

      if (
        !file.type ||
        !file.type.startsWith(
          "image/"
        )
      ) {

        setMessage(
          "File yang dipilih harus berupa gambar."
        );

        return;
      }

      // Batas 25 MB.
      if (
        file.size >
        25 * 1024 * 1024
      ) {

        setMessage(
          "Ukuran foto terlalu besar. Gunakan foto di bawah 25 MB."
        );

        return;
      }

      if (submitButton) {

        submitButton.disabled =
          true;

        submitButton.textContent =
          "Mengunggah...";

      }

      try {

        // ------------------------------------------
        // 1. AMBIL AUTH IMAGEKIT DARI WORKER
        // ------------------------------------------

        setMessage(
          "Meminta autentikasi upload..."
        );

        const authResponse =
          await fetch(
            "/api/upload-auth",
            {
              method: "GET",
              headers: {
                Authorization:
                  `Bearer ${adminPassword}`
              },
              cache: "no-store"
            }
          );

        const authText =
          await authResponse.text();

        if (!authResponse.ok) {

          throw new Error(
            authText ||
            "Password admin salah."
          );

        }

        let auth;

        try {

          auth =
            JSON.parse(
              authText
            );

        } catch {

          throw new Error(
            "Respons autentikasi Worker tidak valid."
          );

        }

        if (
          !auth.token ||
          !auth.signature ||
          !auth.expire ||
          !auth.publicKey
        ) {

          throw new Error(
            "Data autentikasi ImageKit tidak lengkap."
          );

        }

        // ------------------------------------------
        // 2. SIAPKAN FORM DATA IMAGEKIT
        // ------------------------------------------

        setMessage(
          "Mengunggah foto ke ImageKit..."
        );

        const formData =
          new FormData();

        formData.append(
          "file",
          file
        );

        formData.append(
          "fileName",
          file.name
        );

        formData.append(
          "token",
          auth.token
        );

        formData.append(
          "signature",
          auth.signature
        );

        formData.append(
          "expire",
          String(auth.expire)
        );

        formData.append(
          "publicKey",
          auth.publicKey
        );

        formData.append(
          "useUniqueFileName",
          "true"
        );

        // Folder di ImageKit.
        formData.append(
          "folder",
          `/galeri/${category}`
        );

        // ------------------------------------------
        // CUSTOM METADATA IMAGEKIT
        // ------------------------------------------
        //
        // Field Name:
        // category
        // Name
        // Age
        // Note
        //
        // Option category:
        // Waifu
        // Anime
        // Penghormatan
        // ------------------------------------------

        formData.append(
          "customMetadata",
          JSON.stringify({

            category:
              imageKitCategory[
                category
              ],

            Name:
              name,

            Age:
              age || "-",

            Note:
              note || ""

          })
        );

        // ------------------------------------------
        // 3. KIRIM KE IMAGEKIT
        // ------------------------------------------

        const uploadResponse =
          await fetch(
            "https://upload.imagekit.io/api/v1/files/upload",
            {
              method: "POST",
              body: formData
            }
          );

        const uploadText =
          await uploadResponse.text();

        if (
          !uploadResponse.ok
        ) {

          let errorMessage =
            uploadText;

          try {

            const errorData =
              JSON.parse(
                uploadText
              );

            errorMessage =
              errorData.message ||
              errorData.error ||
              uploadText;

          } catch {
            // Gunakan text asli.
          }

          throw new Error(
            errorMessage ||
            "Upload ImageKit gagal."
          );
        }

        let uploadResult;

        try {

          uploadResult =
            JSON.parse(
              uploadText
            );

        } catch {

          throw new Error(
            "Respons ImageKit tidak valid."
          );

        }

        if (!uploadResult.url) {

          throw new Error(
            "ImageKit tidak mengembalikan URL foto."
          );

        }

        // ------------------------------------------
        // 4. BERHASIL
        // ------------------------------------------

        setMessage(
          "Foto berhasil di-upload."
        );

        activeCategory =
          category;

        document
          .querySelectorAll(
            ".category-btn"
          )
          .forEach(button => {

            button.classList.toggle(
              "active",
              button.dataset.category ===
                activeCategory
            );

          });

        closeAddPhoto();

        await renderGallery();

      } catch (error) {

        console.error(
          "Upload error:",
          error
        );

        setMessage(
          `Gagal upload: ${error.message}`
        );

      } finally {

        if (submitButton) {

          submitButton.disabled =
            false;

          submitButton.textContent =
            "Upload Foto";

        }

      }

    }
  );

}

// ======================================================
// HAPUS FOTO ONLINE
// ======================================================

if (deletePhotoBtn) {

  deletePhotoBtn.addEventListener(
    "click",
    async () => {

      if (!selectedPhotoId) {
        return;
      }

      const password =
        window.prompt(
          "Masukkan password admin untuk menghapus foto:"
        );

      if (!password) {
        return;
      }

      const confirmed =
        window.confirm(
          "Hapus foto ini dari galeri online?"
        );

      if (!confirmed) {
        return;
      }

      try {

        const response =
          await fetch(
            "/api/delete",
            {
              method: "DELETE",

              headers: {
                "Content-Type":
                  "application/json",

                Authorization:
                  `Bearer ${password}`
              },

              body: JSON.stringify({
                fileId:
                  selectedPhotoId
              })

            }
          );

        if (!response.ok) {

          throw new Error(
            await readResponseError(
              response
            )
          );

        }

        closePhoto();

        await renderGallery();

      } catch (error) {

        console.error(
          "Delete error:",
          error
        );

        window.alert(
          `Gagal menghapus: ${error.message}`
        );

      }

    }
  );

}

// ======================================================
// TOMBOL ESC
// ======================================================

document.addEventListener(
  "keydown",
  event => {

    if (
      event.key !==
      "Escape"
    ) {
      return;
    }

    if (
      photoModal &&
      !photoModal.classList.contains(
        "hidden"
      )
    ) {
      closePhoto();
    }

    if (
      addModal &&
      !addModal.classList.contains(
        "hidden"
      )
    ) {
      closeAddPhoto();
    }

  }
);

// ======================================================
// MULAI
// ======================================================

renderGallery();
