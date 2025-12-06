/**
 * Firebase Firestore Manual Mock
 * calculateMonthlySalary() 테스트용 간단한 Mock
 */

class MockDocumentSnapshot {
  constructor(data) {
    this._data = data;
    this.empty = !data;
  }
  
  data() {
    return this._data;
  }
  
  exists() {
    return !this.empty;
  }
}

class MockQuerySnapshot {
  constructor(docs = []) {
    this.docs = docs.map(data => new MockDocumentSnapshot(data));
    this.empty = this.docs.length === 0;
  }
}

class MockQuery {
  constructor(collectionName, mockData) {
    this.collectionName = collectionName;
    this.mockData = mockData;
    this.filters = [];
  }
  
  where(field, operator, value) {
    this.filters.push({ field, operator, value });
    return this;
  }
  
  limit(count) {
    this._limit = count;
    return this;
  }
  
  async get() {
    // 필터링 로직 (간단한 구현)
    let results = this.mockData[this.collectionName] || [];
    
    for (const filter of this.filters) {
      results = results.filter(doc => {
        if (filter.operator === '==') {
          return doc[filter.field] === filter.value;
        }
        return true;
      });
    }
    
    if (this._limit) {
      results = results.slice(0, this._limit);
    }
    
    return new MockQuerySnapshot(results);
  }
}

class MockFirestore {
  constructor(mockData = {}) {
    this.mockData = mockData;
  }
  
  collection(name) {
    return new MockQuery(name, this.mockData);
  }
}

/**
 * Mock Firebase 전역 객체 생성
 * @param {object} mockData - { collectionName: [documents] } 형식
 */
function createMockFirebase(mockData) {
  return {
    firestore: () => new MockFirestore(mockData)
  };
}

module.exports = {
  createMockFirebase,
  MockFirestore,
  MockQuery,
  MockQuerySnapshot,
  MockDocumentSnapshot
};
