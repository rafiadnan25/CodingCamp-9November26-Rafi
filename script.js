// State Initialization from Local Storage
let transactions = JSON.parse(localStorage.getItem("transactions")) || [];
let categories = JSON.parse(localStorage.getItem("categories")) || [
  "Food",
  "Transport",
  "Fun",
];
let budgetLimit = parseFloat(localStorage.getItem("budgetLimit")) || 0;
let isDarkMode = localStorage.getItem("darkMode") === "true";

// DOM Elements
const form = document.getElementById("expense-form");
const nameInput = document.getElementById("item-name");
const amountInput = document.getElementById("item-amount");
const categorySelect = document.getElementById("item-category");
const transactionList = document.getElementById("transaction-list");
const totalBalanceEl = document.getElementById("total-balance");
const balanceCard = document.querySelector(".balance-card");
const budgetLimitInput = document.getElementById("budget-limit");
const limitWarning = document.getElementById("limit-warning");
const sortSelect = document.getElementById("sort-select");
const monthlySummaryEl = document.getElementById("monthly-summary");
const themeToggleBtn = document.getElementById("theme-toggle");
const categoryBreakdownEl = document.getElementById("category-breakdown");

// Custom Category Elements
const toggleCustomCatBtn = document.getElementById("toggle-custom-cat");
const customCatBox = document.getElementById("custom-cat-box");
const newCategoryInput = document.getElementById("new-category-input");
const addCategoryBtn = document.getElementById("add-category-btn");

let expenseChart = null;

// Palet warna modern & estetik
const chartColors = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
];

// Format currency (IDR)
function formatCurrency(num) {
  return "Rp " + num.toLocaleString("id-ID");
}

// Save all state to Local Storage
function saveData() {
  localStorage.setItem("transactions", JSON.stringify(transactions));
  localStorage.setItem("categories", JSON.stringify(categories));
  localStorage.setItem("budgetLimit", budgetLimit.toString());
}

// Render Category Dropdown
function renderCategories() {
  categorySelect.innerHTML = "";
  categories.forEach((cat) => {
    const option = document.createElement("option");
    option.value = cat;
    option.textContent = cat;
    categorySelect.appendChild(option);
  });
}

// Update Total Balance & Check Spending Limit
function updateBalance() {
  const total = transactions.reduce((sum, tx) => sum + tx.amount, 0);
  totalBalanceEl.textContent = formatCurrency(total);

  if (budgetLimit > 0 && total > budgetLimit) {
    balanceCard.classList.add("over-limit");
    limitWarning.classList.remove("hidden");
  } else {
    balanceCard.classList.remove("over-limit");
    limitWarning.classList.add("hidden");
  }
}

// Render Transaction List with Sorting
function renderTransactions() {
  transactionList.innerHTML = "";

  if (transactions.length === 0) {
    transactionList.innerHTML =
      '<li class="empty-msg">No transactions added yet.</li>';
    return;
  }

  const sortBy = sortSelect.value;
  const sorted = [...transactions].sort((a, b) => {
    if (sortBy === "amount-desc") return b.amount - a.amount;
    if (sortBy === "amount-asc") return a.amount - b.amount;
    if (sortBy === "category") return a.category.localeCompare(b.category);
    return b.id - a.id;
  });

  sorted.forEach((tx) => {
    const li = document.createElement("li");
    li.className = "transaction-item";
    li.innerHTML = `
      <div class="tx-info">
        <span class="tx-name">${tx.name}</span>
        <span class="tx-meta">${tx.category} • ${tx.date}</span>
      </div>
      <div class="tx-right">
        <span class="tx-amount">${formatCurrency(tx.amount)}</span>
        <button class="delete-btn" onclick="deleteTransaction(${tx.id})" aria-label="Delete item">✕</button>
      </div>
    `;
    transactionList.appendChild(li);
  });
}

// Render Monthly Summary
function renderMonthlySummary() {
  if (transactions.length === 0) {
    monthlySummaryEl.innerHTML =
      '<p class="empty-msg">No monthly data yet.</p>';
    return;
  }

  const monthlyTotals = {};
  transactions.forEach((tx) => {
    const monthYear = tx.monthYear || "Current Month";
    monthlyTotals[monthYear] = (monthlyTotals[monthYear] || 0) + tx.amount;
  });

  monthlySummaryEl.innerHTML = "";
  Object.entries(monthlyTotals).forEach(([month, total]) => {
    const div = document.createElement("div");
    div.className = "summary-item";
    div.innerHTML = `
      <span>${month}</span>
      <strong>${formatCurrency(total)}</strong>
    `;
    monthlySummaryEl.appendChild(div);
  });
}

