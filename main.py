from pathlib import Path

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session, joinedload

from database import SessionLocal
from models import FoodOrder, MenuItem, OrderItem, Restaurant
from schemas import OrderCreate, OrderResponse, OrderStatusUpdate, RestaurantResponse, MenuItemResponse
from seed_data import seed_database

PROJECT_DIR = Path(__file__).resolve().parent
FRONTEND_DIR = PROJECT_DIR / "frontend"

seed_database()

app = FastAPI(
    title="Campus Bites API",
    description="A small restaurant, menu, and food ordering API.",
    version="1.0.0",
)
app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_order_or_404(order_id: int, db: Session) -> FoodOrder:
    order = (
        db.query(FoodOrder)
        .options(joinedload(FoodOrder.restaurant), joinedload(FoodOrder.items))
        .filter(FoodOrder.id == order_id)
        .first()
    )
    if order is None:
        raise HTTPException(status_code=404, detail="Order not found")
    return order


@app.get("/", include_in_schema=False)
def home():
    return FileResponse(FRONTEND_DIR / "index.html")


@app.get("/health")
def health_check():
    return {"status": "healthy"}


@app.get("/restaurants", response_model=list[RestaurantResponse])
def list_restaurants(
    search: str | None = None,
    cuisine: str | None = None,
    db: Session = Depends(get_db),
):
    query = db.query(Restaurant)
    if search:
        query = query.filter(Restaurant.name.ilike(f"%{search}%"))
    if cuisine:
        query = query.filter(Restaurant.cuisine == cuisine)
    return query.order_by(Restaurant.name).all()


@app.get("/restaurants/{restaurant_id}", response_model=RestaurantResponse)
def get_restaurant(restaurant_id: int, db: Session = Depends(get_db)):
    restaurant = db.query(Restaurant).filter(Restaurant.id == restaurant_id).first()
    if restaurant is None:
        raise HTTPException(status_code=404, detail="Restaurant not found")
    return restaurant


@app.get("/restaurants/{restaurant_id}/menu", response_model=list[MenuItemResponse])
def get_restaurant_menu(
    restaurant_id: int,
    category: str | None = None,
    db: Session = Depends(get_db),
):
    restaurant = db.query(Restaurant.id).filter(Restaurant.id == restaurant_id).first()
    if restaurant is None:
        raise HTTPException(status_code=404, detail="Restaurant not found")

    query = db.query(MenuItem).filter(MenuItem.restaurant_id == restaurant_id, MenuItem.is_available.is_(True))
    if category:
        query = query.filter(MenuItem.category == category)
    return query.order_by(MenuItem.category, MenuItem.name).all()


@app.post("/orders", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
def place_order(order_data: OrderCreate, db: Session = Depends(get_db)):
    item_quantities = {}
    for item in order_data.items:
        item_quantities[item.menu_item_id] = item_quantities.get(item.menu_item_id, 0) + item.quantity

    menu_items = (
        db.query(MenuItem)
        .filter(MenuItem.id.in_(item_quantities), MenuItem.is_available.is_(True))
        .all()
    )
    if len(menu_items) != len(item_quantities):
        raise HTTPException(status_code=400, detail="One or more menu items are unavailable")

    restaurant_ids = {item.restaurant_id for item in menu_items}
    if len(restaurant_ids) != 1:
        raise HTTPException(status_code=400, detail="An order can only include items from one restaurant")

    restaurant_id = next(iter(restaurant_ids))
    restaurant = db.query(Restaurant).filter(Restaurant.id == restaurant_id).first()
    food_total = sum(item.price * item_quantities[item.id] for item in menu_items)
    order = FoodOrder(
        restaurant_id=restaurant_id,
        customer_name=order_data.customer_name.strip(),
        phone=order_data.phone.strip(),
        delivery_address=order_data.delivery_address.strip(),
        total=round(food_total + restaurant.delivery_fee, 2),
        items=[
            OrderItem(
                menu_item_id=item.id,
                item_name=item.name,
                unit_price=item.price,
                quantity=item_quantities[item.id],
            )
            for item in menu_items
        ],
    )
    db.add(order)
    db.commit()
    return get_order_or_404(order.id, db)


@app.get("/orders", response_model=list[OrderResponse])
def list_orders(db: Session = Depends(get_db)):
    return (
        db.query(FoodOrder)
        .options(joinedload(FoodOrder.restaurant), joinedload(FoodOrder.items))
        .order_by(FoodOrder.created_at.desc())
        .all()
    )


@app.get("/orders/{order_id}", response_model=OrderResponse)
def get_order(order_id: int, db: Session = Depends(get_db)):
    return get_order_or_404(order_id, db)


@app.patch("/orders/{order_id}/status", response_model=OrderResponse)
def update_order_status(
    order_id: int,
    status_data: OrderStatusUpdate,
    db: Session = Depends(get_db),
):
    order = get_order_or_404(order_id, db)
    allowed_next = {
        "Pending": {"Preparing"},
        "Preparing": {"Out for delivery"},
        "Out for delivery": {"Delivered"},
    }
    if status_data.status not in allowed_next.get(order.status, set()):
        raise HTTPException(status_code=409, detail=f"Order cannot move from {order.status} to {status_data.status}")

    order.status = status_data.status
    db.commit()
    return get_order_or_404(order.id, db)


@app.delete("/orders/{order_id}", response_model=OrderResponse)
def cancel_order(order_id: int, db: Session = Depends(get_db)):
    order = get_order_or_404(order_id, db)
    if order.status != "Pending":
        raise HTTPException(status_code=409, detail="Only pending orders can be cancelled")

    order.status = "Cancelled"
    db.commit()
    return get_order_or_404(order.id, db)
