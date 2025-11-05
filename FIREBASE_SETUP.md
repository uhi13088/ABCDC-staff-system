# Firebase Cloud Functions 자동 배포 설정

## 🎯 목표
GitHub에 push하면 Firebase Cloud Functions도 자동으로 배포되도록 설정

## 📋 설정 방법 (한 번만 하면 됩니다!)

### 1단계: Firebase CI 토큰 생성

로컬 컴퓨터(Mac/Windows)에서 실행:

```bash
# Firebase CLI 설치 (처음 한 번만)
npm install -g firebase-tools

# Firebase 로그인
firebase login

# CI 토큰 생성
firebase login:ci
```

실행하면 이런 형태의 토큰이 나옵니다:
```
1//0gABCDEFG...xyz123
```

**이 토큰을 복사해두세요!** ⚠️

### 2단계: GitHub에 토큰 등록

1. GitHub 저장소로 이동:
   https://github.com/uhi13088/mannamsalon-admin-system

2. **Settings** → **Secrets and variables** → **Actions** 클릭

3. **New repository secret** 버튼 클릭

4. 다음 정보 입력:
   - Name: `FIREBASE_TOKEN`
   - Secret: (1단계에서 복사한 토큰 붙여넣기)

5. **Add secret** 클릭

### 3단계: Functions 폴더에 dependencies 설치 (로컬에서)

```bash
cd /home/user/webapp/functions
npm install
```

### 4단계: Git push

```bash
cd /home/user/webapp
git add .
git commit -m "chore: GitHub Actions 설정"
git push origin main
```

## ✅ 완료!

이제부터 `functions/` 폴더의 코드를 수정하고 GitHub에 push하면:

```
GitHub push
    ↓
GitHub Actions 자동 실행
    ↓
Firebase Cloud Functions 자동 배포
    ↓
✅ 완료!
```

## 🔍 배포 상태 확인

- GitHub 저장소 → **Actions** 탭에서 배포 진행 상황 확인
- Firebase Console → Functions에서 배포된 함수 확인

## 📝 현재 상태

- ✅ `.github/workflows/firebase-functions.yml` 생성 완료
- ⏳ GitHub Secret 설정 필요 (FIREBASE_TOKEN)
- ⏳ functions/node_modules 설치 필요

## 🚀 수동 배포 (선택사항)

자동 배포 설정 전에 바로 배포하고 싶다면:

```bash
firebase login
cd /home/user/webapp
firebase deploy --only functions
```

## 💡 주의사항

- Firebase Blaze 플랜(종량제) 필요 (무료 할당량 있음)
- 월 200만 호출, 400,000 GB초 무료
- 소규모 시스템은 무료 범위 내 사용 가능
