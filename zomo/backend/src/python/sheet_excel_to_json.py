import pandas as pd
import json
import sys
import os
from datetime import datetime

# Path to your Excel file
data_path = sys.argv[1]
print(f"Processing file: {data_path}")

def date_converter(o):
    if isinstance(o, (datetime, pd.Timestamp)):
        return o.strftime("%m-%d-%Y")
    raise TypeError("Type not serializable")

try:
    # Step 1: Read all sheets into a dictionary of DataFrames
    df_sheets = pd.read_excel(data_path, sheet_name=None, header=None)

    # Dictionary to hold JSON data for each sheet
    all_sheets_json = {}

    # Step 2: Iterate over each sheet and process it
    for sheet_name, df in df_sheets.items():
        # Replace NaN (empty cells) with empty strings
        df = df.fillna("")

        # Extract columns (header) and data
        columns = df.iloc[0].tolist()  # First row contains columns
        data = df[1:].values.tolist()  # All rows after the first row contain the data

        # Combine columns and data into the required format
        sheet_data = [columns] + data

        # Add this sheet's data to the all_sheets_json dictionary
        all_sheets_json[sheet_name] = sheet_data

    # Step 3: Serialize all sheets' data to a single JSON string
    json_data = json.dumps(all_sheets_json, default=date_converter, indent=4, ensure_ascii=False)

    file_name = os.path.splitext(os.path.basename(data_path))[0]

    # Optional: Save JSON to a file
    json_file_path = os.path.join(os.path.dirname(data_path), file_name + ".json")
    with open(json_file_path, 'w', encoding='utf-8') as json_file:
        json_file.write(json_data)

    print(f'All sheets from "{data_path}" have been converted to JSON and saved to "{json_file_path}".')

except Exception as e:
    print(f"Error converting Excel to JSON: {str(e)}")
