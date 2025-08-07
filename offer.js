class OfferCalculator {
    constructor() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        document.getElementById('calculateOfferBtn').addEventListener('click', () => this.calculateOffer());
    }

    async calculateOffer() {
        const payload = {
            brand: document.getElementById('brandInput').value,
            model: document.getElementById('modelInput').value,
            year: parseInt(document.getElementById('yearInput').value),
            salesPrice: parseFloat(document.getElementById('salesPriceInput').value),
            dailyHoldingCost: parseFloat(document.getElementById('dailyHoldingCostInput').value),
            salesCommission: parseFloat(document.getElementById('salesCommissionInput').value),
            reconditioningCost: parseFloat(document.getElementById('reconditioningCostInput').value),
            desiredProfitMargin: parseFloat(document.getElementById('desiredProfitMarginInput').value),
        };

        if (!payload.brand || !payload.model || !payload.year || !payload.salesPrice) {
            alert('Por favor, complete todos los campos del vehículo y el precio de venta.');
            return;
        }

        try {
            const response = await fetch('/api/inventory/offer-suggestion', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            const data = await response.json();
            this.renderResult(data);

        } catch (error) {
            console.error('Error calculating offer:', error);
            alert('Hubo un error al calcular la oferta. Por favor, revise la consola.');
        }
    }

    renderResult(data) {
        document.getElementById('suggestedOfferPrice').textContent = `$${data.suggestedOfferPrice}`;
        
        const breakdownDiv = document.getElementById('offerBreakdown');
        breakdownDiv.innerHTML = `
            <p>Precio de Venta Objetivo: <strong>$${data.breakdown.targetSalesPrice}</strong></p>
            <hr>
            <p>Costo de Inventario (Promedio ${data.breakdown.avgDaysInInventory} días): $${data.breakdown.inventoryCost}</p>
            <p>Comisión de Venta: $${data.breakdown.commissionAmount}</p>
            <p>Costos de Reacondicionamiento: $${data.breakdown.reconditioningCost}</p>
            <p>Costo de Oportunidad (1%): $${data.breakdown.opportunityCost}</p>
            <p><strong>Costos Totales Proyectados:</strong> <strong>$${data.breakdown.totalCosts}</strong></p>
            <hr>
            <p>Ganancia Proyectada: <strong>$${data.breakdown.projectedProfit}</strong></p>
        `;

        document.getElementById('offerResult').style.display = 'block';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new OfferCalculator();
});
