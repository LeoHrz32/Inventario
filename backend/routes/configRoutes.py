from fastapi import APIRouter, HTTPException, Query
from sqlalchemy.exc import SQLAlchemyError
from fastapi.responses import HTMLResponse
from typing import List
import os
from storage import get_db
from fastapi.responses import JSONResponse

from controllers.configController import (
    crear_tabla,
    eliminar_tabla,
    listar_tablas,
    obtener_columnas,
    alterar_tabla,
    TablaCreate,
    get_tablas,
    TablaAlter
)

router = APIRouter(tags=["Tablas Dinámicas"])

@router.post("/tablas", status_code=201)
def ruta_crear_tabla(esquema: TablaCreate):
    """Crear una nueva tabla dinámica"""
    try:
        return crear_tabla(esquema)
    except HTTPException as he:
        raise he
    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/tablasDelete/{nombre_tabla}") 
async def eliminar_tabla(nombre_tabla: str): 
    try:
        from storage import get_db 
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute(f"DROP TABLE IF EXISTS {nombre_tabla}")
        conn.commit()
        return {"message": f"Tabla {nombre_tabla} eliminada exitosamente"}
    except Exception as e: 
        raise HTTPException(status_code=500, detail=f"No se pudo eliminar la tabla: {e}")
  
@router.get("/tablas", response_model=list[str])
def ruta_listar_tablas():
    """Listar todas las tablas en la base de datos"""
    return listar_tablas()



@router.get("/{nombre_tabla}/columnas")
def ruta_obtener_columnas(nombre_tabla: str):
    """Obtener los campos (columnas) de una tabla dinámica"""
    try:
        return obtener_columnas(nombre_tabla)
    except HTTPException as he:
        raise he
    
@router.get("/tablasTable", response_class=HTMLResponse)
async def list_tables():
    tables = get_tablas()
    path = os.path.join(os.path.dirname(__file__), "../../frontend/tablasTable.html")
    with open(path, encoding="utf-8") as f:
        html = f.read()

    rows = "".join([
        f"<tr>"
        f"<td>{t['nombre_tabla']}</td>"
        f"<td>{t['fecha_creacion']}</td>"
        f"<td>"
        f"  <button onclick='editTable(\"{t['nombre_tabla']}\")'>Editar</button>"
        f"  <button onclick='deleteTable(\"{t['nombre_tabla']}\")'>Eliminar</button>"
        f"</td>"
        f"</tr>"
        for t in tables
    ])
    return HTMLResponse(html.replace("<!-- rows-placeholder -->", rows))



@router.put("/tablasUpdate/{nombre_tabla}")
def ruta_alterar_tabla( 
    nombre_tabla: str,
    esquema: TablaAlter
    
):
    """Agregar o eliminar columnas de la tabla especificada"""
    print("DEBUG - Nombre ruta:", nombre_tabla)
    print("DEBUG - Nombre payload:", esquema.nombre_tabla)
    if esquema.nombre_tabla != nombre_tabla:
        raise HTTPException(status_code=400, detail="El nombre de tabla en la ruta y el body no coinciden")
    try:
        return alterar_tabla(esquema)
    except HTTPException as he:
        raise he


@router.get("/tablasPaginated", response_model=dict)
def ruta_tablas_paginated(
    page: int = Query(1, ge=1),
    per_page: int = Query(5, ge=1)
):
    """
    Devuelve un objeto con:
      - tablas: lista de nombres de tablas de la página solicitada
      - total_pages: número total de páginas
    """
    all_tables: List[str] = listar_tablas()
    total = len(all_tables)
    total_pages = (total + per_page - 1) // per_page

    start = (page - 1) * per_page
    end = start + per_page
    page_tables = all_tables[start:end]

    return {"tablas": page_tables, "total_pages": total_pages}


@router.get("/tablas/search")
def buscar_tablas(query: str = Query(...)):
    try:
        connection = get_db()
        with connection.cursor() as cursor:
            print("Query recibido:", query)
            cursor.execute("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = %s AND table_name LIKE %s
            """, ("db_inventario", f"%{query}%"))
            resultados = cursor.fetchall()
            print("Resultados encontrados:", resultados)

        # ✅ Cambiado aquí
        nombres = [fila[0] for fila in resultados]
        return {"tablas": nombres}
    except Exception as e:
        print("Error:", str(e))
        return JSONResponse(content={"error": str(e)}, status_code=500)
    finally:
        if 'connection' in locals():
            connection.close()

