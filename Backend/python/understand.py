from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import pandas as pd
from sqlalchemy import text
from database import engines


app = FastAPI()

class AssetDetails(BaseModel):
    portal_username : str
    portal_password : str

@app.post('/app/users/register')
def add_user(asset: AssetDetails):
    try:
        username = asset.portal_username
        password = asset.portal_password

        with engines["yamato_assets"].connect() as connection:
            result = connection.execute(
                text("INSERT INTO LOGIN(username, password) VALUES (:username, :password)"),
                {"username": username, "password": password}
            )
            connection.commit()

        return {"message": "User registered successfully.", "username": username}
    
    except Exception as e:
        print(f"Error occured : {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")