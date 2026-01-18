@echo off
REM ============================================
REM Database Setup Script for Windows
REM ============================================

setlocal enabledelayedexpansion

REM Database configuration
set DB_NAME=event_management
set DB_USER=postgres
set DB_PASSWORD=postgres
set DB_HOST=localhost
set DB_PORT=5432

echo ========================================
echo University Event Management System
echo Database Setup Script
echo ========================================
echo.

REM Check if PostgreSQL is running
echo Checking PostgreSQL connection...
pg_isready -h %DB_HOST% -p %DB_PORT% -U %DB_USER% >nul 2>&1
if errorlevel 1 (
    echo Error: Cannot connect to PostgreSQL at %DB_HOST%:%DB_PORT%
    echo Please make sure PostgreSQL is running.
    echo.
    echo You can start PostgreSQL with Docker:
    echo docker run --name postgres-event-mgmt -e POSTGRES_PASSWORD=%DB_PASSWORD% -e POSTGRES_DB=%DB_NAME% -p %DB_PORT%:5432 -d postgres:15
    exit /b 1
)
echo [OK] PostgreSQL is running
echo.

REM Check if database exists
echo Checking if database exists...
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -lqt | findstr /C:"%DB_NAME%" >nul 2>&1
if not errorlevel 1 (
    echo Database '%DB_NAME%' already exists.
    set /p DROP="Do you want to drop and recreate it? (y/N): "
    if /i "!DROP!"=="y" (
        echo Dropping database...
        dropdb -h %DB_HOST% -p %DB_PORT% -U %DB_USER% %DB_NAME%
        echo [OK] Database dropped
    ) else (
        echo Skipping database creation
        exit /b 0
    )
)

REM Create database
echo Creating database '%DB_NAME%'...
createdb -h %DB_HOST% -p %DB_PORT% -U %DB_USER% %DB_NAME%
if errorlevel 1 (
    echo Error: Failed to create database
    exit /b 1
)
echo [OK] Database created successfully
echo.

REM Run schema
echo Creating database schema...
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -f schema.sql >nul 2>&1
if errorlevel 1 (
    echo Error: Failed to create schema
    exit /b 1
)
echo [OK] Schema created successfully
echo.

REM Ask if user wants to seed data
set /p SEED="Do you want to seed sample data? (Y/n): "
if /i not "!SEED!"=="n" (
    echo Seeding sample data...
    psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -f seed.sql >nul 2>&1
    if errorlevel 1 (
        echo Error: Failed to seed data
        exit /b 1
    )
    echo [OK] Sample data seeded successfully
)
echo.

REM Summary
echo ========================================
echo Database setup completed!
echo ========================================
echo.
echo Database Information:
echo   Name: %DB_NAME%
echo   Host: %DB_HOST%
echo   Port: %DB_PORT%
echo   User: %DB_USER%
echo.
echo Connection String:
echo   postgresql://%DB_USER%:%DB_PASSWORD%@%DB_HOST%:%DB_PORT%/%DB_NAME%
echo.
echo Next steps:
echo   1. Update your .env file with the connection string
echo   2. Run: npm run prisma:generate
echo   3. Run: npm run dev
echo.

endlocal
