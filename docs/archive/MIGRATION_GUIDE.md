# 🚀 Schedules Collection 마이그레이션 가이드

## ⚡ 초간단 실행 방법 (클릭 1번!)

### 1단계: 관리자 페이지 열기
```
https://abcdc-staff-system.web.app/admin-dashboard.html
```

### 2단계: 로그인
- 이메일: `uhi1308@naver.com`
- 관리자 계정으로 로그인

### 3단계: 브라우저 콘솔 열기
- **Windows**: `F12` 키
- **Mac**: `Cmd + Option + I`
- **Console 탭** 클릭

### 4단계: 아래 명령어 복사 → 붙여넣기 → Enter (끝!)

```javascript
(async function() {
  // ISO 8601 주차 계산
  function getMondayOfWeek(year, weekNum) {
    const jan4 = new Date(year, 0, 4);
    const jan4Day = jan4.getDay() || 7;
    const firstMonday = new Date(jan4);
    firstMonday.setDate(jan4.getDate() - jan4Day + 1);
    const targetMonday = new Date(firstMonday);
    targetMonday.setDate(firstMonday.getDate() + (weekNum - 1) * 7);
    return targetMonday;
  }

  console.log('%c========================================', 'color: #007bff; font-weight: bold;');
  console.log('%c🚀 마이그레이션 시작', 'color: #28a745; font-weight: bold; font-size: 16px;');
  console.log('%c========================================', 'color: #007bff; font-weight: bold;');
  console.log('');

  // 권한 확인
  const user = firebase.auth().currentUser;
  if (!user) {
    console.error('❌ 로그인이 필요합니다!');
    return;
  }
  const userDoc = await db.collection('users').doc(user.uid).get();
  if (userDoc.data().role !== 'admin') {
    console.error('❌ 관리자 권한이 필요합니다!');
    return;
  }
  console.log(`✅ 로그인: ${user.email}`);
  console.log(`✅ 권한: ${userDoc.data().role}\n`);

  // 1단계: 백업
  console.log('📦 1단계: 백업 중...');
  const snapshot = await db.collection('schedules').get();
  let batch = db.batch();
  let count = 0;
  for (const doc of snapshot.docs) {
    batch.set(db.collection('schedules_backup').doc(doc.id), doc.data());
    count++;
    if (count % 500 === 0) {
      await batch.commit();
      batch = db.batch();
    }
  }
  if (count % 500 !== 0) await batch.commit();
  console.log(`✅ 백업 완료: ${count}개\n`);

  // 2단계: 변환
  console.log('🔄 2단계: 변환 중...');
  batch = db.batch();
  let newDocs = 0;
  for (const doc of snapshot.docs) {
    const data = doc.data();
    const match = doc.id.match(/^(.+)_(\d{4})-(\d{2})$/);
    if (!match) continue;
    
    const [, userId, yearStr, weekStr] = match;
    const monday = getMondayOfWeek(parseInt(yearStr), parseInt(weekStr));
    const days = ['월', '화', '수', '목', '금', '토', '일'];
    
    for (let i = 0; i < 7; i++) {
      const dayData = data[days[i]];
      if (!dayData || !dayData.isWorkDay) continue;
      
      const currentDate = new Date(monday);
      currentDate.setDate(monday.getDate() + i);
      
      batch.set(db.collection('schedules_new').doc(), {
        userId: userId,
        store: data.store || '',
        date: currentDate.toISOString().split('T')[0],
        startTime: dayData.startTime || '',
        endTime: dayData.endTime || '',
        hours: dayData.hours || 0,
        isShiftReplacement: dayData.isShiftReplacement || false,
        shiftRequestId: dayData.shiftRequestId || null,
        originalRequesterId: dayData.originalRequesterId || null,
        originalRequesterName: dayData.originalRequesterName || null,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      newDocs++;
      
      if (newDocs % 500 === 0) {
        await batch.commit();
        console.log(`   ${newDocs}개 변환 완료...`);
        batch = db.batch();
      }
    }
  }
  if (newDocs % 500 !== 0) await batch.commit();
  console.log(`✅ 변환 완료: ${newDocs}개\n`);

  // 3단계: 검증
  console.log('🔍 3단계: 검증 중...');
  let originalWorkDays = 0;
  for (const doc of snapshot.docs) {
    const data = doc.data();
    for (const day of ['월', '화', '수', '목', '금', '토', '일']) {
      if (data[day] && data[day].isWorkDay) originalWorkDays++;
    }
  }
  console.log(`   원본: ${originalWorkDays}개`);
  console.log(`   변환: ${newDocs}개`);
  if (originalWorkDays !== newDocs) {
    console.error('❌ 검증 실패! 중단합니다.');
    return;
  }
  console.log('✅ 검증 성공\n');

  // 4단계: 전환
  console.log('⚠️ 5초 후 전환 시작...');
  await new Promise(r => setTimeout(r, 5000));
  console.log('🔄 4단계: 전환 중...');
  
  // schedules → schedules_old
  batch = db.batch();
  count = 0;
  for (const doc of snapshot.docs) {
    batch.set(db.collection('schedules_old').doc(doc.id), doc.data());
    batch.delete(doc.ref);
    count++;
    if (count % 500 === 0) {
      await batch.commit();
      batch = db.batch();
    }
  }
  if (count % 500 !== 0) await batch.commit();
  console.log(`✅ schedules → schedules_old: ${count}개`);
  
  // schedules_new → schedules
  const newSnapshot = await db.collection('schedules_new').get();
  batch = db.batch();
  count = 0;
  for (const doc of newSnapshot.docs) {
    batch.set(db.collection('schedules').doc(doc.id), doc.data());
    batch.delete(doc.ref);
    count++;
    if (count % 500 === 0) {
      await batch.commit();
      batch = db.batch();
    }
  }
  if (count % 500 !== 0) await batch.commit();
  console.log(`✅ schedules_new → schedules: ${count}개\n`);

  console.log('%c========================================', 'color: #007bff; font-weight: bold;');
  console.log('%c✅ 마이그레이션 완료!', 'color: #28a745; font-weight: bold; font-size: 16px;');
  console.log('%c========================================', 'color: #007bff; font-weight: bold;');
  console.log('');
  console.log('백업: schedules_backup, schedules_old');
  console.log('관리자 페이지에서 스케줄 확인하세요!');
})();
```

