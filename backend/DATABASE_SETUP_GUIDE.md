# 🗄️ Database Setup Guide

## Problem: PostgreSQL Connection Failed

The error indicates that the application cannot connect to PostgreSQL with the user "postgres" and password "password".

## 🚀 **Quick Solutions**

### Option 1: Install and Configure PostgreSQL

#### **Step 1: Install PostgreSQL**
1. Download PostgreSQL from: https://www.postgresql.org/download/windows/
2. Run the installer and follow the setup wizard
3. **Important**: Remember the password you set for the `postgres` superuser

#### **Step 2: Configure PostgreSQL**
1. Open Command Prompt as Administrator
2. Navigate to PostgreSQL bin directory (usually `C:\Program Files\PostgreSQL\15\bin\`)
3. Connect to PostgreSQL:
   ```cmd
   psql -U postgres
   ```
4. Create the database:
   ```sql
   CREATE DATABASE stunxtv2;
   \q
   ```

#### **Step 3: Update .env file**
Update the database password in `.env`:
```env
DATABASE_PASSWORD=your_actual_postgres_password
```

### Option 2: Use SQLite for Development (Recommended)

For development, SQLite is much easier to set up. Here's how to switch:

#### **Step 1: Install SQLite Driver**
```bash
npm install sqlite3 better-sqlite3
```

#### **Step 2: Update Database Configuration**
Replace the database configuration in your TypeORM config:

```typescript
// In app.module.ts or database.module.ts
TypeOrmModule.forRootAsync({
  imports: [ConfigModule],
  useFactory: (configService: ConfigService) => ({
    type: 'sqlite',
    database: 'database.sqlite',
    entities: [__dirname + '/**/*.entity{.ts,.js}'],
    synchronize: configService.get('NODE_ENV') === 'development',
    logging: true,
  }),
  inject: [ConfigService],
}),
```

#### **Step 3: Update .env for SQLite**
```env
# Database Configuration (SQLite)
DATABASE_TYPE=sqlite
DATABASE_NAME=database.sqlite
DATABASE_SYNCHRONIZE=true
DATABASE_LOGGING=true
```

### Option 3: Use Docker PostgreSQL

#### **Step 1: Install Docker Desktop**
Download and install Docker Desktop from https://www.docker.com/products/docker-desktop/

#### **Step 2: Run PostgreSQL Container**
```bash
docker run --name stunxt-postgres -e POSTGRES_PASSWORD=password -e POSTGRES_DB=stunxtv2 -p 5432:5432 -d postgres:15
```

#### **Step 3: Verify Connection**
```bash
docker exec -it stunxt-postgres psql -U postgres -d stunxtv2
```

## 🔧 **Current Database Configuration**

Your current `.env` settings:
```env
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=password
DATABASE_NAME=stunxtv2
```

## ✅ **Recommended for Development**

**Use SQLite** - It's the easiest option for development:
- No installation required
- File-based database
- Perfect for development and testing
- Zero configuration

## 🚀 **Next Steps**

1. Choose one of the options above
2. Update your configuration accordingly
3. Restart the development server: `npm run start:dev`

The authentication service code is complete and ready - we just need the database connection working!
