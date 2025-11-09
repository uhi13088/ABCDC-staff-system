// Check Firestore Collections
const https = require('https');

const config = {
  apiKey: "AIzaSyCr3Tq2T7oy5rVlK1c33m_G0TlUWv0-g3k",
  projectId: "abcdc-staff-system"
};

const baseUrl = `https://firestore.googleapis.com/v1/projects/${config.projectId}/databases/(default)/documents`;

function httpsRequest(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(data);
        }
      });
    }).on('error', reject);
  });
}

async function checkCollections() {
  console.log('========================================');
  console.log('🔍 Firestore 컬렉션 확인');
  console.log('========================================\n');
  
  const collections = ['schedules', 'schedules_backup', 'schedules_old', 'schedules_new', 'users', 'contracts'];
  
  for (const collectionName of collections) {
    try {
      const url = `${baseUrl}/${collectionName}?pageSize=5&key=${config.apiKey}`;
      const response = await httpsRequest(url);
      
      if (response.documents && response.documents.length > 0) {
        console.log(`✅ ${collectionName}: ${response.documents.length}개 문서 (샘플)`);
        
        // 첫 번째 문서 구조 확인
        const firstDoc = response.documents[0];
        const docId = firstDoc.name.split('/').pop();
        console.log(`   샘플 ID: ${docId}`);
        
        if (firstDoc.fields) {
          const fieldKeys = Object.keys(firstDoc.fields);
          console.log(`   필드: ${fieldKeys.slice(0, 10).join(', ')}${fieldKeys.length > 10 ? '...' : ''}`);
        }
        console.log('');
      } else if (response.error) {
        console.log(`❌ ${collectionName}: 오류 - ${response.error.message}`);
        console.log('');
      } else {
        console.log(`⚠️ ${collectionName}: 비어있음 또는 접근 불가`);
        console.log('');
      }
    } catch (error) {
      console.log(`❌ ${collectionName}: ${error.message}`);
      console.log('');
    }
  }
  
  console.log('========================================');
  console.log('확인 완료');
  console.log('========================================');
}

checkCollections();
