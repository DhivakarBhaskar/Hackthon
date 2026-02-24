import os
from datetime import datetime, date, timedelta
import math
import re
from flask import Flask, render_template, request, redirect, url_for, session, jsonify, flash
import sqlite3
from sqlite3 import Error
from predictions import get_weekly_insights, get_smart_suggestions, calculate_streak

app = Flask(__name__)
app.secret_key = 'super_secret_student_finance_key'

# Ensure SQLite path is absolute so the DB is found in production
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
db_path = os.path.join(BASE_DIR, "finance_tracker.db")
DATABASE = db_path
# Helpful for apps that use SQLAlchemy; harmless if not used
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///" + db_path

def get_db_connection():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    c = conn.cursor()
    # Create Users Table
    c.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            monthly_budget REAL DEFAULT 5000,
            savings_goal REAL DEFAULT 1000
        )
    ''')
    # Create Transactions Table
    c.execute('''
        CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            amount REAL NOT NULL,
            category TEXT NOT NULL,
            type TEXT NOT NULL, -- 'income' or 'expense'
            description TEXT,
            date TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    ''')
    conn.commit()
    conn.close()

init_db()


def compute_stability_score(total_income: float, total_expense: float, available_balance: float) -> int:
    """
    Shared stability score (0–100) for dashboard and decision engine.
    Higher when savings ratio is good and expense ratio is lower.
    """
    score = 50
    if total_income > 0:
        savings_ratio = available_balance / total_income
        expense_ratio = total_expense / total_income
        score = 50 + (savings_ratio * 30) - (expense_ratio * 20)
    else:
        # If there is only spending and no income logged, penalize
        score = 50 - (total_expense / 100.0)

    return max(0, min(100, int(score)))

@app.route('/')
def index():
    if 'user_id' in session:
        return redirect(url_for('dashboard'))
    return redirect(url_for('login'))

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        
        conn = get_db_connection()
        try:
            conn.execute('INSERT INTO users (username, password) VALUES (?, ?)', (username, password))
            conn.commit()
            flash('Registration successful! Please login.', 'success')
            return redirect(url_for('login'))
        except sqlite3.IntegrityError:
            flash('Username already exists.', 'danger')
        finally:
            conn.close()
            
    return render_template('register.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        
        conn = get_db_connection()
        user = conn.execute('SELECT * FROM users WHERE username = ? AND password = ?', (username, password)).fetchone()
        conn.close()
        
        if user:
            session['user_id'] = user['id']
            session['username'] = user['username']
            return redirect(url_for('dashboard'))
        else:
            flash('Invalid username or password.', 'danger')
            
    return render_template('login.html')

@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('login'))

def auto_categorize(description):
    """Simple keyword matching to auto-categorize expenses."""
    desc = str(description).lower()
    mapping = {
        'swiggy': 'Food', 'zomato': 'Food', 'dominos': 'Food', 'mcdonalds': 'Food', 'cafe': 'Food', 'coffee': 'Food',
        'uber': 'Travel', 'ola': 'Travel', 'rapido': 'Travel', 'metro': 'Travel', 'bus': 'Travel', 'train': 'Travel',
        'amazon': 'Shopping', 'flipkart': 'Shopping', 'myntra': 'Shopping', 'zara': 'Shopping', 'h&m': 'Shopping',
        'jio': 'Recharge', 'airtel': 'Recharge', 'vi': 'Recharge', 'wifi': 'Recharge', 'internet': 'Recharge',
        'fees': 'Fees', 'college': 'Fees', 'tuition': 'Fees', 'library': 'Fees', 'exam': 'Fees',
        'movie': 'Entertainment', 'netflix': 'Entertainment', 'spotify': 'Entertainment', 'steam': 'Entertainment'
    }
    for keyword, category in mapping.items():
        if keyword in desc:
            return category
    return 'Others'

@app.route('/dashboard')
def dashboard():
    if 'user_id' not in session:
        return redirect(url_for('login'))
        
    user_id = session['user_id']
    conn = get_db_connection()
    user = conn.execute('SELECT * FROM users WHERE id = ?', (user_id,)).fetchone()
    
    # Dates and month window
    now = datetime.now()
    first_day_of_month = f"{now.year}-{now.month:02d}-01"

    # Fetch all user transactions once, then derive monthly views in Python
    cursor = conn.execute('''
        SELECT * FROM transactions 
        WHERE user_id = ?
        ORDER BY date DESC
    ''', (user_id,))
    all_transactions = [dict(row) for row in cursor.fetchall()]

    # Filter to current month for dashboard summaries and charts
    transactions = [t for t in all_transactions if t['date'] >= first_day_of_month]
    
    # Basic Calculations for current month
    total_expense = sum(t['amount'] for t in transactions if t['type'] == 'expense')
    total_income = sum(t['amount'] for t in transactions if t['type'] == 'income')
    
    import calendar
    days_in_month = calendar.monthrange(now.year, now.month)[1]
    current_day = now.day
    days_remaining = max(days_in_month - current_day, 1)
    
    # Real balance model
    current_balance = total_income - total_expense  # can be negative
    # Non-negative balance used for survival calculations
    available_balance = max(current_balance, 0)
    
    safe_daily_spend = available_balance / days_remaining if days_remaining > 0 else available_balance
    
    # --- CHART 1: Spending Trend (Last 30 Days) ---
    thirty_days_ago = (now - timedelta(days=30)).strftime('%Y-%m-%d')
    cursor = conn.execute('''
        SELECT date, SUM(amount) as daily_total 
        FROM transactions 
        WHERE user_id = ? AND date >= ? AND type = 'expense'
        GROUP BY date ORDER BY date ASC
    ''', (user_id, thirty_days_ago))
    daily_spend_data = cursor.fetchall()
    
    # Generate 30 day sequence filling missing days with 0
    from collections import defaultdict
    daily_dict = {row['date']: row['daily_total'] for row in daily_spend_data}
    chart_dates = []
    chart_spent = []
    
    for i in range(30, -1, -1):
        d = (now - timedelta(days=i)).strftime('%Y-%m-%d')
        chart_dates.append(d[-5:]) # MM-DD format
        chart_spent.append(daily_dict.get(d, 0))

    # --- CHART 2: Category Doughnut ---
    category_totals = defaultdict(float)
    for t in transactions:
        if t['type'] == 'expense':
            category_totals[t['category']] += t['amount']
    
    cat_labels = list(category_totals.keys())
    cat_values = list(category_totals.values())
    
    # --- CHART 3: Balance Forecast Array ---
    forecast_data = []
    current_proj_balance = available_balance
    avg_daily_spend = total_expense / current_day if current_day > 0 else 0
    
    for i in range(1, days_remaining + 1):
        forecast_data.append(max(0, current_proj_balance))
        current_proj_balance -= avg_daily_spend
        
    forecast_labels = [f"Day {current_day + i}" for i in range(1, days_remaining + 1)]
    
    # Message for Forecast
    forecast_message = "You are safe."
    if current_proj_balance <= 0:
        days_until_zero = available_balance / avg_daily_spend if avg_daily_spend > 0 else 999
        forecast_message = f"At this rate you may run out of money in {int(days_until_zero)} days."

    # --- NEW CAPABILITIES ---
    from predictions import get_weekly_insights, get_smart_suggestions, calculate_streak
    weekly_insights = get_weekly_insights(all_transactions, now)
    suggestions = get_smart_suggestions(weekly_insights, total_expense)
    # No-spend streak uses full history so older expenses correctly break the streak
    streak = calculate_streak(all_transactions)
    
    # Financial Stability Score Base Calc (shared formula)
    score = compute_stability_score(total_income, total_expense, available_balance)
    
    # Alert Logic for Hero
    alert_color = "success"
    days_to_zero = days_remaining
    
    if avg_daily_spend > 0:
        days_to_zero = int(available_balance / avg_daily_spend) if available_balance > 0 else 0
    else:
        days_to_zero = 999
        
    if days_to_zero < days_remaining:
        alert_color = "danger"
    elif days_to_zero <= days_remaining + 3:
        alert_color = "warning"
        
    # Pass down additional predictive data
    
    return render_template('dashboard.html', 
        user=user, 
        balance=available_balance,
        current_balance=current_balance,
        safe_daily_spend=safe_daily_spend,
        transactions=transactions[:10], # recent 10 records
        chart_dates=chart_dates,
        chart_spent=chart_spent,
        cat_labels=cat_labels,
        cat_values=cat_values,
        forecast_labels=forecast_labels,
        forecast_data=forecast_data,
        forecast_message=forecast_message,
        
        # New Context Variables
        remaining_days=days_remaining,
        forecast_days=days_to_zero,
        weekly_avg_daily_expense=avg_daily_spend,
        financial_score=score,
        alert_color=alert_color,
        suggestions=suggestions,
        streak=streak
    )

@app.route('/insights')
def insights():
    if 'user_id' not in session:
        return redirect(url_for('login'))
        
    user_id = session['user_id']
    conn = get_db_connection()
    
    # 1. Fetch all transactions for the logged-in user
    cursor = conn.execute('''
        SELECT id, amount, category, type, description, date 
        FROM transactions 
        WHERE user_id = ?
        ORDER BY date DESC
    ''', (user_id,))
    transactions = [dict(row) for row in cursor.fetchall()]
    conn.close()
    
    # 2. Process data in Python using dictionaries
    from collections import defaultdict
    import calendar
    
    now = datetime.now()
    days_in_month = calendar.monthrange(now.year, now.month)[1]
    days_passed_in_month = max(now.day, 1)
    remaining_days_in_month = max(days_in_month - now.day, 1)
    
    total_income = 0
    total_expense = 0
    
    category_totals = defaultdict(float)
    daily_totals = defaultdict(float)
    week_totals = {'Monday': 0, 'Tuesday': 0, 'Wednesday': 0, 'Thursday': 0, 'Friday': 0, 'Saturday': 0, 'Sunday': 0}
    
    current_month_prefix = f"{now.year}-{now.month:02d}"
    
    current_month_expense = 0
    weekend_expense = 0
    food_expense = 0
    recent_transactions_count = 0
    
    for t in transactions:
        amount = t['amount']
        t_date = t['date']
        
        if t['type'] == 'income':
            total_income += amount
        else:
            total_expense += amount
            category_totals[t['category']] += amount
            daily_totals[t_date] += amount
            
            try:
                dt = datetime.strptime(t_date, '%Y-%m-%d')
                day_name = dt.strftime('%A')
                if day_name in week_totals:
                    week_totals[day_name] += amount
                
                if day_name in ['Saturday', 'Sunday']:
                    weekend_expense += amount
            except ValueError:
                pass
                
            if t['category'] == 'Food':
                food_expense += amount
                
            if t_date.startswith(current_month_prefix):
                current_month_expense += amount
                recent_transactions_count += 1
                
    category_labels = list(category_totals.keys())
    category_values = list(category_totals.values())
    
    sorted_dates = sorted(daily_totals.keys())[-30:] # Limit to 30 days for clarity
    daily_labels = sorted_dates
    daily_values = [daily_totals[d] for d in sorted_dates]
    
    week_labels = list(week_totals.keys())
    week_values = list(week_totals.values())
    
    # --- FINANCIAL SURVIVAL PREDICTION ---
    current_balance = max(0, total_income - total_expense)
    average_daily_spend = current_month_expense / days_passed_in_month if days_passed_in_month > 0 else 0
    
    if average_daily_spend > 0:
        survival_days = int(round(current_balance / average_daily_spend))
    else:
        survival_days = 999
        
    if survival_days < remaining_days_in_month:
        survival_message = f"⚠ You will run out of money in {survival_days} days"
        survival_color = "danger"
    elif survival_days <= remaining_days_in_month + 3:
        survival_message = "⚠ You are cutting it close for the month"
        survival_color = "warning"
    else:
        survival_message = "✓ You are safe for the rest of the month"
        survival_color = "success"

    # --- BEHAVIOUR DETECTION PANEL ---
    behaviour_insights = []
    if category_totals:
        highest_cat = max(category_totals, key=category_totals.get)
        behaviour_insights.append(f"Most of your money is going to {highest_cat}.")
        
    if sum(week_totals.values()) > 0:
        highest_day = max(week_totals, key=week_totals.get)
        behaviour_insights.append(f"You spend the most on {highest_day}s.")
        
    behaviour_insights.append(f"You made {recent_transactions_count} transactions recently.")
    behaviour_insights.append(f"Average daily spend is ₹{int(average_daily_spend)}.")

    # --- SMART ADVICE ENGINE ---
    smart_rules = []
    if total_expense > 0:
        if (food_expense / total_expense) > 0.40:
            savings = int(food_expense * 0.3)
            smart_rules.append(f"🍔 Cooking at home could save you ₹{savings} this month.")
        if (weekend_expense / total_expense) > 0.30:
            smart_rules.append("⚠️ High weekend spending detected. Carefully plan weekend outings.")
            
    if recent_transactions_count > 15:
        smart_rules.append("🛍️ Frequent micro-spending detected. Try consolidating purchases.")

    if not smart_rules:
        smart_rules.append("✨ Your spending habits are healthy! Keep it up.")

    # --- FINANCIAL STABILITY SCORE ---
    if total_income > 0:
        savings_ratio = current_balance / total_income
        expense_ratio = total_expense / total_income
    else:
        savings_ratio = 0
        expense_ratio = 1
        
    score = 50 + (savings_ratio * 30) - (expense_ratio * 20)
    
    if survival_days >= remaining_days_in_month:
        score += 20
    else:
        score -= 20 * (1 - (survival_days / remaining_days_in_month))
        
    financial_stability_score = max(0, min(100, int(score)))

    # --- NO-SPEND STREAK ---
    from predictions import calculate_streak
    streak = calculate_streak(transactions)

    return render_template('insights.html',
        income_total=total_income,
        expense_total=total_expense,
        category_labels=category_labels,
        category_values=category_values,
        daily_labels=daily_labels,
        daily_values=daily_values,
        weekday_labels=week_labels,
        weekday_values=week_values,
        raw_transactions=transactions,
        survival_days=survival_days,
        survival_message=survival_message,
        survival_color=survival_color,
        remaining_days_in_month=remaining_days_in_month,
        behaviour_insights=behaviour_insights,
        smart_rules=smart_rules,
        financial_stability_score=financial_stability_score,
        streak=streak
    )

@app.route('/add_transaction', methods=['POST'])
def add_transaction():
    if 'user_id' not in session:
        return redirect(url_for('login'))
        
    amount_str = request.form.get('amount')
    try:
        amount = float(amount_str) if amount_str else 0.0
    except ValueError:
        amount = 0.0
        
    category = request.form.get('category')
    t_type = request.form.get('type')
    date_val = request.form.get('date')
    description = request.form.get('description', '')
    
    if amount > 0:
        conn = get_db_connection()
        try:
            conn.execute('''
                INSERT INTO transactions (user_id, amount, category, type, description, date)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (session['user_id'], amount, category, t_type, description, date_val))
            conn.commit()
        except Exception as e:
            print(f"Error adding transaction: {e}")
        finally:
            conn.close()
            
    return redirect(url_for('dashboard'))

