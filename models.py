from datetime import datetime
from uuid import uuid4

from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from database import Base


class Restaurant(Base):
    __tablename__ = "restaurants"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(120), nullable=False)
    cuisine = Column(String(60), nullable=False)
    description = Column(String(255), nullable=False)
    area = Column(String(120), nullable=False)
    delivery_minutes = Column(Integer, nullable=False, default=30)
    delivery_fee = Column(Float, nullable=False, default=0)
    rating = Column(Float, nullable=False, default=4.5)
    image_url = Column(String(500), nullable=False)

    menu_items = relationship("MenuItem", back_populates="restaurant", cascade="all, delete-orphan")


class MenuItem(Base):
    __tablename__ = "menu_items"

    id = Column(Integer, primary_key=True, index=True)
    restaurant_id = Column(Integer, ForeignKey("restaurants.id"), nullable=False)
    name = Column(String(120), nullable=False)
    description = Column(String(255), nullable=False)
    category = Column(String(60), nullable=False)
    price = Column(Float, nullable=False)
    is_available = Column(Boolean, nullable=False, default=True)

    restaurant = relationship("Restaurant", back_populates="menu_items")


class FoodOrder(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    order_number = Column(String(16), unique=True, nullable=False, default=lambda: f"CB-{uuid4().hex[:7].upper()}")
    restaurant_id = Column(Integer, ForeignKey("restaurants.id"), nullable=False)
    customer_name = Column(String(120), nullable=False)
    phone = Column(String(30), nullable=False)
    delivery_address = Column(String(255), nullable=False)
    status = Column(String(30), nullable=False, default="Pending")
    total = Column(Float, nullable=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    restaurant = relationship("Restaurant")
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")


class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    menu_item_id = Column(Integer, ForeignKey("menu_items.id", ondelete="SET NULL"), nullable=True)
    item_name = Column(String(120), nullable=False)
    unit_price = Column(Float, nullable=False)
    quantity = Column(Integer, nullable=False)

    order = relationship("FoodOrder", back_populates="items")

    @property
    def subtotal(self):
        return round(self.unit_price * self.quantity, 2)