// Render Category Percentage Breakdown
function renderCategoryBreakdown() {
  if (transactions.length === 0) {
    categoryBreakdownEl.innerHTML = "";
    return;
  }

  const totalExpense = transactions.reduce((sum, tx) => sum + tx.amount, 0);
  const categoryTotals = {};
  transactions.forEach((tx) => {
    categoryTotals[tx.category] =
      (categoryTotals[tx.category] || 0) + tx.amount;
  });

  categoryBreakdownEl.innerHTML = "";
  Object.entries(categoryTotals).forEach(([cat, amount], index) => {
    const percentage =
      totalExpense > 0 ? ((amount / totalExpense) * 100).toFixed(1) : 0;
    const color = chartColors[index % chartColors.length];

    const itemDiv = document.createElement("div");
    itemDiv.className = "breakdown-item";
    itemDiv.innerHTML = `
      <div class="breakdown-info">
        <span><strong>${cat}</strong> (${formatCurrency(amount)})</span>
        <span><strong>${percentage}%</strong></span>
      </div>
      <div class="breakdown-bar-bg">
        <div class="breakdown-bar-fill" style="width: ${percentage}%; background-color: ${color};"></div>
      </div>
    `;
    categoryBreakdownEl.appendChild(itemDiv);
  });
}

// Render or Update Doughnut Chart with Tooltip Percentage
function updateChart() {
  const ctx = document.getElementById("expense-chart").getContext("2d");

  const categoryTotals = {};
  transactions.forEach((tx) => {
    categoryTotals[tx.category] =
      (categoryTotals[tx.category] || 0) + tx.amount;
  });

  const labels = Object.keys(categoryTotals);
  const data = Object.values(categoryTotals);
  const totalExpense = data.reduce((a, b) => a + b, 0);

  if (expenseChart) {
    expenseChart.destroy();
  }

  expenseChart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: labels.length ? labels : ["No Data"],
      datasets: [
        {
          data: data.length ? data : [1],
          backgroundColor: data.length
            ? chartColors.slice(0, labels.length)
            : ["#cbd5e1"],
          borderWidth: 2,
          borderColor: isDarkMode ? "#1e293b" : "#ffffff",
          borderRadius: 6,
          spacing: 4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "70%",
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            color: isDarkMode ? "#f8fafc" : "#1e293b",
            padding: 14,
            font: { size: 11 },
          },
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              if (data.length === 0) return " No Data";
              let label = context.label || "";
              let value = context.raw || 0;
              let percentage =
                totalExpense > 0
                  ? ((value / totalExpense) * 100).toFixed(1)
                  : 0;
              return ` ${label}: Rp ${value.toLocaleString("id-ID")} (${percentage}%)`;
            },
          },
        },
      },
    },
  });
}

// Refresh Entire UI
function updateUI() {
  updateBalance();
  renderTransactions();
  renderMonthlySummary();
  renderCategoryBreakdown();
  updateChart();
}

// Add Transaction
form.addEventListener("submit", (e) => {
  e.preventDefault();

  const name = nameInput.value.trim();
  const amount = parseFloat(amountInput.value);
  const category = categorySelect.value;

  if (!name || isNaN(amount) || amount <= 0 || !category) {
    alert("Please fill in all fields with valid values.");
    return;
  }

  const now = new Date();
  const dateStr = now.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const monthYear = now.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const newTx = {
    id: Date.now(),
    name,
    amount,
    category,
    date: dateStr,
    monthYear,
  };

  transactions.push(newTx);
  saveData();
  updateUI();

  nameInput.value = "";
  amountInput.value = "";
});

window.deleteTransaction = function (id) {
  transactions = transactions.filter((tx) => tx.id !== id);
  saveData();
  updateUI();
};

toggleCustomCatBtn.addEventListener("click", () => {
  customCatBox.classList.toggle("hidden");
});

addCategoryBtn.addEventListener("click", () => {
  const newCat = newCategoryInput.value.trim();
  if (!newCat) return;

  if (!categories.includes(newCat)) {
    categories.push(newCat);
    saveData();
    renderCategories();
  }
  categorySelect.value = newCat;
  newCategoryInput.value = "";
  customCatBox.classList.add("hidden");
});

budgetLimitInput.addEventListener("input", (e) => {
  budgetLimit = parseFloat(e.target.value) || 0;
  saveData();
  updateBalance();
});

sortSelect.addEventListener("change", renderTransactions);

function applyTheme() {
  if (isDarkMode) {
    document.body.classList.add("dark-mode");
    themeToggleBtn.textContent = "☀️";
  } else {
    document.body.classList.remove("dark-mode");
    themeToggleBtn.textContent = "🌙";
  }
  updateChart();
}

themeToggleBtn.addEventListener("click", () => {
  isDarkMode = !isDarkMode;
  localStorage.setItem("darkMode", isDarkMode);
  applyTheme();
});

// Initial App Boot
if (budgetLimit > 0) budgetLimitInput.value = budgetLimit;
renderCategories();
applyTheme();
updateUI();
