# ✅ v3.7 배포 체크리스트

**버전**: v3.7  
**날짜**: 2025-01-20  
**작업**: Cloud Functions 보안 강화  
**우선순위**: 🔴 Critical (보안 취약점 해결)

---

## 📋 배포 전 준비 사항

### ✅ 완료된 작업

- [x] `functions/index.js` 보안 강화 코드 작성
- [x] 비밀 키 생성 (64자 랜덤)
- [x] 인증 미들웨어 구현 (`verifyAuthorization`)
- [x] 4개 함수 보호 완료
- [x] 문서 작성 (`FUNCTIONS_SECURITY_v3.7.md`)
- [x] README.md 업데이트
- [x] CHANGELOG.md 업데이트
- [x] Git 커밋 및 푸시 완료

---

## 🚀 사장님이 해야 할 배포 작업

### 1️⃣ Firebase Functions 환경 변수 설정 (필수!)

**중요**: 이 작업을 하지 않으면 Functions가 작동하지 않습니다!

```bash
# 터미널에서 실행
cd /home/user/webapp

# Firebase 프로젝트 확인
firebase use abcdc-staff-system

# 비밀 키 설정 (아래 키를 그대로 복사해서 사용)
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

# Functions만 배포 (약 3~5분 소요)
firebase deploy --only functions
```

**예상 출력**:
```
✔  functions: Finished running predeploy script.
i  functions: preparing functions directory for uploading...
✔  functions: functions folder uploaded successfully
i  functions: creating Node.js 18 function cleanupOrphanedAuth...
i  functions: creating Node.js 18 function cleanupOldResignedUsers...
i  functions: creating Node.js 18 function createAbsentRecords...
i  functions: creating Node.js 18 function createAbsentRecordsForDate...
✔  functions[cleanupOrphanedAuth]: Successful update operation.
✔  functions[cleanupOldResignedUsers]: Successful update operation.
✔  functions[createAbsentRecords]: Successful update operation.
✔  functions[createAbsentRecordsForDate]: Successful update operation.

✔  Deploy complete!
```

---

### 3️⃣ Cloud Scheduler 설정 (자동 실행 함수)

**Google Cloud Console 접속**: https://console.cloud.google.com/cloudscheduler

#### 📅 작업 1: createAbsentRecords (매일 자정 1분)

**새 작업이면**:
1. **작업 만들기** 클릭
2. 설정:
   - 이름: `create-absent-records-daily`
   - 빈도: `1 0 * * *`
   - 시간대: `Asia/Seoul`
   - 대상: `HTTP`
   - URL: `https://us-central1-abcdc-staff-system.cloudfunctions.net/createAbsentRecords`
   - HTTP 메서드: `POST`
   - 헤더:
     ```
     Authorization: Bearer 142df780b6ca7208e5995129023c57b4ebea95f8c469b4119da816286d6d9f81
     ```

**기존 작업이면**:
1. 작업 이름 클릭
2. **수정** 클릭
3. **헤더** 섹션에 추가:
   ```
   Authorization: Bearer 142df780b6ca7208e5995129023c57b4ebea95f8c469b4119da816286d6d9f81
   ```
4. **업데이트** 클릭

---

#### 📅 작업 2: cleanupOldResignedUsers (매일 새벽 3시)

**새 작업이면**:
1. **작업 만들기** 클릭
2. 설정:
   - 이름: `cleanup-old-resigned-users`
   - 빈도: `0 3 * * *`
   - 시간대: `Asia/Seoul`
   - 대상: `HTTP`
   - URL: `https://us-central1-abcdc-staff-system.cloudfunctions.net/cleanupOldResignedUsers`
   - HTTP 메서드: `POST`
   - 헤더:
     ```
     Authorization: Bearer 142df780b6ca7208e5995129023c57b4ebea95f8c469b4119da816286d6d9f81
     ```

