# Setting up OpenRacer on your machine

Step-by-step. Not skipping anything. Should take 20–30 minutes if you've never done this before.

## What you need

- A Mac or Windows PC (either works; instructions slightly different for Windows)
- An Anthropic account with Claude Pro or Max subscription (for Claude Code access)
- Your terminal app (Terminal on Mac, PowerShell on Windows)
- About 30 minutes

## Step 1 — Install Node.js

Claude Code runs on Node.js. If you've never installed it, go to https://nodejs.org and download the LTS version (the big green button). Run the installer with default settings.

**Verify it worked.** Open your terminal and type:

```
node --version
```

You should see something like `v22.11.0`. If you get "command not found", restart your terminal and try again. If still failing, reboot the machine.

## Step 2 — Install Claude Code

In the same terminal, type:

```
npm install -g @anthropic-ai/claude-code
```

This takes a minute or two. When done, type:

```
claude --version
```

If you see a version number, it worked.

## Step 3 — Create the project folder

Pick where you want the code to live. On a Mac, `~/Projects` is a common choice. Create it:

```
mkdir -p ~/Projects/openracer
cd ~/Projects/openracer
```

## Step 4 — Drop the handoff files in

You should have received a zip file called `openracer-handoff.zip`. Unzip it. Inside is a folder containing:

- `CLAUDE.md`
- `README.md`
- `FIRST-PROMPT.md`
- `SETUP.md` (this file)
- `.gitignore`
- `docs/` (a folder with phase-0-plan, decisions, roadmap, spec-summary, and the full spec .docx)

**Copy everything from inside that folder into `~/Projects/openracer/`.** You don't want the outer folder, just the contents.

Verify it worked:

```
ls
```

You should see `CLAUDE.md`, `README.md`, etc. listed.

## Step 5 — Initialise git

Still in `~/Projects/openracer/`:

```
git init
git add .
git commit -m "chore: initial spec and handoff docs"
```

This gives you a safety net. If anything goes wrong later, you can always get back to this starting point.

## Step 6 — Log into Claude Code

```
claude
```

First time, it'll ask you to log in. Follow the prompts — it'll open a browser, you log in with your Anthropic account, then come back to the terminal. Done.

## Step 7 — Kick off the first session

Open `FIRST-PROMPT.md` in any text editor (or just use `cat FIRST-PROMPT.md` to read it in the terminal).

Copy the block of text between the `---` lines.

Paste it into the Claude Code prompt and press enter.

Claude will read the docs and come back to you with:
1. A confirmation that it understood Phase 0 scope
2. Any questions it has
3. A proposed order of work

Review that. If it looks right, tell it to go ahead. If something's off, correct it before any code gets written.

## What happens next

Claude Code will:
1. Scaffold a React Native Expo project in this folder
2. Install dependencies
3. Create the folder structure from the Phase 0 plan
4. Write the hooks, stores, utilities, and HomeScreen
5. Write unit tests
6. Run everything to verify it works

It'll commit as it goes. If anything breaks, it'll tell you and you decide whether to fix it together or roll back.

## Testing the app on your phone

Once Claude Code has the scaffold working, you can test on a real phone:

**iPhone:** Install the "Expo Go" app from the App Store. Run `npm start` in the project folder. Scan the QR code that appears with your iPhone camera. The app loads inside Expo Go.

**Android:** Install "Expo Go" from the Play Store. Same process.

For the airplane-mode test, enable airplane mode on the phone first, then open Expo Go (with the app cached), and verify GPS still shows values.

## If things go wrong

**Claude Code got stuck or confused.** Type `/compact` to summarise the conversation and continue, or `/clear` to restart. Your CLAUDE.md and docs survive.

**A command failed with an error you don't understand.** Paste the whole error to Claude Code and ask it to explain. That's the point of having it.

**The project is genuinely broken and you want to restart.** You've got the git commit from step 5. Run:

```
git reset --hard HEAD
git clean -fdx
```

This blows away everything except your original handoff files. Start fresh.

**You want to pause and come back later.** Just close the terminal. Next time, `cd ~/Projects/openracer` and type `claude` again. It'll pick up where you left off (though starting with a fresh session is often cleaner — Claude Code reads CLAUDE.md every session).

## A note on cost

Claude Code uses tokens. Phase 0 should cost £2–5 of your Claude Pro/Max allowance total. If you're on a flat-rate plan (Pro or Max), you won't see a direct charge — you just eat into your monthly tokens. If Claude ever says "compact running low" or similar, just type `/compact` and carry on.

Typical developer usage is $6–12/day of tokens. Phase 0 is a 2-week phase but most of that is Claude thinking/running tests, not continuous chat, so real consumption is modest.
