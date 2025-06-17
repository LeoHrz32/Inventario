from fastapi import HTTPException
from typing import List, Dict, Any
from storage import get_db

def obtener_registros(nombre_tabla: str) -> List[Dict[str, Any]]:
    conn = get_db()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute(f"SELECT * FROM `{nombre_tabla}`")
        registros = cursor.fetchall()
        return registros
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener registros: {e}")
    finally:
        cursor.close()
        conn.close()

def obtener_registro_por_id(nombre_tabla: str, registro_id: int) -> Dict[str, Any]:
    conn = get_db()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute(f"SELECT * FROM `{nombre_tabla}` WHERE id = %s", (registro_id,))
        registro = cursor.fetchone()
        if not registro:
            raise HTTPException(status_code=404, detail="Registro no encontrado")
        return registro
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener el registro: {e}")
    finally:
        cursor.close()
        conn.close()

def crear_registro(nombre_tabla: str, datos: Dict[str, Any]) -> Dict[str, Any]:
    conn = get_db()
    cursor = conn.cursor()

    try:
        columnas = ", ".join(f"`{k}`" for k in datos.keys())
        valores = ", ".join(["%s"] * len(datos))
        sql = f"INSERT INTO `{nombre_tabla}` ({columnas}) VALUES ({valores})"
        cursor.execute(sql, tuple(datos.values()))
        conn.commit()
        return {"message": "Registro creado correctamente", "id": cursor.lastrowid}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Error al crear el registro: {e}")
    finally:
        cursor.close()
        conn.close()
        
        
def actualizar_registro(
    nombre_tabla: str,
    pk_field: str,
    pk_value: Any,
    datos: Dict[str, Any]
) -> Dict[str, Any]:
    conn   = get_db()
    cursor = conn.cursor()
    try:
        # Construye SETs
        sets = ", ".join(f"`{k}` = %s" for k in datos.keys())
        # Usa campo PK dinámico en el WHERE
        sql  = f"UPDATE `{nombre_tabla}` SET {sets} WHERE `{pk_field}` = %s"
        valores = list(datos.values()) + [pk_value]
        cursor.execute(sql, tuple(valores))
        conn.commit()
        return {"message": "Registro actualizado correctamente"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Error al actualizar el registro: {e}")
    finally:
        cursor.close()
        conn.close()


def eliminar_registro(nombre_tabla: str, registro_id: int) -> Dict[str, Any]:
    conn = get_db()
    cursor = conn.cursor()

    try:
        sql = f"DELETE FROM `{nombre_tabla}` WHERE id = %s"
        cursor.execute(sql, (registro_id,))
        conn.commit()
        return {"message": "Registro eliminado correctamente"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Error al eliminar el registro: {e}")
    finally:
        cursor.close()
        conn.close()
        
def obtener_tablas() -> List[str]:
    """Devuelve la lista de nombres de tablas existentes en la base de datos"""
    conn = get_db()
    cursor = conn.cursor()

    try:
        cursor.execute("SHOW TABLES")
        resultados = cursor.fetchall()
        return [row[0] for row in resultados]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener tablas: {e}")
    finally:
        cursor.close()
        conn.close()

