#!/bin/bash

# Car Dealership Chatbot Setup Script
# This script sets up the complete environment for the car dealership chatbot

set -e

echo "🚗 Setting up Car Dealership Chatbot System"
echo "============================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   print_error "This script should not be run as root"
   exit 1
fi

# Check prerequisites
print_header "Checking Prerequisites"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js 16+ first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    print_error "Node.js version 16 or higher is required. Current version: $(node -v)"
    exit 1
fi

print_status "Node.js version: $(node -v) ✓"

# Check if PostgreSQL is available
if ! command -v psql &> /dev/null; then
    print_warning "PostgreSQL client not found. Please ensure PostgreSQL is installed and accessible."
fi

# Check if Docker is available (optional)
if command -v docker &> /dev/null; then
    print_status "Docker found ✓"
    DOCKER_AVAILABLE=true
else
    print_warning "Docker not found. Manual PostgreSQL setup will be required."
    DOCKER_AVAILABLE=false
fi

# Get project directory
PROJECT_DIR=$(pwd)
print_status "Project directory: $PROJECT_DIR"

# Setup API
print_header "Setting up API Server"

cd "$PROJECT_DIR/api"

# Install dependencies
print_status "Installing API dependencies..."
npm install

# Copy environment file
if [ ! -f ".env" ]; then
    print_status "Creating .env file from template..."
    cp .env.example .env
    print_warning "Please edit .env file with your database credentials"
else
    print_status ".env file already exists"
fi

# Setup Database
print_header "Setting up Database"

# Ask user for database setup preference
echo "Choose database setup method:"
echo "1) Use Docker (recommended for development)"
echo "2) Use existing PostgreSQL installation"
echo "3) Skip database setup (manual setup required)"
read -p "Enter choice (1-3): " DB_CHOICE

case $DB_CHOICE in
    1)
        if [ "$DOCKER_AVAILABLE" = true ]; then
            print_status "Setting up PostgreSQL with Docker..."
            
            # Create docker-compose.yml for PostgreSQL
            cat > "$PROJECT_DIR/docker-compose.yml" << EOF
version: '3.8'
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: car_dealership
      POSTGRES_USER: dealership_user
      POSTGRES_PASSWORD: dealership_pass
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database:/docker-entrypoint-initdb.d
    restart: unless-stopped

volumes:
  postgres_data:
EOF

            # Start PostgreSQL
            docker-compose up -d postgres
            
            # Wait for PostgreSQL to be ready
            print_status "Waiting for PostgreSQL to be ready..."
            sleep 10
            
            # Update .env with Docker database settings
            sed -i 's/DB_HOST=localhost/DB_HOST=localhost/' "$PROJECT_DIR/api/.env"
            sed -i 's/DB_USER=your_db_user/DB_USER=dealership_user/' "$PROJECT_DIR/api/.env"
            sed -i 's/DB_PASSWORD=your_db_password/DB_PASSWORD=dealership_pass/' "$PROJECT_DIR/api/.env"
            sed -i 's/DB_NAME=car_dealership/DB_NAME=car_dealership/' "$PROJECT_DIR/api/.env"
            
            print_status "PostgreSQL is running with Docker ✓"
        else
            print_error "Docker not available. Please choose option 2 or 3."
            exit 1
        fi
        ;;
    2)
        print_status "Using existing PostgreSQL installation..."
        print_warning "Please ensure PostgreSQL is running and accessible"
        print_warning "Update the .env file with your database credentials"
        ;;
    3)
        print_warning "Skipping database setup. You'll need to set up PostgreSQL manually."
        ;;
    *)
        print_error "Invalid choice. Exiting."
        exit 1
        ;;
esac

# Initialize database schema (if not skipped)
if [ "$DB_CHOICE" != "3" ]; then
    print_header "Initializing Database Schema"
    
    # Wait a bit more for database to be fully ready
    sleep 5
    
    # Try to connect and create schema
    if [ "$DB_CHOICE" = "1" ]; then
        # Docker setup
        print_status "Creating database schema..."
        docker exec -i $(docker-compose ps -q postgres) psql -U dealership_user -d car_dealership < "$PROJECT_DIR/database/schema.sql" || print_warning "Schema creation failed - you may need to run it manually"
        
        print_status "Inserting sample data..."
        docker exec -i $(docker-compose ps -q postgres) psql -U dealership_user -d car_dealership < "$PROJECT_DIR/database/sample_data.sql" || print_warning "Sample data insertion failed - you may need to run it manually"
    else
        # Existing PostgreSQL
        print_warning "Please run the following commands manually:"
        echo "psql -h localhost -U your_user -d car_dealership < $PROJECT_DIR/database/schema.sql"
        echo "psql -h localhost -U your_user -d car_dealership < $PROJECT_DIR/database/sample_data.sql"
    fi
fi

# Test API connection
print_header "Testing API Setup"

cd "$PROJECT_DIR/api"

# Start API in background for testing
print_status "Starting API server for testing..."
npm start &
API_PID=$!

# Wait for API to start
sleep 5

# Test health endpoint
if curl -s http://localhost:3000/health > /dev/null; then
    print_status "API health check passed ✓"
else
    print_warning "API health check failed - check the logs"
fi

# Stop test API
kill $API_PID 2>/dev/null || true

# Setup instructions for n8n
print_header "n8n Setup Instructions"

print_status "To set up n8n integration:"
echo "1. Install n8n: npm install -g n8n"
echo "2. Start n8n: n8n start"
echo "3. Open http://localhost:5678 in your browser"
echo "4. Import the workflow from: $PROJECT_DIR/n8n/workflow.json"
echo "5. Configure the API base URL in workflow settings"
echo "6. Test the chatbot endpoints"

# Create startup scripts
print_header "Creating Startup Scripts"

# API startup script
cat > "$PROJECT_DIR/start-api.sh" << EOF
#!/bin/bash
cd "$PROJECT_DIR/api"
echo "Starting Car Dealership API..."
npm start
EOF

chmod +x "$PROJECT_DIR/start-api.sh"

# Database startup script (if using Docker)
if [ "$DB_CHOICE" = "1" ]; then
    cat > "$PROJECT_DIR/start-database.sh" << EOF
#!/bin/bash
cd "$PROJECT_DIR"
echo "Starting PostgreSQL database..."
docker-compose up -d postgres
echo "Database is running on localhost:5432"
EOF

    chmod +x "$PROJECT_DIR/start-database.sh"
fi

# Complete startup script
cat > "$PROJECT_DIR/start-all.sh" << EOF
#!/bin/bash
cd "$PROJECT_DIR"

echo "🚗 Starting Car Dealership System"
echo "================================="

# Start database if using Docker
if [ -f "docker-compose.yml" ]; then
    echo "Starting database..."
    docker-compose up -d postgres
    sleep 5
fi

# Start API
echo "Starting API..."
cd api
npm start &

echo ""
echo "System started successfully!"
echo "API: http://localhost:3000"
echo "Health check: http://localhost:3000/health"
echo ""
echo "To stop the system, run: ./stop-all.sh"
EOF

chmod +x "$PROJECT_DIR/start-all.sh"

# Stop script
cat > "$PROJECT_DIR/stop-all.sh" << EOF
#!/bin/bash
cd "$PROJECT_DIR"

echo "Stopping Car Dealership System..."

# Stop API
pkill -f "node.*server.js" || true

# Stop database if using Docker
if [ -f "docker-compose.yml" ]; then
    docker-compose down
fi

echo "System stopped."
EOF

chmod +x "$PROJECT_DIR/stop-all.sh"

# Summary
print_header "Setup Complete!"

echo ""
echo "🎉 Car Dealership Chatbot System is ready!"
echo ""
echo "📁 Project structure:"
echo "├── api/              → REST API server"
echo "├── database/         → SQL schema and sample data"
echo "├── n8n/             → n8n workflow configuration"
echo "└── setup/           → Setup scripts"
echo ""
echo "🚀 Quick start:"
echo "1. Start the system:    ./start-all.sh"
echo "2. Test the API:       curl http://localhost:3000/health"
echo "3. View cars:          curl http://localhost:3000/api/cars"
echo "4. Setup n8n workflow (see n8n/README.md)"
echo ""
echo "📊 API Endpoints:"
echo "• Cars:        GET  /api/cars"
echo "• Search:      POST /api/search/cars"
echo "• Clients:     POST /api/clients"
echo "• Analytics:   GET  /api/analytics/dashboard"
echo "• Webhooks:    POST /api/webhooks/n8n/chatbot"
echo ""
echo "🔧 Configuration files to review:"
echo "• api/.env            → Database and API settings"
echo "• n8n/workflow.json   → Import this into n8n"
echo ""

if [ "$DB_CHOICE" = "1" ]; then
    echo "🐳 Database (Docker):"
    echo "• Host: localhost:5432"
    echo "• Database: car_dealership"
    echo "• User: dealership_user"
    echo "• Password: dealership_pass"
    echo ""
fi

print_status "Setup completed successfully! 🎉"
print_warning "Don't forget to:"
echo "  1. Review and update the .env file"
echo "  2. Set up n8n workflow for chatbot integration"
echo "  3. Test the complete flow from chatbot to database"

exit 0