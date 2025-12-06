# 🧪 ABCDC Staff System - 테스트 가이드

> **맛남살롱 직원 관리 시스템 v3.8**  
> Jest 기반 자동화 테스트 환경

---

## 📋 목차

1. [테스트 개요](#테스트-개요)
2. [테스트 환경 구성](#테스트-환경-구성)
3. [테스트 실행 방법](#테스트-실행-방법)
4. [테스트 커버리지](#테스트-커버리지)
5. [테스트 작성 가이드](#테스트-작성-가이드)
6. [CI/CD 통합](#cicd-통합)
7. [문제 해결](#문제-해결)

---

## 테스트 개요

### ✅ 테스트 대상 모듈

| 모듈 | 파일 | 테스트 파일 | 커버리지 |
|------|------|-------------|----------|
| **급여 계산** | `js/salary-calculator.js` | `tests/salary-calculator.test.js`<br>`tests/salary-calculator-monthly.test.js` | 84.51% |
| **직원 유틸** | `js/employee-utils.js` | `tests/employee.test.js` | 95.34% |

### 🎯 테스트 범위

#### ✅ Pure Functions (순수 함수)
- Firebase 의존성 없음
- 입력 → 출력 결정적
- 부작용(Side Effect) 없음
- **테스트 가능**

#### ⚠️ Firebase 의존 함수
- Firestore 쿼리/업데이트
- Firebase Auth 연동
- **Mock 필요 또는 통합 테스트**

---

## 테스트 환경 구성

### 설치된 패키지

```json
{
  "devDependencies": {
    "@babel/core": "^7.23.0",
    "@babel/preset-env": "^7.23.0",
    "babel-jest": "^29.7.0",
    "jest": "^29.7.0"
  }
}
```

### 설정 파일

#### `jest.config.js`
```javascript
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  collectCoverageFrom: [
    'js/salary-calculator.js',
    'js/employee-utils.js'
  ],
  coverageThreshold: {
    global: {
      branches: 75,
      functions: 90,
      lines: 85,
      statements: 85
    }
  }
};
```

#### `.babelrc`
```json
{
  "presets": [
    ["@babel/preset-env", {
      "targets": { "node": "current" }
    }]
  ]
}
```

---

## 테스트 실행 방법

### 기본 테스트 실행

```bash
# 모든 테스트 실행
npm test

# 특정 파일만 테스트
npm test salary-calculator

# Watch 모드 (파일 변경 감지)
npm run test:watch
```

### 커버리지 리포트 생성

```bash
# 커버리지 포함 테스트
npm run test:coverage

# HTML 리포트 확인
open coverage/index.html
```

### CI 환경에서 실행

```bash
# CI 최적화 옵션
npm run test:ci
```

---

## 테스트 커버리지

### 📊 현재 커버리지 (v3.8)

```
----------------------|---------|----------|---------|---------
File                  | % Stmts | % Branch | % Funcs | % Lines
----------------------|---------|----------|---------|---------
All files             |   86.17 |    76.21 |   95.83 |   85.82
 employee-utils.js    |   95.34 |    88.46 |     100 |   94.87
 salary-calculator.js |   84.51 |    74.62 |   93.33 |   84.27
----------------------|---------|----------|---------|---------
```

### 📈 커버리지 목표

| 지표 | 현재 | 목표 (v4.0) |
|------|------|-------------|
| Statements | 86.17% | 90%+ |
| Branches | 76.21% | 85%+ |
| Functions | 95.83% | 95%+ |
| Lines | 85.82% | 90%+ |

---

## 테스트 작성 가이드

### 1️⃣ Pure Function 테스트

**예시: salary-calculator.js**

```javascript
describe('timeToMinutes() - 시간 변환', () => {
  test('정상 시간 변환', () => {
    expect(timeToMinutes('09:30')).toBe(570);
    expect(timeToMinutes('12:00')).toBe(720);
  });
  
  test('잘못된 입력 처리', () => {
    expect(timeToMinutes('')).toBe(0);
    expect(timeToMinutes(null)).toBe(0);
  });
});
```

### 2️⃣ Firebase Mock 테스트

**예시: calculateMonthlySalary()**

```javascript
const { createMockFirebase } = require('./__mocks__/firebase-mock');

beforeAll(() => {
  global.firebase = createMockFirebase(mockData);
});

test('시급제 급여 계산', async () => {
  const result = await calculateMonthlySalary(
    employee, contract, attendances, '2025-01'
  );
  
  expect(result.basePay).toBe(90000);
  expect(result.totalWorkHours).toBe(9);
});
```

### 3️⃣ 테스트 작성 원칙

#### ✅ 좋은 테스트
- **AAA 패턴**: Arrange (준비) → Act (실행) → Assert (검증)
- **독립성**: 각 테스트는 독립적으로 실행 가능
- **명확한 이름**: 테스트 의도가 명확하게 드러남
- **Edge Case**: 경계값 테스트 포함

#### ❌ 나쁜 테스트
- 다른 테스트에 의존
- 너무 포괄적 (한 테스트에서 여러 것 검증)
- 불명확한 assertion

---

## CI/CD 통합

### GitHub Actions 설정

**`.github/workflows/test.yml`** (수동 추가 필요)

```yaml
name: Jest 자동 테스트

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18.x, 20.x]
    
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'
      
      - run: npm ci
      - run: npm test
      - run: npm run test:coverage
```

**⚠️ 주의**: GitHub Token에 `workflow` 권한이 필요합니다.

---

## 문제 해결

### 1. `document is not defined` 에러

**원인**: 브라우저 전용 코드를 Node.js에서 실행

**해결책**:
```javascript
// Pure Function을 별도 파일로 분리
// employee.js → employee-utils.js

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { /* functions */ };
}
```

### 2. Firebase Mock 실패

**원인**: `firebase` 전역 객체 없음

**해결책**:
```javascript
beforeAll(() => {
  global.firebase = createMockFirebase(mockData);
});

afterAll(() => {
  delete global.firebase;
});
```

### 3. 타임아웃 에러

**원인**: 느린 테스트 (Firebase 연결 등)

**해결책**:
```javascript
// jest.config.js
testTimeout: 10000  // 10초로 증가
```

### 4. Coverage Threshold 실패

**원인**: 커버리지가 임계값 미만

**해결책**:
```bash
# 커버리지 확인
npm run test:coverage

# 미커버 라인 확인
open coverage/index.html
```

---

## 테스트 파일 구조

```
webapp/
├── tests/
│   ├── __mocks__/
│   │   └── firebase-mock.js          # Firebase Mock
│   ├── salary-calculator.test.js     # Pure Function 테스트 (29개)
│   ├── salary-calculator-monthly.test.js  # Firebase Mock 테스트 (5개)
│   └── employee.test.js               # employee-utils 테스트 (33개)
├── js/
│   ├── salary-calculator.js           # 급여 계산 모듈
│   └── employee-utils.js              # 직원 유틸 모듈
├── jest.config.js                     # Jest 설정
├── .babelrc                           # Babel 설정
└── package.json                       # npm scripts
```

---

## 테스트 체크리스트

### 새 기능 추가 시

- [ ] Pure Function으로 작성 가능한지 검토
- [ ] Firebase 의존성 최소화
- [ ] 테스트 파일 작성 (`*.test.js`)
- [ ] 커버리지 85% 이상 유지
- [ ] Edge Case 테스트 포함
- [ ] `npm test` 통과 확인
- [ ] Git 커밋 전 테스트 실행

### 버그 수정 시

- [ ] 버그를 재현하는 테스트 먼저 작성 (TDD)
- [ ] 테스트가 실패하는지 확인
- [ ] 버그 수정
- [ ] 테스트 통과 확인
- [ ] Regression 테스트 추가

---

## 참고 자료

- [Jest 공식 문서](https://jestjs.io/)
- [Babel 설정 가이드](https://babeljs.io/docs/)
- [Firebase Testing Best Practices](https://firebase.google.com/docs/rules/unit-tests)
- [프로젝트 CHANGELOG](./CHANGELOG.md)

---

**문서 버전**: v3.8  
**최종 업데이트**: 2025-01-15  
**작성자**: QA Engineer & Test Automation Specialist
