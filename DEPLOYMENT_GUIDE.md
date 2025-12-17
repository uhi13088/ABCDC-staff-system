# 🚀 Firebase 자동 배포 완료 안내

## ✅ 완료된 작업

### 1. Next.js Static Export 설정 ✅
- `next.config.js`: `output: 'export'` 추가
- Firebase Hosting 완전 호환
- 빌드 결과: 15/15 Static Pages 성공

### 2. Dynamic Route → Query Parameter 변경 ✅
- **변경 전**: `/contract-sign/[id]`
- **변경 후**: `/contract-sign?id=xxx`
- `useSearchParams()` with Suspense boundary
- 모든 링크 참조 업데이트 완료

### 3. Firebase Hosting 설정 ✅
- `firebase.json`: public=out, rewrites, headers
- `.firebaserc`: project=abcdc-staff-system
- 빌드 출력: `out/` 디렉토리

### 4. Git Push 완료 ✅
- Commit: `e368a4da`
- GitHub: https://github.com/uhi13088/ABCDC-staff-system

---

## 🔧 남은 작업: GitHub Actions Workflow 생성

**⚠️ workflow scope 문제로 인해 GitHub UI에서 직접 생성이 필요합니다**

### Step 1: GitHub Repository 접속
1. https://github.com/uhi13088/ABCDC-staff-system 접속
2. **Actions** 탭 클릭
3. **"New workflow"** 또는 **"set up a workflow yourself"** 클릭

### Step 2: Workflow 파일 생성
파일 이름: `.github/workflows/firebase-hosting.yml`

아래 내용을 그대로 붙여넣기:

```yaml
name: Deploy to Firebase Hosting

on:
  push:
    branches:
      - main
  workflow_dispatch: # 수동 실행 가능

jobs:
  build_and_deploy:
    runs-on: ubuntu-latest
    
    steps:
      - name: 📥 Checkout code
        uses: actions/checkout@v4
      
      - name: 🟢 Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: 📦 Install dependencies
        run: npm ci
      
      - name: 🔧 Create .env.local from secrets
        run: |
          cat << EOF > .env.local
          # Firebase Web SDK Configuration
          NEXT_PUBLIC_FIREBASE_API_KEY=${{ secrets.NEXT_PUBLIC_FIREBASE_API_KEY }}
          NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=${{ secrets.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN }}
          NEXT_PUBLIC_FIREBASE_PROJECT_ID=${{ secrets.NEXT_PUBLIC_FIREBASE_PROJECT_ID }}
          NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=${{ secrets.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET }}
          NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=${{ secrets.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID }}
          NEXT_PUBLIC_FIREBASE_APP_ID=${{ secrets.NEXT_PUBLIC_FIREBASE_APP_ID }}
          
          # Public Holiday API Key
          NEXT_PUBLIC_HOLIDAY_API_KEY=${{ secrets.NEXT_PUBLIC_HOLIDAY_API_KEY }}
          
          # Firebase Admin SDK Configuration (서버 사이드 전용)
          FIREBASE_ADMIN_PROJECT_ID=${{ secrets.FIREBASE_ADMIN_PROJECT_ID }}
          FIREBASE_ADMIN_CLIENT_EMAIL=${{ secrets.FIREBASE_ADMIN_CLIENT_EMAIL }}
          FIREBASE_ADMIN_PRIVATE_KEY=${{ secrets.FIREBASE_ADMIN_PRIVATE_KEY }}
          EOF
      
      - name: 🏗️ Build Next.js (Static Export)
        run: npm run build
      
      - name: 🚀 Deploy to Firebase Hosting
        uses: w9jds/firebase-action@master
        with:
          args: deploy --only hosting
        env:
          FIREBASE_TOKEN: ${{ secrets.FIREBASE_TOKEN }}
```

### Step 3: Firebase Token 생성

터미널에서 실행:
```bash
npx firebase login:ci
```

출력된 토큰을 복사합니다.

### Step 4: GitHub Secrets 등록

1. Repository → **Settings** → **Secrets and variables** → **Actions**
2. **New repository secret** 클릭
3. 아래 Secrets를 하나씩 등록:

#### 🔑 필수 Secrets 목록

