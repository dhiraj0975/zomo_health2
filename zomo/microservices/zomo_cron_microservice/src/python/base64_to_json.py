# base64data to json file create
import base64
import json
import os
import pandas as pd
from io import BytesIO
import sys

# Define the static file path for the Base64 encoded text file
# file_path = "D:/Darshit/Darshit/Scripts/fileBase64_1096.txt"  # Replace with your actual file path
file_path = sys.argv[1]

# Step 1: Read the Base64 string from the file
with open(file_path, 'r') as file:
    base64_data = file.read().strip()  # Read and strip any extra whitespace/newlines

# Step 2: Decode the Base64 string into bytes
decoded_bytes = base64.b64decode(base64_data)

# Step 3: Use BytesIO to handle the decoded Excel file in memory
excel_data = BytesIO(decoded_bytes)

# Step 4: Read the Excel file into a pandas DataFrame
df = pd.read_excel(excel_data, engine='openpyxl')

# Step 5: Convert the pandas DataFrame into a JSON object
json_data = df.to_json(orient='records', lines=False)

file_name = os.path.splitext(os.path.basename(file_path))[0]

# Construct CSV file path in the same directory
output_file_path = os.path.join(os.path.dirname(file_path), file_name + ".json")
# Step 6: Generate the file name and save the JSON data to a file
# output_file_path = "D:/Darshit/Darshit/Scripts/decoded_data.json"  # Define the output file path


with open(output_file_path, 'w', encoding='utf-8') as json_file:
    json_file.write(json_data)

print(f"JSON data has been saved to '{output_file_path}'.")
