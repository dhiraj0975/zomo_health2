# install package pip install pyzipper
import os
import sys
import pyzipper

def create_encrypted_zip(file_path, zip_file_path, password):
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"File {file_path} not found!")

    try:
        with pyzipper.AESZipFile(zip_file_path, 'w',compression=pyzipper.ZIP_DEFLATED, encryption=pyzipper.WZ_AES) as zipf:
            zipf.setpassword(password.encode('utf-8'))  # Set password in UTF-8 encoding
            zipf.write(file_path, os.path.basename(file_path))  # Add the file to the ZIP
        
        print(f"Encrypted ZIP file created successfully at {zip_file_path}")
    except Exception as e:
        print(f"Error occurred: {e}")

if __name__ == "__main__":
    if len(sys.argv) != 4:
        print("Usage: python create_zip.py <file_path> <password> <zip_file_path>")
        sys.exit(1)

    file_path = sys.argv[1]  # Path to the file to zip
    password = sys.argv[2]   # Password for the ZIP file
    zip_file_path = sys.argv[3]  # Path to save the encrypted ZIP file

    create_encrypted_zip(file_path, zip_file_path, password)
