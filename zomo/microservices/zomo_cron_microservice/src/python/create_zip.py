# install package pip install pyzipper
import os
import sys
import json
import pyzipper

def create_encrypted_zip(file_paths_input, zip_file_path, password):
    print(f"Creating encrypted ZIP: {zip_file_path}")
    print(f"Password: {password}")
    file_paths = []
    # ────── FIX 1: Normalize input properly ──────
    if isinstance(file_paths_input, str):
        cleaned = file_paths_input.strip().strip('"').strip("'")
        try:
            parsed = json.loads(cleaned)
            # if isinstance(parsed, list):
            #     file_paths = [os.path.normpath(str(p)) for p in parsed if str(p).strip()]
            # else:
            #     file_paths = [os.path.normpath(str(parsed))]
            if isinstance(parsed, list):
                file_paths = [os.path.normpath(str(p).replace('\\\\', '\\')) for p in parsed if str(p).strip()]
            else:
                file_paths = [os.path.normpath(str(parsed).replace('\\\\', '\\'))]
        except json.JSONDecodeError:
            # ← ADD THIS BLOCK
            # Emergency fix: someone passed "[path]" as string
            cleaned_fixed = cleaned.replace('[', '').replace(']', '').replace('"', '').replace("'", "")
            paths = [p.strip() for p in cleaned_fixed.split(',') if p.strip()]
            file_paths = [os.path.normpath(p.replace('\\\\', '\\')) for p in paths]
    # elif isinstance(file_paths_input, list):
    #     file_paths = [os.path.normpath(str(p)) for p in file_paths_input if str(p).strip()]
    # else:
    #     raise ValueError("Invalid input")
    elif isinstance(file_paths_input, list):
        file_paths = [os.path.normpath(str(p).replace('\\\\', '\\')) for p in file_paths_input if str(p).strip()]
    else:
        raise ValueError("Invalid input")

    if not file_paths:
        raise ValueError("No files to zip")

    print(f"Found {len(file_paths)} file(s):")
    # ────── FIX 2: Check existence ──────
    for fp in file_paths:
        if not os.path.exists(fp):
            raise FileNotFoundError(f"File not found: {fp}")

    try:
        # with pyzipper.AESZipFile(zip_file_path, 'w',compression=pyzipper.ZIP_DEFLATED, encryption=pyzipper.WZ_AES) as zipf:
        #     zipf.setpassword(password.encode('utf-8'))  # Set password in UTF-8 encoding
        #     zipf.write(file_path, os.path.basename(file_path))  # Add the file to the ZIP
        with pyzipper.AESZipFile(
            zip_file_path,
            'w',
            compression=pyzipper.ZIP_DEFLATED,
            encryption=pyzipper.WZ_AES
        ) as zipf:
            zipf.setpassword(password.encode('utf-8'))

            for file_path in file_paths:
                arcname = os.path.basename(file_path)
                zipf.write(file_path, arcname)
                print(f"Added: {arcname}")
        
        print(f"Encrypted ZIP file created successfully at {zip_file_path}")
    except Exception as e:
        print(f"Error occurred: {e}")

if __name__ == "__main__":
    if len(sys.argv) != 4:
        print("Usage: python create_zip.py <file_path> <password> <zip_file_path>")
        sys.exit(1)

    input_arg   = sys.argv[1]   # ← this can be "file.xlsx" OR '["f1.xlsx","f2.xlsx"]'
    password  = sys.argv[2]
    output_zip = sys.argv[3]

    create_encrypted_zip(input_arg, output_zip, password)
