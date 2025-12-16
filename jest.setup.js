// Learn more: https://github.com/testing-library/jest-dom
// import '@testing-library/jest-dom' // Node 환경에서는 불필요

// Jest 전역 설정
global.console = {
  ...console,
  // 테스트 중 불필요한 로그 숨기기 (필요시 주석 해제)
  // log: jest.fn(),
  // debug: jest.fn(),
  // info: jest.fn(),
  // warn: jest.fn(),
}
