from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class RestaurantResponse(BaseModel):
    id: int
    name: str
    cuisine: str
    description: str
    area: str
    delivery_minutes: int
    delivery_fee: float
    rating: float
    image_url: str

    model_config = ConfigDict(from_attributes=True)


class MenuItemResponse(BaseModel):
    id: int
    restaurant_id: int
    name: str
    description: str
    category: str
    price: float
    is_available: bool

    model_config = ConfigDict(from_attributes=True)


class OrderItemCreate(BaseModel):
    menu_item_id: int
    quantity: int = Field(ge=1, le=20)


class OrderCreate(BaseModel):
    customer_name: str = Field(min_length=2, max_length=120)
    phone: str = Field(min_length=7, max_length=30)
    delivery_address: str = Field(min_length=5, max_length=255)
    items: list[OrderItemCreate] = Field(min_length=1)


class OrderItemResponse(BaseModel):
    id: int
    item_name: str
    unit_price: float
    quantity: int
    subtotal: float

    model_config = ConfigDict(from_attributes=True)


class OrderResponse(BaseModel):
    id: int
    order_number: str
    restaurant_id: int
    customer_name: str
    phone: str
    delivery_address: str
    status: Literal["Pending", "Preparing", "Out for delivery", "Delivered", "Cancelled"]
    total: float
    created_at: datetime
    restaurant: RestaurantResponse
    items: list[OrderItemResponse]

    model_config = ConfigDict(from_attributes=True)


class OrderStatusUpdate(BaseModel):
    status: Literal["Preparing", "Out for delivery", "Delivered"]
