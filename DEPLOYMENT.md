# 瓦兰卡GEO项目部署指南

## 1. 服务器环境准备

### 1.1 登录腾讯云服务器
```bash
ssh root@43.156.9.56
```

### 1.2 安装必要的软件

#### 安装Node.js
```bash
# 安装Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

# 验证安装
node --version
npm --version
```

#### 安装MySQL
```bash
# 安装MySQL
apt-get update
apt-get install -y mysql-server

# 启动MySQL服务
systemctl start mysql
systemctl enable mysql

# 安全配置
mysql_secure_installation
```

#### 安装Redis
```bash
# 安装Redis
apt-get install -y redis-server

# 启动Redis服务
systemctl start redis-server
systemctl enable redis-server

# 验证Redis
redis-cli ping
```

## 2. 数据库配置

### 2.1 创建数据库和用户

```bash
# 登录MySQL
mysql -u root -p

# 创建数据库
CREATE DATABASE walanka_geo;

# 创建用户并授权
CREATE USER 'walanka'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON walanka_geo.* TO 'walanka'@'localhost';
FLUSH PRIVILEGES;

# 退出MySQL
EXIT;
```

### 2.2 配置数据库连接

修改 `server.js` 文件中的数据库连接配置：

```javascript
const dbConfig = {
  host: 'localhost',
  user: 'walanka',
  password: 'your_password',
  database: 'walanka_geo',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};
```

## 3. 项目部署

### 3.1 上传项目文件

使用SCP命令将项目文件上传到服务器：

```bash
scp -r d:\myweb/* root@43.156.9.56:/var/www/walanka-geo/
```

### 3.2 安装依赖

```bash
cd /var/www/walanka-geo/
npm install
```

### 3.3 启动服务

#### 使用PM2管理进程

```bash
# 安装PM2
npm install -g pm2

# 启动服务
npm start

# 或者使用PM2
npm run start
```

#### 配置Nginx反向代理（可选）

```bash
# 安装Nginx
apt-get install -y nginx

# 创建Nginx配置文件
cat > /etc/nginx/sites-available/walanka-geo << 'EOF'
server {
    listen 80;
    server_name 43.156.9.56;

    location /geo {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

# 启用配置
ln -s /etc/nginx/sites-available/walanka-geo /etc/nginx/sites-enabled/

# 重启Nginx
systemctl restart nginx
```

## 4. 项目更新

### 4.1 上传新代码

```bash
scp -r d:\myweb/* root@43.156.9.56:/var/www/walanka-geo/
```

### 4.2 重启服务

```bash
cd /var/www/walanka-geo/
# 停止服务
npm stop
# 或使用PM2
pm run dev

# 启动服务
npm start
```

## 5. 常见问题排查

### 5.1 服务无法启动

检查端口是否被占用：
```bash
netstat -tuln | grep 3002
```

查看服务日志：
```bash
pm logs
```

### 5.2 数据库连接失败

检查MySQL服务是否运行：
```bash
systemctl status mysql
```

检查数据库连接配置是否正确。

### 5.3 Redis连接失败

检查Redis服务是否运行：
```bash
systemctl status redis-server
```

## 6. 安全配置

### 6.1 防火墙配置

```bash
# 允许80端口
iptables -A INPUT -p tcp --dport 80 -j ACCEPT

# 允许3000端口（如果不使用Nginx）
iptables -A INPUT -p tcp --dport 3000 -j ACCEPT

# 保存配置
iptables-save > /etc/iptables/rules.v4
```

### 6.2 HTTPS配置（可选）

使用Let's Encrypt获取SSL证书：

```bash
# 安装Certbot
apt-get install -y certbot python3-certbot-nginx

# 获取证书
certbot --nginx -d 43.156.9.56
```

## 7. 测试

访问以下地址测试项目：
- 首页：http://43.156.9.56/geo
- 注册页：http://43.156.9.56/geo/register.html
- 登录页：http://43.156.9.56/geo/login.html
- 工作台：http://43.156.9.56/geo/workbench.html

## 8. 技术栈

- **前端**：HTML5, CSS3, JavaScript
- **后端**：Node.js, Express
- **数据库**：MySQL, Redis
- **部署**：PM2, Nginx（可选）