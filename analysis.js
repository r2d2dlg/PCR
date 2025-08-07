class BIDashboard {
    constructor() {
        this.activePeriod = '1m';
        this.salesData = [];
        this.charts = {};

        this.initCharts();
        this.setupEventListeners();
        this.fetchData();
    }

    initCharts() {
        this.charts.brand = this.createChart('brandChart', 'bar', 'Ventas por Marca');
        this.charts.model = this.createChart('modelChart', 'pie', 'Ventas por Modelo (Top 10)');
        this.charts.price = this.createChart('priceChart', 'doughnut', 'Ventas por Rango de Precio');
    }

    createChart(canvasId, type, label) {
        const ctx = document.getElementById(canvasId).getContext('2d');
        return new Chart(ctx, {
            type: type,
            data: {
                labels: [],
                datasets: [{
                    label: label,
                    data: [],
                    backgroundColor: this.getChartColors(),
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: type === 'bar' ? 'top' : 'right',
                    }
                }
            }
        });
    }

    setupEventListeners() {
        const filterButtons = document.querySelectorAll('.filter-btn');
        filterButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                this.activePeriod = e.target.dataset.period;
                filterButtons.forEach(btn => btn.classList.remove('active'));
                e.target.classList.add('active');
                this.fetchData();
            });
        });
    }

    async fetchData() {
        try {
            const response = await fetch(`/api/inventory/sales-analysis?period=${this.activePeriod}`);
            this.salesData = await response.json();
            this.updateCharts();
        } catch (error) {
            console.error('Error fetching sales data:', error);
        }
    }

    updateCharts() {
        this.updateBrandChart();
        this.updateModelChart();
        this.updatePriceChart();
    }

    updateBrandChart() {
        const brandCounts = this.salesData.reduce((acc, sale) => {
            acc[sale.brand] = (acc[sale.brand] || 0) + 1;
            return acc;
        }, {});

        const sortedBrands = Object.entries(brandCounts).sort((a, b) => b[1] - a[1]);
        const labels = sortedBrands.map(entry => entry[0]);
        const data = sortedBrands.map(entry => entry[1]);

        this.charts.brand.data.labels = labels;
        this.charts.brand.data.datasets[0].data = data;
        this.charts.brand.update();
    }

    updateModelChart() {
        const modelCounts = this.salesData.reduce((acc, sale) => {
            const modelKey = `${sale.brand} ${sale.model}`;
            acc[modelKey] = (acc[modelKey] || 0) + 1;
            return acc;
        }, {});

        const sortedModels = Object.entries(modelCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);
        const labels = sortedModels.map(entry => entry[0]);
        const data = sortedModels.map(entry => entry[1]);

        this.charts.model.data.labels = labels;
        this.charts.model.data.datasets[0].data = data;
        this.charts.model.update();
    }

    updatePriceChart() {
        const priceRanges = {
            '<$20k': 0,
            '$20k-$30k': 0,
            '$30k-$40k': 0,
            '>$40k': 0,
        };

        this.salesData.forEach(sale => {
            if (sale.price < 20000) priceRanges['<$20k']++;
            else if (sale.price >= 20000 && sale.price < 30000) priceRanges['$20k-$30k']++;
            else if (sale.price >= 30000 && sale.price < 40000) priceRanges['$30k-$40k']++;
            else priceRanges['>$40k']++;
        });

        const labels = Object.keys(priceRanges);
        const data = Object.values(priceRanges);

        this.charts.price.data.labels = labels;
        this.charts.price.data.datasets[0].data = data;
        this.charts.price.update();
    }

    getChartColors() {
        return [
            '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40',
            '#E7E9ED', '#8A2BE2', '#00FFFF', '#7FFF00', '#D2691E', '#FF7F50'
        ];
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new BIDashboard();
});
