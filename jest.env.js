// Jest 환경변수 설정 (Firebase 연동)
require('dotenv').config({ path: '.env.local' })

// TextEncoder/TextDecoder polyfill (Node.js 환경)
const { TextEncoder, TextDecoder } = require('util')
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder
