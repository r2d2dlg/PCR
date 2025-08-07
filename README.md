# Car Dealership Chatbot System

A complete intelligent chatbot system for automotive dealerships with PostgreSQL database integration and n8n workflow automation.

## 🚗 System Overview

This system provides:
- **Intelligent chatbot** that can understand natural language queries about cars
- **PostgreSQL database** with comprehensive car inventory and client management
- **RESTful API** for car search, client data capture, and analytics
- **n8n workflow integration** for automated lead processing
- **Real-time analytics** dashboard for business intelligence

## 📊 Key Features

### Chatbot Capabilities
- **Natural language search**: "SUV Toyota negro bajo 400,000"
- **Lead capture**: Collects client information and preferences
- **Car recommendations**: Shows matching vehicles with details
- **Client profiling**: Tracks preferences and search patterns

### Database Schema
- **Cars table**: 30+ sample vehicles with all attributes (brand, model, year, type, color, mileage, price)
- **Clients table**: Lead capture with preferences and contact information
- **Search tracking**: Monitors what clients are looking for
- **Interaction logging**: Complete conversation history
- **Analytics tables**: Business intelligence and reporting

### API Endpoints
- **Car search**: Advanced filtering by type, brand, price, color, mileage
- **Client management**: Lead capture and preference tracking
- **Analytics**: Dashboard metrics and client behavior analysis
- **Webhooks**: n8n integration for chatbot automation

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   n8n Chatbot   │────│   REST API      │────│   PostgreSQL    │
│   Workflow       │    │   Server        │    │   Database      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
        │                        │                        │
        │                        │                        │
        ▼                        ▼                        ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   WhatsApp/      │    │   Analytics     │    │   Client Data   │
│   Telegram       │    │   Dashboard     │    │   & Preferences │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🚀 Quick Start

### Prerequisites
- Node.js 16+
- PostgreSQL 12+
- n8n (for chatbot workflow)
- Docker (optional, for easy database setup)

### Installation

1. **Run the automated setup script:**
```bash
cd /mnt/f/projects/PCR
chmod +x setup/install.sh
./setup/install.sh
```

2. **Start the system:**
```bash
./start-all.sh
```

3. **Test the API:**
```bash
curl http://localhost:3000/health
curl http://localhost:3000/api/cars
```

### Manual Setup (Alternative)

1. **Setup Database:**
```bash
# Create database
createdb car_dealership

# Import schema and data
psql car_dealership < database/schema.sql
psql car_dealership < database/sample_data.sql
```

2. **Setup API:**
```bash
cd api
npm install
cp .env.example .env
# Edit .env with your database credentials
npm start
```

3. **Setup n8n:**
```bash
npm install -g n8n
n8n start
# Import workflow from n8n/workflow.json
```

## 📚 API Documentation

### Car Endpoints

#### Get Cars with Filters
```http
GET /api/cars?body_type=suv&brand=toyota&max_price=400000
```

#### Search Cars (Natural Language)
```http
POST /api/search/intelligent
Content-Type: application/json

{
  "query_text": "SUV Toyota negro bajo 400,000",
  "session_id": "session_123",
  "client_id": 1
}
```

### Client Endpoints

#### Capture Lead
```http
POST /api/clients
Content-Type: application/json

{
  "name": "Juan García",
  "phone": "55-1234-5678",
  "email": "juan@email.com",
  "preferred_body_type": "suv",
  "max_price": 400000
}
```

### Analytics Endpoints

#### Dashboard Metrics
```http
GET /api/analytics/dashboard?timeframe=30
```

#### Client Preferences
```http
GET /api/analytics/client-preferences?timeframe=7
```

### Webhook Endpoints (n8n Integration)

#### Chatbot Webhook
```http
POST /api/webhooks/n8n/chatbot
Content-Type: application/json

{
  "action": "search_cars",
  "session_id": "session_123",
  "search_criteria": {
    "body_type": "suv",
    "brand": "toyota",
    "max_price": 400000
  }
}
```

## 🤖 n8n Chatbot Integration

### Workflow Features
- **Proactive greeting** when users start conversation
- **Natural language understanding** for car searches
- **Lead qualification** and data capture
- **Real-time database updates** for all interactions
- **Analytics tracking** for business intelligence

### Example Conversation Flow
```
Bot: ¡Hola! ¿Qué tipo de vehículo estás buscando?

User: SUV Toyota negro

Bot: Excelente. ¿Cuál es tu presupuesto aproximado?

User: Hasta 400,000

Bot: Encontré 3 Toyota SUVs que coinciden:
     1. Toyota RAV4 2021 - $385,000
     2. Toyota Highlander 2020 - $425,000
     3. Toyota 4Runner 2019 - $395,000

User: Me interesa el RAV4

Bot: ¡Perfecto! Para enviarte más detalles, ¿me das tu nombre y teléfono?

User: Juan García, 55-1234-5678

Bot: ¡Gracias Juan! Un asesor te contactará pronto por WhatsApp.
```

