from fastapi import APIRouter, Path, Body
from typing import Dict, Any, List
from fastapi.responses import HTMLResponse
import os
from controllers.registroController import obtener_registros

from controllers.registroController import (
    obtener_registros,
    obtener_registro_por_id,
    crear_registro,
    actualizar_registro,
    eliminar_registro,
    obtener_tablas
)

router = APIRouter(tags=["Registros Dinámicos"])

@router.get("/registros/tablas-disponibles", response_model=List[str])
def listar_tablas_disponibles():
    """Retorna los nombres de las tablas dinámicas disponibles"""
    tablas = obtener_tablas()
    return tablas  # ✅ Asegúrate que esto sea una lista tipo: ['tabla1', 'tabla2']


@router.get("/registros/{nombre_tabla}", response_model=List[Dict[str, Any]])
def listar_registros(nombre_tabla: str):
    """Listar todos los registros de una tabla dinámica"""
    return obtener_registros(nombre_tabla)

@router.get("/registros/{nombre_tabla}/{registro_id}", response_model=Dict[str, Any])
def obtener_un_registro(nombre_tabla: str, registro_id: int = Path(..., gt=0)):
    """Obtener un registro específico por ID"""
    return obtener_registro_por_id(nombre_tabla, registro_id)

@router.post("/registros/{nombre_tabla}", status_code=201)
def registrar(nombre_tabla: str, datos: Dict[str, Any] = Body(...)):
    """Registrar un nuevo dato en la tabla dinámica"""
    return crear_registro(nombre_tabla, datos)

@router.put("/registros/{nombre_tabla}/{pk_field}/{pk_value}")
def editar_registro(
    nombre_tabla: str,
    pk_field: str = Path(..., regex=r"^[A-Za-z_][A-Za-z0-9_]*$"),
    pk_value: Any = Path(...),
    datos: Dict[str, Any] = Body(...)
):
    """
    Actualiza un registro usando un campo PK dinámico.
    """
    return actualizar_registro(nombre_tabla, pk_field, pk_value, datos)


@router.delete("/registros/{nombre_tabla}/{registro_id}")
def eliminar(nombre_tabla: str, registro_id: int):
    """Eliminar un registro por ID"""
    return eliminar_registro(nombre_tabla, registro_id)


@router.get("/registrosTable", response_class=HTMLResponse)
def cargar_vista_registros():
    """Vista inicial de registros sin datos cargados"""
    path = os.path.join(os.path.dirname(__file__), "../../frontend/registrosTable.html")
    with open(path, encoding="utf-8") as f:
        html = f.read()
    return HTMLResponse(html)
