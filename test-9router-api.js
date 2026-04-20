/**
 * Test file để thử nghiệm 9router API với Kiro
 * 9Router chạy local tại localhost:20128
 * API Key: sk-da70b1ddaca3117d-eeq7kf-0f6119ba
 */

const API_KEY = 'sk-da70b1ddaca3117d-eeq7kf-0f6119ba';
const API_ENDPOINT = 'http://localhost:20128/v1/chat/completions';

// Parse SSE (Server-Sent Events) response
function parseSSE(text) {
  const lines = text.split('\n');
  const messages = [];
  
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const data = line.substring(6);
      if (data === '[DONE]') break;
      try {
        messages.push(JSON.parse(data));
      } catch (e) {
        // Skip invalid JSON
      }
    }
  }
  
  return messages;
}

async function testAPIConnection() {
  console.log('🚀 Bắt đầu test kết nối 9router API...\n');
  console.log('📍 Endpoint:', API_ENDPOINT);
  console.log('🔑 API Key:', API_KEY.substring(0, 20) + '...\n');

  try {
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: 'kr/claude-sonnet-4.5',
        messages: [
          {
            role: 'system',
            content: 'Bạn là một trợ lý AI thông minh và hữu ích.'
          },
          {
            role: 'user',
            content: 'Xin chào! Hãy giới thiệu ngắn gọn về bạn bằng tiếng Việt trong 2-3 câu.'
          }
        ],
        temperature: 0.7,
        max_tokens: 150,
        stream: true // Enable streaming
      })
    });

    console.log('📊 Status Code:', response.status);
    console.log('📊 Status Text:', response.statusText);
    console.log('');

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Lỗi từ API:', errorText);
      return;
    }

    const text = await response.text();
    const messages = parseSSE(text);
    
    console.log('✅ Kết nối thành công!\n');
    console.log('📝 Response từ AI (streaming):');
    console.log('─'.repeat(50));
    
    // Combine all content chunks
    let fullContent = '';
    for (const msg of messages) {
      if (msg.choices && msg.choices[0]?.delta?.content) {
        fullContent += msg.choices[0].delta.content;
      }
    }
    
    console.log(fullContent);
    console.log('─'.repeat(50));
    console.log('\n📊 Thông tin chi tiết:');
    console.log('- Model:', messages[0]?.model || 'N/A');
    console.log('- Số chunks nhận được:', messages.length);

  } catch (error) {
    console.error('❌ Lỗi khi gọi API:', error.message);
    console.log('\n� Gợi ý:');
    console.log('- Đảm bảo 9router đang chạy: 9router');
    console.log('- Kiểm tra dashboard: http://localhost:20128/dashboard');
  }
}

// Test với non-streaming mode
async function testNonStreaming() {
  console.log('\n\n🎯 Test với non-streaming mode...\n');

  try {
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: 'kr/claude-sonnet-4.5',
        messages: [
          { role: 'user', content: 'Viết một câu thơ ngắn về mùa xuân' }
        ],
        temperature: 0.8,
        max_tokens: 100,
        stream: false // Disable streaming
      })
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Response:');
      console.log('─'.repeat(50));
      console.log(data.choices[0].message.content);
      console.log('─'.repeat(50));
      console.log(`� Tokens: ${data.usage?.total_tokens || 'N/A'}`);
    } else {
      const errorText = await response.text();
      console.log('❌ Lỗi:', response.status, errorText);
    }
  } catch (error) {
    console.log('❌ Lỗi:', error.message);
  }
}

// Test với nhiều prompts khác nhau
async function testMultiplePrompts() {
  console.log('\n\n🎯 Test với nhiều prompts (streaming)...\n');

  const testCases = [
    'Giải thích ngắn gọn về AI là gì',
    'Đề xuất 3 món ăn Việt Nam ngon',
    'Viết code JavaScript để tính tổng mảng'
  ];

  for (let i = 0; i < testCases.length; i++) {
    const prompt = testCases[i];
    console.log(`\n📝 Test ${i + 1}/${testCases.length}: "${prompt}"`);
    console.log('─'.repeat(50));
    
    try {
      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`
        },
        body: JSON.stringify({
          model: 'kr/claude-sonnet-4.5',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          max_tokens: 150,
          stream: true
        })
      });

      if (response.ok) {
        const text = await response.text();
        const messages = parseSSE(text);
        
        let fullContent = '';
        for (const msg of messages) {
          if (msg.choices && msg.choices[0]?.delta?.content) {
            fullContent += msg.choices[0].delta.content;
          }
        }
        
        console.log('✅', fullContent);
      } else {
        console.log('❌ Lỗi:', response.status);
      }
    } catch (error) {
      console.log('❌ Lỗi:', error.message);
    }

    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

// Test list models
async function testListModels() {
  console.log('\n\n📋 Test danh sách models có sẵn...\n');
  
  try {
    const response = await fetch('http://localhost:20128/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${API_KEY}`
      }
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Danh sách models:');
      console.log('─'.repeat(50));
      if (data.data && Array.isArray(data.data)) {
        data.data.forEach((model, idx) => {
          console.log(`${idx + 1}. ${model.id}`);
        });
      }
    } else {
      console.log('❌ Không thể lấy danh sách models:', response.status);
    }
  } catch (error) {
    console.log('❌ Lỗi:', error.message);
  }
}

// Test với các models khác nhau
async function testDifferentModels() {
  console.log('\n\n🤖 Test với các models khác nhau...\n');

  const models = [
    'kr/claude-sonnet-4.5',
    'kr/deepseek-3.2',
    'kr/qwen3-coder-next'
  ];

  const prompt = 'Viết hàm JavaScript tính giai thừa';

  for (const model of models) {
    console.log(`\n🔧 Testing model: ${model}`);
    console.log('─'.repeat(50));
    
    try {
      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`
        },
        body: JSON.stringify({
          model: model,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.5,
          max_tokens: 200,
          stream: true
        })
      });

      if (response.ok) {
        const text = await response.text();
        const messages = parseSSE(text);
        
        let fullContent = '';
        for (const msg of messages) {
          if (msg.choices && msg.choices[0]?.delta?.content) {
            fullContent += msg.choices[0].delta.content;
          }
        }
        
        console.log('✅', fullContent.substring(0, 200) + (fullContent.length > 200 ? '...' : ''));
      } else {
        console.log('❌ Lỗi:', response.status);
      }
    } catch (error) {
      console.log('❌ Lỗi:', error.message);
    }

    await new Promise(resolve => setTimeout(resolve, 1500));
  }
}

// Chạy tests
(async () => {
  console.log('╔════════════════════════════════════════════════╗');
  console.log('║     9Router API Test Suite - Kiro Edition      ║');
  console.log('╚════════════════════════════════════════════════╝\n');
  
  await testListModels();
  await testAPIConnection();
  await testNonStreaming();
  await testMultiplePrompts();
  await testDifferentModels();
  
  console.log('\n\n╔════════════════════════════════════════════════╗');
  console.log('║            ✨ Hoàn thành tất cả tests!         ║');
  console.log('╚════════════════════════════════════════════════╝');
})();
