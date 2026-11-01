# Turning on online play

**Play online** lets two people play the same game on two devices. One player taps **Challenge a friend** and sends the link, or taps **Make a room** and tells their friend the 5-letter code. The friend opens the link, or taps **Play online → Join a room** and types the code, and plays black on their own device. Moves, undo, new positions, new games and names all sync live.

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

   These rules let only the person who created a challenge and the one friend who accepted it read or change that match. Nobody can take over the other player's seat, change the other player's name, or store anything the game doesn't use. Room codes point at a match, last a day, and stop working once a friend joins. Whenever `database.rules.json` changes, paste it in again and publish.

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

To stop the key being used for other Google services, open <https://console.cloud.google.com/apis/credentials> for the project, edit the **Browser key**, and:

- under **API restrictions**, allow only Identity Toolkit API, Token Service API, Firebase Realtime Database API and Firebase App Check API;
- under **Website restrictions**, add `playtheoryhq.com/*` and `butterknifees.github.io/*`.

## 5. Turn on App Check (recommended)

App Check makes Firebase accept requests only from your site, so nobody can script thousands of matches and use up the free plan.

1. Go to <https://www.google.com/recaptcha/admin/create>, make a **reCAPTCHA v3** key, and add the domains `playtheoryhq.com` and `butterknifees.github.io`.
2. In the Firebase console, open **Build → App Check**, register the web app with the reCAPTCHA v3 provider and paste the key's **secret**.
3. Put the key's **site key** in `APP_CHECK_SITE_KEY` in [`js/firebase-config.js`](js/firebase-config.js), then commit and push.
4. Play an online match to check it works, then in **App Check → APIs**, click **Enforce** for Realtime Database. (Enforce only after the site sends App Check tokens, or online play stops working.)

## Good to know

- A challenge link works for exactly one friend. Whoever opens it first becomes black, and anyone else who opens it is told the challenge was already accepted.
- If either player refreshes the page, they rejoin the same match, because the link stays in the address bar.
- Either player can deal a new game, start a new position or change who moves first. Each player can undo only their own last move.
- Finished and abandoned matches stay in the database, and players can't delete them, so the games can be used to train a bot. Each match's `created` time says when it started. Delete matches older than 30 days from the console. Tapping **End online match** frees the room code but keeps the match.
- Every move is also saved once under `logs/<match id>/<move number>`: the move type (`k`), who made it (`b`: 0 is blue, 1 is black), the game (`g`), the position after the move as JSON (`s`) and the server time (`t`). This is the full game from start to finish, for training a bot. Players can add to it but can't read, change or delete it. Export it from the console (**⋮ → Export JSON**) and delete old entries there too.
- Moves are checked on each player's device, not by the database, so a friend who knows their way around browser developer tools could still cheat. Only play people you trust for anything that matters.
- Online play doesn't work in the claude.ai preview, because that page can't reach Firebase. Use the GitHub Pages site.
