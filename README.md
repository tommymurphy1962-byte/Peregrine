# Peregrine Solutions Portal

### Deploy in 3 steps — no technical knowledge required.

---

## [![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template?template=https://github.com/YOUR_GITHUB_USERNAME/peregrine-portal&envs=BASE_DOMAIN,ADMIN_EMAIL,ADMIN_PASSWORD,ANTHROPIC_API_KEY&BASE_DOMAINDesc=Your+domain+e.g.+peregrinesolutions.com&ADMIN_EMAILDesc=Email+you+will+log+in+with&ADMIN_PASSWORDDesc=Password+for+the+admin+account&ANTHROPIC_API_KEYDesc=From+console.anthropic.com)

---

## Step 1 — Put this on GitHub (2 minutes)

1. Go to **github.com** → sign up free
2. Click **+** → **New repository** → name it `peregrine-portal` → **Private** → **Create**
3. Click **uploading an existing file** → drag ALL files in this folder → **Commit changes**

---

## Step 2 — Click the Deploy button above (4 minutes)

Railway will ask you for 4 things:

| Field | What to enter |
|-------|--------------|
| BASE_DOMAIN | `peregrinesolutions.com` (your domain) |
| ADMIN_EMAIL | The email you want to log in with |
| ADMIN_PASSWORD | Pick any password |
| ANTHROPIC_API_KEY | From console.anthropic.com → API Keys |

Click **Deploy** — Railway builds and launches everything automatically.

---

## Step 3 — Point your domain in GoDaddy (5 minutes)

After Railway deploys, it gives you a URL like `something.up.railway.app`

In GoDaddy → your domain → DNS → add:

| Type | Name | Value |
|------|------|-------|
| CNAME | admin | paste-your-railway-url-here |
| CNAME | * | paste-your-railway-url-here |

Then in Railway → Settings → Domains → add `admin.peregrinesolutions.com`

**Wait 10 minutes → go to `https://admin.peregrinesolutions.com` → log in.**

---

## That's it. You're live.

The app walks you through everything else — adding vendor credentials, creating customer portals, and syncing products — from inside the admin dashboard.

**Monthly cost:** ~$5 on Railway. Nothing else.

---

*Built with Node.js · SQLite · React · Playwright · Claude AI*
