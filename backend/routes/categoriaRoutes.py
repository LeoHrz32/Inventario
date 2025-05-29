from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse
import os

from sqlmodel import Session

from controllers.categoriaController import( Categoria,CategoriaCreate,CategoriaUpdate,get_categoria,add_categoria,delete_categoria,getByIdCategoria,update_categoria, get_categorias,get_categoria_update)

from storage import get_db

router = APIRouter()

@router.get("/categorias", response_class=HTMLResponse)
async def list_categorias():
    categorias = get_categorias()
    path = os.path.join(os.path.dirname(__file__), "../../frontend/categoriasTable.html")
    html = open(path, encoding= "utf-8").read()
    rows = "".join([    
        f"<tr><td>{c.id}</td><td>"
        f"<tr><td>{c.nombre}</td><td>"
        f"<tr><td>{c.descripcion}</td><td>"
        for c in categorias
        
    ])
    return HTMLResponse(html.replace("<!-- rows-placeholder -->", rows))

@router.get("/categorias_json", response_model=List[dict])
async def list_categorias_json():
    """
    Devuelve un array JSON con id y nombre de cada categoría,
    utilizando tu función get_categorias() que maneja la conexión.
    """
    try:
        categorias = get_categorias()  # devuelve lista de objetos con .id y .nombre
        return [{"id": c.id, "nombre": c.nombre} for c in categorias]
    except Exception as e:
        # Loguea el error en servidor si quieres, luego:
        raise HTTPException(status_code=500, detail="No se pudo obtener categorías")

@router.get("/categoriaById/{categoria_id}")
async def get_categoria_by_id(categoria_id: int):
    try:
        categoria = getByIdCategoria(categoria_id)
        return JSONResponse (content= categoria.dict())
    except Exception :
        raise HTTPException(status_code=404, detail="Categoria no encontrada")
    
@router.get("/categorias_paginated")
async def list_caregorias_paginated (page : int = Query (1), per_page: int = Query (10)):
    categorias = get_categorias()
    start=(page -1) *per_page 
    slice_ = categorias[start:start + per_page]
    total = len(categorias)
    total_pages = (total + per_page - 1) // per_page
    return{
        "categorias": [c.dict() for c in slice_],
        "total_categorias": total,
        "current_pages": page,
        "per_pages" : per_page,
        "total_pages": total_pages
    }
    
@router.get("/categorias_search")
async def search_categorias(query: str = Query(..., alias="query")):
    categorias = [c for c in get_categorias() if query.lower() in c.nombre.lower() or query.lower() in c.descripcion.lower()]
    return {"categorias": [c.dict() for c in categorias]}

@router.delete("/categorias/{categoria_id}")
async def delete_categoria_route(categoria_id: int ):
    if delete_categoria(categoria_id):
         return {"message": "Categoria eliminado exitosamente"}
    raise HTTPException(status_code=404, detail="Usuario no encontrado")

@router.post("/categorias/", status_code=201)
async def create_categoria (categoria : CategoriaCreate):
    res = add_categoria(categoria.nombre, categoria.descripcion)
    if res["success"]:
        return {"message": res ["message"]}
    raise HTTPException(status_code=400, detail=res["message"])

@router.put("/categoriasUpdate/{id}")
async def update_categoria_route(
    id: int,
    categoria_data: CategoriaUpdate = Depends(get_categoria_update)
):
    try:
        connection = get_db()
        cursor = connection.cursor(dictionary=True)
        
        query= """
            UPDATE categoria
            SET nombre = %s,
                descripcion = %s
            WHERE id = %s
        """
        values = (
            categoria_data.nombre,
            categoria_data.descripcion,
            id
        )
        cursor.execute(query,values)
        connection.commit()
        cursor.close()
        connection.close()
        return{"message": "Categoria actualizada correctamente"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en la actualización: {str(e)}")
         




