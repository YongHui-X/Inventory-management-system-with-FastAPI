from fastapi import FastAPI, Depends
from models import Product
from database import SessionLocal, engine
from database_models import Product as DBProduct
import database_models
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

app = FastAPI()

#give permission
app.add_middleware(
    CORSMiddleware,
    #where u want to allow it
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"] #accept all methods
)

#Creates tables in your database (if they don’t exist)
database_models.Base.metadata.create_all(bind=engine)

products = [
    Product(id=1, name="phone", description="Budget smartphone with 4G", price=99, quantity=10),
    Product(id=2, name="laptop", description="Gaming laptop with RTX GPU", price=989, quantity=6),
    Product(id=3, name="pen", description="Blue ink ballpoint pen", price=7, quantity=25),
    Product(id=4, name="notebook", description="A5 ruled notebook, 200 pages", price=15, quantity=40),
    Product(id=5, name="headphones", description="Wireless over-ear headphones", price=120, quantity=8),
    Product(id=6, name="mouse", description="Wireless optical mouse", price=25, quantity=18),
    Product(id=7, name="keyboard", description="Mechanical keyboard, RGB backlight", price=55, quantity=12),
    Product(id=8, name="monitor", description="24-inch Full HD monitor", price=150, quantity=7),
    Product(id=9, name="backpack", description="Laptop backpack, waterproof", price=45, quantity=20),
    Product(id=10, name="water bottle", description="Stainless steel, 1L", price=20, quantity=30)
]

@app.get('/')
def greet():
    return "Welcome to Inventrack"

def init_db():
    db = SessionLocal() 

    count = db.query(database_models.Product).count()

    if count == 0:
        for product in products:
            db.add(database_models.Product(**product.model_dump()))
    db.commit()

init_db()

def get_db():  
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def single_query(id: int, db: Session):
    return db.query(database_models.Product).filter(database_models.Product.id == id).first()

@app.get('/products/')
def get_all_products(db: Session = Depends(get_db)):
    #get all products
    db_products = db.query(database_models.Product).all()
    return db_products

@app.get("/products/{id}")
def get_product_by_id(id: int, db: Session = Depends(get_db)):
    #if multiple items, take first one
    db_product = db.query(database_models.Product).filter(database_models.Product.id == id).first()
    
    if db_product:
        return db_product
    return "product not found"

@app.post("/products/")
def add_product(product: Product, db: Session = Depends(get_db)):
    db.add(database_models.Product(**product.model_dump()))
    db.commit()
    return product

@app.put("/products/{id}")
def update_product(id: int, product: Product, db: Session = Depends(get_db)):
    #check if product exist
    db_product = db.query(database_models.Product).filter(database_models.Product.id == id).first()
    if db_product:
        db_product.name = product.name
        db_product.description = product.description
        db_product.price = product.price
        db_product.quantity = product.quantity
        db.commit()
        return "Product updated"
    else:
        return "Product not found"

@app.delete("/products/{id}")
def delete_product(id: int, db: Session = Depends(get_db)):
    db_product = single_query(id, db)
    if db_product:
        db.delete(db_product)
        db.commit()
        return "Product deleted"
    return "Product not found"

