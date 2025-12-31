#!/bin/bash

# 데이터베이스 정화 스크립트 실행 헬퍼
# 개발 환경용 (백업 없이 바로 실행)

echo ""
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║    🧹 Firestore 데이터 정화 - 빠른 실행 (개발용)        ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

# 서비스 계정 키 확인
if [ ! -f "service-account-key.json" ]; then
    echo "❌ service-account-key.json 파일이 없습니다!"
    echo ""
    echo "📥 서비스 계정 키 다운로드 방법:"
    echo "1. https://console.firebase.google.com/ 접속"
    echo "2. 프로젝트 선택"
    echo "3. 프로젝트 설정 → 서비스 계정 탭"
    echo "4. '새 비공개 키 생성' 클릭"
    echo "5. 다운로드한 파일을 이 위치에 'service-account-key.json'로 저장"
    echo ""
    exit 1
fi

echo "✅ 서비스 계정 키 발견"
echo ""

# 메뉴 선택
echo "실행 모드를 선택하세요:"
echo ""
echo "1) 🔍 DRY RUN - 테스트 (실제 변경 없음)"
echo "2) 🚀 실제 실행 - 모든 컬렉션"
echo "3) 📊 실제 실행 - salary만"
echo "4) 📅 실제 실행 - attendance만"
echo "5) 📄 실제 실행 - contracts만"
echo "6) 👥 실제 실행 - users만"
echo ""
read -p "선택 (1-6): " choice

case $choice in
    1)
        echo ""
        echo "🔍 DRY RUN 모드 시작..."
        npm run clean-db:dry-run
        ;;
    2)
        echo ""
        echo "⚠️  모든 컬렉션을 정화합니다!"
        npm run clean-db
        ;;
    3)
        echo ""
        echo "📊 salary 컬렉션 정화 시작..."
        npm run clean-db:salary
        ;;
    4)
        echo ""
        echo "📅 attendance 컬렉션 정화 시작..."
        npm run clean-db:attendance
        ;;
    5)
        echo ""
        echo "📄 contracts 컬렉션 정화 시작..."
        npm run clean-db:contracts
        ;;
    6)
        echo ""
        echo "👥 users 컬렉션 정화 시작..."
        npm run clean-db:users
        ;;
    *)
        echo "❌ 잘못된 선택입니다."
        exit 1
        ;;
esac
