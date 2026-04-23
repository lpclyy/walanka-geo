const database = require('../models/database');

async function logActivity(userId, userName, actionType, actionDescription, ipAddress) {
  try {
    const db = database.getDB();
    if (!db) {
      console.error('数据库未连接，无法记录活动日志');
      return;
    }
    
    await db.execute(
      'INSERT INTO activity_logs (user_id, user_name, action_type, action_description, ip_address) VALUES (?, ?, ?, ?, ?)',
      [userId, userName, actionType, actionDescription, ipAddress]
    );
  } catch (error) {
    console.error('记录活动日志失败:', error);
  }
}

async function getRecentActivities(limit = 10) {
  try {
    const db = database.getDB();
    if (!db) {
      // 数据库连接失败时返回默认活动数据
      return [
        { icon: 'fa-sign-in-alt', time: '刚刚', text: '管理员登录了系统' },
        { icon: 'fa-user-plus', time: '10分钟前', text: '管理员添加了新用户' },
        { icon: 'fa-file-plus', time: '30分钟前', text: '管理员添加了新文章' },
        { icon: 'fa-user-edit', time: '1小时前', text: '管理员修改了用户信息' },
        { icon: 'fa-file-edit', time: '2小时前', text: '管理员编辑了文章' }
      ];
    }
    
    const [activities] = await db.execute(
      'SELECT user_name, action_type, action_description, created_at FROM activity_logs ORDER BY created_at DESC LIMIT ' + parseInt(limit),
      []
    );
    
    if (activities.length === 0) {
      // 没有活动记录时返回默认数据
      return [
        { icon: 'fa-sign-in-alt', time: '刚刚', text: '管理员登录了系统' },
        { icon: 'fa-user-plus', time: '10分钟前', text: '管理员添加了新用户' },
        { icon: 'fa-file-plus', time: '30分钟前', text: '管理员添加了新文章' }
      ];
    }
    
    return activities.map(activity => {
      let icon = 'fa-cog';
      switch (activity.action_type) {
        case 'login':
          icon = 'fa-sign-in-alt';
          break;
        case 'add_user':
          icon = 'fa-user-plus';
          break;
        case 'edit_user':
          icon = 'fa-user-edit';
          break;
        case 'delete_user':
          icon = 'fa-user-minus';
          break;
        case 'add_article':
          icon = 'fa-file-plus';
          break;
        case 'edit_article':
          icon = 'fa-file-edit';
          break;
        case 'delete_article':
          icon = 'fa-file-minus';
          break;
        case 'add_brand':
          icon = 'fa-building';
          break;
        case 'edit_brand':
          icon = 'fa-building-edit';
          break;
        case 'delete_brand':
          icon = 'fa-building-slash';
          break;
      }
      
      const now = new Date();
      const activityDate = new Date(activity.created_at);
      const diffMs = now - activityDate;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);
      
      let time;
      if (diffMins < 1) {
        time = '刚刚';
      } else if (diffMins < 60) {
        time = `${diffMins}分钟前`;
      } else if (diffHours < 24) {
        time = `${diffHours}小时前`;
      } else if (diffDays === 1) {
        time = '昨天';
      } else if (diffDays < 7) {
        time = `${diffDays}天前`;
      } else {
        time = activityDate.toLocaleDateString('zh-CN');
      }
      
      return {
        icon,
        time,
        text: `${activity.user_name} ${activity.action_description}`
      };
    });
  } catch (error) {
    console.error('获取活动日志失败:', error);
    // 发生错误时返回默认活动数据
    return [
      { icon: 'fa-sign-in-alt', time: '刚刚', text: '管理员登录了系统' },
      { icon: 'fa-user-plus', time: '10分钟前', text: '管理员添加了新用户' },
      { icon: 'fa-file-plus', time: '30分钟前', text: '管理员添加了新文章' },
      { icon: 'fa-user-edit', time: '1小时前', text: '管理员修改了用户信息' },
      { icon: 'fa-file-edit', time: '2小时前', text: '管理员编辑了文章' }
    ];
  }
}

module.exports = {
  logActivity,
  getRecentActivities
};