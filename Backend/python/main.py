from fastapi import FastAPI, HTTPException, status, Body, UploadFile, File
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import os
import io
import pandas as pd
import math
from datetime import datetime
from sqlalchemy import text, inspect
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
import bcrypt as _bcrypt
import hashlib, base64

# Import the mapped engines from your database.py
from database import engines

# ----------------------------------------------------
# PASSWORD HASHING (bcrypt direct — no passlib)
# passlib 1.7.4 is broken with bcrypt 5.0.0 due to
# the removed __about__ attribute. We call bcrypt directly.
# SHA-256 pre-hash keeps input at 44 bytes (< 72-byte limit).
# ----------------------------------------------------
def _preprocess(plain: str) -> bytes:
    """SHA-256 → base64 → bytes  (always 44 bytes, fits bcrypt limit)."""
    digest = hashlib.sha256(plain.encode("utf-8")).digest()
    return base64.b64encode(digest)

def hash_password(plain: str) -> str:
    """Return a bcrypt hash string for the given plain-text password."""
    hashed_bytes = _bcrypt.hashpw(_preprocess(plain), _bcrypt.gensalt())
    return hashed_bytes.decode("utf-8")

def verify_password(plain: str, hashed: str) -> bool:
    """Verify a bcrypt hash. Falls back to plain-text for legacy rows."""
    try:
        return _bcrypt.checkpw(_preprocess(plain), hashed.encode("utf-8"))
    except Exception:
        # Legacy plain-text fallback for rows inserted before hashing
        return plain == hashed

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
        hashed_pw = hash_password(user.password)
        with engines["login"].connect() as connection:
            connection.execute(
                text("INSERT INTO Login (Username, Password) VALUES (:username, :password)"),
                {"username": user.username, "password": hashed_pw}
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
        with engines["yamato_assets"].connect() as connection:
            result = connection.execute(
                text("SELECT * FROM login WHERE username = :username"),
                {"username": user.username}
            )
            row = result.mappings().first()
            
        if not row:
            raise HTTPException(status_code=401, detail="Invalid username or password")
        
        user_data = dict(row)
        db_password = user_data.get("password")

        # verify_password handles both bcrypt hashes and legacy plain-text
        if not verify_password(user.password, db_password):
            raise HTTPException(status_code=401, detail="Invalid username or password")
            
        return {
            "success": True,
            "message": "Login successful!",
            "user": {
                "id": user_data.get("id"),
                "username": user_data.get("username")
            }
        }
    except HTTPException as http_ex:
        raise http_ex
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ---- Password change schema ----
class ChangePasswordSchema(BaseModel):
    username: str
    current_password: str
    new_password: str

@app.put("/api/change-password")
def change_password(payload: ChangePasswordSchema):
    """Verifies the current password then saves a new bcrypt hash."""
    try:
        with engines["login"].connect() as connection:
            result = connection.execute(
                text("SELECT * FROM Login WHERE Username = :username"),
                {"username": payload.username}
            )
            row = result.mappings().first()

        if not row:
            raise HTTPException(status_code=404, detail="User not found.")

        user_data = dict(row)
        db_password = user_data.get("Password") or user_data.get("password")

        if not verify_password(payload.current_password, db_password):
            raise HTTPException(status_code=401, detail="Current password is incorrect.")

        new_hashed = hash_password(payload.new_password)
        with engines["login"].connect() as connection:
            connection.execute(
                text("UPDATE Login SET Password = :new_pw WHERE Username = :username"),
                {"new_pw": new_hashed, "username": payload.username}
            )
            connection.commit()

        return {"success": True, "message": "Password updated successfully!"}
    except HTTPException as http_ex:
        raise http_ex
    except Exception as e:
        print("!!! CHANGE PASSWORD ERROR !!!:", str(e))
        raise HTTPException(status_code=500, detail=f"Password update failed: {str(e)}")

# 1. Declare verification payload input structure schema
class PurgeVerificationSchema(BaseModel):
    security_key: str

# 2. Secure dynamic table drop endpoint engine
@app.delete("/api/purge-table/{db_name}/{table_name}")
def purge_database_table(db_name: str, table_name: str, payload: PurgeVerificationSchema):
    # CRITICAL MASTER KEY: Set your super secret confirmation password right here!
    ADMIN_MASTER_KEY = "Deepak@yamato@2022"

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
    


@app.get("/api/assets/total-value")
def get_total_inventory_value():
    """Sums the price column from currentassets and returns a formatted Indian-currency total."""
    import re
    try:
        inspector = inspect(engines["registeredassets"])
        if not inspector.has_table("currentassets"):
            return {"success": True, "total_value": 0, "formatted": "₹0"}

        columns = [col['name'].lower() for col in inspector.get_columns("currentassets")]
        if "price" not in columns:
            return {"success": True, "total_value": 0, "formatted": "₹0"}

        query = text("SELECT price FROM currentassets WHERE price IS NOT NULL AND price != ''")
        with engines["registeredassets"].connect() as connection:
            rows = connection.execute(query).fetchall()

        total = 0.0
        for row in rows:
            cleaned = re.sub(r'[^\d.]', '', str(row[0] or ''))
            try:
                total += float(cleaned) if cleaned else 0.0
            except Exception:
                pass

        # Format as Indian number system (e.g. ₹12,34,567)
        n = int(total)
        s = str(n)
        if len(s) <= 3:
            formatted = f"₹{s}"
        else:
            last3 = s[-3:]
            rest = s[:-3]
            groups = []
            while len(rest) > 2:
                groups.insert(0, rest[-2:])
                rest = rest[:-2]
            if rest:
                groups.insert(0, rest)
            formatted = f"₹{','.join(groups)},{last3}"

        return {"success": True, "total_value": total, "formatted": formatted}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/assets/depreciation")
def get_asset_depreciation(schedule: str = "1year"):
    """
    Returns asset counts for the depreciation chart.
      schedule='1year' → groups by status for the current year.
      schedule='5year' → groups by year (last 5 years) if a year column exists.
    Gracefully falls back when the schema is not fully populated yet.
    """
    try:
        current_year = datetime.now().year
        inspector = inspect(engines["registeredassets"])

        if not inspector.has_table("currentassets"):
            return {"success": True, "schedule": schedule, "labels": [], "values": []}

        columns = [col['name'].lower() for col in inspector.get_columns("currentassets")]

        # Try to detect a purchase-year column for the 5-year view
        year_col = None
        for candidate in ['purchase_year', 'year', 'purchaseyear', 'purchase_date', 'purchasedate']:
            if candidate in columns:
                year_col = candidate
                break

        with engines["registeredassets"].connect() as connection:
            if schedule == "5year" and year_col:
                start_year = current_year - 4
                query = text(f"""
                    SELECT {year_col} as yr, COUNT(*) as total
                    FROM currentassets
                    WHERE {year_col} BETWEEN :start AND :end
                    GROUP BY {year_col}
                    ORDER BY yr ASC
                """)
                result = connection.execute(query, {"start": start_year, "end": current_year}).fetchall()
                year_map = {str(r[0]): r[1] for r in result}
                # Fill missing years with 0
                all_years = [str(y) for y in range(start_year, current_year + 1)]
                labels = all_years
                values = [year_map.get(y, 0) for y in all_years]

            elif "status" in columns:
                # Group by status for current-year view
                query = text("SELECT status, COUNT(*) as total FROM currentassets GROUP BY status")
                result = connection.execute(query).fetchall()
                labels = [str(r[0] or "Unknown") for r in result]
                values = [r[1] for r in result]

            else:
                # Absolute fallback: total count attributed to current year
                total = connection.execute(text("SELECT COUNT(*) FROM currentassets")).scalar() or 0
                labels = [str(current_year)]
                values = [total]

        return {"success": True, "schedule": schedule, "labels": labels, "values": values}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


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


# ----------------------------------------------------
# PDF REPORT GENERATION ROUTES
# ----------------------------------------------------

def _fetch_assigned_assets_data() -> list:
    """Shared helper: fetches all employee-asset assignment records."""
    try:
        inspector = inspect(engines["assets"])
        if not inspector.has_table("totalassets"):
            return []
        query = text("""
            SELECT 
                a.assetId,
                a.name        AS asset_name,
                a.asset_type,
                a.status,
                a.purchase_date,
                a.assigned_to AS employee_name,
                e.email,
                e.mob_number  AS phone_number,
                e.department,
                a.remarks
            FROM totalassets a
            LEFT JOIN employee.yamatoemployee e ON a.assigned_to = e.name
        """)
        with engines["assets"].connect() as conn:
            rows = [dict(r) for r in conn.execute(query).mappings().all()]
        return rows
    except Exception as e:
        print("!!! REPORT DATA FETCH ERROR !!!:", str(e))
        raise HTTPException(status_code=500, detail=f"Data fetch error: {str(e)}")


def _build_pdf(title: str, columns: list, rows: list, subtitle: str = "") -> io.BytesIO:
    """Core PDF builder using ReportLab. Returns an in-memory PDF buffer."""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=1.5 * cm,
        leftMargin=1.5 * cm,
        topMargin=2 * cm,
        bottomMargin=2 * cm,
    )

    styles = getSampleStyleSheet()
    story = []

    # Title
    title_style = ParagraphStyle(
        "ReportTitle",
        parent=styles["Title"],
        fontSize=18,
        textColor=colors.HexColor("#1a237e"),
        spaceAfter=4,
    )
    story.append(Paragraph("Yamato Asset Management", title_style))

    sub_style = ParagraphStyle(
        "SubTitle",
        parent=styles["Normal"],
        fontSize=11,
        textColor=colors.HexColor("#455a64"),
        spaceAfter=2,
    )
    story.append(Paragraph(title, sub_style))
    if subtitle:
        story.append(Paragraph(subtitle, sub_style))

    generated_style = ParagraphStyle(
        "Generated",
        parent=styles["Normal"],
        fontSize=8,
        textColor=colors.grey,
        spaceAfter=12,
    )
    story.append(Paragraph(f"Generated on: {datetime.now().strftime('%d %B %Y, %I:%M %p')}", generated_style))
    story.append(Spacer(1, 0.3 * cm))

    # Table
    header_row = [col.replace("_", " ").upper() for col in columns]
    table_data = [header_row]

    for row in rows:
        table_data.append([str(row.get(col, "") or "") for col in columns])

    col_count = len(columns)
    available_width = A4[0] - 3 * cm  # page width minus margins
    col_width = available_width / col_count

    table = Table(table_data, colWidths=[col_width] * col_count, repeatRows=1)
    table.setStyle(TableStyle([
        # Header
        ("BACKGROUND",   (0, 0), (-1, 0),  colors.HexColor("#1a237e")),
        ("TEXTCOLOR",    (0, 0), (-1, 0),  colors.white),
        ("FONTNAME",     (0, 0), (-1, 0),  "Helvetica-Bold"),
        ("FONTSIZE",     (0, 0), (-1, 0),  8),
        ("ALIGN",        (0, 0), (-1, 0),  "CENTER"),
        ("BOTTOMPADDING",(0, 0), (-1, 0),  6),
        ("TOPPADDING",   (0, 0), (-1, 0),  6),
        # Body rows
        ("FONTNAME",     (0, 1), (-1, -1), "Helvetica"),
        ("FONTSIZE",     (0, 1), (-1, -1), 7),
        ("ROWBACKGROUNDS",(0, 1), (-1, -1), [colors.white, colors.HexColor("#e8eaf6")]),
        ("ALIGN",        (0, 1), (-1, -1), "LEFT"),
        ("VALIGN",       (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING",   (0, 1), (-1, -1), 4),
        ("BOTTOMPADDING",(0, 1), (-1, -1), 4),
        # Grid
        ("GRID",         (0, 0), (-1, -1), 0.4, colors.HexColor("#c5cae9")),
        ("BOX",          (0, 0), (-1, -1), 1,   colors.HexColor("#1a237e")),
    ]))
    story.append(table)

    doc.build(story)
    buffer.seek(0)
    return buffer


@app.get("/api/reports/audit-trail")
def generate_audit_trail_report():
    """PDF: Full asset audit trail — all assets with assigned employee details."""
    rows = _fetch_assigned_assets_data()
    columns = ["assetId", "asset_name", "asset_type", "status",
               "purchase_date", "employee_name", "email", "phone_number", "department", "remarks"]
    buffer = _build_pdf(
        title="Asset Audit Trail Report",
        subtitle=f"Total Records: {len(rows)}",
        columns=columns,
        rows=rows
    )
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=audit_trail_report.pdf"}
    )


@app.get("/api/reports/maintenance-schedule")
def generate_maintenance_schedule_report():
    """PDF: Maintenance schedule — assets sorted by purchase date showing oldest first."""
    rows = _fetch_assigned_assets_data()
    # Sort by purchase date ascending (oldest assets need maintenance soonest)
    rows_sorted = sorted(
        rows,
        key=lambda r: str(r.get("purchase_date") or "9999"),
    )
    columns = ["assetId", "asset_name", "asset_type", "status", "purchase_date", "employee_name", "department", "remarks"]
    buffer = _build_pdf(
        title="Maintenance Schedule Report",
        subtitle="Sorted by Purchase Date (Oldest First — Priority Maintenance)",
        columns=columns,
        rows=rows_sorted
    )
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=maintenance_schedule_report.pdf"}
    )


