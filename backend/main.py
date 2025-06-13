from fastapi import FastAPI, Request, Form, HTTPException,Depends
from fastapi.responses import HTMLResponse, RedirectResponse,Response
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from fastapi.middleware.cors import CORSMiddleware
import os
from routes.userRoutes import get_user
from routes.userRoutes import router as user_router
from routes.categoriaRoutes import router as categoria_router

from routes.productosRoutes import router as productos_router
from routes.configRoutes import router as config_router


from storage import get_db

app = FastAPI()

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static files
app.mount(
    "/static",
    StaticFiles(directory=os.path.join(os.path.dirname(__file__), "../frontend/static")),
    name="static"
)

# Include routers
app.include_router(user_router)
app.include_router(categoria_router)
app.include_router(productos_router)
app.include_router(config_router)


# Login page
@app.get("/", response_class=HTMLResponse)
async def index():
    path = os.path.join(os.path.dirname(__file__), "../frontend/inicio.html")
    return HTMLResponse(open(path, encoding="utf-8").read())


# Login handler
@app.post("/login", response_class=HTMLResponse)
async def login(
    request: Request,
    strUsuario: str = Form(...),
    strContrasenna: str = Form(...),
    db_session: Session = Depends(get_db)
):
    # Obtener datos del usuario (asegúrate de usar la función que devuelve el campo "id")
    user = get_user(strUsuario, strContrasenna)
    if user is None:
        raise HTTPException(status_code=401, detail="Nombre de usuario o contraseña incorrectos")
    else :
        redirect_url = "/users"
    
    # Crear la respuesta de redirección y establecer la cookie con el ID del usuario
    response = RedirectResponse(url=redirect_url, status_code=303)
    response.set_cookie(key="user_id", value=str(user["id"]), httponly=True)
    return response


# Ruta para manejar el logout y redirigir al login
@app.post("/logout")
async def logout(response: Response):
    # Eliminar la cookie de sesión
    response.delete_cookie("session") 
    
    # Redirigir al login
    return RedirectResponse(url="/", status_code=303)