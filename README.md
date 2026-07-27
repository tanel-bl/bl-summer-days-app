# Black Labz Summer Days 2026 — App

A installable iPhone "app" (PWA) with the itinerary, a link to the individual
challenges, and a live shared photo wall. Guests take a photo → it uploads
automatically to a shared gallery everyone can see. No photo is saved to
their camera roll, and no App Store download is needed.

## What's in this folder

```
index.html       ← the whole app (3 tabs: Schedule / Challenges / Camera)
manifest.json    ← makes it installable ("Add to Home Screen")
sw.js            ← service worker (required for install prompt on some browsers)
icons/           ← B'L app icons
api/upload.js    ← serverless function: receives a photo, stores it
api/photos.js    ← serverless function: lists all photos for the gallery
package.json     ← one dependency: @vercel/blob (Vercel's file storage)
vercel.json      ← tells Vercel this is a plain static + functions project
```

## Deploy it — step by step

### 1. Put this folder on GitHub
Create a new repository (e.g. `bl-summer-days-app`) and upload all these files
to it, keeping the folder structure exactly as-is (the `api` folder must stay
named `api`, at the root).

### 2. Import into Vercel
- vercel.com → **Add New → Project**
- Select the GitHub repo you just created
- Leave all settings on default (Framework: **Other**) → **Deploy**

At this point the app will deploy, the Schedule and Challenges tabs will work,
but the Camera tab's uploads will fail — it needs its own storage first.

### 3. Turn on photo storage (Vercel Blob) — one-time setup
- In your Vercel project, open the **Storage** tab
- Click **Create Database → Blob**
- Give it a name (anything, e.g. `bl-photos`) → **Create**
- On the next screen, make sure your project is checked under **Connect to
  Project**, then confirm

This automatically adds a `BLOB_READ_WRITE_TOKEN` environment variable to your
project — you don't need to copy/paste anything yourself.

### 4. Redeploy
- Go to **Deployments** → click the **⋯** menu on the latest deployment →
  **Redeploy**
  (This step is needed once, so the new environment variable takes effect.)

That's it — the Camera tab now works. Test it by opening your `.vercel.app`
link, going to the Camera tab, and taking a photo. It should appear in the
gallery within a couple of seconds.

## Installing it on iPhone (for your colleagues)

1. Open the link in **Safari** (must be Safari, not Chrome, for this to work
   on iPhone)
2. Tap the **Share** button (square with an arrow, at the bottom)
3. Scroll down and tap **Add to Home Screen**
4. Tap **Add**

A B'L icon now appears on their home screen. Tapping it opens the app
full-screen, exactly like a downloaded app — no browser bar, no address bar.

## Editing the schedule later

Open `index.html` in any text editor and search for the day you want to
change (e.g. search for `14.08` or `Puijo Tower`). Each event is one line
like:

```html
<div class="row"><div class="time">16:00</div><div><div class="what">Opening Lunch</div><div class="where">Puijo Tower Restaurant</div></div></div>
```

Change the text inside, save, and push to GitHub — Vercel redeploys
automatically within about a minute.

## Notes

- Photos are stored publicly (anyone with the direct photo URL can view that
  one photo), but the gallery itself is only visible inside the app —
  reasonable for an internal team event. Let me know if you'd like the
  gallery password-protected too, same as the Challenges page.
- There's no moderation/delete button built in yet. If you want a way to
  remove an inappropriate photo, that's a small addition — just ask.
- The free "Hobby" Vercel plan includes enough Blob storage for an event this
  size at no cost.
