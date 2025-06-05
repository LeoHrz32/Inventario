import mysql.connector
from mysql.connector import Error
from pydantic import BaseModel
from fastapi import Form, HTTPException
from typing import List, Optional

from storage import get_db


# Pydantic models
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
    pulgadas: Optional[str] = None
    tonner_referencia: Optional[str] = None
    Multifuncional: Optional[str] = None
    tipo_impresion: Optional[str] = None
    tipo_tv: Optional[str] = None
    pertenencia: str
    categoria_id: int
    categoria_nombre: str

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
    pulgadas: Optional[str] 
    tonner_referencia: Optional[str]
    Multifuncional: Optional[str]
    tipo_impresion: Optional[str]
    tipo_tv: Optional[str]
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
    pulgadas: Optional[str]
    tonner_referencia: Optional[str]
    Multifuncional: Optional[str]
    tipo_impresion: Optional[str]
    tipo_tv: Optional[str]
    pertenencia: str
    categoria_id: int

# Dependencies for FastAPI form data
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
    pulgadas: Optional[str] = Form(None),
    tonner_referencia: Optional[str] = Form(None),
    Multifuncional: Optional[str] = Form(None),
    tipo_impresion: Optional[str] = Form(None),
    tipo_tv: Optional[str] = Form(None),
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
        pulgadas=pulgadas,
        tonner_referencia=tonner_referencia,
        Multifuncional=Multifuncional,
        tipo_impresion=tipo_impresion,
        tipo_tv=tipo_tv,
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
    pulgadas: Optional[str] = Form(None),
    tonner_referencia: Optional[str] = Form(None),
    Multifuncional: Optional[str] = Form(None),
    tipo_impresion: Optional[str] = Form(None),
    tipo_tv: Optional[str] = Form(None),
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
        pulgadas=pulgadas,
        tonner_referencia=tonner_referencia,
        Multifuncional=Multifuncional,
        tipo_impresion=tipo_impresion,
        tipo_tv=tipo_tv,
        pertenencia=pertenencia,
        categoria_id=categoria_id
    )

# CRUD operations

def get_product(product_id: int) -> Product:
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    cursor.execute(
        """
        SELECT
          p.id, p.nombre, p.marca, p.serial, p.procesador, p.modelo,
          p.capacidad_ram, p.tipo_disco, p.capacidad_disco,
          p.sistema_operativo, p.pulgadas, p.tonner_referencia,
          p.Multifuncional, p.tipo_impresion, p.tipo_tv,
          p.pertenencia, p.categoria_id,
          c.nombre AS categoria_nombre
        FROM productos p
        JOIN categoria c ON p.categoria_id = c.id
        WHERE p.id = %s
        """,
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
        p.sistema_operativo, p.pulgadas, p.tonner_referencia,
        p.Multifuncional, p.tipo_impresion, p.tipo_tv,
        p.pertenencia, p.categoria_id,
        c.nombre AS categoria_nombre
      FROM productos p
      JOIN categoria c ON p.categoria_id = c.id
    """
    )
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
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
    pulgadas: Optional[str],
    tonner_referencia: Optional[str],
    Multifuncional: Optional[str],
    tipo_impresion: Optional[str],
    tipo_tv: Optional[str],
    pertenencia: str,
    categoria_id: int
) -> dict:
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute(
        "SELECT id FROM categoria WHERE id = %s",
        (categoria_id,)
    )
    if not cursor.fetchone():
        cursor.close()
        conn.close()
        return {"success": False, "message": "Categoría no encontrada"}

    cursor.execute(
        "SELECT id FROM productos WHERE serial = %s",
        (serial,)
    )
    if cursor.fetchone():
        cursor.close()
        conn.close()
        return {"success": False, "message": "Serial ya registrado"}

    cursor.execute(
        """
        INSERT INTO productos
          (nombre, marca, serial, procesador, modelo,
           capacidad_ram, tipo_disco, capacidad_disco,
           sistema_operativo, pulgadas, tonner_referencia,
           Multifuncional, tipo_impresion, tipo_tv,
           pertenencia, categoria_id)
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
        """,
        (
            nombre, marca, serial, procesador, modelo,
            capacidad_ram, tipo_disco, capacidad_disco,
            sistema_operativo, pulgadas, tonner_referencia,
            Multifuncional, tipo_impresion, tipo_tv,
            pertenencia, categoria_id
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
    pulgadas: Optional[str],
    tonner_referencia: Optional[str],
    Multifuncional: Optional[bool],
    tipo_impresion: Optional[str],
    tipo_tv: Optional[str],
    pertenencia: str,
    categoria_id: int
) -> dict:
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute(
        "SELECT id FROM productos WHERE id = %s",
        (product_id,)
    )
    if not cursor.fetchone():
        cursor.close()
        conn.close()
        return {"success": False, "message": "Producto no encontrado"}

    cursor.execute(
        "SELECT id FROM categoria WHERE id = %s",
        (categoria_id,)
    )
    if not cursor.fetchone():
        cursor.close()
        conn.close()
        return {"success": False, "message": "Categoría no encontrada"}

    cursor.execute(
        """
        UPDATE productos
        SET nombre=%s, marca=%s, serial=%s, procesador=%s,
            modelo=%s, capacidad_ram=%s, tipo_disco=%s,
            capacidad_disco=%s, sistema_operativo=%s,
            pulgadas=%s, tonner_referencia=%s, Multifuncional=%s,
            tipo_impresion=%s, tipo_tv=%s, pertenencia=%s,
            categoria_id=%s
        WHERE id=%s
        """,
        (
            nombre, marca, serial, procesador, modelo,
            capacidad_ram, tipo_disco, capacidad_disco,
            sistema_operativo, pulgadas, tonner_referencia,
            Multifuncional, tipo_impresion, tipo_tv,
            pertenencia, categoria_id,
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