@app.route('/api/quick_add', methods=['POST'])
def api_quick_add():
    """AJAX endpoint for quick expense addition."""
    if 'user_id' not in session:
        return jsonify({'error': 'Unauthorized'}), 401
        
    data = request.json
    amount = float(data.get('amount', 0))
    description = data.get('description', '')
    
    if amount <= 0:
        return jsonify({'error': 'Invalid amount'}), 400
        
    category = auto_categorize(description)
    date_val = datetime.now().strftime('%Y-%m-%d')
    user_id = session['user_id']
    
    conn = get_db_connection()
    conn.execute('''
        INSERT INTO transactions (user_id, amount, category, type, description, date)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (user_id, amount, category, 'expense', description, date_val))
    conn.commit()
    conn.close()
    
    return jsonify({
        'success': True,
        'transaction': {
            'amount': amount,
            'category': category,
            'description': description,
            'date': date_val,
            'type': 'expense'
        }
    })

@app.route('/check_budget', methods=['POST'])
def check_budget():
    if 'user_id' not in session:
        return jsonify({'error': 'Not logged in'}), 401
        
    data = request.json
    amount = float(data.get('amount', 0))
    user_id = session['user_id']
    conn = get_db_connection()
    user = conn.execute('SELECT * FROM users WHERE id = ?', (user_id,)).fetchone()
    
    now = datetime.now()
    first_day = f"{now.year}-{now.month:02d}-01"
    
    cursor = conn.execute("SELECT SUM(amount) as total FROM transactions WHERE user_id = ? AND date >= ? AND type = 'expense'", (user_id, first_day))
    row = cursor.fetchone()
    total_expense = row['total'] if row['total'] else 0
    
    cursor = conn.execute("SELECT SUM(amount) as total FROM transactions WHERE user_id = ? AND date >= ? AND type = 'income'", (user_id, first_day))
    row = cursor.fetchone()
    total_income = row['total'] if row['total'] else 0
    
    import calendar
    days_in_month = calendar.monthrange(now.year, now.month)[1]
    days_remaining_in_month = max(days_in_month - now.day, 1)
    
    # Use the same real balance model here for consistency
    current_balance = total_income - total_expense
    balance = max(current_balance, 0)
    
    safe_daily_spend = balance / max(days_remaining_in_month, 1)
    conn.close()
    
    if amount <= safe_daily_spend:
        return jsonify({'status': 'safe', 'message': 'Safe to spend'})
    else:
        return jsonify({'status': 'danger', 'message': 'Not recommended — will affect your monthly survival'})


@app.route('/api/should_i_buy', methods=['POST'])
def should_i_buy():
    """
    Core decision engine: given an item and price, simulate the month
    with and without the purchase and return a verdict and metrics.
    """
    if 'user_id' not in session:
        return jsonify({'error': 'Not logged in'}), 401

    data = request.get_json(silent=True) or {}
    item_name = (data.get('item_name') or '').strip()

    # Robust price parsing
    try:
        price = float(data.get('price', 0))
    except (TypeError, ValueError):
        price = 0.0

    if price <= 0:
        return jsonify({'error': 'Invalid price'}), 400

    user_id = session['user_id']
    conn = get_db_connection()

    now = datetime.now()
    first_day = f"{now.year}-{now.month:02d}-01"

    cursor = conn.execute(
        '''
        SELECT amount, type, category, date
        FROM transactions
        WHERE user_id = ? AND date >= ?
        ORDER BY date DESC
        ''',
        (user_id, first_day),
    )
    month_transactions = [dict(row) for row in cursor.fetchall()]
    conn.close()

    total_income = sum(t['amount'] for t in month_transactions if t['type'] == 'income')
    total_expense = sum(t['amount'] for t in month_transactions if t['type'] == 'expense')

    import calendar

    days_in_month = calendar.monthrange(now.year, now.month)[1]
    days_passed = max(now.day, 1)
    days_remaining = max(days_in_month - now.day, 1)

    current_balance = total_income - total_expense
    available_balance = max(current_balance, 0)

    avg_daily_spend = total_expense / days_passed if days_passed > 0 else 0.0

    # Survival days before purchase
    if avg_daily_spend > 0:
        current_survival_days = current_balance > 0 and (current_balance / avg_daily_spend) or 0
    else:
        current_survival_days = 999 if current_balance > 0 else 0

    # Simulate purchase
    post_balance = current_balance - price
    post_available_balance = max(post_balance, 0)

    if avg_daily_spend > 0:
        post_survival_days = post_available_balance > 0 and (post_available_balance / avg_daily_spend) or 0
    else:
        post_survival_days = 999 if post_balance > 0 else 0

    # Stability scores before / after
    stability_before = compute_stability_score(total_income, total_expense, available_balance)
    stability_after = compute_stability_score(total_income, total_expense, post_available_balance)
    stability_delta = stability_after - stability_before

    # Risk classification
    # Days short of month end if purchase happens
    if post_survival_days == 999:
        days_short = 0
    else:
        days_short = max(0, int(round(days_remaining - post_survival_days)))

    if post_balance < 0 or post_survival_days < max(days_remaining - 3, 0) or stability_delta < -15:
        risk_level = "HIGH"
        verdict = "Do NOT buy"
    elif post_survival_days < days_remaining or stability_delta < -5:
        risk_level = "MEDIUM"
        verdict = "Risky purchase"
    else:
        risk_level = "LOW"
        verdict = "Safe to buy"

    # Run-out narrative
    if post_balance <= 0:
        runout_message = "If you buy this, you will be out of money immediately."
    elif days_short > 0:
        runout_message = f"If you buy this, you will run out of money {days_short} days before month end."
    else:
        runout_message = "This purchase does not make you run out before month end."

    # Safe price suggestion – keep survival_days >= days_remaining
    if avg_daily_spend > 0:
        safe_price_raw = current_balance - (avg_daily_spend * days_remaining)
        safe_price_raw = max(0.0, safe_price_raw)
    else:
        safe_price_raw = max(0.0, current_balance)

    if safe_price_raw <= 0:
        safe_price = 0
    else:
        # Round down to nearest 50 for a friendly suggestion
        safe_price = math.floor(safe_price_raw / 50.0) * 50.0

    response = {
        "item_name": item_name or "Planned purchase",
        "price": price,
        "current_balance": current_balance,
        "post_balance": post_balance,
        "current_safe_daily": available_balance / days_remaining if days_remaining > 0 else available_balance,
        "post_safe_daily": post_available_balance / days_remaining if days_remaining > 0 else post_available_balance,
        "current_survival_days": current_survival_days,
        "post_survival_days": post_survival_days,
        "stability_score_before": stability_before,
        "stability_score_after": stability_after,
        "stability_delta": stability_delta,
        "risk_level": risk_level,
        "verdict": verdict,
        "runout_message": runout_message,
        "safe_price": safe_price,
        "days_remaining": days_remaining,
        "days_short": days_short,
    }

    return jsonify(response)

@app.route('/smart_import', methods=['POST'])
def smart_import():
    if 'user_id' not in session:
        return jsonify({'error': 'Not logged in'}), 401
        
    data = request.json
    message = data.get('message', '').lower()
    
    # Regex to find amount (e.g., Rs. 500, ₹ 100, INR 50)
    amount_match = re.search(r'(?:rs\.?|₹|inr)\s*(\d+(?:\.\d+)?)', message)
    amount = float(amount_match.group(1)) if amount_match else 0
    
    category = 'Other'
    t_type = 'expense'
    
    # Keyword based categorization
    if 'swiggy' in message or 'zomato' in message or 'food' in message or 'lunch' in message or 'tea' in message:
        category = 'Food'
    elif 'bus' in message or 'uber' in message or 'ola' in message or 'travel' in message:
        category = 'Travel'
    elif 'recharge' in message or 'jio' in message or 'airtel' in message or 'bill' in message:
        category = 'Bills'
    elif 'scholarship' in message or 'salary' in message or 'received' in message or 'credited' in message:
        category = 'Income'
        t_type = 'income'
        
    if amount > 0:
        conn = get_db_connection()
        conn.execute('''
            INSERT INTO transactions (user_id, amount, category, type, description, date)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (session['user_id'], amount, category, t_type, f"Smart Import: {message[:20]}...", datetime.now().strftime('%Y-%m-%d')))
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True, 
            'amount': amount, 
            'category': category, 
            'type': t_type
        })
    else:
        return jsonify({'success': False, 'error': 'Could not detect amount'})


