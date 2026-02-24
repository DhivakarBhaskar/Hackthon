# Student Finance Tracker - Automated Financial Assistant

A beginner-friendly full-stack web application designed for students to effortlessly track finances. Instead of manual entry for everything, this tracker features smart import capabilities, categorizes expenses, updates balances, predicts safe spending limits, and scores your financial health.

## 🚀 Features

- **Automated Smart Import**: Paste a UPI payment message (e.g., "Paid Swiggy Rs. 200"), and the app will detect the amount, categorize it automatically, and log the transaction!
- **Quick Add Buttons**: Single-click buttons for common student expenses (Lunch, Tea, Bus, Recharge).
- **Financial Intelligence**:
  - Predicts your daily safe spending limit based on remaining days in the month.
  - Alerts you if you hit 80% of your monthly budget.
  - Calculates a "Financial Health Score".
  - Goal tracking for savings.
- **Visual Analytics**: Interactive dynamic graphs using Chart.js (Expense Pie, Daily Line, Income vs Expense Bar).
- **Modern UI**: Fully responsive, dark-mode togglable, card-based interface using Bootstrap 5.
- **Secure Data**: All data persists in an SQLite database.

## 🛠 Tech Stack

- **Frontend**: HTML5, CSS3, Bootstrap 5, JavaScript, Chart.js
- **Backend**: Python, Flask
- **Database**: SQLite

---

## 💻 Windows Run Steps

Follow these easy steps to get the app running on your Windows machine:

1. **Install Python**: Make sure you have Python installed. You can download it from [python.org](https://www.python.org/).
2. **Open Command Prompt / PowerShell** and navigate to this project's folder:
   ```cmd
   cd path\to\cursor 2
   ```
3. **Set up a Virtual Environment (Optional but Recommended)**:
   ```cmd
   python -m venv venv
   venv\Scripts\activate
   ```
4. **Install Flask**:
   ```cmd
   pip install flask
   ```
5. **Run the Application**:
   ```cmd
   python app.py
   ```
6. **Open in Browser**:
   Open Chrome or Edge and go to `http://127.0.0.1:5000/`.

---

## ✅ Testing Checklist

Once the app is running, try out these steps to see it in action:

- [ ] **Registration & Login**: Register a new user account and log in. You should be redirected to an empty dashboard.
- [ ] **Quick Add**: Click one of the "Quick Add" buttons (like Lunch ₹120). Watch your balance decrease and the table update.
- [ ] **Manual Entry**: Complete the "Manual Entry" form. Add a ₹5000 'Income' and a ₹500 'Shopping' expense. Check if your balance calculations are correct.
- [ ] **Smart Import**: Paste this exact text into the Smart Import box: `Paid Swiggy Rs. 350 for dinner`. Click Import. The app should automatically record ₹350 under 'Food'.
- [ ] **Charts**: Verify that the Expense Breakdown Pie Chart and Daily Spending graph render with the data you entered.
- [ ] **Income vs Expense**: Click the 'Income vs Expense' button next to Recent Transactions to open the modal chart.
- [ ] **Visuals and Limits**: 
  - Change your system theme or click the moon/sun icon in the top right to switch between **Dark Mode** and **Light Mode**.
  - Check the **Daily Safe Limit** (it should divide your remaining budget by the remaining days in the month).
- [ ] **Data Persistence**: Log out and log back in, or stop the server (`Ctrl+C` in terminal) and start it again. Your transactions and user data should still be there.

Enjoy managing your finances smarter!
