# 🔒 Cloud Functions 보안 강화 가이드 (v3.7)

**날짜**: 2025-01-20  
**버전**: v3.7  
**작업**: HTTP 트리거 보안 강화 (비밀 키 인증)

---

## 📋 변경 사항 요약

### ✅ 보안 강화된 함수 (4개)

| 함수명 | 기능 | 실행 주기 |
|--------|------|----------|
| `cleanupOrphanedAuth` | 고아 Authentication 계정 삭제 | 수동 (필요시) |
| `cleanupOldResignedUsers` | 2년 지난 퇴사자 삭제 | 자동 (매일 새벽 3시) |
| `createAbsentRecords` | 자동 결근 기록 생성 | 자동 (매일 자정 1분) |
| `createAbsentRecordsForDate` | 특정 날짜 결근 기록 생성 | 수동 (테스트/보정) |

### 🔐 보안 메커니즘

**인증 방식**: `Authorization: Bearer SECRET_KEY` 헤더 검증

**보호 기능**:
- ✅ 무단 접근 차단 (401 Unauthorized)
- ✅ 잘못된 비밀 키 거부
- ✅ Authorization 헤더 누락 차단
- ✅ IP 및 User-Agent 로깅 (보안 감사)

---

## 🔑 비밀 키 정보

### 🔥 생성된 비밀 키 (안전하게 보관!)

```
142df780b6ca7208e5995129023c57b4ebea95f8c469b4119da816286d6d9f81
```

**⚠️ 중요**: 이 키는 **절대 GitHub에 커밋하지 마세요!**

---

## 🚀 배포 절차

### 1️⃣ Firebase Functions 환경 변수 설정

**로컬 터미널에서 실행**:

```bash
# 프로젝트 디렉토리로 이동
cd /home/user/webapp

# Firebase 프로젝트 확인
firebase use abcdc-staff-system

# 비밀 키 설정
firebase functions:config:set functions.secret_key="142df780b6ca7208e5995129023c57b4ebea95f8c469b4119da816286d6d9f81"

# 설정 확인
firebase functions:config:get
```

**예상 출력**:
```json
{
  "functions": {
    "secret_key": "142df780b6ca7208e5995129023c57b4ebea95f8c469b4119da816286d6d9f81"
  }
}
```

---

### 2️⃣ Cloud Functions 배포

```bash
cd /home/user/webapp

# Functions만 배포 (Hosting 제외)
firebase deploy --only functions

# 특정 함수만 배포 (선택 사항)
firebase deploy --only functions:cleanupOrphanedAuth,functions:cleanupOldResignedUsers,functions:createAbsentRecords,functions:createAbsentRecordsForDate
```

**배포 시간**: 약 3~5분 소요

---

### 3️⃣ Cloud Scheduler 설정 (자동 실행 함수)

Google Cloud Console에서 설정:

#### 📅 createAbsentRecords (매일 자정 1분)

1. **Cloud Scheduler 콘솔**: https://console.cloud.google.com/cloudscheduler
2. **작업 만들기** 클릭
3. **설정**:
   - **이름**: `create-absent-records-daily`
   - **빈도**: `1 0 * * *` (매일 자정 1분)
   - **시간대**: `Asia/Seoul`
   - **대상**: `HTTP`
   - **URL**: `https://us-central1-abcdc-staff-system.cloudfunctions.net/createAbsentRecords`
   - **HTTP 메서드**: `POST`
   - **본문**: (비워둠)
   - **헤더**:
     ```
     Authorization: Bearer 142df780b6ca7208e5995129023c57b4ebea95f8c469b4119da816286d6d9f81
     ```

#### 📅 cleanupOldResignedUsers (매일 새벽 3시)

1. **작업 만들기** 클릭
2. **설정**:
   - **이름**: `cleanup-old-resigned-users`
   - **빈도**: `0 3 * * *` (매일 새벽 3시)
   - **시간대**: `Asia/Seoul`
   - **대상**: `HTTP`
   - **URL**: `https://us-central1-abcdc-staff-system.cloudfunctions.net/cleanupOldResignedUsers`
   - **HTTP 메서드**: `POST`
   - **본문**: (비워둠)
   - **헤더**:
     ```
     Authorization: Bearer 142df780b6ca7208e5995129023c57b4ebea95f8c469b4119da816286d6d9f81
     ```

---

## 🧪 테스트 방법

### ✅ 로컬 테스트 (비밀 키 설정)

**1. 로컬 환경 변수 파일 생성**:

```bash
cd /home/user/webapp/functions

# .runtimeconfig.json 생성
cat > .runtimeconfig.json << 'EOF'
{
  "functions": {
    "secret_key": "142df780b6ca7208e5995129023c57b4ebea95f8c469b4119da816286d6d9f81"
  }
}
EOF

# Functions Emulator 실행
firebase emulators:start --only functions
```

**2. curl 테스트**:

