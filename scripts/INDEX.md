# 脚本索引

## init-db.sh
- **用途：** 初始化或同步 PostgreSQL 数据库表结构
- **用法：** `bash scripts/init-db.sh`
- **说明：** 依赖 `DATABASE_URL` 环境变量，执行 `prisma db push`
- **适用场景：** 首次部署、数据库结构变更后手动执行

## seed-users.sh
- **用途：** 初始化默认账号数据
- **用法：** `bash scripts/seed-users.sh`
- **说明：** 依赖 `DATABASE_URL` 环境变量，创建默认账号 `admin/admin123` 和 `user/user123`
- **适用场景：** 首次部署，或确认需要补默认账号时手动执行

## tunnel.sh
- **用途：** 启动 SSH 隧道连接服务器 PostgreSQL
- **用法：** `bash scripts/tunnel.sh`
- **说明：** 将服务器 5432 端口转发到本地 15432 端口
- **依赖：** SSH 公钥认证（已配置）
- **注意：** 启动后不要关闭终端窗口
