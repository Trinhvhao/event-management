#!/bin/bash

# ============================================
# Docker Setup Script for PostgreSQL
# ============================================

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}🐳 Docker PostgreSQL Setup${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed!${NC}"
    echo ""
    echo "Please install Docker first:"
    echo "  Windows/macOS: https://www.docker.com/products/docker-desktop"
    echo "  Linux: https://docs.docker.com/engine/install/"
    exit 1
fi

# Check if Docker is running
if ! docker info &> /dev/null; then
    echo -e "${RED}❌ Docker is not running!${NC}"
    echo ""
    echo "Please start Docker Desktop and try again."
    exit 1
fi

echo -e "${GREEN}✓ Docker is installed and running${NC}"
echo ""

# Check if docker-compose is available
if command -v docker-compose &> /dev/null; then
    COMPOSE_CMD="docker-compose"
elif docker compose version &> /dev/null; then
    COMPOSE_CMD="docker compose"
else
    echo -e "${RED}❌ docker-compose is not available!${NC}"
    exit 1
fi

echo -e "${GREEN}✓ docker-compose is available${NC}"
echo ""

# Ask user which method to use
echo -e "${YELLOW}Choose setup method:${NC}"
echo "  1) Docker Compose (Recommended - includes pgAdmin)"
echo "  2) Docker Run (Simple - PostgreSQL only)"
echo ""
read -p "Enter choice (1 or 2): " choice

if [ "$choice" = "1" ]; then
    echo ""
    echo -e "${BLUE}Using Docker Compose...${NC}"
    echo ""
    
    # Ask if user wants pgAdmin
    read -p "Do you want to include pgAdmin (Database GUI)? (y/N): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}Starting PostgreSQL + pgAdmin...${NC}"
        $COMPOSE_CMD --profile tools up -d
        echo ""
        echo -e "${GREEN}✓ PostgreSQL and pgAdmin started!${NC}"
        echo ""
        echo "pgAdmin URL: http://localhost:5050"
        echo "  Email: admin@university.edu.vn"
        echo "  Password: admin123"
        echo ""
        echo "To connect to PostgreSQL in pgAdmin:"
        echo "  Host: postgres"
        echo "  Port: 5432"
        echo "  Database: event_management"
        echo "  Username: postgres"
        echo "  Password: postgres"
    else
        echo -e "${YELLOW}Starting PostgreSQL only...${NC}"
        $COMPOSE_CMD up -d postgres
        echo ""
        echo -e "${GREEN}✓ PostgreSQL started!${NC}"
    fi
    
    echo ""
    echo "Useful commands:"
    echo "  Start:   $COMPOSE_CMD start"
    echo "  Stop:    $COMPOSE_CMD stop"
    echo "  Logs:    $COMPOSE_CMD logs -f postgres"
    echo "  Remove:  $COMPOSE_CMD down"
    
elif [ "$choice" = "2" ]; then
    echo ""
    echo -e "${BLUE}Using Docker Run...${NC}"
    echo ""
    
    # Stop and remove existing container
    if docker ps -a | grep -q postgres-event-mgmt; then
        echo -e "${YELLOW}Removing existing container...${NC}"
        docker stop postgres-event-mgmt 2>/dev/null
        docker rm postgres-event-mgmt 2>/dev/null
    fi
    
    # Create volume
    echo -e "${YELLOW}Creating volume...${NC}"
    docker volume create postgres-event-data
    
    # Start PostgreSQL
    echo -e "${YELLOW}Starting PostgreSQL...${NC}"
    docker run --name postgres-event-mgmt \
      -e POSTGRES_PASSWORD=postgres \
      -e POSTGRES_DB=event_management \
      -p 5432:5432 \
      -v postgres-event-data:/var/lib/postgresql/data \
      -d postgres:15-alpine
    
    echo ""
    echo -e "${YELLOW}Waiting for PostgreSQL to start...${NC}"
    sleep 5
    
    # Check if running
    if docker ps | grep -q postgres-event-mgmt; then
        echo -e "${GREEN}✓ PostgreSQL is running!${NC}"
    else
        echo -e "${RED}❌ Failed to start PostgreSQL${NC}"
        docker logs postgres-event-mgmt
        exit 1
    fi
    
    echo ""
    echo "Useful commands:"
    echo "  Start:   docker start postgres-event-mgmt"
    echo "  Stop:    docker stop postgres-event-mgmt"
    echo "  Logs:    docker logs -f postgres-event-mgmt"
    echo "  Remove:  docker rm -f postgres-event-mgmt"
else
    echo -e "${RED}Invalid choice!${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}🎉 Setup Complete!${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo "Database Information:"
echo "  Host: localhost"
echo "  Port: 5432"
echo "  Database: event_management"
echo "  Username: postgres"
echo "  Password: postgres"
echo ""
echo "Connection String:"
echo "  postgresql://postgres:postgres@localhost:5432/event_management"
echo ""
echo "Next steps:"
echo "  1. Update your .env file with the connection string"
echo "  2. Run: npm run prisma:generate"
echo "  3. Run: npm run dev"
echo ""
echo "To connect to database:"
echo "  docker exec -it postgres-event-mgmt psql -U postgres -d event_management"
echo ""
