/**
 * ===================================================================
 * 스케줄 데이터 로더 모듈
 * ===================================================================
 * 
 * 책임:
 * - Firestore에서 스케줄 데이터 조회
 * - 계약서 데이터 조회 및 캐싱
 * - 스케줄 데이터 가공 및 변환
 * - breakTime 파싱 및 처리
 * 
 * 사용처:
 * - admin-dashboard.html (관리자 페이지)
 * - js/employee.js (직원 페이지)
 */

class ScheduleDataLoader {
  /**
   * @param {firebase.firestore.Firestore} db - Firestore 인스턴스
   */
  constructor(db) {
    this.db = db;
    this.contractCache = new Map(); // 계약서 캐시: Map<userId, contract>
    this.cacheExpiry = 5 * 60 * 1000; // 5분 캐시 유효 시간
  }

  /**
   * 캐시 초기화
   */
  clearCache() {
    this.contractCache.clear();
    console.log('📦 계약서 캐시 초기화됨');
  }

  /**
   * 주차의 날짜 범위 계산
   * @param {number} year - 연도
   * @param {number} weekNum - 주차 번호
   * @returns {{startDate: string, endDate: string, monday: Date}}
   */
  getWeekRange(year, weekNum) {
    const monday = this._getMondayOfWeek(year, weekNum);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    return {
      startDate: this._formatDate(monday),
      endDate: this._formatDate(sunday),
      monday: monday
    };
  }

  /**
   * 현재 주차의 날짜 범위 계산
   * @returns {{startDate: string, endDate: string, monday: Date}}
   */
  getCurrentWeekRange() {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const monday = new Date(today.setDate(diff));
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    return {
      startDate: this._formatDate(monday),
      endDate: this._formatDate(sunday),
      monday: monday
    };
  }

  /**
   * 매장의 스케줄 로드 (관리자용)
   * @param {string} storeId - 매장 ID
   * @param {string} startDate - 시작 날짜 (YYYY-MM-DD)
   * @param {string} endDate - 종료 날짜 (YYYY-MM-DD)
   * @returns {Promise<Object>} 스케줄 데이터
   */
  async loadStoreSchedules(storeId, startDate, endDate) {
    console.log(`📅 매장 스케줄 조회: storeId=${storeId}, ${startDate} ~ ${endDate}`);

    try {
      // 1. 매장 정보 조회
      const storeDoc = await this.db.collection('stores').doc(storeId).get();
      if (!storeDoc.exists) {
        throw new Error(`매장을 찾을 수 없습니다: ${storeId}`);
      }
      const storeData = storeDoc.data();

      // 2. 해당 매장 직원 조회
      let usersQuery = this.db.collection('users')
        .where('store', '==', storeData.name)
        .where('role', 'in', ['staff', 'store_manager', 'manager']);
      
      // companyId 필터 추가 (멀티테넌트)
      if (storeData.companyId) {
        usersQuery = usersQuery.where('companyId', '==', storeData.companyId);
      }
      
      const employeesSnapshot = await usersQuery.get();

      console.log(`👥 "${storeData.name}" 매장 직원: ${employeesSnapshot.size}명`);

      // 3. 각 직원의 스케줄 및 계약서 조회
      const employees = [];
      
      for (const empDoc of employeesSnapshot.docs) {
        const empUid = empDoc.id;
        const empData = empDoc.data();

        // 계약서 조회 (캐시 사용)
        const contract = await this.getContract(empUid, empData.name, empData.birth);

        // 스케줄 조회
        const schedules = await this._loadEmployeeSchedulesForWeek(
          empUid,
          empData.name,
          startDate,
          endDate
        );

        employees.push({
          uid: empUid,
          name: empData.name || '이름없음',
          schedules: schedules,
          salaryType: contract ? (contract.salaryType || 'hourly') : 'hourly',
          salaryAmount: contract ? (contract.salaryAmount || 0) : 0
        });
      }

      return {
        employees: employees,
        type: 'schedule',
        store: storeData.name,
        storeId: storeId
      };

    } catch (error) {
      console.error('❌ 매장 스케줄 조회 실패:', error);
      throw error;
    }
  }

