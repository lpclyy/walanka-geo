// 数据库操作脚本

// 模拟数据库操作
const db = {
  // 读取用户数据
  async getUsers() {
    try {
      const response = await fetch('/data/users.json');
      const data = await response.json();
      return data.users;
    } catch (error) {
      console.error('读取用户数据失败:', error);
      return [];
    }
  },
  
  // 添加用户
  async addUser(user) {
    try {
      const users = await this.getUsers();
      const newUser = {
        id: (users.length + 1).toString(),
        name: user.name,
        phone: user.phone,
        role: user.role || 'user',
        createdAt: new Date().toISOString()
      };
      users.push(newUser);
      
      // 在实际应用中，这里应该是一个POST请求来更新数据库
      console.log('添加用户:', newUser);
      return newUser;
    } catch (error) {
      console.error('添加用户失败:', error);
      throw error;
    }
  },
  
  // 根据手机号查找用户
  async findUserByPhone(phone) {
    try {
      const users = await this.getUsers();
      return users.find(user => user.phone === phone);
    } catch (error) {
      console.error('查找用户失败:', error);
      return null;
    }
  },
  
  // 验证用户登录
  async verifyUser(phone, code) {
    try {
      const user = await this.findUserByPhone(phone);
      if (user) {
        // 在实际应用中，这里应该验证验证码
        return user;
      }
      return null;
    } catch (error) {
      console.error('验证用户失败:', error);
      return null;
    }
  }
};

// 导出数据库操作对象
if (typeof module !== 'undefined' && module.exports) {
  module.exports = db;
} else {
  window.db = db;
}
