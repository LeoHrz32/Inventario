from typing import List
import mysql.connector
from mysql.connector import Error
from pydantic import BaseModel
from fastapi import Form
import os


from storage import get_db

class Categoria(BaseModel):
    id: int
    nombre: str
    descripcion: str
    

class CategoriaCreate(BaseModel):
    nombre: str
    descripcion: str
    
class CategoriaUpdate(BaseModel):
    nombre: str
    descripcion: str
    
    
async def get_categoria_update(
    nombre: str = Form(...),
    descripcion: str = Form(...)
    ) -> CategoriaUpdate:
    return CategoriaUpdate(
        nombre= nombre,
        descripcion=descripcion
    )

def get_categoria(nombre: str):
    connection = get_db()
    cursor = connection.cursor(dictionary=True)
    
    query = """
    SELECT id, nombre, descripcion FROM categoria
    WHERE nombre = %s
        
    """
    
    cursor.execute(query, (nombre,))
    categoria = cursor.fetchone()
    
    cursor.close()
    connection.close()
    
    if categoria == categoria['nombre'] :
        return{
            "id" : categoria['id'],
            "nombre" : categoria['nombre'],
            "descripcion" : categoria['descripcion']
        }
    
    return None

def get_categorias() -> List[Categoria]:
    conn = get_db()
    cursor=conn.cursor(dictionary=True)
    cursor.execute(
        "SELECT id, nombre, descripcion FROM categoria"
    )
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return [Categoria(**c) for c in rows]


def delete_categoria(categoria_id: int) -> bool :
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT id FROM categoria WHERE id = %s ", (categoria_id,))
    if not cursor.fetchone():
        cursor.close()
        conn.close()
        return False
    cursor.execute("DELETE FROM categoria WHERE id = %s", (categoria_id,))
    conn.commit()
    sucess = cursor.rowcount > 0
    cursor.close()
    conn.close()
    return sucess

def add_categoria (nombre: str, descripcion: str) ->dict :
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT id FROM categoria WHERE nombre = %s" , (nombre,))
    if cursor.fetchone():
        cursor.close()
        conn.close()
        return {"success":False, "message": "Categoria ya registrada"}
    cursor.execute(
        "INSERT INTO categoria (nombre, descripcion) VALUES (%s, %s)",
        (nombre, descripcion)
    )
    conn.commit()
    cursor.close()
    conn.close()
    return {"success" : True, "message": "Categoria registrada correctamente"}

def update_categoria(id: int, nombre: str, descripcion: str) :
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    
    try:
        query_check = "SELECT id FROM categoria WHERE id = %s"
        cursor.execute(query_check, (id))
        existing_categoria = cursor.fetchone()
        if not existing_categoria:
            return {"success": False, "message": "Categoria no existe"}
        
        query_update ="""
            UPDATE categoria SET nombre = %s, descripcion = %s WHERE id = %s
        """
        cursor.execute(query_update,(nombre,descripcion, id))
        conn.commit()
        return {"success": True, "message": "Categoria actualizada correctamente"}
    
    except Exception as e:
        return {"success": False, "message": f"Error: {str(e)}"}
    
    finally:
        cursor.close()
        conn.close()     

def getByIdCategoria (categoria_id: int) -> Categoria:
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT id, nombre, descripcion FROM categoria WHERE id = %s ", (categoria_id,))
    row = cursor.fetchone()
    cursor.close()
    conn.close()
    if not row:
        raise Exception ("Categoria no encontrada")
    return Categoria(**row)        