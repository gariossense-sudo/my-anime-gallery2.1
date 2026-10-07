function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

function isAuthorized(request, env) {
  const expectedPassword =
    env.GALLERY_ADMIN_PASSWORD;

  if (!expectedPassword) {
    return false;
  }

  const authorization =
    request.headers.get("Authorization") || "";

  if (!authorization.startsWith("Bearer ")) {
    return false;
  }

  return (
    authorization.slice(7) ===
    expectedPassword
  );
}

function imageKitAuthHeader(privateKey) {
  return `Basic ${btoa(`${privateKey}:`)}`;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // ==================================================
    // IMAGEKIT UPLOAD AUTH
    // ==================================================

    if (
      url.pathname ===
      "/api/upload-auth"
    ) {
      if (request.method !== "GET") {
        return new Response(
          "Method Not Allowed",
          { status: 405 }
        );
      }

      if (!isAuthorized(request, env)) {
        return json(
          {
            error:
              "Password admin salah."
          },
          401
        );
      }

      const privateKey =
        env.IMAGEKIT_PRIVATE_KEY;

      const publicKey =
        env.IMAGEKIT_PUBLIC_KEY;

      if (!privateKey || !publicKey) {
        return json(
          {
            error:
              "Konfigurasi ImageKit belum lengkap."
          },
          500
        );
      }

      const token =
        crypto.randomUUID();

      const expire =
        Math.floor(Date.now() / 1000) +
        30 * 60;

      const encoder =
        new TextEncoder();

      const cryptoKey =
        await crypto.subtle.importKey(
          "raw",
          encoder.encode(privateKey),
          {
            name: "HMAC",
            hash: "SHA-1"
          },
          false,
          ["sign"]
        );

      const signatureBuffer =
        await crypto.subtle.sign(
          "HMAC",
          cryptoKey,
          encoder.encode(
            token + expire
          )
        );

      const signature =
        Array.from(
          new Uint8Array(
            signatureBuffer
          )
        )
          .map(byte =>
            byte
              .toString(16)
              .padStart(2, "0")
          )
          .join("");

      return json({
        token,
        expire,
        signature,
        publicKey
      });
    }

    // ==================================================
    // AMBIL DAFTAR FOTO
    // ==================================================

    if (
      url.pathname ===
      "/api/photos"
    ) {
      if (request.method !== "GET") {
        return new Response(
          "Method Not Allowed",
          { status: 405 }
        );
      }

      const privateKey =
        env.IMAGEKIT_PRIVATE_KEY;

      if (!privateKey) {
        return json(
          {
            error:
              "ImageKit private key belum diset."
          },
          500
        );
      }

      const params =
        new URLSearchParams({
          type: "file",
          fileType: "image",
          limit: "1000",
          skip: "0",
          sort: "DESC_CREATED"
        });

      const response =
        await fetch(
          `https://api.imagekit.io/v1/files?${params.toString()}`,
          {
            method: "GET",
            headers: {
              Authorization:
                imageKitAuthHeader(
                  privateKey
                ),
              Accept:
                "application/json"
            }
          }
        );

      const responseText =
        await response.text();

      if (!response.ok) {
        return new Response(
          responseText,
          {
            status:
              response.status,
            headers: {
              "Content-Type":
                "application/json; charset=utf-8"
            }
          }
        );
      }

      let files;

      try {
        files =
          JSON.parse(
            responseText
          );
      } catch {
        return json(
          {
            error:
              "Respons ImageKit tidak valid."
          },
          502
        );
      }

      if (!Array.isArray(files)) {
        return json([]);
      }

      const photos =
        files
          .filter(file => {
            return (
              file.type === "file" &&
              file.fileType === "image" &&
              typeof file.filePath ===
                "string" &&
              file.filePath.startsWith(
                "/galeri/"
              )
            );
          })
          .map(file => {
            const metadata =
              file.customMetadata || {};

            let category =
              metadata.category || "";

            if (
              category === "Waifu"
            ) {
              category = "waifu";
            } else if (
              category === "Anime"
            ) {
              category = "anime";
            } else if (
              category ===
              "Penghormatan"
            ) {
              category =
                "penghormatan";
            }

            if (!category) {
              const pathParts =
                file.filePath
                  .split("/");

              category =
                pathParts[2] ||
                "anime";
            }

            // Gambar sekarang lewat Worker.
            const imageUrl =
              `${url.origin}/api/image?path=` +
              encodeURIComponent(
                file.filePath
              );

            return {
              id: file.fileId,
              image: imageUrl,
              category: category,
              name:
                metadata.Name ||
                file.name,
              age:
                metadata.Age ||
                "-",
              note:
                metadata.Note ||
                ""
            };
          });

      return json(photos);
    }

    // ==================================================
    // PROXY GAMBAR IMAGEKIT
    // ==================================================

    if (
      url.pathname ===
      "/api/image"
    ) {
      if (request.method !== "GET") {
        return new Response(
          "Method Not Allowed",
          { status: 405 }
        );
      }

      const path =
        url.searchParams.get(
          "path"
        );

      if (!path) {
        return new Response(
          "Path gambar tidak ada.",
          { status: 400 }
        );
      }

      // Hanya izinkan file dari folder
      // /galeri di ImageKit.
      if (
        !path.startsWith(
          "/galeri/"
        )
      ) {
        return new Response(
          "Path tidak diizinkan.",
          { status: 403 }
        );
      }

      const imageUrl =
        `https://ik.imagekit.io/starganzz${path}`;

      const imageResponse =
        await fetch(
          imageUrl,
          {
            method: "GET",
            headers: {
              Accept:
                "image/avif,image/webp,image/jpeg,image/png,image/*"
            },
            cf: {
              cacheTtl: 86400,
              cacheEverything: true
            }
          }
        );

      if (!imageResponse.ok) {
        return new Response(
          "Gambar tidak ditemukan.",
          {
            status:
              imageResponse.status
          }
        );
      }

      const headers =
        new Headers(
          imageResponse.headers
        );

      headers.set(
        "Cache-Control",
        "public, max-age=86400"
      );

      return new Response(
        imageResponse.body,
        {
          status:
            imageResponse.status,
          headers
        }
      );
    }

    // ==================================================
    // HAPUS FOTO
    // ==================================================

    if (
      url.pathname ===
      "/api/delete"
    ) {
      if (
        request.method !== "DELETE"
      ) {
        return new Response(
          "Method Not Allowed",
          { status: 405 }
        );
      }

      if (!isAuthorized(request, env)) {
        return json(
          {
            error:
              "Password admin salah."
          },
          401
        );
      }

      let body;

      try {
        body =
          await request.json();
      } catch {
        body = {};
      }

      const fileId =
        body.fileId;

      if (
        !fileId ||
        !/^[A-Za-z0-9_-]+$/.test(
          fileId
        )
      ) {
        return json(
          {
            error:
              "fileId tidak valid."
          },
          400
        );
      }

      const privateKey =
        env.IMAGEKIT_PRIVATE_KEY;

      if (!privateKey) {
        return json(
          {
            error:
              "ImageKit private key belum diset."
          },
          500
        );
      }

      const response =
        await fetch(
          `https://api.imagekit.io/v1/files/${encodeURIComponent(
            fileId
          )}`,
          {
            method: "DELETE",
            headers: {
              Authorization:
                imageKitAuthHeader(
                  privateKey
                ),
              Accept:
                "application/json"
            }
          }
        );

      const responseText =
        await response.text();

      if (!response.ok) {
        return new Response(
          responseText,
          {
            status:
              response.status,
            headers: {
              "Content-Type":
                "application/json; charset=utf-8"
            }
          }
        );
      }

      return json({
        success: true
      });
    }

    // ==================================================
    // WEBSITE
    // ==================================================

    return env.ASSETS.fetch(
      request
    );
  }
};