```
Name: FIREBASE_TOKEN
Value: (npx firebase login:ci 출력 토큰)

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
Value: (아래 전체 내용 그대로 복사)
-----BEGIN PRIVATE KEY-----
MIIEuwIBADANBgkqhkiG9w0BAQEFAASCBKUwggShAgEAAoIBAQDiBITGNxNTqEXi
YXyNDY4GSVzESYpdh1iIZEG+DOp1h4exROwf/GJvVb7SaQ/+o5WkEjhoL0tHoKez
jvD9/QDO5iSkwVSG6iX76v6lxajez+0cpTwynZawbU9IUmJcfWzMG7JA0UNoQ1U6
G8tV2D74DrE2q1teSeEcTb2f6/2Qq0/0xBxRoyteTG4GsIxi0kdv8IyYwUHQOrCO
TW9ezn2ySxb2lwJy3rRLflN2zoW1S6RFzt8CUCbDxJpx3K0+LwYDQWIjX+co8iOx
3//uwF/om1lJu4aVzN5jsAPCCWlIcQuI+16xUolx/kiwXgspmCYTf4l5nv1P4r4N
lpaDZmcVAgMBAAECgf9jw5rX43ekdaJjSqSvnkwSek94VP2+Sv/JNHfQa+MR/cDn
foS7mavZeP/B4J4uyAZFZcWAN2ADPebIW1AEzKiOqweBsdSduL0Lda7xfU4NC7qd
6lGoBed9+MIGKldAfByJ+6+y7KvUWeREwf/+5HTnCZUvjHPIKtQyqh4JeSFzuVYX
nTtC7pU7Ng18ncbNPRHvqnBcarcAUbrERs1/BBl5vyESfrQbKIdrOPC1IRq5CXp9
E/SVHjaEN4YbOUKKJBcAIIa2hpGapF9+xEkFarwrnmIU7m0KJe9eYKBaag7e3Ebo
TuCeo1Z1OmuBSgqW1Y6P5Z4FWEiBIs7+k2ZP4o0CgYEA+OFpoGDeXaJ052Kq1KZc
9W2wgzeasVcMKQw7PxnL5gldfi2G1/AddOKE3ZFp3PF03cuPIlNyDnvfpt2njaJ3
oG9U1mty0sdjG3041jQwvUt0WoiwvwDWwoGqveDmgOpGDqAIAXr9nmblY67G6M6e
AWyOmwrp5/D21VAWAChhurMCgYEA6HutkuCKQOdaR+Q0skIWddxV13pl032irdOd
W9QlfaA2/OCRzoeZS7IIgWHWXBLPhdpngoy4C4QWs2m8ORCdDOdBcOUeSDGBfbM0
HuG/w0P/OlXaDeCv76rw5RLiitZsWlIaXWA1TD3r3Ixxpgdvnhcv9WpDHsYvKiTY
DGo7WxcCgYEAsBXLxczDhzwJuiv08b9CxeJ1oGEW8aHE2MXupRZ7TKYTn9JWNTGN
pcUefCUF4Wx0YvhCrOadK+I4urbYdT0dpkUeoRYkhzzKwgg2zlbepQ9dozBS3NCb
IcLcKruUWmFmb7KJ94ItLoVehsiBsvV8lUVZIBj4pUG3YfTnm/T2MEECgYARktfK
FIMe6N4gNRXuq6Q7AI7UnQH5fLPBZA+vE1hKKMQ/VVJwRDvIRwrxjM3BZAKf4aSV
b8GxzShSI5oAzkqw4QJHYGprlqJtOBCmjPYL8qXmaPr0tZlXCprvFgBd8lt6cF5h
1JXyz3N21n74x/MeBi6v5HpyZxTFoMdcGOOnvQKBgDv7Gpmo1HvYEqrvMyzGC4fO
J0SGdO9A0og+vX1umRdWg8TmMQEwZ9Fpj/31ptNqo/dRHUdX18yyJl7vmZwlW49g
Sz7CvbKDPKNVApKj8An9OsikLLxtPPJj3JBW6WJj8u65a2QICAXh/NjO9sKw1HeE
LWnmuDA8qTVM3oid7xdY
-----END PRIVATE KEY-----
```

### Step 5: Workflow 실행

1. Workflow 파일 저장 후 **"Commit changes"** 클릭
2. **Actions** 탭에서 자동 실행 확인
3. 배포 완료 대기 (약 3-5분)

---

## 📍 배포 URL

배포 완료 후 다음 URL에서 접속 가능:
- **https://abcdc-staff-system.web.app**
- **https://abcdc-staff-system.firebaseapp.com**

---

## 🎯 배포 후 확인사항

1. ✅ Admin 로그인 테스트
2. ✅ Employee 로그인 테스트
3. ✅ 계약서 서명 페이지 (`/contract-sign?id=xxx`)
4. ✅ 모든 Firebase 연동 기능 확인

---

## ⚠️ 문제 해결

### 배포 실패 시
1. GitHub Actions 로그 확인
2. FIREBASE_TOKEN 유효성 검증
3. 모든 Secrets 정확히 등록되었는지 확인

### Firebase Token 재생성
```bash
npx firebase login:ci
```

---

## 📞 다음 단계

배포 완료 후:
1. QR 출퇴근 체크인 기능 (Phase T)
2. 추가 기능 개발
3. 성능 모니터링

---

**축하합니다! 🎉 Firebase 자동 배포 설정이 완료되었습니다!**
