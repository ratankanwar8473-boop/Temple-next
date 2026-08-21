# 🛕 Temple Website — Next.js Full Stack (Single Vercel Deploy)

## Deploy Steps

### 1. MongoDB Atlas (Free)
- [mongodb.com/atlas](https://mongodb.com/atlas) → Free cluster
- Database Access → Add user → copy connection string

### 2. GitHub
```bash
cd temple-next
git init && git add . && git commit -m "init"
git remote add origin <your-repo-url>
git push -u origin main
```

### 3. Vercel
- [vercel.com](https://vercel.com) → New Project → Import repo
- Framework: **Next.js** (auto detected)
- Add env vars:
  - `MONGODB_URI` = your Atlas URI
  - `ADMIN_SECRET` = any strong secret

### Admin Panel
- URL: `/admin`
- Default: `admin` / `temple@123`
- Change password from Admin panel → Change Password tab
- Set same ADMIN_SECRET in Vercel env AND Admin → Cloudinary tab

### Local Dev
```bash
cp .env.local.example .env.local   # fill values
npm install
npm run dev
```
