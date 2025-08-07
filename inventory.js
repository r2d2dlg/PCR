class InventoryPage {
    constructor() {
        this.fetchInventory();
    }

    async fetchInventory() {
        try {
            const response = await fetch('/api/cars');
            const cars = await response.json();
            this.renderInventoryTable(cars);
        } catch (error) {
            console.error('Error fetching inventory:', error);
        }
    }

    renderInventoryTable(cars) {
        const tableBody = document.getElementById('inventoryTableBody');
        if (cars.length === 0) {
            tableBody.innerHTML = '<tr class="no-data"><td colspan="7">No hay autos disponibles en este momento.</td></tr>';
            return;
        }

        tableBody.innerHTML = cars.map(car => `
            <tr>
                <td>${car.brand}</td>
                <td>${car.model}</td>
                <td>${car.year}</td>
                <td>$${car.price}</td>
                <td>${car.mileage}</td>
                <td>${car.color}</td>
                <td>${car.body_type}</td>
            </tr>
        `).join('');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new InventoryPage();
});
