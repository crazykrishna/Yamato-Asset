from fastapi import FastAPI, HTTPException, status, Body, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import os
import pandas as pd
import math
from sqlalchemy import text, inspect

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

        # FIXED ROUTING MAP MATCHING YOUR CHOICE EXACTLY:
        if db_name == "assets":
            table_name = "totalassets"      # Asset List -> Assets DB -> totalassets
        elif db_name == "registeredassets":
            table_name = "currentassets"    # Inventory -> Registeredassets -> currentassets
        else:
            raw_filename = os.path.splitext(file.filename)[0]
            table_name = raw_filename.replace(" ", "_").replace("-", "_").lower()

        if file.filename.endswith('.csv'):
            df = pd.read_csv(file_location)
        else:
            df = pd.read_excel(file_location)

        df.columns = [c.strip().replace(" ", "_").replace("-", "_").lower() for c in df.columns]

        df.to_sql(table_name, con=engines[db_name], if_exists="replace", index=False)
        export_db_to_sql()

        return {
            "message": f"Successfully processed spreadsheet and mapped data to '{table_name}' table!",
            "table_created": table_name,
            "rows_inserted": len(df)
        }
    except Exception as e:
        print("!!! CRITICAL BACKEND ERROR !!!:", str(e))
        raise HTTPException(status_code=500, detail=f"Database Engine Error: {str(e)}")

# 1. FIXED INVENTORY FETCH: Reads currentassets from registeredassets database with NaN handling
@app.get("/api/assets")
def get_assets():
    try:
        inspector = inspect(engines["registeredassets"])
        if not inspector.has_table("currentassets"):
            print("--- INFO: currentassets table does not exist in DB yet. Returning empty list. ---")
            return []

        df = pd.read_sql_table("currentassets", con=engines["registeredassets"])
        raw_data = df.to_dict(orient="records")
        
        cleaned_data = [
            {
                key: (None if isinstance(val, float) and math.isnan(val) else val)
                for key, val in row.items()
            }
            for row in raw_data
        ]
        return cleaned_data
    except Exception as e:
        print("!!! INVENTORY FETCH CRASH !!!:", str(e))
        raise HTTPException(status_code=500, detail=f"Database error occurred: {str(e)}")

# 2. FIXED ASSETS LIST FETCH: Reads totalassets out of assets database with NaN handling
@app.get("/api/regAssets")
def get_registered_assets():
    try:
        inspector = inspect(engines["assets"])
        if not inspector.has_table("totalassets"):
            print("--- INFO: totalassets table does not exist in Assets DB yet. ---")
            return []

        df = pd.read_sql_table("totalassets", con=engines["assets"])
        raw_data = df.to_dict(orient="records")

        cleaned_data = [
            {
                key: (None if isinstance(val, float) and math.isnan(val) else val)
                for key, val in row.items()
            }
            for row in raw_data
        ]
        return cleaned_data
    except Exception as e:
        print("!!! ASSETS FETCH CRASH !!!:", str(e))
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

@app.get("/api/employee")
def get_employees():
    try:
        df = pd.read_sql_table("yamatoemployee", con=engines["employee"])
        df = df.where(pd.notnull(df), None)
        return df.to_dict(orient="records")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error occurred: {str(e)}")

@app.get("/api/assigned-assets")
def get_assigned_assets():
    try:
        inspector = inspect(engines["assets"])
        if not inspector.has_table("totalassets"):
            return []

        query = text("""
            SELECT 
                a.*,
                e.email,
                e.mob_number AS phone_number
            FROM totalassets a 
            LEFT JOIN employee.yamatoemployee e ON a.assigned_to = e.name
        """)
        with engines["assets"].connect() as connection:
            result = connection.execute(query)
            rows = [dict(row) for row in result.mappings().all()]
        return rows
    except Exception as e:
        print("!!! ASSIGNED ASSETS CROSS JOIN ERROR !!!:", str(e))
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

# 1. Declare verification payload input structure schema
class PurgeVerificationSchema(BaseModel):
    security_key: str

# 2. Secure dynamic table drop endpoint engine
@app.delete("/api/purge-table/{db_name}/{table_name}")
def purge_database_table(db_name: str, table_name: str, payload: PurgeVerificationSchema):
    # CRITICAL MASTER KEY: Set your super secret confirmation password right here!
    ADMIN_MASTER_KEY = "YamatoAdmin2026"

    # Verify if the engine exists
    if db_name not in engines:
        raise HTTPException(status_code=400, detail=f"Database target '{db_name}' is not configured.")
    
    # Check Gate Two: Admin Secret Key Password Matching Sequence
    if payload.security_key != ADMIN_MASTER_KEY:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid administrator master key password. Deletion aborted.")

    try:
        # Build clean direct DROP TABLE command dynamically
        # Using string replacement here because table names cannot be parameterized in SQL queries
        safe_table = table_name.strip().lower()
        query_string = f"DROP TABLE IF EXISTS {safe_table};"

        with engines[db_name].connect() as connection:
            connection.execute(text(query_string))
            connection.commit()
            
        return {
            "success": True,
            "message": f"Table '{table_name}' has been completely dropped from database '{db_name}'."
        }
    except Exception as e:
        print("!!! DELETION ROUTE SYSTEM CRASH !!!:", str(e))
        raise HTTPException(status_code=500, detail=f"MySQL execution failure during table drop operation: {str(e)}")

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
            with engines["assets"].connect() as connection:
                connection.execute(text(asset_query), asset_payload)
                connection.commit()

        return {"success": True, "message": "Assignment synchronized successfully."}
    except Exception as e:
        print("!!! SYNCHRONIZATION UPDATE ERROR !!!:", str(e))
        raise HTTPException(status_code=500, detail=f"Database write failure: {str(e)}")
    