@app.get("/api/reports/user-activity-log")
def generate_user_activity_log_report():
    """PDF: User activity log — employee-centric view of all asset assignments."""
    rows = _fetch_assigned_assets_data()
    # Sort by employee name for easier reading
    rows_sorted = sorted(rows, key=lambda r: str(r.get("employee_name") or "ZZZ"))
    columns = ["employee_name", "email", "phone_number", "department", "assetId", "asset_name", "asset_type", "status"]
    buffer = _build_pdf(
        title="User Activity Log Report",
        subtitle="Employee Asset Assignment Overview — Sorted by Employee Name",
        columns=columns,
        rows=rows_sorted
    )
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=user_activity_log_report.pdf"}
    )


@app.get("/api/reports/checkout-history")
def generate_checkout_history_report():
    """PDF: Check-out history — assets that are currently assigned (not unassigned)."""
    rows = _fetch_assigned_assets_data()
    # Filter only rows where an employee is actually assigned
    checked_out = [r for r in rows if r.get("employee_name") and str(r["employee_name"]).strip() != ""]
    columns = ["assetId", "asset_name", "asset_type", "employee_name", "email", "department", "phone_number", "status", "purchase_date"]
    buffer = _build_pdf(
        title="Asset Check-out History Report",
        subtitle=f"Currently Checked-out Assets: {len(checked_out)} of {len(rows)} total",
        columns=columns,
        rows=checked_out
    )
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=checkout_history_report.pdf"}
    )