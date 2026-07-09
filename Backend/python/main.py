from fastapi import FastAPI, HTTPException, status, Body, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import os
import pandas as pd
import math
from sqlalchemy import text

# Import the mapped engines from your database.py
from database import engines 

app = FastAPI()

# Configuration for file uploads
UPLOAD_DIR = os.path.join(os.getcwd(), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

# ----------------------------------------------------
# DATA SCHEMAS
# ----------------------------------------------------
class EmployeeSchema(BaseModel):
    empId: str
    name: str
    email: str
    mob_number: Optional[str] = None
    department: Optional[str] = None
    designation: Optional[str] = None

class UserSchema(BaseModel):
    username: str
    password: str

class AssetSchema(BaseModel):
    name: str
    serialNo: str
    purchase_date: str
    asset_type: str
    status: str
    Remarks: Optional[str] = ""

class AssetUpdateSchema(BaseModel):
    assetId: int
    name: Optional[str] = None
    serialNo: Optional[str] = None
    purchase_date: Optional[str] = None
    asset_type: Optional[str] = None
    status: Optional[str] = None
    remarks: Optional[str] = None

class AssignedAssetUpdateSchema(BaseModel):
    assetId: int
    originalEmployeeName: Optional[str] = None
    name: Optional[str] = None
    asset_type: Optional[str] = None
    status: Optional[str] = None
    remarks: Optional[str] = None
    employee_name: Optional[str] = None

def export_db_to_sql():
    pass

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----------------------------------------------------
# ROUTES & LOGIC
# ----------------------------------------------------
@app.get("/")
def read_root():
    return {"status": "Backend is running flawlessly!", "message": "Hello World!"}

@app.get("/tables/{db_name}/{table_name}")
def get_table_data(db_name: str, table_name: str):
    if db_name not in engines:
        raise HTTPException(status_code=400, detail=f"Database '{db_name}' not configured.")
    try:
        df = pd.read_sql_table(table_name, con=engines[db_name])
        raw_data = df.to_dict(orient="records")
        cleaned_data = [
            {
                key: (None if isinstance(val, float) and math.isnan(val) else val)
                for key, val in row.items()
            }
            for row in raw_data
        ]
        return {"table": table_name, "data": cleaned_data}
    except Exception as e:
        print("!!! TABLE DATA ERROR !!!:", str(e))
        raise HTTPException(status_code=500, detail=f"Table error: {str(e)}")

@app.get("/tables/{db_name}")
def get_all_tables(db_name: str):
    if db_name not in engines:
        raise HTTPException(status_code=400, detail=f"Database '{db_name}' not configured.")
    try:
        with engines[db_name].connect() as connection:
            result = connection.execute(text("SHOW TABLES;"))
            tables = [row[0] for row in result.fetchall()]
        return {"tables": tables}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch tables: {str(e)}")

@app.post("/upload/{db_name}")
async def upload_excel_file(db_name: str, file: UploadFile = File(...)):
    if db_name not in engines:
        raise HTTPException(status_code=400, detail=f"Database '{db_name}' not configured.")
    if not file.filename.endswith(('.xlsx', '.xls', '.csv')):
        raise HTTPException(status_code=400, detail="Invalid file format.")
    
    try:
        file_location = os.path.join(UPLOAD_DIR, file.filename)
        with open(file_location, "wb") as f:
            f.write(await file.read())
            
        raw_filename = os.path.splitext(file.filename)[0]
        table_name = raw_filename.replace(" ", "_").replace("-", "_").lower()

        if file.filename.endswith('.csv'):
            df = pd.read_csv(file_location)
        else:
            df = pd.read_excel(file_location)

        df.columns = [c.strip().replace(" ", "_").replace("-", "_").lower() for c in df.columns]

        # FIXED: Removed the duplicate execution loop block
        df.to_sql(table_name, con=engines[db_name], if_exists="append", index=False)
        export_db_to_sql()

        return {
            "message": f"Successfully processed spreadsheet!",
            "table_created": table_name,
            "rows_inserted": len(df)
        }
    except Exception as e:
        print("!!! CRITICAL BACKEND ERROR !!!:", str(e))
        raise HTTPException(status_code=500, detail=f"Database Engine Error: {str(e)}")

@app.get("/api/users")
def get_users():
    try:
        with engines["login"].connect() as connection:
            result = connection.execute(text("SELECT * FROM Login"))
            rows = [dict(row) for row in result.mappings().all()]
        return rows
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error occurred: {str(e)}")

@app.post("/api/users")
def create_user(user: UserSchema):
    try:
        with engines["login"].connect() as connection:
            connection.execute(
                text("INSERT INTO Login (Username, Password) VALUES (:username, :password)"),
                {"username": user.username, "password": user.password}
            )
            connection.commit()
        return {"message": "User added successfully!", "userId": user.username}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error occurred: {str(e)}")

@app.get("/api/assets")
def get_assets():
    try:
        df = pd.read_sql_table("currentassets", con=engines["yamato_assets"])
        df = df.where(pd.notnull(df), None)
        return df.to_dict(orient="records")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error occurred: {str(e)}")

@app.get("/api/employee")
def get_employees():
    try:
        df = pd.read_sql_table("yamatoemployee", con=engines["employee"])
        df = df.where(pd.notnull(df), None)
        return df.to_dict(orient="records")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error occurred: {str(e)}")

@app.get("/api/regAssets")
def get_registered_assets():
    try:
        df = pd.read_sql_table("totalassets", con=engines["registeredassets"])
        df = df.where(pd.notnull(df), None)
        return df.to_dict(orient="records")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error occurred: {str(e)}")

@app.get("/api/assigned-assets")
def get_assigned_assets():
    try:
        query = text("""
            SELECT 
                a.assetId,
                a.name AS asset_name,
                a.asset_type,
                a.status,
                DATE_FORMAT(a.purchase_date, '%d-%m-%y') AS purchase_date,
                a.assigned_to AS employee_name,
                e.email,
                e.mob_number AS phone_number,
                a.remarks
            FROM totalassets a 
            LEFT JOIN employee.yamatoemployee e ON a.assigned_to = e.name
        """)
        with engines["registeredassets"].connect() as connection:
            result = connection.execute(query)
            rows = [dict(row) for row in result.mappings().all()]
        return rows
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")

@app.post("/api/login")
def login_user(user: UserSchema):
    try:
        with engines["login"].connect() as connection:
            result = connection.execute(
                text("SELECT * FROM Login WHERE Username = :username"),
                {"username": user.username}
            )
            row = result.mappings().first()
            
        if not row:
            raise HTTPException(status_code=401, detail="Invalid username or password")
        
        user_data = dict(row)
        db_password = user_data.get("Password") or user_data.get("password")
        if db_password != user.password:
            raise HTTPException(status_code=401, detail="Invalid Username or password")
            
        return {
            "success": True,
            "message": "Login successful!",
            "user": {
                "id": user_data.get("id"),
                "username": user_data.get("Username") or user_data.get("username")
            }
        }
    except HTTPException as http_ex:
        raise http_ex
    except Exception as e:
        raise HTTPException(status_code=500, detail="An internal server error occurred")

@app.put("/api/assets/update")
def update_asset_record(asset: AssetUpdateSchema):
    try:
        update_pairs = []
        payload = {"asset_id": asset.assetId}

        if asset.name is not None:
            update_pairs.append("name = :name")
            payload["name"] = asset.name
        if asset.serialNo is not None:
            update_pairs.append("serialNo = :serialNo")
            payload["serialNo"] = asset.serialNo
        if asset.purchase_date is not None:
            update_pairs.append("purchase_date = :purchase_date")
            payload["purchase_date"] = asset.purchase_date
        if asset.asset_type is not None:
            update_pairs.append("asset_type = :asset_type")
            payload["asset_type"] = asset.asset_type
        if asset.status is not None:
            update_pairs.append("status = :status")
            payload["status"] = asset.status
        if asset.remarks is not None:
            update_pairs.append("Remarks = :remarks")
            payload["remarks"] = asset.remarks

        if not update_pairs:
            raise HTTPException(status_code=400, detail="No field parameters supplied for update operation.")

        query_string = f"""
            UPDATE totalassets 
            SET {', '.join(update_pairs)} 
            WHERE assetId = :asset_id
        """

        with engines["registeredassets"].connect() as connection:
            result = connection.execute(text(query_string), payload)
            connection.commit()
            
            if result.rowcount == 0:
                raise HTTPException(status_code=404, detail="Asset record reference ID not found.")

        return {"success": True, "message": "Asset information successfully modified."}

    except HTTPException as http_ex:
        raise http_ex
    except Exception as e:
        print("!!! ROW UPDATE ERROR !!!:", str(e))
        raise HTTPException(status_code=500, detail=f"Database persistent write error: {str(e)}")

@app.post("/api/assets", status_code=201)
def add_asset_manually(asset: AssetSchema):
    try:
        query = text("""
            INSERT INTO Assets (name, serialNo, purchase_date, asset_type, status, Remarks) 
            VALUES (:name, :serialNo, :purchase_date, :asset_type, :status, :remarks)
        """)
        with engines["assets"].connect() as connection:
            connection.execute(query, {
                "name": asset.name,
                "serialNo": asset.serialNo,
                "purchase_date": asset.purchase_date,
                "asset_type": asset.asset_type,
                "status": asset.status,
                "remarks": asset.Remarks
            })      
            connection.commit()
        return {"success": True, "message": "Asset successfully written to database."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database query processing error: {str(e)}")

@app.post("/api/users/employee", status_code=201)
def add_new_employee_record(emp: EmployeeSchema):
    try:
        query = text("""
            INSERT INTO yamatoemployee (empId, name, email, mob_number, department, designation) 
            VALUES (:emp_id, :name, :email, :mob_number, :department, :designation)
        """)
        with engines["employee"].connect() as connection:
            connection.execute(query, {
                "emp_id": emp.empId,
                "name": emp.name,
                "email": emp.email,
                "mob_number": emp.mob_number,
                "department": emp.department,
                "designation": emp.designation
            })      
            connection.commit()
        return {"success": True, "message": "Employee record successfully saved to the employee database."}
    except Exception as e:
        print("!!! EMPLOYEE INSERTION ERROR !!!:", str(e))
        raise HTTPException(status_code=500, detail=f"Database write failure: {str(e)}")

@app.post("/api/regAssets", status_code=201)
def add_registered_asset(asset: AssetSchema):
    try:
        query = text("""
            INSERT INTO totalassets (name, serialNo, purchase_date, asset_type, status, Remarks) 
            VALUES (:name, :serialNo, :purchase_date, :asset_type, :status, :remarks)
        """)
        with engines["registeredassets"].connect() as connection:
            connection.execute(query, {
                "name": asset.name,
                "serialNo": asset.serialNo,
                "purchase_date": asset.purchase_date,
                "asset_type": asset.asset_type,
                "status": asset.status,
                "remarks": asset.Remarks
            })      
            connection.commit()
        return {"success": True, "message": "Asset successfully logged to registry."}
    except Exception as e:
        print("!!! REGISTRATION ENDPOINT ERROR !!!:", str(e))
        raise HTTPException(status_code=500, detail=f"Database persistent logging failed: {str(e)}")

@app.put("/api/assigned-assets/update")
def update_assigned_asset_record(asset: AssignedAssetUpdateSchema = Body(...)):
    try:
        asset_pairs = []
        asset_payload = {"asset_id": asset.assetId}

        if asset.name is not None:
            asset_pairs.append("name = :name")
            asset_payload["name"] = asset.name
        if asset.asset_type is not None:
            asset_pairs.append("asset_type = :asset_type")
            asset_payload["asset_type"] = asset.asset_type
        if asset.status is not None:
            asset_pairs.append("status = :status")
            asset_payload["status"] = asset.status
        if asset.remarks is not None:
            asset_pairs.append("remarks = :remarks")
            asset_payload["remarks"] = asset.remarks
        if asset.employee_name is not None:
            asset_pairs.append("assigned_to = :assigned_to")
            asset_payload["assigned_to"] = asset.employee_name if asset.employee_name.strip() != "" else None

        if asset_pairs:
            asset_query = f"""
                UPDATE totalassets 
                SET {', '.join(asset_pairs)} 
                WHERE assetId = :asset_id
            """
            with engines["registeredassets"].connect() as connection:
                connection.execute(text(asset_query), asset_payload)
                connection.commit()

        return {"success": True, "message": "Assignment synchronized successfully."}
    except Exception as e:
        print("!!! SYNCHRONIZATION UPDATE ERROR !!!:", str(e))
        raise HTTPException(status_code=500, detail=f"Database write failure: {str(e)}")