# Turning on online play

**Play online** lets two people play the same game on two devices. One player taps **Challenge a friend** and sends the link. The friend opens it and plays black on their own device. Moves, undo, new positions, new games and names all sync live.

Online play needs a free Firebase project. You set it up once and it takes about ten minutes. Until it's set up, the site still works as a one-screen game and the online button explains that online play isn't switched on.

## 1. Create the project

1. Go to <https://console.firebase.google.com> and click **Create a project**. Any name works, for example `playtheory`. You can switch Google Analytics off.
2. The free **Spark** plan is enough.

## 2. Turn on anonymous sign-in

Players never make accounts. Each device gets an anonymous ID, so a match knows which device is blue and which is black.

1. Go to **Build → Authentication → Get started**.
2. Under **Sign-in method**, choose **Anonymous**, switch it on and save.
3. Under **Settings → Authorized domains**, click **Add domain** and add `butterknifees.github.io`.

## 3. Create the database

1. Go to **Build → Realtime Database → Create database**. Pick the location nearest to you and start in **locked mode**.
2. Open the **Rules** tab and replace everything there with the contents of [`database.rules.json`](database.rules.json). Click **Publish**.

   These rules let only the person who created a challenge and the one friend who accepted it read or change that match.

## 4. Connect the site

1. Open **Project settings** (the gear icon) and find **Your apps**. Click the web icon `</>`, name the app `PlayTheory` and register it. You don't need Firebase Hosting.
2. Copy the `firebaseConfig` object it shows into [`js/firebase-config.js`](js/firebase-config.js):

   ```js
   const FIREBASE_CONFIG={
     apiKey:"…",
     authDomain:"playtheory-xxxx.firebaseapp.com",
     databaseURL:"https://playtheory-xxxx-default-rtdb.firebaseio.com",
     projectId:"playtheory-xxxx",
     appId:"…"
   };
   ```

   Make sure `databaseURL` is there. If it's missing, copy the URL shown at the top of the Realtime Database page.
3. Commit and push. GitHub Pages updates within a minute or two.

The `apiKey` is meant to be public. It only identifies the project. What keeps matches private is the database rules from step 3.

## Good to know

- A challenge link works for exactly one friend. Whoever opens it first becomes black, and anyone else who opens it is told the challenge was already accepted.
- If either player refreshes the page, they rejoin the same match, because the link stays in the address bar.
- Either player can deal a new game, start a new position or change who moves first. Each player can undo only their own last move.
- Old matches stay in the database. They're tiny, but you can delete the `matches` node in the console whenever you like.
- Online play doesn't work in the claude.ai preview, because that page can't reach Firebase. Use the GitHub Pages site.
