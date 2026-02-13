# Changelog

Todas as mudanças notáveis para este projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
e este projeto adere ao [Semantic Versioning](https://semver.org/spec/v2.0.0.html).


## [1.2.1] - 2026-02-13

### Correcciones (Crítico)
- **Subida de Archivos**: Se arregló la ruta de guardado (`uploads/exams`). Ahora los archivos van a la carpeta correcta.
- **Validación de Archivos**: Se restringió la subida a solo PDF, Word e Imágenes (JPG, PNG). Alerta visible si el formato es incorrecto.
- **Interfaz**: Mejorado el espaciado y diseño de la lista de resultados de exámenes.
- **Estabilidad**: Corregido error en script de inicio de desarrollo (`Iniciar_Desarrollo.bat`) que no cerraba correctamente el backend.

## [1.2.0] - 2026-02-13

### Cambios (UI/UX)
- Cambiado formato de hora de 24h a 12h (AM/PM) en todo el sistema.
- Reemplazado selector de hora nativo por selector personalizado (Hora/Minuto/AM-PM).
- Renombrado "Visual Analytics" a "Dashboard" en el menú lateral.
- Renombrado "Apellidos (Completo)" a "Apellidos" en formulario de pacientes.
- Actualización de "Próximas Citas" en dashboard para usar formato 12h.

## [1.0.0] - 2026-01-29

### Adicionado
- Implementação inicial do sistema de controle de versão com Git.
- Configuração do `package.json` com versão base 1.0.0.
- Criação deste arquivo `CHANGELOG.md` para rastreamento de atualizações futuras.
- Configuração do `.gitignore` para proteger dados sensíveis e arquivos de sistema.

### Segurança
- Pasta `uploads/` adicionada ao ignore para evitar vazamento de dados de pacientes no repositório.
