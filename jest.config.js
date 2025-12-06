/**
 * Jest 설정 파일
 * 급여 계산 모듈(salary-calculator.js) 테스트 자동화
 */

module.exports = {
  // Node.js 환경에서 테스트 실행
  testEnvironment: 'node',
  
  // 테스트 파일 위치 (tests/ 폴더의 .test.js 파일들)
  testMatch: [
    '**/tests/**/*.test.js',
    '**/__tests__/**/*.js',
    '**/?(*.)+(spec|test).js'
  ],
  
  // 커버리지 수집 대상 (js/ 폴더의 파일들)
  collectCoverageFrom: [
    'js/**/*.js',
    '!js/**/*.min.js',
    '!**/node_modules/**',
    '!**/vendor/**'
  ],
  
  // 커버리지 무시 경로
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/tests/',
    '/coverage/'
  ],
  
  // 커버리지 리포트 형식
  coverageReporters: [
    'text',           // 터미널 출력
    'text-summary',   // 요약 정보
    'html',           // HTML 리포트 (coverage/ 폴더)
    'lcov'            // CI/CD용
  ],
  
  // 커버리지 임계값 (향후 점진적으로 높일 예정)
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 60,
      lines: 60,
      statements: 60
    }
  },
  
  // 테스트 타임아웃 (5초)
  testTimeout: 5000,
  
  // 상세한 출력
  verbose: true,
  
  // Babel 변환 설정 (ES6 → CommonJS)
  transform: {
    '^.+\\.js$': 'babel-jest'
  }
};
