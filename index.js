let transactions = [];
let unfilteredTransactions = [];
let expensesChart, balanceChart, incomesChart;

document.getElementById("banner").style.display = "none";
const startDateInput = document.getElementById('startDateInput');
const endDateInput = document.getElementById('endDateInput');

// if no dates are selected, then show all data, otherwise filter the data by date
startDateInput.addEventListener('input', function() {
    filterData();
});

endDateInput.addEventListener('input', function() {
    filterData();
});

function filterData() {
    let startDate = new Date(startDateInput.value);
    let endDate = new Date(endDateInput.value);

    if (startDateInput.value === "") {
        startDate = new Date(transactions[0].date);
    }

    if (endDateInput.value === "") {
        endDate = new Date(transactions[transactions.length - 1].date);
    }

    transactions = unfilteredTransactions.filter(t => {
        const date = new Date(t.date);
        return date >= startDate && date <= endDate;
    });

    document.getElementById('clearDates').classList.remove('hidden');

    updateDashboard();
    const newStartDate = formatDate(startDate);
    const newEndDate = formatDate(endDate);

    document.getElementById("reportDate").textContent = `${newStartDate} to ${newEndDate}`;
}

document.getElementById('clearDates').addEventListener('click', function() {
    transactions = unfilteredTransactions;
    startDateInput.value = "";
    endDateInput.value = "";
    document.getElementById('clearDates').classList.add('hidden');
    updateDashboard();
});

document.getElementById('uploadButton').addEventListener('click', function() {
    document.getElementById('csvFile').click();
});

