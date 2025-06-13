import re
from typing import List, Optional

from fastapi import HTTPException
from pydantic import BaseModel, validator
from sqlalchemy import text

from storage import get_db

# Pydantic models for dynamic table operations
class Rename(BaseModel):
    antiguo: str
    nuevo:  str

    @validator('antiguo', 'nuevo')
    def nombre_valido(cls, v):
        if not re.match(r'^[A-Za-z_][A-Za-z0-9_]*$', v):
            raise ValueError('Nombre de columna inválido')
        return v
    
class CampoTabla(BaseModel):
    nombre: str

    @validator('nombre')
    def nombre_valido(cls, v):
        if not re.match(r'^[A-Za-z_][A-Za-z0-9_]*$', v):
            raise ValueError('Nombre de campo inválido')
        return v

class TablaCreate(BaseModel):
    nombre_tabla: str
    campos: List[CampoTabla]

    @validator('nombre_tabla')
    def tabla_valida(cls, v):
        if not re.match(r'^[A-Za-z_][A-Za-z0-9_]*$', v):
            raise ValueError('Nombre de tabla inválido')
        return v

class TablaAlter(BaseModel):
    nombre_tabla: str
    campos_add:    Optional[List[CampoTabla]] = []
    campos_drop:   Optional[List[str]]       = []
    campos_rename: Optional[List[Rename]]    = []  # ← nuevo campo

    @validator('nombre_tabla')
    def tabla_valida(cls, v):
        if not re.match(r'^[A-Za-z_][A-Za-z0-9_]*$', v):
            raise ValueError('Nombre de tabla inválido')
        return v

# Controller functions without SQLAlchemy inspect

def _fetch_table_names(conn) -> List[str]:
    cursor = conn.cursor()
    cursor.execute("SHOW TABLES")
    rows = cursor.fetchall()
    cursor.close()
    # rows: list of tuples, value is first element
    return [row[0] for row in rows]


def _fetch_column_names(conn, nombre: str) -> List[dict]:
    cursor = conn.cursor(dictionary=True)
    cursor.execute(f"SHOW COLUMNS FROM `{nombre}`")
    cols = cursor.fetchall()
    cursor.close()
    # cols: list of dicts with 'Field' and 'Type'
    return [{"name": col['Field'], "type": col['Type']} for col in cols]

def get_tablas():
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("""
        SELECT 
            table_name AS nombre_tabla,
            create_time AS fecha_creacion
        FROM information_schema.tables
        WHERE table_schema = 'db_inventario'
        ORDER BY create_time DESC
    """)
    tablas = cursor.fetchall()
    cursor.close()
    conn.close()
    return tablas 
    


def crear_tabla(esquema: TablaCreate):
    conn = get_db()
    # Validar existencia
    tablas = _fetch_table_names(conn)
    if esquema.nombre_tabla in tablas:
        conn.close()
        raise HTTPException(status_code=400, detail="La tabla ya existe")   
    # Construir SQL: todos los campos VARCHAR(255) por defecto
    columnas = ", ".join(f"`{c.nombre}` VARCHAR(255)" for c in esquema.campos)
    sql = f"CREATE TABLE `{esquema.nombre_tabla}` (id INT AUTO_INCREMENT PRIMARY KEY, {columnas})"
    try:
        cursor = conn.cursor()
        cursor.execute(sql)
        conn.commit()
        cursor.close()
    except Exception as e:
        conn.close()
        raise HTTPException(status_code=500, detail=f"Error al crear tabla: {e}")
    conn.close()
    return {"message": "Tabla creada correctamente"}


def eliminar_tabla(nombre: str):
    conn = get_db()
    tablas = _fetch_table_names(conn)
    if nombre not in tablas:
        conn.close()
        raise HTTPException(status_code=404, detail="Tabla no encontrada")
    sql = f"DROP TABLE `{nombre}`"
    try:
        cursor = conn.cursor()
        cursor.execute(sql)
        conn.commit()
        cursor.close()
    except Exception as e:
        conn.close()
        raise HTTPException(status_code=500, detail=f"Error al eliminar tabla: {e}")
    conn.close()
    return {"message": "Tabla eliminada correctamente"} 


def listar_tablas():
    conn = get_db()
    tablas = _fetch_table_names(conn)
    conn.close()
    return tablas


def obtener_columnas(nombre: str):
    conn = get_db()
    tablas = _fetch_table_names(conn)
    if nombre not in tablas:
        conn.close()
        raise HTTPException(status_code=404, detail="Tabla no encontrada")
    cols = _fetch_column_names(conn, nombre)
    conn.close()
    # Excluir columna id
    campos = [c for c in cols if c['name'] != 'id']
    return campos



def alterar_tabla(esquema: TablaAlter):
    conn = get_db()
    cursor = conn.cursor()
    # Verificar existencia
    cursor.execute("SHOW TABLES LIKE %s", (esquema.nombre_tabla,))
    if not cursor.fetchone():
        cursor.close()
        conn.close()
        raise HTTPException(status_code=404, detail="Tabla no encontrada")

    statements = []
    
    
    # Agregar columnas
    for campo in esquema.campos_add or []:
        statements.append(f"ADD COLUMN `{campo.nombre}` VARCHAR(255)")
    # Renombrar columnas
    for rename in esquema.campos_rename or []:
        statements.append(f"CHANGE `{rename.antiguo}` `{rename.nuevo}` VARCHAR(255)")
    # Eliminar columnas
    for drop in esquema.campos_drop or []:
        statements.append(f"DROP COLUMN `{drop}`")

    if not statements:
        cursor.close()
        conn.close()
        raise HTTPException(status_code=400, detail="No hay modificaciones especificadas")

    sql = f"ALTER TABLE `{esquema.nombre_tabla}` " + ", ".join(statements)
    try:
        print("SQL a ejecutar:", sql)
        cursor.execute(sql)
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Error al alterar tabla: {e}")
    except Exception as e:
        print("ERROR SQL:", e)
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Error al alterar tabla: {e}")
    finally:
        cursor.close()
        conn.close()
    return {"message": "Tabla alterada correctamente"}

