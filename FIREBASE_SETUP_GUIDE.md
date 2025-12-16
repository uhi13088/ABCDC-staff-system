# 🔥 Firebase 자동 배포 설정 가이드

## 📋 목차
1. [Firebase Service Account Key 생성](#1-firebase-service-account-key-생성)
2. [GitHub Secrets 등록](#2-github-secrets-등록)
3. [배포 테스트](#3-배포-테스트)

---

## 1. Firebase Service Account Key 생성

### Step 1: Firebase Console 접속
1. [Firebase Console](https://console.firebase.google.com/) 접속
2. **abcdc-staff-system** 프로젝트 선택
3. 좌측 메뉴에서 **⚙️ 프로젝트 설정** 클릭

### Step 2: Service Account 생성
1. 상단 탭에서 **서비스 계정** 클릭
2. 하단에 **Firebase Admin SDK** 섹션 확인
3. **새 비공개 키 생성** 버튼 클릭
4. **키 생성** 확인 클릭
5. **JSON 파일이 자동 다운로드됨** (예: `abcdc-staff-system-xxxxxxxx.json`)

### Step 3: JSON 파일 내용 확인
다운로드된 JSON 파일을 열면 다음과 같은 내용이 있습니다:
```json
{
  "type": "service_account",
  "project_id": "abcdc-staff-system",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxxxx@abcdc-staff-system.iam.gserviceaccount.com",
  ...
}
```

**⚠️ 중요: 이 JSON 파일 전체 내용을 복사해두세요!**

---

## 2. GitHub Secrets 등록

### Step 1: GitHub Repository Settings 접속
1. [GitHub Repository](https://github.com/uhi13088/ABCDC-staff-system) 접속
2. 우측 상단 **Settings** 클릭
3. 좌측 메뉴에서 **Secrets and variables** → **Actions** 클릭

### Step 2: Secrets 등록

**"New repository secret" 버튼을 클릭하여 다음 Secret들을 하나씩 등록:**

#### 🔑 Secret 1: FIREBASE_SERVICE_ACCOUNT
- **Name**: `FIREBASE_SERVICE_ACCOUNT`
- **Value**: 위에서 다운로드한 **JSON 파일 전체 내용** (그대로 붙여넣기)

#### 🔑 Secret 2-7: Firebase Web SDK
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
```

#### 🔑 Secret 8: 공휴일 API Key
```
Name: NEXT_PUBLIC_HOLIDAY_API_KEY
Value: 893a0ba24b1ee451911011b27725db1faca861e1780369475bd16e2799a56293
```

#### 🔑 Secret 9-11: Firebase Admin SDK
```
Name: FIREBASE_ADMIN_PROJECT_ID
Value: abcdc-staff-system

Name: FIREBASE_ADMIN_CLIENT_EMAIL
Value: firebase-adminsdk-fbsvc@abcdc-staff-system.iam.gserviceaccount.com

Name: FIREBASE_ADMIN_PRIVATE_KEY
Value: (아래 전체 내용 복사)
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

**⚠️ 중요: FIREBASE_ADMIN_PRIVATE_KEY는 따옴표 없이 그대로 붙여넣으세요!**

---

## 3. 배포 테스트

### Step 1: Git Push
모든 Secrets를 등록한 후:
```bash
git add .
git commit -m "feat: Firebase 자동 배포 설정 추가"
git push origin main
```

### Step 2: GitHub Actions 확인
1. [GitHub Repository](https://github.com/uhi13088/ABCDC-staff-system) 접속
2. **Actions** 탭 클릭
3. **Deploy to Firebase Hosting** 워크플로우 실행 확인
4. 로그에서 배포 URL 확인

### Step 3: 배포 URL 확인
배포가 완료되면 다음 URL에서 접속 가능:
```
https://abcdc-staff-system.web.app
또는
https://abcdc-staff-system.firebaseapp.com
```

---

## 🎯 예상 배포 시간
- **첫 배포**: 3-5분
- **이후 배포**: 2-3분

---

## ⚠️ 문제 해결

### 문제 1: "Permission denied" 에러
**원인**: Service Account 권한 부족

**해결**:
1. Firebase Console → 프로젝트 설정 → 서비스 계정
2. **권한** 섹션에서 **Firebase Hosting 관리자** 역할 추가

### 문제 2: "Invalid service account" 에러
**원인**: FIREBASE_SERVICE_ACCOUNT Secret 형식 오류

**해결**:
- JSON 파일 **전체 내용**을 복사했는지 확인
- 중괄호 `{}`가 포함되어 있는지 확인

### 문제 3: Build 실패
**원인**: 환경 변수 누락

**해결**:
- 위의 모든 Secrets가 정확히 등록되었는지 확인
- Secret 이름 철자 확인 (대소문자 구분!)

---

## 📞 문의
문제가 해결되지 않으면 GitHub Actions 로그를 확인하거나 알려주세요!
