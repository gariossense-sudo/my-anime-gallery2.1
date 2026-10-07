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
  const expected = env.GALLERY_ADMIN_PASSWORD;
  if (!expected) return false;

  const header = request.headers.get("Authorization") || "";
  if (!header.startsWith("Bearer ")) return false;

  return header.slice(7) === expected;
}

function imageKitAuthHeader(privateKey) {
  return `Basic ${btoa(`${privateKey}:`)}`;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/upload-auth") {
      if (request.method !== "GET") {
        return new Response("Method Not Allowed", { status: 405 });
      }

      if (!isAuthorized(request, env)) {
        return json({ error: "Password admin salah." }, 401);
      }

      const privateKey = env.IMAGEKIT_PRIVATE_KEY;
      const publicKey = env.IMAGEKIT_PUBLIC_KEY;

      if (!privateKey || !publicKey) {
        return json({ error: "Konfigurasi ImageKit belum lengkap." }, 500);
      }

      const token = crypto.randomUUID();
      const expire = Math.floor(Date.now() / 1000) + 30 * 60;
      const encoder = new TextEncoder();

      const cryptoKey = await crypto.subtle.importKey(
        "raw",
        encoder.encode(privateKey),
        {
          name: "HMAC",
          hash: "SHA-1"
        },
        false,
        ["sign"]
      );

      const signatureBuffer = await crypto.subtle.sign(
        "HMAC",
        cryptoKey,
        encoder.encode(token + expire)
      );

      const signature = Array.from(new Uint8Array(signatureBuffer))
        .map(byte => byte.toString(16).padStart(2, "0"))
        .join("");

      return json({
        token,
        expire,
        signature,
        publicKey
      });
    }

if (url.pathname === "/api/photos") {
  if (request.method !== "GET") {
    return new Response("Method Not Allowed", {
      status: 405
    });
  }

  const privateKey = env.IMAGEKIT_PRIVATE_KEY;

  if (!privateKey) {
    return json(
      {
        error: "ImageKit private key belum diset."
      },
      500
    );
  }

  // Ambil semua file gambar, lalu kita filter
  // hanya file yang berada di /galeri/ atau subfoldernya.
  const params = new URLSearchParams({
    type: "file",
    fileType: "image",
    limit: "1000",
    skip: "0",
    sort: "DESC_CREATED"
  });

  const response = await fetch(
    `https://api.imagekit.io/v1/files?${params.toString()}`,
    {
      method: "GET",
      headers: {
        Authorization: imageKitAuthHeader(
          privateKey
        ),
        Accept: "application/json"
      }
    }
  );

  const text = await response.text();

  if (!response.ok) {
    return new Response(text, {
      status: response.status,
      headers: {
        "Content-Type":
          "application/json; charset=utf-8"
      }
    });
  }

  let files;

  try {
    files = JSON.parse(text);
  } catch {
    return json(
      {
        error:
          "Respons ImageKit tidak valid."
      },
      502
    );
  }

  const photos = Array.isArray(files)
    ? files
        .filter(file => {
          return (
            file.type === "file" &&
            file.fileType === "image" &&
            typeof file.filePath === "string" &&
            file.filePath.startsWith("/galeri/")
          );
        })
        .map(file => {
          const metadata =
            file.customMetadata || {};

          let category =
            metadata.category || "";

          // ImageKit menggunakan option:
          // Waifu / Anime / Penghormatan
          // Website menggunakan:
          // waifu / anime / penghormatan

          if (category === "Waifu") {
            category = "waifu";
          } else if (category === "Anime") {
            category = "anime";
          } else if (
            category === "Penghormatan"
          ) {
            category = "penghormatan";
          }

          // Cadangan berdasarkan folder.
          if (!category) {
            const folderParts =
              file.filePath.split("/");

            category =
              folderParts[2] || "anime";
          }

          return {
            id: file.fileId,
            image: file.url,

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
        })
    : [];

  return json(photos);
}
    }

    if (url.pathname === "/api/delete") {
      if (request.method !== "DELETE") {
        return new Response("Method Not Allowed", { status: 405 });
      }

      if (!isAuthorized(request, env)) {
        return json({ error: "Password admin salah." }, 401);
      }

      const body = await request.json().catch(() => ({}));
      const fileId = body.fileId;

      if (!fileId || !/^[A-Za-z0-9_-]+$/.test(fileId)) {
        return json({ error: "fileId tidak valid." }, 400);
      }

      const privateKey = env.IMAGEKIT_PRIVATE_KEY;
      if (!privateKey) {
        return json({ error: "ImageKit private key belum diset." }, 500);
      }

      const response = await fetch(
        `https://api.imagekit.io/v1/files/${encodeURIComponent(fileId)}`,
        {
          method: "DELETE",
          headers: {
            Authorization: imageKitAuthHeader(privateKey),
            Accept: "application/json"
          }
        }
      );

      const text = await response.text();

      if (!response.ok) {
        return new Response(text, {
          status: response.status,
          headers: {
            "Content-Type": "application/json; charset=utf-8"
          }
        });
      }

      return json({ success: true });
    }

    return env.ASSETS.fetch(request);
  }
};