## 📊 Database Schema

### Core Tables

#### Cars Table
```sql
- id, brand, model, year, body_type
- color, mileage, price, fuel_type
- transmission, engine_size, doors
- available, vin, description, image_url
```

#### Clients Table
```sql
- id, name, phone, email
- preferred_body_type, preferred_brand
- min_price, max_price, preferred_color
- status, notes, source, created_at
```

#### Client Searches Table
```sql
- id, client_id, session_id
- search_body_type, search_brand
- search_min_price, search_max_price
- results_count, created_at
```

#### Client Interactions Table
```sql
- id, client_id, session_id
- interaction_type, user_message
- bot_response, extracted_data
- created_at
```

## 📈 Analytics & Reports

### Business Intelligence Features
- **Daily lead capture** metrics
- **Popular vehicle types** analysis
- **Client preference** patterns
- **Conversion funnel** tracking
- **Search trend** analysis
- **Car performance** metrics

### Available Analytics Endpoints
- `/api/analytics/dashboard` - Overall metrics
- `/api/analytics/client-preferences` - Client behavior analysis
- `/api/analytics/car-performance` - Inventory performance
- `/api/analytics/chatbot-effectiveness` - Conversation analysis
- `/api/analytics/trends` - Time-based trends

## 🛠️ Configuration

### Environment Variables (.env)
```bash
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=car_dealership
DB_USER=your_user
DB_PASSWORD=your_password

# Server
PORT=3000
NODE_ENV=development

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5678
```

### n8n Workflow Configuration
1. Import `n8n/workflow.json` into your n8n instance
2. Set API base URL in workflow settings
3. Configure webhook endpoints
4. Test conversation flow

## 🧪 Testing

### API Testing
```bash
# Health check
curl http://localhost:3000/health

# Get all cars
curl http://localhost:3000/api/cars

# Search cars
curl -X POST http://localhost:3000/api/search/cars \
  -H "Content-Type: application/json" \
  -d '{"session_id":"test","search_body_type":"suv"}'

# Create client
curl -X POST http://localhost:3000/api/clients \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","phone":"123-456-7890"}'
```

### Chatbot Testing
Use the n8n workflow test feature or integrate with messaging platforms:
- WhatsApp Business API
- Telegram Bot API
- Facebook Messenger
- Web chat widget

## 📁 Project Structure

```
car-dealership-chatbot/
├── api/                    # REST API server
│   ├── routes/            # API endpoints
│   ├── config/            # Database configuration
│   ├── server.js          # Main server file
│   └── package.json       # Dependencies
├── database/              # PostgreSQL schema
│   ├── schema.sql         # Database structure
│   └── sample_data.sql    # Sample car inventory
├── n8n/                   # n8n workflow
│   ├── workflow.json      # Importable workflow
│   └── README.md          # n8n setup guide
├── setup/                 # Installation scripts
│   └── install.sh         # Automated setup
├── start-all.sh           # System startup
├── stop-all.sh            # System shutdown
└── README.md              # This file
```

## 🚀 Deployment

### Production Deployment
1. **Database**: Use managed PostgreSQL (AWS RDS, Google Cloud SQL)
2. **API**: Deploy to cloud platforms (Heroku, AWS, Google Cloud)
3. **n8n**: Use n8n.cloud or self-hosted n8n instance
4. **Monitoring**: Add logging and error tracking
5. **Security**: Implement authentication and rate limiting

### Scaling Considerations
- **Database indexing** for large car inventories
- **API caching** for frequently accessed data
- **Load balancing** for high traffic
- **Message queuing** for webhook processing
- **CDN** for car images

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For questions or issues:
1. Check the setup documentation
2. Review API endpoints and examples
3. Test with the provided sample data
4. Check n8n workflow configuration

## 🔄 Updates & Roadmap

### Current Version: 1.0.0
- ✅ Complete chatbot with n8n integration
- ✅ PostgreSQL database with analytics
- ✅ RESTful API with search capabilities
- ✅ Natural language processing
- ✅ Lead capture and client management

### Future Enhancements
- 🔄 WhatsApp Business integration
- 🔄 Multi-language support
- 🔄 AI-powered recommendations
- 🔄 Integration with dealership CRM
- 🔄 Advanced analytics dashboard
- 🔄 Mobile app support