@app.route('/api/chart_data')
def chart_data():
    if 'user_id' not in session:
        return jsonify({'error': 'Not logged in'}), 401
        
    user_id = session['user_id']
    conn = get_db_connection()
    
    now = datetime.now()
    first_day = f"{now.year}-{now.month:02d}-01"
    
    # Expense by category (Pie Chart)
    cursor = conn.execute('''
        SELECT category, SUM(amount) as total 
        FROM transactions 
        WHERE user_id = ? AND date >= ? AND type = 'expense'
        GROUP BY category
    ''', (user_id, first_day))
    category_data = cursor.fetchall()
    
    # Daily spending (Line Chart)
    cursor = conn.execute('''
        SELECT date, SUM(amount) as total 
        FROM transactions 
        WHERE user_id = ? AND date >= ? AND type = 'expense'
        GROUP BY date
        ORDER BY date
    ''', (user_id, first_day))
    daily_data = cursor.fetchall()
    
    # Income vs Expense
    cursor = conn.execute('''
        SELECT type, SUM(amount) as total 
        FROM transactions 
        WHERE user_id = ? AND date >= ?
        GROUP BY type
    ''', (user_id, first_day))
    inc_exp_data = cursor.fetchall()
    
    # Weekly Spending Pattern (Day of Week)
    cursor = conn.execute('''
        SELECT 
            CASE cast(strftime('%w', date) as integer)
                WHEN 0 THEN 'Sunday'
                WHEN 1 THEN 'Monday'
                WHEN 2 THEN 'Tuesday'
                WHEN 3 THEN 'Wednesday'
                WHEN 4 THEN 'Thursday'
                WHEN 5 THEN 'Friday'
                WHEN 6 THEN 'Saturday'
            END as day_of_week,
            strftime('%w', date) as day_index,
            SUM(amount) as total 
        FROM transactions 
        WHERE user_id = ? AND type = 'expense'
        GROUP BY day_of_week
        ORDER BY day_index
    ''', (user_id,))
    weekly_pattern_data = cursor.fetchall()
    
    conn.close()
    
    return jsonify({
        'expense_categories': {
            'labels': [row['category'] for row in category_data],
            'data': [row['total'] for row in category_data]
        },
        'daily_spending': {
            'labels': [row['date'] for row in daily_data],
            'data': [row['total'] for row in daily_data]
        },
        'income_vs_expense': {
            'labels': [row['type'].capitalize() for row in inc_exp_data],
            'data': [row['total'] for row in inc_exp_data]
        },
        'weekly_pattern': {
            'labels': [row['day_of_week'] for row in weekly_pattern_data],
            'data': [row['total'] for row in weekly_pattern_data]
        }
    })

if __name__ == '__main__':
    app.run(host="0.0.0.0", port=10000)
