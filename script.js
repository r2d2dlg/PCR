class ChatBot {
    constructor() {
        this.currentStep = 0;
        this.leadData = {
            vehicleType: '',
            priceRange: '',
            name: '',
            phone: ''
        };
        this.isFormMode = false;
        this.init();
    }

    init() {
        this.container = document.getElementById('chatbotContainer');
        this.messagesDiv = document.getElementById('chatbotMessages');
        this.inputContainer = document.getElementById('chatbotInputContainer');
        this.input = document.getElementById('chatbotInput');
        this.sendBtn = document.getElementById('sendMessage');
        this.closeBtn = document.getElementById('closeChatbot');

        this.setupEventListeners();
        this.startProactiveChat();
    }

    setupEventListeners() {
        this.sendBtn.addEventListener('click', () => this.handleUserInput());
        this.input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleUserInput();
        });
        this.closeBtn.addEventListener('click', () => this.closeChatbot());
    }

    startProactiveChat() {
        setTimeout(() => {
            this.showChatbot();
            this.addBotMessage("¡Hola! Bienvenido a AutoDealer Premium. ¿Qué tipo de vehículo estás buscando hoy? (Ej: SUV, Sedán, Pickup)");
        }, 3000);
    }

    showChatbot() {
        this.container.classList.add('active');
    }

    closeChatbot() {
        this.container.classList.remove('active');
    }

    addBotMessage(message) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message bot-message';
        messageDiv.textContent = message;
        this.messagesDiv.appendChild(messageDiv);
        this.scrollToBottom();
    }

    addUserMessage(message) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message user-message';
        messageDiv.textContent = message;
        this.messagesDiv.appendChild(messageDiv);
        this.scrollToBottom();
    }

    scrollToBottom() {
        this.messagesDiv.scrollTop = this.messagesDiv.scrollHeight;
    }

    handleUserInput() {
        if (this.isFormMode) return;

        const userInput = this.input.value.trim();
        if (!userInput) return;

        this.addUserMessage(userInput);
        this.input.value = '';

        this.processUserResponse(userInput);
    }

    processUserResponse(response) {
        switch (this.currentStep) {
            case 0:
                this.leadData.vehicleType = response;
                this.currentStep = 1;
                this.addBotMessage("Excelente elección. ¿Tienes algún rango de precio en mente?");
                break;
            
            case 1:
                this.leadData.priceRange = response;
                this.currentStep = 2;
                this.addBotMessage("Tenemos varias opciones excelentes que encajan con tu búsqueda. ¿Te gustaría que un asesor te contacte por WhatsApp para enviarte fotos y agendar una prueba de manejo? Solo necesito tu nombre y número de teléfono.");
                this.showContactForm();
                break;
        }
    }

    showContactForm() {
        this.isFormMode = true;
        this.inputContainer.style.display = 'none';

        const formDiv = document.createElement('div');
        formDiv.className = 'contact-form';
        formDiv.innerHTML = `
            <div class="form-input">
                <label for="nameInput">Nombre:</label>
                <input type="text" id="nameInput" placeholder="Tu nombre completo">
            </div>
            <div class="form-input">
                <label for="phoneInput">Número de teléfono:</label>
                <input type="tel" id="phoneInput" placeholder="Ej: +52 55 1234 5678">
            </div>
            <button class="submit-btn" onclick="chatBot.submitContactForm()">Enviar</button>
        `;
        
        this.messagesDiv.appendChild(formDiv);
        this.scrollToBottom();
    }

    async submitContactForm() {
        const nameInput = document.getElementById('nameInput');
        const phoneInput = document.getElementById('phoneInput');
        
        const name = nameInput.value.trim();
        const phone = phoneInput.value.trim();

        if (!name || !phone) {
            alert('Por favor completa todos los campos');
            return;
        }

        this.leadData.name = name;
        this.leadData.phone = phone;
        this.leadData.timestamp = new Date().toISOString();

        await this.saveLead();
        this.addBotMessage("¡Gracias! Un asesor te contactará pronto por WhatsApp. ¡Esperamos verte pronto en AutoDealer Premium!");
        
        setTimeout(() => {
            this.closeChatbot();
        }, 3000);
    }

    async saveLead() {
        try {
            const response = await fetch('http://localhost:3000/api/clients', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(this.leadData),
            });
    
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
    
            dashboard.updateDashboard();
        } catch (error) {
            console.error('Error saving lead:', error);
            this.addBotMessage("Hubo un error al guardar tus datos. Por favor, inténtalo de nuevo más tarde.");
        }
    }
}

class Dashboard {
    constructor() {
        this.chart = null;
        this.initChart();
        this.updateDashboard();
        setInterval(() => this.updateDashboard(), 5000);
    }

