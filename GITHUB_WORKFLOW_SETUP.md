# 🚀 GitHub Workflow 설정 가이드 (간단 버전)

## ✅ Service Account Key 발견!

레거시 폴더에서 `serviceAccountKey.json` 발견했습니다!
이미 복사 완료: `/home/user/webapp/serviceAccountKey.json`

---

## 📋 GitHub에서 할 작업 (3단계)

### Step 1: GitHub Secrets 등록

1. https://github.com/uhi13088/ABCDC-staff-system 접속
2. **Settings** → **Secrets and variables** → **Actions**
3. **New repository secret** 클릭

#### 🔑 등록할 Secrets (12개)

**1. FIREBASE_SERVICE_ACCOUNT_KEY**

로컬 프로젝트의 `serviceAccountKey.json` 파일 내용을 그대로 복사해서 붙여넣기!

위치: `/home/user/webapp/serviceAccountKey.json`

⚠️ **중요**: JSON 전체 내용을 그대로 복사 (중괄호 `{}` 포함)

**2-11. 나머지 환경변수들**
```
Name: NEXT_PUBLIC_FIREBASE_API_KEY
Value: AIzaSyCr3Tq2T7oy5rVlK1c33m_G0TlUWv0-g3k

Name: NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
Value: abcdc-staff-system.firebaseapp.com

Name: NEXT_PUBLIC_FIREBASE_PROJECT_ID
Value: abcdc-staff-system

Name: NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
Value: abcdc-staff-system.firebasestorage.app

Name: NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
Value: 442207878284

Name: NEXT_PUBLIC_FIREBASE_APP_ID
Value: 1:442207878284:web:49b157573851b124d28fa9

Name: NEXT_PUBLIC_HOLIDAY_API_KEY
Value: 893a0ba24b1ee451911011b27725db1faca861e1780369475bd16e2799a56293

Name: FIREBASE_ADMIN_PROJECT_ID
Value: abcdc-staff-system

Name: FIREBASE_ADMIN_CLIENT_EMAIL
Value: firebase-adminsdk-fbsvc@abcdc-staff-system.iam.gserviceaccount.com

Name: FIREBASE_ADMIN_PRIVATE_KEY
Value: (로컬 .env.local 파일에서 복사)
```

---

### Step 2: GitHub Workflow 파일 생성

1. https://github.com/uhi13088/ABCDC-staff-system 접속
2. **Actions** → **New workflow** → **set up a workflow yourself**
3. 파일명: `.github/workflows/firebase-hosting.yml`
4. 아래 내용 복사해서 붙여넣기:

```yaml
name: Deploy to Firebase Hosting

on:
  push:
    branches:
      - main
  workflow_dispatch:

jobs:
  build_and_deploy:
    runs-on: ubuntu-latest
    
    steps:
      - name: 📥 Checkout
        uses: actions/checkout@v4
      
      - name: 🟢 Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: 📦 Install dependencies
        run: npm ci
      
      - name: 🔧 Create .env.local
        run: |
          cat << EOF > .env.local
          NEXT_PUBLIC_FIREBASE_API_KEY=${{ secrets.NEXT_PUBLIC_FIREBASE_API_KEY }}
          NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=${{ secrets.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN }}
          NEXT_PUBLIC_FIREBASE_PROJECT_ID=${{ secrets.NEXT_PUBLIC_FIREBASE_PROJECT_ID }}
          NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=${{ secrets.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET }}
          NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=${{ secrets.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID }}
          NEXT_PUBLIC_FIREBASE_APP_ID=${{ secrets.NEXT_PUBLIC_FIREBASE_APP_ID }}
          NEXT_PUBLIC_HOLIDAY_API_KEY=${{ secrets.NEXT_PUBLIC_HOLIDAY_API_KEY }}
          FIREBASE_ADMIN_PROJECT_ID=${{ secrets.FIREBASE_ADMIN_PROJECT_ID }}
          FIREBASE_ADMIN_CLIENT_EMAIL=${{ secrets.FIREBASE_ADMIN_CLIENT_EMAIL }}
          FIREBASE_ADMIN_PRIVATE_KEY=${{ secrets.FIREBASE_ADMIN_PRIVATE_KEY }}
          EOF
      
      - name: 🏗️ Build
        run: npm run build
      
      - name: 🔑 Create Service Account Key file
        run: echo '${{ secrets.FIREBASE_SERVICE_ACCOUNT_KEY }}' > serviceAccountKey.json
      
      - name: 🚀 Deploy to Firebase
        run: npx firebase-tools deploy --only hosting --project abcdc-staff-system
        env:
          GOOGLE_APPLICATION_CREDENTIALS: ./serviceAccountKey.json
```

5. **"Commit changes"** 클릭

---

### Step 3: 배포 확인

1. **Actions** 탭에서 자동 실행 확인
2. 배포 완료 대기 (3-5분)
3. 배포 URL 접속:
   - https://abcdc-staff-system.web.app
   - https://abcdc-staff-system.firebaseapp.com

---

## 🎯 완료!

이제 `main` 브랜치에 push할 때마다 자동으로 Firebase에 배포됩니다! 🚀

---

## ⚠️ 문제 해결

### 배포 실패 시
1. Actions 로그 확인
2. FIREBASE_SERVICE_ACCOUNT_KEY Secret 확인
3. 모든 환경변수 Secrets 확인

---

**간단하죠? 이제 자동 배포 시스템이 완성되었습니다!** 🎉
