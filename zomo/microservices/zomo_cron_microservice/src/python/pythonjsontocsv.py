import json
import csv
import os
import sys

# Path to your JSON file
data_path = sys.argv[1]

# Step 1: Read JSON data
with open(data_path, 'r', encoding='utf-8') as json_file:
    data = json.load(json_file)

# Extract file name without extension
file_name = os.path.splitext(os.path.basename(data_path))[0]

# Construct CSV file path in the same directory
csv_filename = os.path.join(os.path.dirname(data_path), file_name + ".csv")

# Step 2: Extract headers and write to CSV file
with open(csv_filename, 'w', newline='', encoding='utf-8') as csv_file:
    writer = csv.writer(csv_file)
    
    # Write headers
    headers = list(data[0].keys())
    writer.writerow(headers)
    
    # Write data rows

    # for row in data:
    #     writer.writerow(row.values())

    for row in data:
        row_data = []
        for key in headers:
            value = row.get(key, '')

            # Replace None with empty string
            if value is None:
                value = ''
            
            # Wrap "Error Code" in quotes explicitly to keep as text
            if key == "Error Code" and isinstance(value, str):
                value = f'"{value}"'

            row_data.append(value)

        writer.writerow(row_data)

print(f'CSV file "{csv_filename}" has been created.')