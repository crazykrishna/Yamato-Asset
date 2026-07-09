from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# 1. Define the location of the SQLite database file
# This will automatically create an 'assets.db' file inside your backend folder
# Format: mysql+pymysql://username:password@localhost:3306/database_name
SQLALCHEMY_DATABASE_URL1 = "mysql+pymysql://root:radheradhe@localhost:3306/yamato_assets"
SQLALCHEMY_DATABASE_URL2= "mysql+pymysql://root:radheradhe@localhost:3306/login"
SQLALCHEMY_DATABASE_URL3 = "mysql+pymysql://root:radheradhe@localhost:3306/employee"
SQLALCHEMY_DATABASE_URL4 = "mysql+pymysql://root:radheradhe@localhost:3306/registeredassets"
SQLALCHEMY_DATABASE_URL5 = "mysql+pymysql://root:radheradhe@localhost:3306/assets"


# 2. Create the database engine
# OLD CRASHING CODE:
# engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})

# NEW CORRECTED CODE:
engine1 = create_engine(SQLALCHEMY_DATABASE_URL1)
engine2 = create_engine(SQLALCHEMY_DATABASE_URL2)
engine3 = create_engine(SQLALCHEMY_DATABASE_URL3)
engine4 = create_engine(SQLALCHEMY_DATABASE_URL4)
engine5 = create_engine(SQLALCHEMY_DATABASE_URL5)

# 3. Create a SessionLocal class for talking to the database
SessionLocal1 = sessionmaker(autocommit=False, autoflush=False, bind=engine1)
SessionLocal2 = sessionmaker(autocommit=False, autoflush=False, bind=engine2)
SessionLocal3 = sessionmaker(autocommit=False, autoflush=False, bind=engine3)
SessionLocal4 = sessionmaker(autocommit=False, autoflush=False, bind=engine4)
SessionLocal5 = sessionmaker(autocommit=False, autoflush=False, bind=engine5)

# Add this at the bottom of database.py
engines = {
    "yamato_assets": engine1,
    "login": engine2,
    "employee": engine3,
    "registeredassets": engine4,
    "assets": engine5
}


# 4. Create a Base class that our future data models will inherit from
Base = declarative_base()