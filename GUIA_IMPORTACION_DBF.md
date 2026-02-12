# Guía de Importación Incremental (Sistema Legado DBF)

Esta herramienta permite traer nuevos pacientes desde el sistema antiguo (archivos `.DBF`) hacia el nuevo Sistema Neuro, sin borrar ni duplicar los pacientes que ya existen.

---

## 1. Preparación del Archivo
1.  Ubique el archivo **`_PAC001.DBF`** más reciente de la computadora de la doctora.
2.  Copie ese archivo dentro de la carpeta:
    `backend/data`
    *(Debe reemplazar el archivo que ya existe en esa carpeta si se le pregunta).*

---

## 2. Ejecución del Script
1.  Abra una terminal en la carpeta `backend`.
    *   (Puede hacer clic derecho en la carpeta `backend` > "Abrir en Terminal").
2.  Escriba el siguiente comando y presione **Enter**:
    ```bash
    node importar_legado_incremental.js
    ```

---

## 3. Resultados Esperados
El sistema analizará cada paciente. Al finalizar, verá un resumen como este:

```text
-------------------------------------------
IMPORTACIÓN COMPLETADA
Total Procesados del DBF: 1250
Nuevos Insertados:        5       <-- Estos son los que agregó
Saltados (Ya existen):    1245    <-- Estos ya estaban, no se tocaron
Errores:                  0
-------------------------------------------
```

### Notas Importantes:
*   El script compara pacientes usando **DNI** y **Número de Historia Clínica**.
*   Si un paciente ya existe en el sistema nuevo, **SE SALTA** (se ignora). Esto protege cualquier cambio o edición que hayas hecho manualmente en el sistema nuevo.
*   Si el script encuentra un paciente nuevo que no está en la base de datos moderna, lo agrega automáticamente.
