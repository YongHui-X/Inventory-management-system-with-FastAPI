from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine

db_url = "postgresql://postgres@localhost:5433/inventorysystem"
engine = create_engine(db_url)
SessionLocal = sessionmaker(autocommit= False, autoflush=False, bind=engine)