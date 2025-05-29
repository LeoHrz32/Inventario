import mysql.connector
from mysql.connector import Error
from pydantic import BaseModel
from fastapi import Form, HTTPException
from typing import List

# DB connection
from storage import get_db

# Pydantic models
# Pydantic models para productos
class Product(BaseModel):
    id: int
    nombre: str
    marca: str
    serial: str
    procesador: str
    modelo: str
    capacidad_ram: str
    tipo_disco: str
    capacidad_disco: str
    sistema_operativo: str
    pertenencia: str
    categoria_id: int
    categoria_nombre: str | None = None

class ProductCreate(BaseModel):
    nombre: str
    marca: str
    serial: str
    procesador: str
    modelo: str
    capacidad_ram: str
    tipo_disco: str
    capacidad_disco: str
    sistema_operativo: str
    pertenencia: str
    categoria_id: int

class ProductUpdate(BaseModel):
    nombre: str
    marca: str
    serial: str
    procesador: str
    modelo: str
    capacidad_ram: str
    tipo_disco: str
    capacidad_disco: str
    sistema_operativo: str
    pertenencia: str
    categoria_id: int

# Dependencias para FastAPI que leen Form data
async def get_product_create(
    nombre: str = Form(...),
    marca: str = Form(...),
    serial: str = Form(...),
    procesador: str = Form(...),
    modelo: str = Form(...),
    capacidad_ram: str = Form(...),
    tipo_disco: str = Form(...),
    capacidad_disco: str = Form(...),
    sistema_operativo: str = Form(...),
    pertenencia: str = Form(...),
    categoria_id: int = Form(...)
) -> ProductCreate:
    return ProductCreate(
        nombre=nombre,
        marca=marca,
        serial=serial,
        procesador=procesador,
        modelo=modelo,
        capacidad_ram=capacidad_ram,
        tipo_disco=tipo_disco,
        capacidad_disco=capacidad_disco,
        sistema_operativo=sistema_operativo,
        pertenencia=pertenencia,
        categoria_id=categoria_id
    )

async def get_product_update(
    nombre: str = Form(...),
    marca: str = Form(...),
    serial: str = Form(...),
    procesador: str = Form(...),
    modelo: str = Form(...),
    capacidad_ram: str = Form(...),
    tipo_disco: str = Form(...),
    capacidad_disco: str = Form(...),
    sistema_operativo: str = Form(...),
    pertenencia: str = Form(...),
    categoria_id: int = Form(...)
) -> ProductUpdate:
    return ProductUpdate(
        nombre=nombre,
        marca=marca,
        serial=serial,
        procesador=procesador,
        modelo=modelo,
        capacidad_ram=capacidad_ram,
        tipo_disco=tipo_disco,
        capacidad_disco=capacidad_disco,
        sistema_operativo=sistema_operativo,
        pertenencia=pertenencia,
        categoria_id=categoria_id
    )


# CRUD operations

def get_product(product_id: int) -> Product:
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    cursor.execute(
        "SELECT * FROM productos WHERE id = %s",
        (product_id,)
    )
    row = cursor.fetchone()
    cursor.close()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return Product(**row)

def get_products() -> List[Product]:
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("""
      SELECT
        p.id, p.nombre, p.marca, p.serial, p.procesador, p.modelo,
        p.capacidad_ram, p.tipo_disco, p.capacidad_disco,
        p.sistema_operativo, p.pertenencia, p.categoria_id,
        c.nombre AS categoria_nombre
      FROM productos p
      JOIN categoria c ON p.categoria_id = c.id
    """)
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    # Asegúrate de añadir `categoria_nombre: str` al modelo Pydantic Product
    return [Product(**r) for r in rows]

def add_product(
    nombre: str,
    marca: str,
    serial: str,
    procesador: str,
    modelo: str,
    capacidad_ram: str,
    tipo_disco: str,
    capacidad_disco: str,
    sistema_operativo: str,
    pertenencia: str,
    categoria_id: int
) -> dict:
    conn = get_db()
    cursor = conn.cursor()

    # Verificar existencia de la categoría
    cursor.execute(
        "SELECT id FROM categoria WHERE id = %s",
        (categoria_id,)
    )
    if not cursor.fetchone():
        cursor.close()
        conn.close()
        return {"success": False, "message": "Categoría no encontrada"}

    # Verificar serial único
    cursor.execute(
        "SELECT id FROM productos WHERE serial = %s",
        (serial,)
    )
    if cursor.fetchone():
        cursor.close()
        conn.close()
        return {"success": False, "message": "Serial ya registrado"}

    # Insertar producto
    cursor.execute(
        """
        INSERT INTO productos
          (nombre, marca, serial, procesador, modelo,
           capacidad_ram, tipo_disco, capacidad_disco,
           sistema_operativo, pertenencia, categoria_id)
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
        """,
        (
            nombre, marca, serial, procesador, modelo,
            capacidad_ram, tipo_disco, capacidad_disco,
            sistema_operativo, pertenencia, categoria_id
        )
    )
    conn.commit()
    cursor.close()
    conn.close()
    return {"success": True, "message": "Producto creado correctamente"}

def update_product(
    product_id: int,
    nombre: str,
    marca: str,
    serial: str,
    procesador: str,
    modelo: str,
    capacidad_ram: str,
    tipo_disco: str,
    capacidad_disco: str,
    sistema_operativo: str,
    pertenencia: str,
    categoria_id: int
) -> dict:
    conn = get_db()
    cursor = conn.cursor()

    # Verificar producto existente
    cursor.execute(
        "SELECT id FROM productos WHERE id = %s",
        (product_id,)
    )
    if not cursor.fetchone():
        cursor.close()
        conn.close()
        return {"success": False, "message": "Producto no encontrado"}

    # Verificar categoría
    cursor.execute(
        "SELECT id FROM categoria WHERE id = %s",
        (categoria_id,)
    )
    if not cursor.fetchone():
        cursor.close()
        conn.close()
        return {"success": False, "message": "Categoría no encontrada"}

    # Actualizar
    cursor.execute(
        """
        UPDATE productos
        SET nombre=%s, marca=%s, serial=%s, procesador=%s,
            modelo=%s, capacidad_ram=%s, tipo_disco=%s,
            capacidad_disco=%s, sistema_operativo=%s,
            pertenencia=%s, categoria_id=%s
        WHERE id=%s
        """,
        (
            nombre, marca, serial, procesador, modelo,
            capacidad_ram, tipo_disco, capacidad_disco,
            sistema_operativo, pertenencia, categoria_id,
            product_id
        )
    )
    conn.commit()
    cursor.close()
    conn.close()
    return {"success": True, "message": "Producto actualizado correctamente"}

def delete_product(product_id: int) -> dict:
    conn = get_db()
    cursor = conn.cursor()
    # Verificar existencia
    cursor.execute(
        "SELECT id FROM productos WHERE id = %s",
        (product_id,)
    )
    if not cursor.fetchone():
        cursor.close()
        conn.close()
        return {"success": False, "message": "Producto no encontrado"}

    cursor.execute(
        "DELETE FROM productos WHERE id = %s",
        (product_id,)
    )
    conn.commit()
    cursor.close()
    conn.close()
    return {"success": True, "message": "Producto eliminado correctamente"}

def fetch_product_by_id(product_id: int) -> Product:
    return get_product(product_id)