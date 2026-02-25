from flask import Blueprint, render_template, redirect, url_for, flash, request, jsonify
from flask_login import login_user, logout_user, login_required, current_user
from app import db
from app.models import User, Run
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime

main = Blueprint('main', __name__)

# Helper function to convert mm:ss string to float minutes
def duration_to_minutes(duration_str):
    try:
        mins, secs = map(int, duration_str.split(":"))
        return mins + secs / 60
    except:
        return 0

@main.route("/")
def index():
    if current_user.is_authenticated:
        return redirect(url_for('main.dashboard'))
    return redirect(url_for('main.login'))

# ------------------ LOGIN / LOGOUT ------------------
@main.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        username = request.form.get("username")
        password = request.form.get("password")
        user = User.query.filter_by(username=username).first()
        if user and check_password_hash(user.password, password):
            login_user(user)
            return redirect(url_for("main.dashboard"))
        flash("Invalid credentials", "danger")
    return render_template("login.html")


@main.route("/logout")
@login_required
def logout():
    logout_user()
    return redirect(url_for("main.login"))


@main.route("/register", methods=["GET", "POST"])
def register():
    if request.method == "POST":
        username = request.form.get("username")
        email = request.form.get("email")
        password_raw = request.form.get("password")

        # Validate that all fields are filled
        if not username or not email or not password_raw:
            flash("Please fill in all fields", "danger")
            return render_template("register.html")

        # Check if username or email already exists
        if User.query.filter_by(username=username).first():
            flash("Username already exists", "danger")
            return render_template("register.html")
        if User.query.filter_by(email=email).first():
            flash("Email already registered", "danger")
            return render_template("register.html")

        # Hash the password
        password = generate_password_hash(password_raw, method="pbkdf2:sha256")

        # Create new user
        new_user = User(username=username, email=email, password=password)
        db.session.add(new_user)
        db.session.commit()

        flash("Account created! Please log in.", "success")
        return redirect(url_for("main.login"))

    return render_template("register.html")

# ------------------ DASHBOARD ------------------
@main.route("/dashboard")
@login_required
def dashboard():
    runs = Run.query.filter_by(user_id=current_user.id).order_by(Run.date.desc()).all()

    # Leaderboard: best time per distance
    leaderboard_query = (
        db.session.query(
            User.username,
            Run.distance,
            db.func.min(Run.duration).label("best_time")
        )
        .join(User)
        .group_by(User.username, Run.distance)
        .order_by(Run.distance)
    )
    leaderboard = leaderboard_query.all()

    return render_template(
        "dashboard.html",
        runs=runs,
        leaderboard=leaderboard,
        now=datetime.utcnow
    )

# ------------------ ADD / DELETE RUN ------------------
@main.route("/add", methods=["POST"])
@login_required
def add_run():
    date_str = request.form.get("date")
    distance = float(request.form.get("distance"))
    duration = duration_to_minutes(request.form.get("duration"))

    if date_str:
        date = datetime.strptime(date_str, "%Y-%m-%d")
    else:
        date = datetime.utcnow()

    run = Run(date=date, distance=distance, duration=duration, user_id=current_user.id)
    db.session.add(run)
    db.session.commit()
    flash("Run added!", "success")
    return redirect(url_for("main.dashboard"))

@main.route("/delete/<int:run_id>", methods=["POST"])
@login_required
def delete_run(run_id):
    run = Run.query.get_or_404(run_id)
    if run.author != current_user:
        flash("You cannot delete this run.", "danger")
        return redirect(url_for("main.dashboard"))
    db.session.delete(run)
    db.session.commit()
    flash("Run deleted.", "success")
    return redirect(url_for("main.dashboard"))

# ------------------ AJAX: RUNS DATA ------------------
@main.route("/runs-data")
@login_required
def runs_data():
    runs = Run.query.filter_by(user_id=current_user.id).all()
    data = []
    for run in runs:
        data.append({
            "id": run.id,
            "date": run.date.strftime("%Y-%m-%d"),
            "distance": run.distance,
            "duration": run.duration
        })
    return jsonify(data)
# ------------------ RUN DETAILS ------------------
@main.route("/run/<int:run_id>")
def run_detail(run_id):
    run = Run.query.get_or_404(run_id)

    return render_template(
        "run_detail.html",
        run={
            "id": run.id,
            "date": run.date.strftime("%Y-%m-%d"),
            "distance": run.distance,
            "duration": run.duration,
            "username": getattr(run, "username", None)
        }
    )