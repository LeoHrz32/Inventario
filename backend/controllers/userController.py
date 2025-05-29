import mysql.connector
from mysql.connector import Error
from pydantic import BaseModel
from fastapi import Form
import os

# DB connection
from storage import get_db

# Pydantic models
class User(BaseModel):
    id: int
    username: str
    email: str
    password: str

class UserCreate(BaseModel):
    str_name_user: str
    str_email: str
    str_password: str

class UserUpdate(BaseModel):
    str_name_user: str
    str_email: str
    str_password: str



async def get_user_update(
    str_name_user: str = Form(...),
    str_email: str = Form(...),
    str_password: str = Form(...) 
) -> UserUpdate:
    return UserUpdate(
        str_name_user=str_name_user,
        str_email=str_email,
        str_password=str_password
    )
    
    
# CRUD operations

def get_user(str_name_user: str, str_password: str):
    connection = get_db()
    cursor = connection.cursor(dictionary=True)

    # Consulta para obtener el id, usuario, correo, contraseña, permisos y área
    query = """
        SELECT id, str_name_user, str_email, str_password
        FROM tbl_users
        WHERE str_name_user = %s
    """

    # Ejecutar la consulta
    cursor.execute(query, (str_name_user,))
    user = cursor.fetchone()

    # Cerrar conexión
    cursor.close()
    connection.close()

    # Verificar si el usuario existe y si la contraseña coincide
    if user and str_password == user['str_password']:
        # Retornar datos completos del usuario, incluyendo el "id"
        return {
            "id": user["id"],
            "username": user["str_name_user"],
            "email": user["str_email"],
            "password": user["str_password"]
            
        }

    # Retornar None si la validación falla
    return None


def get_users() -> list[User]:
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    cursor.execute(
        "SELECT id, str_name_user AS username, str_email AS email, str_password AS password FROM tbl_users"
    )
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return [User(**r) for r in rows]


def delete_user(user_id: int) -> bool:
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM tbl_users WHERE id = %s", (user_id,))
    if not cursor.fetchone():
        cursor.close()
        conn.close()
        return False
    cursor.execute("DELETE FROM tbl_users WHERE id = %s", (user_id,))
    conn.commit()
    success = cursor.rowcount > 0
    cursor.close()
    conn.close()
    return success


def add_user(str_name_user: str, str_email: str, str_password: str) -> dict:
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM tbl_users WHERE str_name_user = %s", (str_name_user,))
    if cursor.fetchone():
        cursor.close()
        conn.close()
        return {"success": False, "message": "Usuario ya existe"}
    cursor.execute(
        "INSERT INTO tbl_users (str_name_user, str_email, str_password) VALUES (%s,%s,%s)",
        (str_name_user, str_email, str_password)
    )
    conn.commit()
    cursor.close()
    conn.close()
    return {"success": True, "message": "Usuario creado correctamente"}


def update_user(id: int, str_name_user: str, str_email: str, str_password: str):
    connection = get_db()
    cursor = connection.cursor()

    try:
        # Verificar si el usuario existe
        query_check = "SELECT id FROM tbl_users WHERE id = %s"
        cursor.execute(query_check, (id,))
        existing_user = cursor.fetchone()

        if not existing_user:
            return {"success": False, "message": "Usuario no encontrado"}

        # Actualizar los datos del usuario
        query_update = """
            UPDATE tbl_users
            SET str_name_user = %s, str_email = %s, str_password = %s
            WHERE id = %s
        """
        cursor.execute(query_update, (str_name_user, str_email, str_password, id))
        connection.commit()

        return {"success": True, "message": "Usuario actualizado correctamente"}

    except Exception as e:
        return {"success": False, "message": f"Error: {str(e)}"}

    finally:
        cursor.close()
        connection.close()


def fetch_user_by_id(user_id: int) -> User:
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT id, str_name_user AS username, str_email AS email, str_password AS password FROM tbl_users WHERE id=%s", (user_id,))
    row = cursor.fetchone()
    cursor.close()
    conn.close()
    if not row:
        raise Exception("Usuario no encontrado")
    return User(**row)