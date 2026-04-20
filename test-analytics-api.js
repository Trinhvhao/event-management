const axios = require('axios');

async function testAnalyticsAPI() {
    try {
        // Login first to get token
        console.log('1. Logging in...');
        const loginRes = await axios.post('http://localhost:7776/api/auth/login', {
            email: 'admin@dnu.edu.vn',
            password: 'admin123'
        });
        
        const token = loginRes.data.data.token;
        console.log('✓ Login successful, got token');
        
        // Test time-series analytics
        console.log('\n2. Testing time-series analytics...');
        const timeSeriesRes = await axios.get('http://localhost:7776/api/analytics/time-series?timeRange=month', {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        console.log('✓ Time-series data:');
        console.log(JSON.stringify(timeSeriesRes.data.data, null, 2));
        
        // Test department distribution
        console.log('\n3. Testing department distribution...');
        const deptRes = await axios.get('http://localhost:7776/api/analytics/departments', {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        console.log('✓ Department data:');
        console.log(JSON.stringify(deptRes.data.data, null, 2));
        
        console.log('\n✅ All tests passed!');
    } catch (error) {
        console.error('❌ Error:', error.response?.data || error.message);
    }
}

testAnalyticsAPI();