---

## 🆘 만약 에러가 나면?

콘솔에 에러 메시지를 캡처해서 보내주세요!

---

## 🔙 롤백이 필요하면?

```javascript
(async function() {
  console.log('🔙 롤백 시작...');
  
  // schedules 비우기
  const current = await db.collection('schedules').get();
  let batch = db.batch();
  let count = 0;
  for (const doc of current.docs) {
    batch.delete(doc.ref);
    count++;
    if (count % 500 === 0) {
      await batch.commit();
      batch = db.batch();
    }
  }
  if (count % 500 !== 0) await batch.commit();
  
  // backup에서 복구
  const backup = await db.collection('schedules_backup').get();
  batch = db.batch();
  count = 0;
  for (const doc of backup.docs) {
    batch.set(db.collection('schedules').doc(doc.id), doc.data());
    count++;
    if (count % 500 === 0) {
      await batch.commit();
      batch = db.batch();
    }
  }
  if (count % 500 !== 0) await batch.commit();
  
  console.log('✅ 롤백 완료!');
})();
```

---

## 📝 마이그레이션이 하는 일

1. **백업**: 기존 schedules → schedules_backup
2. **변환**: 주차별 문서 → 일별 문서 (schedules_new)
3. **검증**: 근무일 수 일치 확인
4. **전환**: 
   - schedules → schedules_old
   - schedules_new → schedules (프로덕션)

---

**사장님, 위 명령어 복사해서 콘솔에 붙여넣기만 하시면 됩니다!** 🙏
