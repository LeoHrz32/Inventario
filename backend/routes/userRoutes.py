from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse
import os

from controllers.userController import (
    UserCreate, UserUpdate,
    get_user, get_users,
    add_user, update_user,
    delete_user, fetch_user_by_id,get_user_update
)

from storage import get_db

router = APIRouter()

@router.get("/users", response_class=HTMLResponse)
async def list_users():
    users = get_users()
    path = os.path.join(os.path.dirname(__file__), "../../frontend/usersTable.html")
    html = open(path, encoding="utf-8").read()
    rows = "".join([
        f"<tr><td>{u.username}</td><td>{u.email}</td>"
        f"<td>{u.password}</td>"
        f"<td><button onclick='editUser({u.id})'>Editar</button>"
        f"<button onclick='deleteUser({u.id})'>Eliminar</button></td></tr>"
        for u in users
    ])
    return HTMLResponse(html.replace("<!-- rows-placeholder -->", rows))

@router.get("/usersJSON")
async def list_users_json():
    return JSONResponse(content={"users": [u.dict() for u in get_users()]})

@router.get("/userById/{user_id}")
async def get_user_by_id_route(user_id: int):
    try:
        user = fetch_user_by_id(user_id)
        return JSONResponse(content=user.dict())
    except Exception:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

@router.get("/users_paginated")
async def list_users_paginated(page: int = Query(1), per_page: int = Query(10)):
    users = get_users()
    start = (page-1)*per_page
    slice_ = users[start:start+per_page]
    total = len(users)
    total_pages = (total + per_page - 1)//per_page
    return {
        "users": [u.dict() for u in slice_],
        "total_users": total,
        "current_page": page,
        "per_page": per_page,
        "total_pages": total_pages
    }
    
@router.get("/users_search")
async def search_users(query: str = Query(..., alias="query")):
    users = [u for u in get_users() if query.lower() in u.username.lower() or query.lower() in u.email.lower()]
    return {"users": [u.dict() for u in users]}

@router.delete("/users/{user_id}")
async def delete_user_route(user_id: int):
    if delete_user(user_id):
        return {"message": "Usuario eliminado exitosamente"}
    raise HTTPException(status_code=404, detail="Usuario no encontrado")

@router.post("/users/", status_code=201)
async def create_user(user: UserCreate):
    res = add_user(user.str_name_user, user.str_email, user.str_password)
    if res["success"]:
        return {"message": res["message"]}
    raise HTTPException(status_code=400, detail=res["message"])



@router.put("/usersUpdate/{id}")
async def update_user_endpoint(
    id: int,
    user_data: UserUpdate = Depends(get_user_update)
):
    try:
        connection = get_db()
        cursor = connection.cursor(dictionary=True)  # dictionary=True para que los resultados sean dicts si los necesitas

        query = """
            UPDATE tbl_users 
            SET str_name_user = %s, 
                str_email = %s, 
                str_password = %s
            WHERE id = %s
        """
        values = (
            user_data.str_name_user,
            user_data.str_email,
            user_data.str_password,
            id
        )

        cursor.execute(query, values)
        connection.commit()
        cursor.close()
        connection.close()

        return {"message": "Usuario actualizado correctamente."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en la actualización: {str(e)}")