    initChart() {
        const ctx = document.getElementById('vehicleChart').getContext('2d');
        this.chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: [],
                datasets: [{
                    label: 'Búsquedas',
                    data: [],
                    backgroundColor: [
                        '#FF6384',
                        '#36A2EB',
                        '#FFCE56',
                        '#4BC0C0',
                        '#9966FF',
                        '#FF9F40'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    }

    async updateDashboard() {
        try {
            const response = await fetch('http://localhost:3000/api/clients');
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const leads = await response.json();
    
            this.updateProspectCount(leads.length);
            this.updateVehicleChart(leads);
            this.updateProspectsTable(leads);
        } catch (error) {
            console.error('Error fetching leads:', error);
        }
    }

    updateProspectCount(count) {
        document.getElementById('prospectCount').textContent = count;
    }

    updateVehicleChart(leads) {
        const vehicleCounts = {};
        
        leads.forEach(lead => {
            const vehicle = lead.vehicleType.toLowerCase();
            vehicleCounts[vehicle] = (vehicleCounts[vehicle] || 0) + 1;
        });

        const labels = Object.keys(vehicleCounts);
        const data = Object.values(vehicleCounts);

        this.chart.data.labels = labels;
        this.chart.data.datasets[0].data = data;
        this.chart.update();
    }

    updateProspectsTable(leads) {
        const tableBody = document.getElementById('prospectsTableBody');
        
        if (!leads || leads.length === 0) {
            tableBody.innerHTML = '<tr class="no-data"><td colspan="4">No hay prospectos registrados</td></tr>';
            return;
        }

        const recentLeads = leads.slice(-10).reverse();
        
        tableBody.innerHTML = recentLeads.map(lead => {
            const time = new Date(lead.timestamp).toLocaleTimeString('es-ES', {
                hour: '2-digit',
                minute: '2-digit'
            });
            
            return `
                <tr>
                    <td>${lead.name}</td>
                    <td>${lead.phone}</td>
                    <td>${lead.vehicleType}</td>
                    <td>${time}</td>
                </tr>
            `;
        }).join('');
    }
}

class InventoryAnalysis {
    constructor() {
        this.fetchRotationData();
        this.fetchDiscountData();
        this.setupEventListeners();
    }

    setupEventListeners() {
        document.getElementById('getPriceSuggestion').addEventListener('click', () => this.fetchBuyingPriceSuggestion());
    }

    async fetchRotationData() {
        try {
            const response = await fetch('http://localhost:3000/api/inventory/rotation');
            const data = await response.json();
            this.renderRotationTable(data);
        } catch (error) {
            console.error('Error fetching rotation data:', error);
        }
    }

    renderRotationTable(data) {
        const tableBody = document.getElementById('rotationTableBody');
        if (data.length === 0) {
            tableBody.innerHTML = '<tr class="no-data"><td colspan="5">No hay datos de rotación</td></tr>';
            return;
        }

        tableBody.innerHTML = data.map(item => `
            <tr>
                <td>${item.brand}</td>
                <td>${item.model}</td>
                <td>${item.year}</td>
                <td>${parseFloat(item.avg_days_in_inventory).toFixed(2)}</td>
                <td>${item.total_sold}</td>
            </tr>
        `).join('');
    }

    async fetchDiscountData() {
        try {
            const response = await fetch('http://localhost:3000/api/inventory/discount-analysis');
            const data = await response.json();
            this.renderDiscountTable(data);
        } catch (error) {
            console.error('Error fetching discount data:', error);
        }
    }

    renderDiscountTable(data) {
        const tableBody = document.getElementById('discountTableBody');
        if (data.length === 0) {
            tableBody.innerHTML = '<tr class="no-data"><td colspan="6">No hay autos para analizar</td></tr>';
            return;
        }

        tableBody.innerHTML = data.map(item => {
            const suggestedDiscount = (item.price * 0.1).toFixed(2); // 10% discount suggestion
            return `
                <tr>
                    <td>${item.brand}</td>
                    <td>${item.model}</td>
                    <td>${item.year}</td>
                    <td>${item.price}</td>
                    <td>${parseInt(item.days_in_inventory)}</td>
                    <td>${suggestedDiscount}</td>
                </tr>
            `;
        }).join('');
    }

    async fetchBuyingPriceSuggestion() {
        const brand = document.getElementById('brandInput').value;
        const model = document.getElementById('modelInput').value;
        const year = document.getElementById('yearInput').value;

        if (!brand || !model || !year) {
            alert('Por favor, complete todos los campos para la sugerencia de precio.');
            return;
        }

        try {
            const response = await fetch('http://localhost:3000/api/inventory/buying-price-suggestion', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ brand, model, year }),
            });
            const data = await response.json();
            this.renderBuyingPriceSuggestion(data);
        } catch (error) {
            console.error('Error fetching buying price suggestion:', error);
        }
    }

    renderBuyingPriceSuggestion(data) {
        const resultDiv = document.getElementById('buyingPriceResult');
        const suggestedPriceEl = document.getElementById('suggestedPrice');
        const suggestionDetailsEl = document.getElementById('suggestionDetails');

        if (!data.avg_sale_price) {
            suggestedPriceEl.textContent = 'N/A';
            suggestionDetailsEl.textContent = 'No hay datos históricos para este modelo.';
        } else {
            const suggestedPrice = (data.avg_sale_price * 0.85).toFixed(2); // Suggest buying at 85% of avg sale price
            suggestedPriceEl.textContent = `${suggestedPrice}`;
            suggestionDetailsEl.textContent = `Basado en un precio de venta promedio de ${parseFloat(data.avg_sale_price).toFixed(2)} y un tiempo de venta de ${parseFloat(data.avg_days_to_sell).toFixed(2)} días.`;
        }

        resultDiv.style.display = 'block';
    }
}

let chatBot;
let dashboard;

document.addEventListener('DOMContentLoaded', () => {
    chatBot = new ChatBot();
    dashboard = new Dashboard();
});