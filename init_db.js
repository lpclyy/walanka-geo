const mysql = require('mysql2/promise');

async function initDatabase() {
  // 使用与应用相同的数据库配置
  const dbConfig = {
    host: 'localhost',
    user: 'walanka',
    password: '123456',
    database: 'walanka_geo',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    timezone: '+08:00',
    dateStrings: true
  };
  
  const db = await mysql.createPool(dbConfig);
  
  try {
    // 添加缺失的字段
    console.log('正在检查并添加缺失的数据库字段...');
    
    await db.execute(`ALTER TABLE brand_analysis ADD COLUMN IF NOT EXISTS strengths JSON`);
    console.log('已添加 strengths 字段');
    
    await db.execute(`ALTER TABLE brand_analysis ADD COLUMN IF NOT EXISTS opportunities JSON`);
    console.log('已添加 opportunities 字段');
    
    await db.execute(`ALTER TABLE brand_analysis ADD COLUMN IF NOT EXISTS competition JSON`);
    console.log('已添加 competition 字段');
    
    await db.execute(`ALTER TABLE brand_analysis ADD COLUMN IF NOT EXISTS risks JSON`);
    console.log('已添加 risks 字段');
    
    console.log('\n数据库表结构更新完成');
    process.exit(0);
  } catch (error) {
    console.error('数据库初始化失败:', error.message);
    process.exit(1);
  }
}

initDatabase();