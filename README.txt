# My Anime Gallery - Online

GitHub = source code
Cloudflare Worker = website + API
ImageKit = online image storage

Cloudflare variables/secrets required:
IMAGEKIT_PRIVATE_KEY   (Secret)
IMAGEKIT_PUBLIC_KEY    (Variable)
GALLERY_ADMIN_PASSWORD (Secret)

ImageKit custom metadata field names used by this code:
category
Name
Age
Note

Category values:
waifu
anime
penghormatan

The old `functions/api/upload-auth.js` is not used by this Worker and can be deleted.