  /**
   * 직원 개인 스케줄 로드 (직원용)
   * @param {string} userId - 사용자 UID
   * @param {string} userName - 사용자 이름
   * @param {string} startDate - 시작 날짜 (YYYY-MM-DD)
   * @param {string} endDate - 종료 날짜 (YYYY-MM-DD)
   * @returns {Promise<Object>} 스케줄 데이터
   */
  async loadEmployeeSchedules(userId, userName, startDate, endDate) {
    console.log(`📅 개인 스케줄 조회: userId=${userId}, ${startDate} ~ ${endDate}`);

    try {
      // 스케줄 조회
      const schedules = await this._loadEmployeeSchedulesForWeek(
        userId,
        userName,
        startDate,
        endDate
      );

      // 계약서 조회 (캐시 사용)
      const contract = await this.getContract(userId, userName);

      return {
        employees: [{
          uid: userId,
          name: userName,
          schedules: schedules,
          salaryType: contract ? (contract.salaryType || 'hourly') : 'hourly',
          salaryAmount: contract ? (contract.salaryAmount || 0) : 0
        }],
        type: 'schedule'
      };

    } catch (error) {
      console.error('❌ 개인 스케줄 조회 실패:', error);
      throw error;
    }
  }

  /**
   * 계약서 조회 (캐싱 포함)
   * @param {string} userId - 사용자 UID
   * @param {string} userName - 사용자 이름 (옵션)
   * @param {string} birth - 생년월일 (옵션)
   * @param {string} companyId - 회사 ID (옵션, 멀티테넌트)
   * @returns {Promise<Object|null>} 계약서 데이터
   */
  async getContract(userId, userName = null, birth = null, companyId = null) {
    // 캐시 확인
    const cached = this.contractCache.get(userId);
    if (cached && (Date.now() - cached.timestamp) < this.cacheExpiry) {
      console.log(`  📦 [캐시] ${userName || userId} 계약서`);
      return cached.data;
    }

    try {
      console.log(`  🔍 ${userName || userId} 계약서 조회 중...`);

      // 1차: employeeId로 조회
      let contractsSnapshot = await this.db.collection('contracts')
        .where('employeeId', '==', userId)
        .orderBy('createdAt', 'desc')
        .limit(1)
        .get();

      console.log(`     1차 조회 (employeeId): ${contractsSnapshot.size}개`);

      // 2차: name + birth로 조회
      if (contractsSnapshot.empty && userName && birth) {
        console.log(`     2차 조회 시도 (name: "${userName}", birth: "${birth}")`);
        
        contractsSnapshot = await this.db.collection('contracts')
          .where('employeeName', '==', userName)
          .where('employeeBirth', '==', birth)
          .orderBy('createdAt', 'desc')
          .limit(1)
          .get();

        console.log(`     2차 조회 결과: ${contractsSnapshot.size}개`);
      }

      // 계약서 데이터
      let contractData = null;
      if (!contractsSnapshot.empty) {
        const contractDoc = contractsSnapshot.docs[0];
        contractData = {
          contractId: contractDoc.id,
          ...contractDoc.data()
        };
        console.log(`  ✅ ${userName || userId} 최신 계약서 ID: ${contractDoc.id}`);
      } else {
        console.log(`  ❌ ${userName || userId}: 계약서 없음`);
      }

      // 캐시 저장
      this.contractCache.set(userId, {
        data: contractData,
        timestamp: Date.now()
      });

      return contractData;

    } catch (error) {
      console.error(`  ❌ 계약서 조회 실패:`, error);
      return null;
    }
  }

