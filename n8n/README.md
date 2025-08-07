# n8n Chatbot Workflow Configuration

This guide explains how to set up the n8n workflow for the car dealership chatbot that integrates with the PostgreSQL database.

## Overview

The n8n workflow handles:
- **Lead capture** from client conversations
- **Car search** with natural language processing
- **Database integration** for analytics and client management
- **Real-time responses** based on inventory and client preferences

## n8n Workflow Structure

### 1. Webhook Trigger
- **URL**: `http://your-api-domain/api/webhooks/n8n/chatbot`
- **Method**: POST
- **Authentication**: Optional (add API key if needed)

### 2. Main Nodes Configuration

#### A. Start Conversation Node
```json
{
  "action": "start_conversation",
  "session_id": "{{ $json.session_id || uuid() }}"
}
```

#### B. Car Search Node
```json
{
  "action": "search_cars",
  "session_id": "{{ $json.session_id }}",
  "search_criteria": {
    "body_type": "{{ $json.body_type }}",
    "brand": "{{ $json.brand }}",
    "min_price": "{{ $json.min_price }}",
    "max_price": "{{ $json.max_price }}",
    "color": "{{ $json.color }}",
    "max_mileage": "{{ $json.max_mileage }}"
  },
  "client_id": "{{ $json.client_id }}"
}
```

#### C. Natural Language Search Node
```json
{
  "action": "natural_search",
  "session_id": "{{ $json.session_id }}",
  "user_message": "{{ $json.user_message }}",
  "client_id": "{{ $json.client_id }}"
}
```

#### D. Lead Capture Node
```json
{
  "action": "capture_lead",
  "session_id": "{{ $json.session_id }}",
  "user_data": {
    "name": "{{ $json.name }}",
    "phone": "{{ $json.phone }}",
    "email": "{{ $json.email }}",
    "preferences": {
      "body_type": "{{ $json.preferred_body_type }}",
      "brand": "{{ $json.preferred_brand }}",
      "min_price": "{{ $json.min_price }}",
      "max_price": "{{ $json.max_price }}",
      "color": "{{ $json.preferred_color }}",
      "max_mileage": "{{ $json.max_mileage }}"
    }
  }
}
```

#### E. Log Interaction Node
```json
{
  "action": "log_interaction",
  "session_id": "{{ $json.session_id }}",
  "user_message": "{{ $json.user_message }}",
  "bot_response": "{{ $json.bot_response }}",
  "interaction_type": "{{ $json.interaction_type }}",
  "client_id": "{{ $json.client_id }}"
}
```

### 3. Conversation Flow Logic

#### Initial Greeting
```
Trigger: New session or "start" command
Response: "¡Hola! Soy tu asistente virtual de AutoDealer Premium. ¿Qué tipo de vehículo estás buscando hoy?"
Options: ["SUV", "Sedán", "Pickup", "Hatchback", "Coupé", "No estoy seguro"]
```

#### Vehicle Type Selection
```
Trigger: User selects vehicle type
Action: Log preference, ask for budget
Response: "Excelente elección. ¿Cuál es tu presupuesto aproximado?"
```

#### Budget Qualification
```
Trigger: User provides budget
Action: Log budget, perform initial search
Response: Show 3-5 matching vehicles with brief details
Follow-up: "¿Te interesa alguno de estos? ¿O prefieres ajustar los criterios de búsqueda?"
```

#### Natural Language Search
```
Trigger: User types free-form search
Action: Extract criteria using NLP, perform search
Response: Show results with interpretation
Example: "Entiendo que buscas: SUV Toyota, color negro. Aquí tienes las opciones disponibles:"
```

#### Lead Capture
```
Trigger: User shows interest in specific car or requests contact
Request: Name and phone number
Action: Save to database, link all session activity to client
Response: "¡Gracias! Un asesor te contactará pronto por WhatsApp."
```

### 4. Conditional Logic Nodes

