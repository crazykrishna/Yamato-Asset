from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import pandas as pd
from database import engine


app = FastAPI()

class AssetDetails(BaseModel):
    portal_username : str
    portal_password : str

@app.post('/app/users/register')
async def add_user(asset: AssetDetails ):
    try:
        username = asset.portal_username
        password = asset.portal_password

        query = "INSERT INTO LOGIN(username, password) VALUES (? , ?) RETURNING *"

        result = await engine.fetchrow(query, username, password)

        return(result)
    
    except Exception as e:
        print(f"Error occured : {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")