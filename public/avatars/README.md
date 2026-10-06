# Avatar Frames

PixelTalk has 10 built-in pixel avatar frames (`avatar-01` … `avatar-10`).

They are rendered as crisp SVG pixel-art data URIs by
`frontend/lib/avatars.js` — no uploads, no external storage. Only the
`avatarId` string (e.g. `"avatar-04"`) is stored in MongoDB on the user.

To customize the artwork, either:

1. Edit the pixel recipes in `frontend/lib/avatars.js`, or
2. Drop real images here named `avatar-01.png` … `avatar-10.png` and change
   `avatarSrc()` in `lib/avatars.js` to return `/avatars/${id}.png`.
