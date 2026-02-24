from datetime import datetime, timedelta

def get_weekly_insights(transactions, now):
    """Calculate weekly insights from transactions."""
    seven_days_ago_str = (now - timedelta(days=7)).strftime('%Y-%m-%d')
    weekly_txns = [t for t in transactions if t['date'] >= seven_days_ago_str and t['type'] == 'expense']
    
    if not weekly_txns:
        return None
        
    num_txns = len(weekly_txns)
    total_spent = sum(t['amount'] for t in weekly_txns)
    avg_daily_spent = total_spent / 7 if num_txns > 0 else 0
    
    # Highest category
    categories = {}
    for t in weekly_txns:
        categories[t['category']] = categories.get(t['category'], 0) + t['amount']
    highest_category = max(categories, key=categories.get) if categories else 'None'
    
    # Most expensive day of week
    days = {}
    for t in weekly_txns:
        try:
            dt = datetime.strptime(t['date'], '%Y-%m-%d')
            day_name = dt.strftime('%A')
            days[day_name] = days.get(day_name, 0) + t['amount']
        except ValueError:
            pass
    expensive_day = max(days, key=days.get) if days else 'None'
    
    return {
        'total_spent': total_spent,
        'num_txns': num_txns,
        'avg_daily_spent': avg_daily_spent,
        'highest_category': highest_category,
        'expensive_day': expensive_day,
        'categories': categories
    }

def get_smart_suggestions(insights, total_expense_month):
    """Generate smart suggestions based on weekly insights."""
    suggestions = []
    
    if not insights or insights['total_spent'] <= 0:
        return ["Add some expenses this week to get personalized insights!"]
        
    total_spent = insights['total_spent']
        
    # Food suggestion (if > 40% of weekly)
    food_spent = insights['categories'].get('Food', 0)
    food_percent = food_spent / total_spent
    if food_percent > 0.40:
        savings = round(food_spent * 0.3, 2)
        suggestions.append(f"🍔 Cooking at home 2 times this week could save ₹{savings}")
        
    # Transport suggestion
    transport_spent = insights['categories'].get('Travel', 0)
    transport_percent = transport_spent / total_spent
    if transport_percent > 0.30:
        savings = round(transport_spent * 0.4, 2)
        suggestions.append(f"🚌 Using bus instead of auto 3 times could save ₹{savings}")
        
    # Desktop/Micro-spending suggestion
    if insights['num_txns'] > 10:
        suggestions.append("⚠️ High transaction frequency detected. Beware of micro-spending leaks.")

    # Shopping/Weekend suggestion
    weekend_spent = insights['categories'].get('Shopping', 0) # Fallback heuristic if no date parsing
    # Let's count actual weekend spending from the transactions list directly in the insights
    weekend_total = 0
    if hasattr(insights, 'days'): # safety if we expose days dictionary
       pass
    
    # Actually, we can use the expensive_day to proxy a warning
    if insights.get('expensive_day') in ['Saturday', 'Sunday']:
        suggestions.append("⚠️ High weekend spending detected. Consider planning weekend budgets in advance.")
    
    shopping_spent = insights['categories'].get('Shopping', 0)
    shopping_percent = shopping_spent / total_spent if total_spent > 0 else 0
    
    if shopping_percent > 0.25:
        suggestions.append("🛍️ Reduce online shopping orders this week to protect your budget.")
        
    # If doing well
    if not suggestions and total_spent > 0:
        suggestions.append("✨ Great job! Your spending categories look well-balanced this week.")
        
    return suggestions

def calculate_streak(transactions):
    """
    Calculate No-Spend streak (consecutive days WITHOUT an expense),
    counting backwards from today.

    Rules:
    - Income does NOT break the streak
    - Any expense on a given day breaks the streak
    - Today only counts if there is no expense today
    """
    if not transactions:
        return 0

    expense_dates = set()
    all_dates = []

    for t in transactions:
        date_str = t.get('date') if isinstance(t, dict) else getattr(t, 'date', None)
        if not date_str:
            continue
        try:
            dt = datetime.strptime(date_str, '%Y-%m-%d').date()
        except ValueError:
            continue

        all_dates.append(dt)
        if (t.get('type') if isinstance(t, dict) else getattr(t, 'type', None)) == 'expense':
            expense_dates.add(dt)

    if not all_dates:
        return 0

    today = datetime.now().date()
    earliest = min(all_dates)

    streak = 0
    current = today

    # Limit to 365 days for safety, but also stop before account start
    for _ in range(365):
        if current < earliest:
            break
        if current in expense_dates:
            break

        streak += 1
        current -= timedelta(days=1)

    return streak
