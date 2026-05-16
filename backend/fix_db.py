import sys
import os
sys.path.append(os.path.dirname(__file__))

from app.core.database import SessionLocal
from app.models.user import User
from app.core.security import get_password_hash

db = SessionLocal()
user = db.query(User).filter(User.email == 'shanvi@gmail.com').first()
if user:
    # Set it to the password the user probably used, let's just assume "shanvi" based on the 6 dots
    user.password = get_password_hash('shanvi')
    db.commit()
    print("Password updated for shanvi@gmail.com to 'shanvi'!")
else:
    print("User not found!")
db.close()
