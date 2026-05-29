import os
import sys
import argparse
from pathlib import Path
from markitdown import MarkItDown

# Reconfigurar stdout y stderr para usar UTF-8 y evitar errores de codificación en consolas de Windows al imprimir emojis
if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass
if sys.stderr.encoding != 'utf-8':
    try:
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

def convert_docx_to_markdown_recursively(directory_path: str):
    """
    Recorre un directorio y sus subdirectorios buscando archivos .docx
    y los convierte a formato Markdown (.md) usando MarkItDown de Microsoft.
    Ignora directorios de dependencias y temporales.
    """
    base_dir = Path(directory_path)
    
    if not base_dir.is_dir():
        print(f"Error: El directorio '{directory_path}' no existe o no es válido.")
        return

    # Inicializar la herramienta de conversión
    try:
        md_converter = MarkItDown()
    except Exception as e:
        print(f"Error al inicializar MarkItDown. Asegúrate de tenerlo instalado (pip install markitdown[docx]). Detalles: {e}")
        return

    # Encontrar todos los archivos .docx recursivamente ignorando directorios comunes de desarrollo/sistema
    ignored_dirs = {'node_modules', '.git', 'venv', '.venv', '.idea', '.vscode', '__pycache__', 'dist', 'build'}
    docx_files = []
    
    for root, dirs, files in os.walk(base_dir):
        # Modificar dirs in-place para evitar recorrer carpetas ignoradas
        dirs[:] = [d for d in dirs if d not in ignored_dirs]
        for file in files:
            if file.lower().endswith('.docx'):
                docx_files.append(Path(root) / file)
    
    if not docx_files:
        print(f"No se encontraron archivos .docx en {directory_path} ni en sus subdirectorios (excluyendo carpetas ignoradas).")
        return
        
    print(f"🔍 Se encontraron {len(docx_files)} archivos .docx. Iniciando conversión...")
    
    success_count = 0
    error_count = 0

    for docx_path in docx_files:
        # Evitar archivos temporales de Word que empiezan con ~$
        if docx_path.name.startswith("~$"):
            continue
            
        md_path = docx_path.with_suffix(".md")
        print(f"🔄 Convirtiendo: {docx_path.name} -> {md_path.name}")
        
        try:
            # Realizar la conversión
            result = md_converter.convert(str(docx_path))
            
            # Guardar el contenido en el nuevo archivo .md
            with open(md_path, "w", encoding="utf-8") as f:
                f.write(result.text_content)
                
            success_count += 1
            
        except Exception as e:
            print(f" ❌ Error al convertir {docx_path.name}: {e}")
            error_count += 1

    print("-" * 40)
    print("✅ Resumen de la operación:")
    print(f"Total procesados: {success_count + error_count}")
    print(f"  - Exitosos: {success_count}")
    print(f"  - Errores:  {error_count}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Convierte recursivamente archivos Word (.docx) a Markdown (.md)")
    parser.add_argument("directorio", help="Ruta del directorio base a procesar")
    args = parser.parse_args()
    
    convert_docx_to_markdown_recursively(args.directorio)