document.getElementById('csvFile').addEventListener('change', function() {
    const fileInput = document.getElementById('csvFile');
    const file = fileInput.files[0];
    if (file) {
        // read the file
        const reader = new FileReader();
        reader.readAsText(file);
        reader.onload = function () {
            let data = reader.result;
            data = data.replace(/,/g, ';');
            data = data.replace(/"/g, '');
            data = Papa.parse(data).data;
            processData(data);
        }
    }
})

function formatNumber(number) {
    return new Intl.NumberFormat('en-ZA').format(number)
}

function processData(data) {
    // Remove header row
    data.shift();

    transactions = data.map(row => ({
        date: row[3],
        description: row[4],
        category: row[6],
        moneyIn: parseFloat(row[7]) || 0,
        moneyOut: parseFloat(row[8]) || 0,
        balance: parseFloat(row[10])
    })).reverse(); // Reverse to get chronological order
    transactions = transactions.filter(t => t.date);
    unfilteredTransactions = transactions;
    updateDashboard();
}

function formatDate(date, format = 'en-ZA') {
    date = new Date(date);
    return new Intl.DateTimeFormat(format).format(date)
}

function updateDashboard() {
    updateTotals();
    updateTransactionList();
    updateTopIncomes();
    updateTopExpenses();
    updateCharts();

    const startDate = formatDate(transactions[0].date);
    const endDate = formatDate(transactions[transactions.length - 1].date);

    document.getElementById("reportDate").textContent = `${startDate} to ${endDate}`;

    document.getElementById("no-data-view").classList.add('hidden');
    document.getElementById("data-view").classList.remove('hidden');

    document.body.style.paddingTop = "60px"
    document.getElementById("banner").style.display = "grid";
}

function updateTotals() {
    const totalBalance = transactions[transactions.length - 1].balance;
    const totalIncome = transactions.reduce((sum, t) => sum + t.moneyIn, 0);
    const totalExpenses = transactions.reduce((sum, t) => sum + t.moneyOut, 0);

    document.getElementById('totalBalance').textContent = `R${formatNumber(totalBalance.toFixed(2))}`;
    document.getElementById('totalIncome').textContent = `R${formatNumber(totalIncome.toFixed(2))}`;
    document.getElementById('totalExpenses').textContent = `R${formatNumber(totalExpenses.toFixed(2))}`;

    // Calculate and display changes (simplified)
    const balanceChange = ((totalBalance - transactions[0].balance) / transactions[0].balance * 100).toFixed(2);
    document.getElementById('balanceChange').textContent = `${balanceChange}%`;
    document.getElementById('balanceChange').className = `change ${balanceChange >= 0 ? 'positive' : 'negative'}`;

    document.getElementById('incomeChange').textContent = totalIncome > 0 ? '↑ 100%' : '0%';
    document.getElementById('incomeChange').className = `change ${totalIncome > 0 ? 'positive' : 'negative'}`;

    document.getElementById('expensesChange').textContent = totalExpenses < 0 ? '↑ 100%' : '0%';
    document.getElementById('expensesChange').className = `change ${totalExpenses > 0 ? 'positive' : 'negative'}`;
}

function updateTransactionList() {
    const transactionList = document.getElementById('transactionList');
    transactionList.innerHTML = '';
    const reversedTransactions = JSON.parse(JSON.stringify(transactions)).reverse();
    reversedTransactions.forEach(transaction => {
        const li = document.createElement('li');
        li.innerHTML = `
                    <span>${transaction.description}</span>
                    <span class="transaction-amount ${transaction.moneyOut < 0 ? 'negative' : 'positive'}">
                        ${transaction.moneyOut < 0 ? '-' : '+'}R${formatNumber((transaction.moneyOut || transaction.moneyIn).toFixed(2)).toString().replace('-', '')}
                    </span>
                `;
        transactionList.appendChild(li);
    });
}

function updateTopIncomes() {
    const topIncomes = transactions.filter(t => t.moneyIn > 0).sort((a, b) => b.moneyIn - a.moneyIn);
    const topIncomesList = document.getElementById('topIncomes');
    topIncomesList.innerHTML = '';
    topIncomes.forEach(transaction => {
        const li = document.createElement('li');
        li.innerHTML = `
                    <span>${transaction.description.replace('Payment Received: ', '')}</span>
                    <span class="transaction-amount positive">+R${formatNumber(transaction.moneyIn.toFixed(2))}</span>
                `;
        topIncomesList.appendChild(li);
    });
}

function updateTopExpenses() {
    const topExpenses = transactions.filter(t => t.moneyOut < 0).sort((a, b) => a.moneyOut - b.moneyOut);
    const topExpensesList = document.getElementById('topExpenses');
    topExpensesList.innerHTML = '';
    topExpenses.forEach(transaction => {
        const li = document.createElement('li');
        li.innerHTML = `
                    <span>${transaction.description.replace("Banking App External ", "").replace("Banking App ", "")}</span>
                    <span class="transaction-amount negative">-R${formatNumber((transaction.moneyOut * -1).toFixed(2))}</span>
                `;
        topExpensesList.appendChild(li);
    });
}

function updateCharts() {
    updateExpensesChart();
    updateIncomesChart();
    updateBalanceChart();
}

function updateExpensesChart() {
    const categories = {};
    transactions.forEach(t => {
        if (t.moneyOut < 0) {
            categories[t.category] = (categories[t.category] || 0) + t.moneyOut;
        }
    });

    const data = {
        labels: Object.keys(categories),
        datasets: [{
            data: Object.values(categories),
            backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#FFCD56']
        }]
    };

    if (expensesChart) {
        expensesChart.data = data;
        expensesChart.update();
    } else {
        const ctx = document.getElementById('expensesChart').getContext('2d');
        expensesChart = new Chart(ctx, {
            type: 'pie',
            data: data
        });
    }
}
function updateIncomesChart() {
    const categories = {};
    transactions.forEach(t => {
        if (t.moneyIn > 0) {
            categories[t.category] = (categories[t.category] || 0) + t.moneyIn;
        }
    });

    const data = {
        labels: Object.keys(categories),
        datasets: [{
            data: Object.values(categories),
            backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#FFCD56']
        }]
    };

    if (incomesChart) {
        incomesChart.data = data;
        incomesChart.update();
    } else {
        const ctx = document.getElementById('incomesChart').getContext('2d');
        incomesChart = new Chart(ctx, {
            type: 'pie',
            data: data
        });
    }
}

function updateBalanceChart() {
    const data = {
        labels: transactions.map(t => t.date.split(' ')[0]),
        datasets: [{
            label: 'Balance',
            data: transactions.map(t => t.balance),
            borderColor: '#8e44ad',
            tension: 0.1
        }]
    };

    if (balanceChart) {
        balanceChart.data = data;
        balanceChart.update();
    } else {
        const ctx = document.getElementById('balanceChart').getContext('2d');
        balanceChart = new Chart(ctx, {
            type: 'line',
            data: data,
            options: {
                scales: {
                    y: {
                        beginAtZero: false
                    }
                }
            }
        });
    }
}
