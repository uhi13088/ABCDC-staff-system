# Firebase Cloud Functions 배포 가이드

## 🎯 목표
직원/관리자 삭제 시 Firebase Authentication도 자동으로 삭제

## ⚡ 빠른 배포 (5분 완료!)

로컬 컴퓨터(Mac/Windows)에서 실행:

### 1단계: 필요한 도구 설치
```bash
# Firebase CLI 설치 (처음 한 번만)
npm install -g firebase-tools
```

### 2단계: Firebase 로그인
```bash
firebase login
```
브라우저가 열리면 Google 계정으로 로그인

### 3단계: 프로젝트로 이동
```bash
cd /path/to/mannamsalon-admin-system
```

### 4단계: Functions dependencies 설치
```bash
cd functions
npm install
cd ..
```

### 5단계: 배포!
```bash
firebase deploy --only functions
```

배포 완료! 🎉

## ✅ 배포 확인

1. **터미널 메시지 확인**
```
✔  functions[deleteAuthOnUserDelete(us-central1)] Successful create operation.
✔  functions[cleanupOrphanedAuth(us-central1)] Successful create operation.
```

2. **Firebase Console에서 확인**
https://console.firebase.google.com/project/abcdc-staff-system/functions

3. **작동 테스트**
- 관리자 페이지에서 테스트 직원 삭제
- Firebase Authentication에서 자동 삭제 확인

## 🔄 이후 업데이트

functions/ 폴더 코드 수정 후:
```bash
cd /path/to/mannamsalon-admin-system
firebase deploy --only functions
```

## 🗑️ 현재 Authentication 정리

배포 완료 후 기존 불필요한 계정 정리:

### 방법 1: HTTP 트리거 사용
```bash
curl -X POST https://us-central1-abcdc-staff-system.cloudfunctions.net/cleanupOrphanedAuth
```

### 방법 2: 수동 확인
1. `cleanup-auth.html` 브라우저로 열기
2. 정리 필요 계정 확인
3. Firebase Console에서 삭제

## 💰 비용

- **무료 할당량**: 월 200만 호출, 400,000 GB초
- **예상 사용량**: 월 10-20회 (직원 삭제 시만 실행)
- **비용**: 무료 범위 내 사용 가능 ✅

## ⚠️ 주의사항

1. Firebase Blaze 플랜 필요 (무료 할당량 있음)
2. 첫 배포는 프로젝트 루트에서 실행
3. Node.js 18 이상 필요

## 🆘 문제 해결

### "Firebase CLI를 찾을 수 없습니다"
```bash
npm install -g firebase-tools
```

### "프로젝트를 찾을 수 없습니다"
```bash
firebase use abcdc-staff-system
```

### "권한이 없습니다"
```bash
firebase login --reauth
```

## 📞 도움말

문제가 있으면 `FIREBASE_SETUP.md` 파일을 참고하세요!
