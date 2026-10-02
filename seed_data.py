from database import Base, SessionLocal, engine
from models import MenuItem, Restaurant


RESTAURANTS = [
    {
        "name": "Dosa Corner",
        "cuisine": "South Indian",
        "description": "Crispy dosas, fresh chutneys, and comforting breakfasts.",
        "area": "College Road",
        "delivery_minutes": 25,
        "delivery_fee": 25,
        "rating": 4.7,
        "image_url": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS9u8ujXg14lnDchEQjQ-DJ_hpIuafO09m_3D7GMmToIX41HhGXq3DrMng&s=10",
        "menu": [
            ("Masala Dosa", "Golden dosa with potato masala and coconut chutney.", "Dosa", 120),
            ("Idli Sambar", "Soft idlis served with warm sambar.", "Breakfast", 80),
            ("Paneer Dosa", "Crisp dosa filled with spiced paneer.", "Dosa", 150),
        ],
    },
    {
        "name": "Little Italy",
        "cuisine": "Italian",
        "description": "Easy-going pizzas and pasta made fresh to order.",
        "area": "Market Square",
        "delivery_minutes": 35,
        "delivery_fee": 35,
        "rating": 4.5,
        "image_url": "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=900&q=80",
        "menu": [
            ("Margherita Pizza", "Tomato, mozzarella, and basil.", "Pizza", 220),
            ("Penne Alfredo", "Creamy white sauce pasta with herbs.", "Pasta", 240),
            ("Garlic Bread", "Toasted bread with garlic butter.", "Sides", 110),
        ],
    },
    {
        "name": "Curry Leaf Kitchen",
        "cuisine": "Indian",
        "description": "Home-style thalis and North Indian favourites.",
        "area": "University Lane",
        "delivery_minutes": 30,
        "delivery_fee": 20,
        "rating": 4.8,
        "image_url": "https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=900&q=80",
        "menu": [
            ("Paneer Butter Masala", "Paneer in a mild, creamy tomato gravy.", "Main course", 210),
            ("Veg Biryani", "Fragrant rice with vegetables and raita.", "Rice", 180),
            ("Butter Naan", "Soft naan brushed with butter.", "Sides", 45),
        ],
    },
    {
        "name": "Green Fork",
        "cuisine": "Healthy bowls",
        "description": "Fresh bowls, colourful salads, and light lunches.",
        "area": "Library Street",
        "delivery_minutes": 20,
        "delivery_fee": 15,
        "rating": 4.6,
        "image_url": "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=900&q=80",
        "menu": [
            ("Roasted Veg Bowl", "Roasted seasonal vegetables with herbed rice.", "Bowls", 190),
            ("Paneer Salad", "Grilled paneer with greens and lemon dressing.", "Salads", 175),
            ("Fruit Yogurt Cup", "Yogurt topped with fresh fruit and granola.", "Dessert", 95),
        ],
    },
]


def seed_database():
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        if db.query(Restaurant).first():
            return

        for restaurant_data in RESTAURANTS:
            menu = restaurant_data["menu"]
            restaurant = Restaurant(**{key: value for key, value in restaurant_data.items() if key != "menu"})
            restaurant.menu_items = [
                MenuItem(name=name, description=description, category=category, price=price)
                for name, description, category, price in menu
            ]
            db.add(restaurant)

        db.commit()


if __name__ == "__main__":
    seed_database()
