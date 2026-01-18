@echo off
REM ============================================
REM Docker Setup Script for PostgreSQL (Windows)
REM ============================================

setlocal enabledelayedexpansion

echo ========================================
echo Docker PostgreSQL Setup
echo ========================================
echo.

REM Check if Docker is installed
docker --version >nul 2>&1
if errorlevel 1 (
    echo Error: Docker is not installed!
    echo.
    echo Please install Docker Desktop from:
    echo https://www.docker.com/products/docker-desktop
    exit /b 1
)

REM Check if Docker is running
docker info >nul 2>&1
if errorlevel 1 (
    echo Error: Docker is not running!
    echo.
    echo Please start Docker Desktop and try again.
    exit /b 1
)

echo [OK] Docker is installed and running
echo.

REM Check docker-compose
docker-compose --version >nul 2>&1
if not errorlevel 1 (
    set COMPOSE_CMD=docker-compose
) else (
    docker compose version >nul 2>&1
    if not errorlevel 1 (
        set COMPOSE_CMD=docker compose
    ) else (
        echo Error: docker-compose is not available!
        exit /b 1
    )
)

echo [OK] docker-compose is available
echo.

REM Ask user which method to use
echo Choose setup method:
echo   1^) Docker Compose ^(Recommended - includes pgAdmin^)
echo   2^) Docker Run ^(Simple - PostgreSQL only^)
echo.
set /p choice="Enter choice (1 or 2): "

if "%choice%"=="1" (
    echo.
    echo Using Docker Compose...
    echo.
    
    REM Ask if user wants pgAdmin
    set /p pgadmin="Do you want to include pgAdmin (Database GUI)? (y/N): "
    
    if /i "%pgadmin%"=="y" (
        echo Starting PostgreSQL + pgAdmin...
        %COMPOSE_CMD% --profile tools up -d
        echo.
        echo [OK] PostgreSQL and pgAdmin started!
        echo.
        echo pgAdmin URL: http://localhost:5050
        echo   Email: admin@university.edu.vn
        echo   Password: admin123
        echo.
        echo To connect to PostgreSQL in pgAdmin:
        echo   Host: postgres
        echo   Port: 5432
        echo   Database: event_management
        echo   Username: postgres
        echo   Password: postgres
    ) else (
        echo Starting PostgreSQL only...
        %COMPOSE_CMD% up -d postgres
        echo.
        echo [OK] PostgreSQL started!
    )
    
    echo.
    echo Useful commands:
    echo   Start:   %COMPOSE_CMD% start
    echo   Stop:    %COMPOSE_CMD% stop
    echo   Logs:    %COMPOSE_CMD% logs -f postgres
    echo   Remove:  %COMPOSE_CMD% down
    
) else if "%choice%"=="2" (
    echo.
    echo Using Docker Run...
    echo.
    
    REM Stop and remove existing container
    docker ps -a | findstr postgres-event-mgmt >nul 2>&1
    if not errorlevel 1 (
        echo Removing existing container...
        docker stop postgres-event-mgmt >nul 2>&1
        docker rm postgres-event-mgmt >nul 2>&1
    )
    
    REM Create volume
    echo Creating volume...
    docker volume create postgres-event-data
    
    REM Start PostgreSQL
    echo Starting PostgreSQL...
    docker run --name postgres-event-mgmt ^
      -e POSTGRES_PASSWORD=postgres ^
      -e POSTGRES_DB=event_management ^
      -p 5432:5432 ^
      -v postgres-event-data:/var/lib/postgresql/data ^
      -d postgres:15-alpine
    
    echo.
    echo Waiting for PostgreSQL to start...
    timeout /t 5 /nobreak >nul
    
    REM Check if running
    docker ps | findstr postgres-event-mgmt >nul 2>&1
    if not errorlevel 1 (
        echo [OK] PostgreSQL is running!
    ) else (
        echo Error: Failed to start PostgreSQL
        docker logs postgres-event-mgmt
        exit /b 1
    )
    
    echo.
    echo Useful commands:
    echo   Start:   docker start postgres-event-mgmt
    echo   Stop:    docker stop postgres-event-mgmt
    echo   Logs:    docker logs -f postgres-event-mgmt
    echo   Remove:  docker rm -f postgres-event-mgmt
) else (
    echo Invalid choice!
    exit /b 1
)

echo.
echo ========================================
echo Setup Complete!
echo ========================================
echo.
echo Database Information:
echo   Host: localhost
echo   Port: 5432
echo   Database: event_management
echo   Username: postgres
echo   Password: postgres
echo.
echo Connection String:
echo   postgresql://postgres:postgres@localhost:5432/event_management
echo.
echo Next steps:
echo   1. Update your .env file with the connection string
echo   2. Run: npm run prisma:generate
echo   3. Run: npm run dev
echo.
echo To connect to database:
echo   docker exec -it postgres-event-mgmt psql -U postgres -d event_management
echo.

endlocal
