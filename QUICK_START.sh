#!/bin/bash

# Color codes for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║       1hrLearning - Quick Start Setup Script            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"

# Function to check if command exists
command_exists() {
  command -v "$1" >/dev/null 2>&1
}

# Function to print status
print_status() {
  echo -e "${YELLOW}[*]${NC} $1"
}

# Function to print success
print_success() {
  echo -e "${GREEN}[✓]${NC} $1"
}

# Function to print error
print_error() {
  echo -e "${RED}[✗]${NC} $1"
}

echo ""
print_status "Checking prerequisites..."
echo ""

# Check Node.js
if command_exists node; then
  NODE_VERSION=$(node --version)
  print_success "Node.js installed: $NODE_VERSION"
else
  print_error "Node.js not found. Please install Node.js 18+.git"
  exit 1
fi

# Check npm
if command_exists npm; then
  NPM_VERSION=$(npm --version)
  print_success "npm installed: $NPM_VERSION"
else
  print_error "npm not found. Please install npm."
  exit 1
fi

# Check PostgreSQL
if command_exists psql; then
  PSQL_VERSION=$(psql --version)
  print_success "PostgreSQL installed: $PSQL_VERSION"
else
  print_error "PostgreSQL not found. Using Docker Compose instead..."
  if ! command_exists docker; then
    print_error "Docker is also not found. Please install PostgreSQL or Docker."
    exit 1
  fi
  print_success "Docker found, will use docker-compose"
fi

# Check Git
if command_exists git; then
  GIT_VERSION=$(git --version)
  print_success "Git installed: $GIT_VERSION"
else
  print_error "Git not found."
  exit 1
fi

echo ""
print_status "Setting up environment..."
echo ""

# Check if .env exists
if [ -f ".env" ]; then
  print_success ".env file already exists"
else
  if [ -f ".env.example" ]; then
    cp .env.example .env
    print_success "Created .env from .env.example"
    echo -e "${YELLOW}Please edit .env with your local configuration${NC}"
  else
    print_error ".env.example not found"
    exit 1
  fi
fi

echo ""
print_status "Installing dependencies..."
echo ""

# Root dependencies
print_status "Installing root dependencies..."
npm install
if [ $? -eq 0 ]; then
  print_success "Root dependencies installed"
else
  print_error "Failed to install root dependencies"
  exit 1
fi

# Backend dependencies
print_status "Installing backend dependencies..."
cd apps/backend
npm install
if [ $? -eq 0 ]; then
  print_success "Backend dependencies installed"
else
  print_error "Failed to install backend dependencies"
  exit 1
fi

# Frontend dependencies
print_status "Installing frontend dependencies..."
cd ../frontend
npm install
if [ $? -eq 0 ]; then
  print_success "Frontend dependencies installed"
else
  print_error "Failed to install frontend dependencies"
  exit 1
fi

cd ../..

echo ""
print_status "Setting up database..."
echo ""

# Check if PostgreSQL is available locally
if command_exists psql; then
  # Try to create database
  psql -U postgres -tc "SELECT 1 FROM pg_database WHERE datname = '1hrlearning'" | grep -q 1 || \
    psql -U postgres -c "CREATE DATABASE 1hrlearning;"

  if [ $? -eq 0 ]; then
    print_success "Database created or already exists"
  fi

  # Run migrations
  cd apps/backend
  print_status "Running database migrations..."
  npx prisma migrate deploy
  if [ $? -eq 0 ]; then
    print_success "Database migrations completed"
  else
    print_error "Database migrations failed"
  fi

  # Generate Prisma client
  print_status "Generating Prisma client..."
  npx prisma generate
  if [ $? -eq 0 ]; then
    print_success "Prisma client generated"
  fi

  cd ../..
else
  # Docker Compose setup
  if command_exists docker; then
    print_status "Starting PostgreSQL with Docker Compose..."
    docker-compose up -d

    # Wait for PostgreSQL to start
    print_status "Waiting for PostgreSQL to be ready..."
    sleep 5

    # Run migrations
    cd apps/backend
    print_status "Running database migrations..."
    npx prisma migrate deploy
    if [ $? -eq 0 ]; then
      print_success "Database migrations completed"
    fi

    cd ../..
  fi
fi

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║          Setup Complete! Ready to Test 🚀               ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════╝${NC}"

echo ""
echo -e "${BLUE}Next steps:${NC}"
echo ""
echo -e "${YELLOW}1. Backend:${NC} Open a terminal and run:"
echo -e "   ${BLUE}cd apps/backend && npm run dev${NC}"
echo ""
echo -e "${YELLOW}2. Frontend:${NC} Open another terminal and run:"
echo -e "   ${BLUE}cd apps/frontend && npm run dev${NC}"
echo ""
echo -e "${YELLOW}3. Access the app:${NC}"
echo -e "   - Frontend: ${BLUE}http://localhost:3000${NC}"
echo -e "   - Backend: ${BLUE}http://localhost:4000${NC}"
echo -e "   - Database Studio: ${BLUE}cd apps/backend && npx prisma studio${NC}"
echo ""
echo -e "${YELLOW}4. Testing:${NC} Read ${BLUE}LOCAL_TESTING_GUIDE.md${NC} for detailed testing instructions"
echo ""
echo -e "${YELLOW}5. Issues?${NC} Check the troubleshooting section in LOCAL_TESTING_GUIDE.md"
echo ""
