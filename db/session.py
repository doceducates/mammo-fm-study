"""SQLAlchemy Database Session Configuration.

Supports local SQLite database (default: sqlite:///data/study.db) and seamless
switch to PostgreSQL / Supabase when DATABASE_URL is set in .env.
"""
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# 1. Determine Database Connection String
DEFAULT_DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "study.db")
os.makedirs(os.path.dirname(DEFAULT_DB_PATH), exist_ok=True)
DEFAULT_SQLITE_URL = f"sqlite:///{DEFAULT_DB_PATH}"

DATABASE_URL = os.environ.get("DATABASE_URL", DEFAULT_SQLITE_URL)

# Fix Heroku/Supabase postgres:// scheme if needed
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# 2. Create Engine
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, connect_args=connect_args, pool_pre_ping=True)

# 3. Create SessionLocal factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 4. Declarative Base for ORM models
Base = declarative_base()


def init_db():
    """Create all ORM tables if they do not exist."""
    Base.metadata.create_all(bind=engine)


def get_db():
    """Dependency for API routes to get a database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