```bash
# ✅ 정상 요청 (비밀 키 포함)
curl -X POST http://localhost:5001/abcdc-staff-system/us-central1/createAbsentRecordsForDate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer 142df780b6ca7208e5995129023c57b4ebea95f8c469b4119da816286d6d9f81" \
  -d '{"date":"2025-01-19"}'

# ❌ 실패 케이스 1: 비밀 키 누락
curl -X POST http://localhost:5001/abcdc-staff-system/us-central1/createAbsentRecordsForDate \
  -H "Content-Type: application/json" \
  -d '{"date":"2025-01-19"}'

# 예상 응답: 401 Unauthorized

# ❌ 실패 케이스 2: 잘못된 비밀 키
curl -X POST http://localhost:5001/abcdc-staff-system/us-central1/createAbsentRecordsForDate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer WRONG_KEY" \
  -d '{"date":"2025-01-19"}'

# 예상 응답: 401 Unauthorized
```

---

### ✅ 프로덕션 테스트

```bash
# createAbsentRecordsForDate 테스트 (특정 날짜)
curl -X POST https://us-central1-abcdc-staff-system.cloudfunctions.net/createAbsentRecordsForDate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer 142df780b6ca7208e5995129023c57b4ebea95f8c469b4119da816286d6d9f81" \
  -d '{"date":"2025-01-19"}'

# cleanupOrphanedAuth 테스트 (고아 계정 정리)
curl -X POST https://us-central1-abcdc-staff-system.cloudfunctions.net/cleanupOrphanedAuth \
  -H "Authorization: Bearer 142df780b6ca7208e5995129023c57b4ebea95f8c469b4119da816286d6d9f81"
```

**예상 응답 (성공)**:
```json
{
  "success": true,
  "message": "N명의 결근 기록이 생성되었습니다.",
  "date": "2025-01-19",
  "createdCount": 5
}
```

**예상 응답 (인증 실패)**:
```json
{
  "success": false,
  "error": "Unauthorized",
  "message": "Invalid or missing authorization credentials",
  "code": "AUTH_FAILED"
}
```

---

## 📊 로그 확인

### Firebase Console 로그

**URL**: https://console.firebase.google.com/project/abcdc-staff-system/functions/logs

**성공 로그 예시**:
```
✅ 인증 성공 - 자동 결근 기록 생성 시작
📅 대상 날짜: 2025-01-19 (금요일)
👥 어제 출근 예정이었던 직원: 12명
✅ 5명의 결근 기록 생성 완료
```

**실패 로그 예시**:
```
🚫 인증 실패: createAbsentRecords
   사유: Missing Authorization header
   IP: 203.0.113.42
   User-Agent: curl/7.68.0
```

---

## 🔐 보안 모범 사례

### ✅ DO (권장)

1. **비밀 키 안전 보관**: 
   - Firebase Functions Config 사용 (환경 변수)
   - 절대 GitHub에 커밋 금지
   - 1년마다 비밀 키 교체 권장

2. **로그 모니터링**:
   - Firebase Console에서 인증 실패 로그 정기 확인
   - 의심스러운 IP 주소 차단

3. **Cloud Scheduler 설정**:
   - Authorization 헤더 반드시 포함
   - HTTPS만 사용 (HTTP 금지)

### ❌ DON'T (금지)

1. **비밀 키 노출**:
   - ❌ GitHub에 커밋
   - ❌ 클라이언트 코드에 포함
   - ❌ 공개 문서에 기록

2. **취약한 키 사용**:
   - ❌ "password123" 같은 단순 키
   - ❌ 32자 미만의 짧은 키

3. **HTTP 사용**:
   - ❌ `http://` URL 사용 금지
   - ✅ `https://` URL만 사용

---

## 🛠️ 트러블슈팅

### 문제 1: "Unauthorized" 에러

**증상**:
```json
{
  "success": false,
  "error": "Unauthorized",
  "code": "AUTH_FAILED"
}
```

**해결**:
1. Authorization 헤더 확인: `Authorization: Bearer SECRET_KEY`
2. 비밀 키 정확성 확인
3. Firebase Functions Config 확인: `firebase functions:config:get`

---

### 문제 2: 환경 변수 설정 안됨

**증상**: Functions 로그에서 "DEVELOPMENT_KEY_PLEASE_CHANGE" 사용

**해결**:
```bash
# 1. 환경 변수 재설정
firebase functions:config:set functions.secret_key="YOUR_SECRET_KEY"

# 2. Functions 재배포
firebase deploy --only functions

# 3. 설정 확인
firebase functions:config:get
```

---

### 문제 3: Cloud Scheduler 실행 실패

**증상**: Scheduler 로그에서 401 에러

**해결**:
1. Cloud Scheduler 작업 편집
2. 헤더에 Authorization 추가 확인
3. 비밀 키 정확성 재확인
4. URL이 HTTPS인지 확인

---

## 📝 변경 이력

### v3.7 (2025-01-20)
- ✅ HTTP 트리거 보안 강화
- ✅ Authorization 헤더 검증 추가
- ✅ 4개 함수 보호 완료
- ✅ 상세 로깅 추가

---

## 📞 문의

문제 발생 시:
1. Firebase Console 로그 확인
2. 이 문서의 트러블슈팅 섹션 참고
3. GitHub Issues에 등록

**배포 성공을 기원합니다!** 🚀
