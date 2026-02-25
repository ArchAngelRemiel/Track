from app import db, login_manager
from flask_login import UserMixin
from datetime import datetime

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

class User(db.Model, UserMixin):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(150), unique=True, nullable=False)
    email = db.Column(db.String(150), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)
    runs = db.relationship("Run", backref="author", lazy=True)

class Run(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    distance = db.Column(db.Integer, nullable=False)   # meters
    duration = db.Column(db.Float(10), nullable=False)  # decimal minutes
    date = db.Column(db.DateTime, default=datetime.utcnow)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)