**기존 작업이면**:
1. 작업 이름 클릭
2. **수정** 클릭
3. **헤더** 섹션에 추가:
   ```
   Authorization: Bearer 142df780b6ca7208e5995129023c57b4ebea95f8c469b4119da816286d6d9f81
   ```
4. **업데이트** 클릭

---

### 4️⃣ 테스트 (배포 후 필수!)

#### 테스트 1: createAbsentRecordsForDate (수동 테스트)

```bash
curl -X POST https://us-central1-abcdc-staff-system.cloudfunctions.net/createAbsentRecordsForDate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer 142df780b6ca7208e5995129023c57b4ebea95f8c469b4119da816286d6d9f81" \
  -d '{"date":"2025-01-19"}'
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

**예상 응답 (인증 실패 - 비밀 키 없이 테스트)**:
```bash
curl -X POST https://us-central1-abcdc-staff-system.cloudfunctions.net/createAbsentRecordsForDate \
  -H "Content-Type: application/json" \
  -d '{"date":"2025-01-19"}'
```

```json
{
  "success": false,
  "error": "Unauthorized",
  "message": "Invalid or missing authorization credentials",
  "code": "AUTH_FAILED"
}
```

✅ 인증 실패 응답이 나오면 보안이 제대로 작동하는 것입니다!

---

#### 테스트 2: Firebase Console 로그 확인

**URL**: https://console.firebase.google.com/project/abcdc-staff-system/functions/logs

**성공 로그 예시**:
```
✅ 인증 성공 - 수동 결근 기록 생성 진행
📅 대상 날짜: 2025-01-19 (일요일)
👥 2025-01-19 출근 예정이었던 직원: 0명
✅ 0명의 결근 기록 생성 완료
```

**실패 로그 예시 (보안 작동)**:
```
🚫 인증 실패: createAbsentRecordsForDate
   사유: Missing Authorization header
   IP: 203.0.113.42
   User-Agent: curl/7.68.0
```

---

## 📊 배포 완료 체크리스트

- [ ] **1단계**: 비밀 키 환경 변수 설정 완료
- [ ] **2단계**: Functions 배포 완료 (firebase deploy)
- [ ] **3단계**: Cloud Scheduler 헤더 추가 (2개 작업)
- [ ] **4단계**: 수동 테스트 성공 (curl)
- [ ] **5단계**: 인증 실패 테스트 성공 (401 응답)
- [ ] **6단계**: Firebase Console 로그 확인

---

## 🚨 트러블슈팅

### 문제 1: "Unauthorized" 에러가 계속 발생

**원인**: 비밀 키 환경 변수 설정 안됨

**해결**:
```bash
# 1. 현재 설정 확인
firebase functions:config:get

# 2. 비어있으면 다시 설정
firebase functions:config:set functions.secret_key="142df780b6ca7208e5995129023c57b4ebea95f8c469b4119da816286d6d9f81"

# 3. Functions 재배포
firebase deploy --only functions
```

---

### 문제 2: Cloud Scheduler가 401 에러 반환

**원인**: Scheduler에 Authorization 헤더 미추가

**해결**:
1. Cloud Scheduler 콘솔 접속
2. 작업 이름 클릭
3. **수정** 클릭
4. **헤더** 섹션에 추가:
   ```
   Authorization: Bearer 142df780b6ca7208e5995129023c57b4ebea95f8c469b4119da816286d6d9f81
   ```
5. **업데이트** 클릭

---

### 문제 3: Functions 배포 실패

**원인**: Node.js 버전 문제 또는 의존성 오류

**해결**:
```bash
cd /home/user/webapp/functions

# 의존성 재설치
rm -rf node_modules package-lock.json
npm install

# 다시 배포
cd /home/user/webapp
firebase deploy --only functions
```

---

## 📞 문의

문제가 해결되지 않으면:
1. Firebase Console 로그 확인
2. 이 체크리스트 다시 확인
3. `FUNCTIONS_SECURITY_v3.7.md` 문서 참고

**배포 성공을 기원합니다!** 🚀