#### Search Result Handler
```javascript
// If cars found
if ($json.cars && $json.cars.length > 0) {
  return [
    {
      json: {
        message: `Encontré ${$json.cars.length} vehículos que coinciden:`,
        cars: $json.cars,
        action: "show_results"
      }
    }
  ];
} else {
  return [
    {
      json: {
        message: "No encontré vehículos exactos, pero puedo ayudarte a refinar tu búsqueda. ¿Qué te parece si ajustamos algunos criterios?",
        action: "refine_search",
        suggestions: ["Aumentar presupuesto", "Cambiar tipo de vehículo", "Considerar más colores"]
      }
    }
  ];
}
```

#### Lead Qualification
```javascript
// Check if enough info for lead capture
const hasContact = $json.name && $json.phone;
const hasPreferences = $json.preferred_body_type || $json.max_price;

if (hasContact && hasPreferences) {
  return [{ json: { action: "complete_lead", ready: true } }];
} else if (hasContact) {
  return [{ json: { action: "gather_preferences", ready: false } }];
} else {
  return [{ json: { action: "request_contact", ready: false } }];
}
```

### 5. Response Templates

#### Car Display Template
```javascript
function formatCarForChat(car) {
  return {
    title: `${car.brand} ${car.model} ${car.year}`,
    price: `$${car.price.toLocaleString()}`,
    details: `🚗 ${car.body_type} | 🎨 ${car.color} | 📏 ${car.mileage.toLocaleString()} km`,
    description: car.description,
    actions: ["Ver detalles", "Agendar cita", "Comparar"]
  };
}
```

#### Error Handling Template
```javascript
function handleError(error, context) {
  console.log('Chatbot error:', error);
  
  return {
    message: "Disculpa, tuve un problema técnico. ¿Podrías repetir tu solicitud?",
    action: "retry",
    context: context,
    suggestions: ["Buscar vehículos", "Hablar con asesor", "Reiniciar conversación"]
  };
}
```

### 6. Integration Points

#### Database Webhook Calls
All database operations go through the API webhooks:
- **Search**: `POST /api/webhooks/n8n/chatbot` with `action: "search_cars"`
- **Lead Capture**: `POST /api/webhooks/n8n/chatbot` with `action: "capture_lead"`
- **Analytics**: `POST /api/webhooks/n8n/analytics` for real-time metrics

#### External Integrations (Optional)
- **WhatsApp API**: For sending follow-up messages
- **Calendar API**: For scheduling test drives
- **Email Service**: For sending vehicle information
- **Maps API**: For dealership location and directions

### 7. Testing the Workflow

#### Test Messages
1. **Start**: "Hola" or "Busco un auto"
2. **Search**: "SUV Toyota bajo 400,000"
3. **Specific**: "Sedán negro con poco kilometraje"
4. **Budget**: "Algo económico" or "Menos de 300,000"
5. **Contact**: "Me interesa, ¿pueden contactarme?"

#### Expected Flow
```
User: "Hola"
Bot: "¡Hola! ¿Qué tipo de vehículo buscas?"

User: "SUV Toyota"
Bot: "Excelente. ¿Cuál es tu presupuesto?"

User: "Hasta 400,000"
Bot: [Shows 3-5 Toyota SUVs under 400,000]

User: "Me gusta el segundo"
Bot: "¡Perfecto! Para enviarte más información, ¿me das tu nombre y teléfono?"

User: "Juan García, 55-1234-5678"
Bot: "¡Gracias Juan! Un asesor te contactará pronto."
```

### 8. Monitoring and Analytics

#### Key Metrics to Track
- **Session length** (interactions per session)
- **Conversion rate** (sessions to leads)
- **Popular searches** (most requested vehicles)
- **Drop-off points** (where users stop responding)
- **Response time** (API call duration)

#### Dashboard Integration
The analytics endpoints provide real-time data for:
- Daily lead count
- Popular vehicle types
- Conversion funnel
- Search patterns

## Setup Instructions

1. **Import n8n workflow** from the provided JSON
2. **Configure webhook URLs** to point to your API
3. **Set environment variables** for database connection
4. **Test each node** individually
5. **Run full conversation flow** testing
6. **Connect to WhatsApp/Telegram** for production

## Production Considerations

- **Rate limiting**: Implement per-session limits
- **Error recovery**: Graceful degradation when API is down
- **Conversation memory**: Store context between messages
- **Multi-language**: Spanish/English support
- **Business hours**: Route to human agents when closed
- **Escalation**: Transfer complex queries to sales team