@app.get('/api/assets/count')
def get_total_assets_count():
    try:
        query = text("SELECT COUNT(assetid) FROM currentassets")

        with engines['registeredassets'].connect() as connection:
            result_count = connection.execute(query).scalar()

        return {'success': True, "total_assets": result_count or 0}
    
    except Exception as e:
        print("!!! DASHBOARD COUNT ENGINE ERROR !!!:", str(e))
        raise HTTPException(status_code=500, detail=f"Database aggregation failure: {str(e)}")
    

@app.get("/api/assets/status-distribution")
def get_asset_status_distribution():
    try:
        # Group metrics by status from your active inventory table
        query = text("""
            SELECT assettype, COUNT(assetid) as total 
            FROM currentassets 
            GROUP BY assettype
        """)
        
        with engines["registeredassets"].connect() as connection:
            result = connection.execute(query).fetchall()
            
        # Format the SQL response into a clean key-value pair dictionary
        distribution = {row[0] if row[0] else "Unknown": row[1] for row in result}
        return {"success": True, "distribution": distribution}
        
    except Exception as e:
        print("!!! STATUS GRAPH AGGREGATION ERROR !!!:", str(e))
        raise HTTPException(status_code=500, detail=str(e))
    

# 1. Fetch Current Active Assets Count
@app.get("/api/assets/active-count")
def get_active_assets_count():
    try:
        # Counts only assets where status is 'In Use' or 'Active'
        query = text("""
            SELECT COUNT(assetid) FROM currentassets 
            WHERE LOWER(status) IN ('in use', 'active')
        """)
        with engines["registeredassets"].connect() as connection:
            result_count = connection.execute(query).scalar()
        return {"success": True, "active_assets": result_count or 0}
    except Exception as e:
        print("!!! ACTIVE COUNT ERROR !!!:", str(e))
        raise HTTPException(status_code=500, detail=str(e))

# 2. Fetch Total Unique Categories Count
@app.get("/api/assets/categories-count")
def get_unique_categories_count():
    try:
        # Counts how many distinct asset types exist in your database
        query = text("SELECT COUNT(DISTINCT assettype) FROM currentassets WHERE assettype IS NOT NULL AND assettype != ''")
        with engines["registeredassets"].connect() as connection:
            result_count = connection.execute(query).scalar()
        return {"success": True, "total_categories": result_count or 0}
    except Exception as e:
        print("!!! CATEGORIES COUNT ERROR !!!:", str(e))
        raise HTTPException(status_code=500, detail=str(e))
    


@app.put("/api/assets/update")
def update_inventory_asset_dynamic(payload: dict = Body(...)):
    try:
        # 1. Pull the primary key identifiers. Safely check both cases.
        asset_id = payload.get("assetId") or payload.get("assetid")
        if not asset_id:
            raise HTTPException(status_code=400, detail="Missing required 'assetId' field.")

        update_pairs = []
        sql_params = {"asset_id": asset_id}

        # 2. DYNAMIC LOOP: Build columns and values on the fly from whatever frontend sends!
        for key, value in payload.items():
            # Skip the tracking ID keys since they belong in the WHERE clause, not the SET clause
            if key in ["assetId", "assetid"]:
                continue
            
            # Map frontend keys straight to database column rules
            column_name = key.strip().lower()
            update_pairs.append(f"{column_name} = :{column_name}")
            sql_params[column_name] = value

        if not update_pairs:
            raise HTTPException(status_code=400, detail="No updated parameters provided.")

        # 3. Assemble the universal query string
        query_string = f"""
            UPDATE currentassets 
            SET {', '.join(update_pairs)} 
            WHERE assetid = :asset_id
        """

        # 4. Commit changes to your unified registeredassets core engine
        with engines["registeredassets"].connect() as connection:
            result = connection.execute(text(query_string), sql_params)
            connection.commit()
            
            if result.rowcount == 0:
                raise HTTPException(status_code=404, detail="Asset ID not found in database.")

        return {
            "success": True, 
            "message": "Database dynamically adapted and updated successfully!",
            "updated_fields": list(sql_params.keys())
        }
    except Exception as e:
        print("!!! DYNAMIC ROW UPDATE ERROR !!!:", str(e))
        raise HTTPException(status_code=500, detail=f"Database update failure: {str(e)}")