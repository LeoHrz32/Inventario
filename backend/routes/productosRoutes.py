from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import HTMLResponse, JSONResponse
import os

from controllers.productosController import (
    ProductCreate, ProductUpdate,
    get_product, get_products,
    add_product, update_product,
    delete_product, fetch_product_by_id,
    get_product_create, get_product_update
)

router = APIRouter()

@router.get("/products", response_class=HTMLResponse)
async def list_products():
    products = get_products()
    path = os.path.join(os.path.dirname(__file__), "../../frontend/productsTable.html")
    html = open(path, encoding="utf-8").read()
    rows = "".join([
        f"<tr>"
        f"<td>{p.nombre}</td>"
        f"<td>{p.marca}</td>"
        f"<td>{p.serial}</td>"
        f"<td>{p.procesador}</td>"
        f"<td>{p.modelo}</td>"
        f"<td>{p.capacidad_ram}</td>"
        f"<td>{p.tipo_disco}</td>"
        f"<td>{p.capacidad_disco}</td>"
        f"<td>{p.sistema_operativo}</td>"
        f"<td>{p.pertenencia}</td>"
        f"<td>{p.categoria_id}</td>"
        f"<td>"
        f"  <button onclick='editProduct({p.id})'>Editar</button>"
        f"  <button onclick='deleteProduct({p.id})'>Eliminar</button>"
        f"</td>"
        f"</tr>"
        for p in products
    ])
    return HTMLResponse(html.replace("<!-- rows-placeholder -->", rows))

@router.get("/productsJSON")
async def list_products_json():
    return JSONResponse(content={"products": [p.dict() for p in get_products()]})

@router.get("/productById/{product_id}")
async def get_product_by_id_route(product_id: int):
    try:
        prod = fetch_product_by_id(product_id)
        return JSONResponse(content=prod.dict())
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

@router.get("/products_paginated")
async def list_products_paginated(
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1)
):
    all_prods = get_products()
    start = (page - 1) * per_page
    slice_ = all_prods[start:start + per_page]
    total = len(all_prods)
    total_pages = (total + per_page - 1) // per_page
    return {
        "products": [p.dict() for p in slice_],
        "total_products": total,
        "current_page": page,
        "per_page": per_page,
        "total_pages": total_pages
    }

@router.get("/products_search")
async def search_products(query: str = Query(..., alias="query")):
    results = [
        p for p in get_products()
        if query.lower() in p.nombre.lower() or query.lower() in p.marca.lower()
    ]
    return {"products": [p.dict() for p in results]}

@router.delete("/products/{product_id}")
async def delete_product_route(product_id: int):
    res = delete_product(product_id)
    if res["success"]:
        return {"message": res["message"]}
    raise HTTPException(status_code=404, detail=res["message"])

@router.post("/products/", status_code=201)
async def create_product(
    prod: ProductCreate = Depends(get_product_create)
):
    res = add_product(
        prod.nombre, prod.marca, prod.serial, prod.procesador,
        prod.modelo, prod.capacidad_ram, prod.tipo_disco,
        prod.capacidad_disco, prod.sistema_operativo,
        prod.pertenencia, prod.categoria_id
    )
    if res["success"]:
        return {"message": res["message"]}
    raise HTTPException(status_code=400, detail=res["message"])

@router.put("/productsUpdate/{id}")
async def update_product_route(
    id: int,
    prod: ProductUpdate = Depends(get_product_update)
):
    res = update_product(
        id, prod.nombre, prod.marca, prod.serial, prod.procesador,
        prod.modelo, prod.capacidad_ram, prod.tipo_disco,
        prod.capacidad_disco, prod.sistema_operativo,
        prod.pertenencia, prod.categoria_id
    )
    if res["success"]:
        return {"message": res["message"]}
    raise HTTPException(status_code=404, detail=res["message"])
