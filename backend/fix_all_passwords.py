import sys
import os
sys.path.append(os.path.dirname(__file__))

from app.core.database import SessionLocal
from app.models.user import User
from app.core.security import get_password_hash

db = SessionLocal()
users = db.query(User).all()
updated_count = 0

for user in users:
    # If the password doesn't look like a bcrypt hash (starts with $2b$ or $2a$)
    if not user.password.startswith('$2b$') and not user.password.startswith('$2a$'):
        print(f"Found plain text password for {user.email}. Hashing it...")
        user.password = get_password_hash(user.password)
        updated_count += 1

if updated_count > 0:
    db.commit()
    print(f"Successfully hashed passwords for {updated_count} users.")
else:
    print("All passwords are already hashed properly.")

db.close()
