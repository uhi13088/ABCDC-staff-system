# GitHub Secrets 설정 가이드

GitHub Actions 자동 배포를 위해 다음 환경변수를 **GitHub Secrets**에 등록해야 합니다.

## 🔧 설정 방법

### 1. GitHub Repository Settings 이동

1. GitHub에서 `uhi13088/ABCDC-staff-system` 저장소 열기
2. **Settings** 탭 클릭
3. 좌측 메뉴에서 **Secrets and variables** → **Actions** 클릭
4. **New repository secret** 버튼 클릭

---

### 2. 환경변수 등록

아래 환경변수들을 하나씩 추가하세요. **로컬의 `.env.local` 파일에서 값을 복사**하면 됩니다.

#### 🔐 Firebase Admin SDK (서버 사이드)

| Secret 이름 | 값 (로컬 .env.local에서 복사) |
|-------------|------------------------------|
| `FIREBASE_ADMIN_PROJECT_ID` | abcdc-staff-system |
| `FIREBASE_ADMIN_CLIENT_EMAIL` | firebase-adminsdk-xxxxx@abcdc-staff-system.iam.gserviceaccount.com |
| `FIREBASE_ADMIN_PRIVATE_KEY` | "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n" |

**⚠️ 주의:** `FIREBASE_ADMIN_PRIVATE_KEY`는 **따옴표 포함** 전체를 복사하세요!

---

#### 🌐 Firebase Client SDK

| Secret 이름 | 값 (로컬 .env.local에서 복사) |
|-------------|------------------------------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | AIzaSyCr3Tq2T7oy5rVlK1c33m_G0TlUWv0-g3k |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | abcdc-staff-system.firebaseapp.com |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | abcdc-staff-system |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | abcdc-staff-system.firebasestorage.app |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | 442207878284 |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | 1:442207878284:web:49b157573851b124d28fa9 |

---

#### 🔑 Firebase Service Account (배포용)

**Firebase Console에서 새로운 Service Account JSON 키 발급:**

1. [Firebase Console](https://console.firebase.google.com/) → `abcdc-staff-system` 프로젝트 선택
2. **⚙️ Project Settings** → **Service Accounts** 탭
3. **Generate new private key** 클릭 → JSON 파일 다운로드
4. JSON 파일 **전체 내용**을 복사

**GitHub Secrets에 추가:**

| Secret 이름 | 값 |
|-------------|-----|
| `FIREBASE_SERVICE_ACCOUNT` | (JSON 파일 전체 내용 붙여넣기) |

**JSON 예시:**
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

---

## ✅ 설정 확인

총 **10개**의 Secrets가 등록되어야 합니다:

- [x] `FIREBASE_ADMIN_PROJECT_ID`
- [x] `FIREBASE_ADMIN_CLIENT_EMAIL`
- [x] `FIREBASE_ADMIN_PRIVATE_KEY`
- [x] `NEXT_PUBLIC_FIREBASE_API_KEY`
- [x] `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- [x] `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- [x] `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- [x] `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- [x] `NEXT_PUBLIC_FIREBASE_APP_ID`
- [x] `FIREBASE_SERVICE_ACCOUNT`

---

## 🚀 자동 배포 테스트

설정이 완료되면:

1. **코드를 `main` 브랜치에 Push**
   ```bash
   git push origin main
   ```

2. **GitHub Actions 확인**
   - GitHub Repository → **Actions** 탭
   - "Deploy to Firebase Hosting" 워크플로우 실행 확인
   - 성공 시 ✅ 녹색 체크

3. **배포 완료!**
   - Firebase Hosting URL에서 확인

---

## 🔍 문제 해결

### 에러: "Secret not found"
→ Secret 이름의 대소문자가 정확히 일치하는지 확인

### 에러: "Firebase authentication failed"
→ `FIREBASE_SERVICE_ACCOUNT` JSON이 완전한지 확인 (중괄호 `{}` 포함)

### 에러: "Build failed"
→ Actions 탭에서 로그 확인 후 에러 메시지 확인

---

## 📚 참고 링크

- [GitHub Secrets 공식 문서](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [Firebase Hosting GitHub Action](https://github.com/FirebaseExtended/action-hosting-deploy)
