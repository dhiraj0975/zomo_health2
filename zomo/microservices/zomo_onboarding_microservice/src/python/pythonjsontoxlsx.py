import json
import os
import sys
import pandas as pd
from openpyxl import load_workbook
from openpyxl.styles import Border, Side

# Path to your JSON file
# data_path = "D:/Darshit/Darshit/Test/Test123.json"
# Input arguments
data_path = sys.argv[1]
typeGet = sys.argv[2] if len(sys.argv) > 2 else 1
hideCells = sys.argv[3].split(',') if len(sys.argv) > 3 else []
multiple = sys.argv[4].lower() == "true" if len(sys.argv) > 4 else False
# Handle multiple JSON paths
data_paths = data_path.split(',') if multiple else [data_path]

# ✅ Always build Excel filename from the FIRST path only
first_json = data_paths[0]
file_name = os.path.splitext(os.path.basename(first_json))[0]
excel_dir = os.path.dirname(first_json)

excel_filename = os.path.join(excel_dir, file_name + ".xlsx")

# Path for the output Excel file
# excel_filename = "D:/Darshit/Darshit/Test/BB.xlsx"
# Extract file name without extension
# file_name = os.path.splitext(os.path.basename(data_paths[0]))[0]
# excel_filename = os.path.join(os.path.dirname(data_paths[0]), file_name + ".xlsx")

# Step 1: Write all JSONs into one Excel (multiple sheets if needed)
with pd.ExcelWriter(excel_filename, engine='openpyxl') as writer:
    for idx, path in enumerate(data_paths):
        with open(path, 'r', encoding='utf-8') as json_file:
            data = json.load(json_file)

        sheet_name = os.path.splitext(os.path.basename(path))[0][:31]  # Excel sheet max length 31
        if typeGet == '2':
            df = pd.DataFrame(data)
            df.columns = df.iloc[0]
            df = df[1:].reset_index(drop=True)
        else:
            df = pd.json_normalize(data)

        df.to_excel(writer, sheet_name=sheet_name or f"Sheet{idx+1}", index=False)


# Step 2: Apply formatting
wb = load_workbook(excel_filename)

# Define border style with no border
no_border_style = Border(
    left=Side(style=None),
    right=Side(style=None),
    top=Side(style=None),
    bottom=Side(style=None)
)


for ws in wb.worksheets:
    # Apply no borders to the headers in the first sheet (Sheet1)
    for cell in ws[1]:  # ws[1] gets the first row (headers)
        cell.border = no_border_style

    min_width = 10
    for col in ws.columns:
        col_letter = col[0].column_letter  # Get column letter (e.g., A, B, C)
        
        if col_letter in hideCells:
            ws.column_dimensions[col_letter].hidden = True  # Hide column
        else:
            max_length = max((len(str(cell.value)) for cell in col if cell.value), default=0)
            ws.column_dimensions[col_letter].width = max(max_length + 5, min_width)

# Save the workbook with formatting applied
wb.save(excel_filename)

print(f'Excel file "{excel_filename}" with headers cleared of borders has been created.')