  /**
   * 직원의 주간 스케줄 조회 및 가공
   * @private
   * @param {string} userId - 사용자 UID
   * @param {string} userName - 사용자 이름
   * @param {string} startDate - 시작 날짜
   * @param {string} endDate - 종료 날짜
   * @returns {Promise<Object>} 요일별 스케줄 맵
   */
  async _loadEmployeeSchedulesForWeek(userId, userName, startDate, endDate) {
    const days = ['월', '화', '수', '목', '금', '토', '일'];
    const schedules = {};
    days.forEach(day => {
      schedules[day] = [];
    });

    try {
      // Firestore에서 해당 기간의 스케줄 조회
      const schedulesSnapshot = await this.db.collection('schedules')
        .where('userId', '==', userId)
        .where('date', '>=', startDate)
        .where('date', '<=', endDate)
        .get();

      console.log(`  📅 ${userName}: ${schedulesSnapshot.size}개 근무 조회됨`);

      // 날짜별 스케줄 그룹화
      const dateSchedules = {};
      schedulesSnapshot.forEach(doc => {
        const data = doc.data();
        const date = data.date;

        if (!dateSchedules[date]) {
          dateSchedules[date] = {
            regular: [],
            additional: []
          };
        }

        if (data.isShiftReplacement) {
          dateSchedules[date].additional.push(data);
        } else {
          dateSchedules[date].regular.push(data);
        }
      });

      // 계약서 조회
      const contract = await this.getContract(userId, userName);
      const latestContractId = contract ? contract.contractId : null;

      // 각 날짜를 요일로 변환하여 정리
      Object.keys(dateSchedules).forEach(dateStr => {
        const date = new Date(dateStr + 'T00:00:00');
        const dayOfWeek = date.getDay();
        const dayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        const dayName = days[dayIndex];

        // 1. 정규 스케줄 처리 (최신 계약서 기준 1개만)
        if (dateSchedules[dateStr].regular.length > 0) {
          let selectedSchedule = null;

          if (latestContractId) {
            // 최신 계약서 ID와 일치하는 스케줄 찾기
            selectedSchedule = dateSchedules[dateStr].regular.find(s => s.contractId === latestContractId);

            if (!selectedSchedule) {
              // contractId 없으면 createdAt 기준 최신 선택
              const sorted = dateSchedules[dateStr].regular.sort((a, b) => {
                const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                return bTime - aTime;
              });
              selectedSchedule = sorted[0];
            }
          } else {
            // 계약서 없으면 createdAt 기준 최신 선택
            const sorted = dateSchedules[dateStr].regular.sort((a, b) => {
              const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
              const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
              return bTime - aTime;
            });
            selectedSchedule = sorted[0];
          }

          if (selectedSchedule) {
            schedules[dayName].push({
              startTime: selectedSchedule.startTime || '',
              endTime: selectedSchedule.endTime || '',
              hours: selectedSchedule.hours || 0,
              breakTime: selectedSchedule.breakTime || null,
              isShiftReplacement: false,
              isWorkDay: true
            });
          }
        }

        // 2. 대타 스케줄 처리 (모두 표시)
        dateSchedules[dateStr].additional.forEach(addSchedule => {
          schedules[dayName].push({
            startTime: addSchedule.startTime || '',
            endTime: addSchedule.endTime || '',
            hours: addSchedule.hours || 0,
            breakTime: addSchedule.breakTime || null,
            isShiftReplacement: true,
            isWorkDay: true
          });
        });
      });

      return schedules;

    } catch (error) {
      console.error(`  ❌ ${userName} 스케줄 조회 실패:`, error);
      return schedules;
    }
  }

  /**
   * 특정 주차의 월요일 날짜 계산
   * @private
   */
  _getMondayOfWeek(year, weekNum) {
    const firstDay = new Date(year, 0, 1);
    const firstMonday = new Date(firstDay);
    const dayOfWeek = firstDay.getDay();
    const daysUntilMonday = dayOfWeek === 0 ? 1 : (8 - dayOfWeek);
    firstMonday.setDate(firstDay.getDate() + daysUntilMonday);

    const targetMonday = new Date(firstMonday);
    targetMonday.setDate(firstMonday.getDate() + (weekNum - 1) * 7);

    return targetMonday;
  }

  /**
   * Date 객체를 YYYY-MM-DD 형식으로 변환
   * @private
   */
  _formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}

// 전역으로 노출
window.ScheduleDataLoader = ScheduleDataLoader;
